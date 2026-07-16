import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import kleur from 'kleur';
import { resolveProjectPath } from '../../config.js';
import { transcribe } from '../../transcribers/index.js';
import { extractCues } from './director-patterns.js';

export async function runLog({ project, transcriber: override }, cfg) {
  const projectPath = resolveProjectPath(cfg.projectsRoot, project);
  if (!existsSync(projectPath)) {
    console.log(kleur.red(`  ✗ project not found: ${projectPath}`));
    console.log(kleur.gray(`    Run \`vp plan ${project}\` first.`));
    return;
  }

  const sourcePath = join(projectPath, 'source.mp4');
  if (!existsSync(sourcePath)) {
    console.log(kleur.red(`  ✗ no source.mp4 in ${project}/`));
    console.log(kleur.gray(`    Drop your recording at: ${sourcePath}`));
    return;
  }

  const logDir = join(projectPath, '1-log');
  mkdirSync(logDir, { recursive: true });

  const engine = override || cfg.transcriber;
  console.log(kleur.cyan(`  • transcribing with ${engine}...`));

  const transcript = await transcribe(sourcePath, engine, cfg);
  const transcriptPath = join(logDir, 'transcript.json');
  writeFileSync(transcriptPath, JSON.stringify(transcript, null, 2));
  console.log(kleur.green(`  ✓ transcript.json (${transcript.words?.length ?? 0} words)`));

  const cues = extractCues(transcript);
  const cuesPath = join(logDir, 'cues.json');
  writeFileSync(cuesPath, JSON.stringify(cues, null, 2));
  console.log(kleur.green(`  ✓ cues.json (${cues.length} director cues extracted)`));

  if (cues.length > 0) {
    console.log(kleur.bold('\n  Cues found:'));
    for (const cue of cues.slice(0, 10)) {
      console.log(kleur.gray(`    [${formatTime(cue.start)}] ${cue.type}: ${cue.text || cue.match}`));
    }
    if (cues.length > 10) console.log(kleur.gray(`    ...and ${cues.length - 10} more.`));
  }

  console.log(kleur.bold('\n  Next:'), kleur.gray(`vp assemble ${project}`));
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
