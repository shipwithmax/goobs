import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const vp = fileURLToPath(new URL('../bin/vp', import.meta.url));

test('every command loads and shows up in --help', () => {
  const out = execFileSync(process.execPath, [vp, '--help'], { encoding: 'utf8' });
  for (const cmd of ['init', 'doctor', 'plan', 'log', 'assemble', 'enrich', 'polish', 'render', 'schedule', 'run']) {
    assert.match(out, new RegExp(`\\b${cmd}\\b`), `missing command: ${cmd}`);
  }
});
