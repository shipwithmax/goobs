import { existsSync, mkdirSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import prompts from 'prompts';
import kleur from 'kleur';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

export async function runInit() {
  console.log(kleur.bold('Welcome aboard Goobs.\n'));
  console.log(kleur.gray('This wizard takes about 60 seconds. Everything is optional —'));
  console.log(kleur.gray('you can change any answer later by editing .env.\n'));

  const responses = await prompts([
    {
      type: 'text',
      name: 'name',
      message: 'Your name?',
      initial: '',
    },
    {
      type: 'text',
      name: 'email',
      message: 'Your email? (optional — for the playbook & updates)',
      initial: '',
    },
    {
      type: 'text',
      name: 'projectsRoot',
      message: 'Where should your videos live?',
      initial: './hangar',
    },
  ]);

  if (!responses.projectsRoot) {
    console.log(kleur.red('\nCancelled.'));
    return;
  }

  // Write .env if it doesn't exist yet
  const envPath = join(repoRoot, '.env');
  const envExamplePath = join(repoRoot, '.env.example');
  if (!existsSync(envPath) && existsSync(envExamplePath)) {
    let envContents = readFileSync(envExamplePath, 'utf8');
    envContents = envContents.replace(
      /^PROJECTS_ROOT=.*/m,
      `PROJECTS_ROOT=${responses.projectsRoot}`,
    );
    writeFileSync(envPath, envContents);
    console.log(kleur.green(`\n  ✓ wrote .env (default transcriber: parakeet-local)`));
  } else if (existsSync(envPath)) {
    console.log(kleur.yellow(`\n  • .env already exists — leaving it alone`));
  }

  // Save profile for future runs
  const profileDir = join(homedir(), '.goobs');
  if (!existsSync(profileDir)) mkdirSync(profileDir, { recursive: true });
  writeFileSync(
    join(profileDir, 'profile.json'),
    JSON.stringify({ name: responses.name, email: responses.email, createdAt: new Date().toISOString() }, null, 2),
  );
  console.log(kleur.green(`  ✓ saved profile to ~/.goobs/profile.json`));

  // Ensure projects root exists
  const expandedRoot = responses.projectsRoot.startsWith('~')
    ? responses.projectsRoot.replace(/^~/, homedir())
    : resolve(repoRoot, responses.projectsRoot);
  if (!existsSync(expandedRoot)) {
    mkdirSync(expandedRoot, { recursive: true });
    console.log(kleur.green(`  ✓ created ${responses.projectsRoot}/`));
  }

  console.log(kleur.bold('\nWhere to next?\n'));

  const next = await prompts({
    type: 'select',
    name: 'choice',
    message: 'Pick your starting move',
    choices: [
      { title: '🎬  Start a new video project (walks you through stage 0)', value: 'new' },
      { title: '🎨  Open the example project (scrub a real one)', value: 'example' },
      { title: '📚  Show me the docs', value: 'docs' },
      { title: '🚪  Just give me the prompt — I\'ll explore', value: 'exit' },
    ],
    initial: 0,
  });

  switch (next.choice) {
    case 'new':
      console.log(kleur.cyan('\n  → run:'), kleur.bold('vp plan'));
      console.log(kleur.gray('    (or open the docs for a full walkthrough)\n'));
      break;
    case 'example':
      console.log(kleur.cyan('\n  → see:'), kleur.bold('examples/starter-project/'));
      console.log(kleur.gray('    A pre-cooked end-to-end demo you can scrub.\n'));
      break;
    case 'docs':
      console.log(kleur.cyan('\n  → see:'), kleur.bold('docs/for-creators.md'));
      console.log(kleur.gray('    Or read the README for the 60-second tour.\n'));
      break;
    default:
      console.log(kleur.gray('\n  Type "vp --help" anytime to see what\'s available.\n'));
  }

  console.log(kleur.bold('Welcome aboard.\n'));
}
