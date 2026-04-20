#!/usr/bin/env node

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const CONFIG_FILE = path.join(os.homedir(), '.gemini-obsidian.config.json');
const PLUGIN_ROOT = path.resolve(__dirname, '..');
const CLI_PATH = path.join(PLUGIN_ROOT, 'dist', 'index.js');

async function loadVaultPath() {
  if (process.env.OBSIDIAN_VAULT_PATH) {
    return process.env.OBSIDIAN_VAULT_PATH;
  }

  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(raw).vault_path || '';
  } catch {
    return '';
  }
}

async function countMarkdownFiles(root) {
  let count = 0;
  const queue = [root];

  while (queue.length > 0) {
    const current = queue.pop();
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        count += 1;
      }
    }
  }

  return count;
}

async function runCli(args, input) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI_PATH, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
      windowsHide: true,
    });

    let stdout = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.resume();

    child.on('close', (code) => {
      resolve({ code: code ?? 1, stdout });
    });

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

async function main() {
  const vaultPath = await loadVaultPath();
  let message;

  try {
    const stat = vaultPath ? await fs.stat(vaultPath) : null;
    if (vaultPath && stat.isDirectory()) {
      const noteCount = await countMarkdownFiles(vaultPath);
      const statusLine = `Obsidian vault connected: ${vaultPath} (${noteCount} notes)`;
      const indexResult = await runCli(['obsidian_rag_index'], '');

      let indexLine = 'RAG index refresh failed';
      if (indexResult.code === 0) {
        try {
          const parsed = JSON.parse(indexResult.stdout || '{}');
          if (parsed.chunks === 0) {
            indexLine = 'RAG index up to date';
          } else if (typeof parsed.chunks === 'number') {
            indexLine = `RAG index updated: ${parsed.chunks} chunks indexed`;
          } else {
            indexLine = 'RAG index check completed';
          }
        } catch {
          indexLine = 'RAG index check completed';
        }
      }

      message = `${statusLine}\n${indexLine}`;
    } else {
      message = 'Obsidian vault not configured. Use obsidian_set_vault to set your vault path.';
    }
  } catch {
    message = 'Obsidian vault not configured. Use obsidian_set_vault to set your vault path.';
  }

  process.stdout.write(`${JSON.stringify({ systemMessage: message, suppressOutput: true })}\n`);
}

main().catch(() => {
  process.stdout.write(
    `${JSON.stringify({
      systemMessage: 'Obsidian vault not configured. Use obsidian_set_vault to set your vault path.',
      suppressOutput: true,
    })}\n`,
  );
});
