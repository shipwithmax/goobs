import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import prompts from 'prompts';
import kleur from 'kleur';
import { runDoctor } from './doctor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

export async function runInit({ yes = false } = {}) {
  console.log(kleur.bold('Welcome aboard Goobs.\n'));
  console.log(kleur.gray('Everything here is local. You can change any answer later by editing .env.\n'));

  const interactive = !yes && process.stdin.isTTY;
  const responses = interactive
    ? await prompts({ type: 'text', name: 'projectsRoot', message: 'Where should your videos live?', initial: './hangar' })
    : { projectsRoot: './hangar' };

  if (!responses.projectsRoot) {
    console.log(kleur.red('\nCancelled.'));
    return;
  }

  // Write .env if it doesn't exist yet
  const envPath = join(repoRoot, '.env');
  const envExamplePath = join(repoRoot, '.env.example');
  if (!existsSync(envPath) && existsSync(envExamplePath)) {
    let envContents = readFileSync(envExamplePath, 'utf8');
    envContents = envContents.replace(/^PROJECTS_ROOT=.*/m, `PROJECTS_ROOT=${responses.projectsRoot}`);
    writeFileSync(envPath, envContents);
    console.log(kleur.green('  ✓ wrote .env (transcriber: whisper-cpp, model: small.en)'));
  } else if (existsSync(envPath)) {
    console.log(kleur.yellow('  • .env already exists — leaving it alone'));
  }

  // Ensure projects root exists
  const expandedRoot = responses.projectsRoot.startsWith('~')
    ? responses.projectsRoot.replace(/^~/, homedir())
    : resolve(repoRoot, responses.projectsRoot);
  if (!existsSync(expandedRoot)) {
    mkdirSync(expandedRoot, { recursive: true });
    console.log(kleur.green(`  ✓ created ${responses.projectsRoot}/`));
  }

  console.log(kleur.bold('\nChecking your tools:\n'));
  await runDoctor();

  console.log(kleur.bold('Where to next?\n'));
  console.log(kleur.gray('  Try it on a synthetic sample:  '), kleur.bold('npm run sample && ./bin/vp run sample-clip'));
  console.log(kleur.gray('  Start your own video:          '), kleur.bold('./bin/vp plan --topic "your topic"'));
  console.log(kleur.gray('  Read the workflow:             '), kleur.bold('docs/for-creators.md'));
  console.log(kleur.bold('\nWelcome aboard.\n'));
}
