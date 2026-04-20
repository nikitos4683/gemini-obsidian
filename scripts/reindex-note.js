#!/usr/bin/env node

const path = require('path');
const { spawn } = require('child_process');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const CLI_PATH = path.join(PLUGIN_ROOT, 'dist', 'index.js');

async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

async function main() {
  const input = await readStdin();
  const child = spawn(process.execPath, [CLI_PATH, 'obsidian_rag_index', '--hook'], {
    stdio: ['pipe', 'ignore', 'ignore'],
    env: process.env,
    windowsHide: true,
  });

  if (input) {
    child.stdin.write(input);
  }
  child.stdin.end();

  child.on('close', () => {
    process.stdout.write('{}\n');
    process.exit(0);
  });
}

main().catch(() => {
  process.stdout.write('{}\n');
  process.exit(0);
});
