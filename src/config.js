import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

function expandHome(p) {
  if (!p) return p;
  if (p.startsWith('~')) return p.replace(/^~/, homedir());
  return p;
}

export async function loadConfig() {
  const envPath = join(repoRoot, '.env');
  const hasEnv = existsSync(envPath);

  // Sensible defaults if .env doesn't exist yet (e.g., user hasn't run `vp init`)
  const defaults = {
    PROJECTS_ROOT: './hangar',
    TRANSCRIBER: 'parakeet-local',
    DIRECTOR_LLM: 'local',
    SCHEDULE_AUTO_PUBLISH: 'false',
    LOG_LEVEL: 'info',
  };

  const env = { ...defaults, ...process.env };
  const projectsRoot = resolve(repoRoot, expandHome(env.PROJECTS_ROOT));

  return {
    repoRoot,
    projectsRoot,
    hasEnv,
    transcriber: env.TRANSCRIBER,
    directorLlm: env.DIRECTOR_LLM,
    autoPublish: env.SCHEDULE_AUTO_PUBLISH === 'true',
    logLevel: env.LOG_LEVEL,
    keys: {
      openai: env.OPENAI_API_KEY || null,
      deepgram: env.DEEPGRAM_API_KEY || null,
      elevenlabs: env.ELEVENLABS_API_KEY || null,
      zernio: env.ZERNIO_API_KEY || null,
      anthropic: env.ANTHROPIC_API_KEY || null,
    },
  };
}

export function resolveProjectPath(projectsRoot, projectName) {
  if (!projectName) return null;
  // If they passed an absolute path or a path that already exists, use it.
  if (projectName.startsWith('/') || projectName.startsWith('~')) {
    return expandHome(projectName);
  }
  return resolve(projectsRoot, projectName);
}
