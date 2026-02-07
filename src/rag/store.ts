import * as lancedb from '@lancedb/lancedb';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { glob } from 'glob';
import matter from 'gray-matter';
import md5 from 'md5';
import { Embedder } from './embedder.js';

const DB_PATH = path.join(os.homedir(), '.gemini-obsidian-lancedb');

interface NoteChunk {
  id: string;
  path: string;
  text: string;
  vector: number[];
}

export class VaultIndexer {
  private db: lancedb.Connection | null = null;
  private table: lancedb.Table | null = null;

  constructor() {}

  private async getDb() {
    if (!this.db) {
      this.db = await lancedb.connect(DB_PATH);
    }
    return this.db;
  }

  private async getTable() {
    const db = await this.getDb();
    const tableNames = await db.tableNames();
    if (tableNames.includes('notes')) {
      this.table = await db.openTable('notes');
    }
    return this.table;
  }

  private async createOrGetTable(data?: any[]) {
    const db = await this.getDb();
    const tableNames = await db.tableNames();

    if (tableNames.includes('notes')) {
        this.table = await db.openTable('notes');
        if (data && data.length > 0) {
            await this.table.add(data);
        }
    } else {
        if (!data || data.length === 0) {
            // Cannot create empty table easily without schema in some versions,
            // but let's wait until we have data.
            return null;
        }
        this.table = await db.createTable('notes', data);
    }
    return this.table;
  }

  public async indexFile(vaultPath: string, relativePath: string) {
    const embedder = Embedder.getInstance();
    const filePath = path.join(vaultPath, relativePath);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const { data, content: body } = matter(content);

      const paragraphs = body.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      
      const textsToEmbed: string[] = [];
      const chunkMetadata: {id: string, text: string, path: string}[] = [];

      for (let i = 0; i < paragraphs.length; i++) {
        const text = paragraphs[i].trim();
        if (text.length < 20) continue;

        const context = `File: ${relativePath}\nContent: ${text}`;
        textsToEmbed.push(context);
        chunkMetadata.push({
            id: md5(`${relativePath}-${i}`),
            path: relativePath,
            text: text
        });
      }

      if (textsToEmbed.length > 0) {
          const vectors = await embedder.embedBatch(textsToEmbed);
          const chunks: NoteChunk[] = chunkMetadata.map((meta, idx) => ({
              ...meta,
              vector: vectors[idx]
          }));

          const db = await this.getDb();
          const tableNames = await db.tableNames();
          if (!tableNames.includes('notes')) {
              this.table = await db.createTable('notes', chunks);
          } else {
              this.table = await db.openTable('notes');
              // Delete old chunks for this file
              await this.table.delete(`path = '${relativePath.replace(/'/g, "''")}'`);
              await this.table.add(chunks);
          }
          console.error(`Indexed ${chunks.length} chunks for ${relativePath}.`);
          return { success: true, chunks: chunks.length };
      }
      return { success: false, message: "No content to index or table not available." };
    } catch (err) {
      console.error(`Failed to index file ${filePath}:`, err);
      return { success: false, message: String(err) };
    }
  }

  public async indexVault(vaultPath: string) {
    const embedder = Embedder.getInstance();

    // 1. Find all markdown files
    const files = await glob('**/*.md', { cwd: vaultPath, absolute: true });
    console.error(`Found ${files.length} notes in ${vaultPath}`);

    const allChunks: NoteChunk[] = [];
    const batchSize = 32; // Batch size for embedding model
    let currentBatchTexts: string[] = [];
    let currentBatchMeta: {id: string, text: string, path: string}[] = [];

    // Helper to flush current batch
    const flushBatch = async () => {
        if (currentBatchTexts.length === 0) return;
        try {
            const vectors = await embedder.embedBatch(currentBatchTexts);
            for (let i = 0; i < vectors.length; i++) {
                allChunks.push({
                    ...currentBatchMeta[i],
                    vector: vectors[i]
                });
            }
        } catch (e) {
            console.error("Failed to embed batch:", e);
        }
        currentBatchTexts = [];
        currentBatchMeta = [];
    };

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const { data, content: body } = matter(content);
        const relativePath = path.relative(vaultPath, filePath);
        const paragraphs = body.split(/\n\s*\n/).filter(p => p.trim().length > 0);

        for (let i = 0; i < paragraphs.length; i++) {
          const text = paragraphs[i].trim();
          if (text.length < 20) continue; 

          const context = `File: ${relativePath}\nContent: ${text}`;
          currentBatchTexts.push(context);
          currentBatchMeta.push({
              id: md5(`${relativePath}-${i}`),
              path: relativePath,
              text: text
          });

          if (currentBatchTexts.length >= batchSize) {
              await flushBatch();
          }
        }
      } catch (err) {
        console.error(`Failed to process file ${filePath}:`, err);
      }
    }

    // Flush remaining
    await flushBatch();

    if (allChunks.length > 0) {
        // Drop existing table to full re-index (simplest for now)
        const db = await this.getDb();
        try {
            await db.dropTable('notes');
        } catch (e) { /* ignore if not exists */ }

        await this.createOrGetTable(allChunks);
        console.error(`Indexed ${allChunks.length} chunks.`);
        return { success: true, chunks: allChunks.length };
    } else {
        return { success: false, message: "No content found to index." };
    }
  }

  public async search(query: string, limit: number = 5) {
    const table = await this.getTable();
    if (!table) {
        return [];
    }

    const embedder = Embedder.getInstance();
    const vector = await embedder.embed(query);

    const results = await table.vectorSearch(vector)
        .limit(limit)
        .toArray();

    return results;
  }
}
