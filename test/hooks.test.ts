import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

type HookEntry = {
  command: string;
  name: string;
};

function loadHookCommands(): HookEntry[] {
  const hooksPath = path.join(__dirname, '..', 'hooks', 'hooks.json');
  const parsed = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));

  return [
    ...parsed.hooks.SessionStart[0].hooks,
    ...parsed.hooks.BeforeTool[0].hooks,
    ...parsed.hooks.AfterTool[0].hooks,
  ].map(({ command, name }) => ({ command, name }));
}

describe('hook commands', () => {
  it('uses node wrappers for cross-platform execution', () => {
    expect(loadHookCommands()).toEqual([
      {
        name: 'obsidian-session-init',
        command: 'node ${extensionPath}/scripts/session-init.js',
      },
      {
        name: 'obsidian-validate-frontmatter',
        command: 'node ${extensionPath}/scripts/validate-frontmatter.js',
      },
      {
        name: 'obsidian-reindex',
        command: 'node ${extensionPath}/scripts/reindex-note.js',
      },
    ]);
  });
});
