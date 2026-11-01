import { existsSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import kleur from 'kleur';
import { resolveProjectPath } from '../../config.js';
import { ffmpeg, probe } from '../../media.js';

// Stage 4 today does one thing well: loudness. Voice is normalised to
// -16 LUFS (a common target for online video) with a -1.5 dB true-peak
// ceiling. Colour, transitions and voice isolation are on the roadmap.
export async function runPolish({ project, lufs = '-16' }, cfg) {
  const projectPath = resolveProjectPath(cfg.projectsRoot, project);
  const input = [
    join(projectPath, '3-enrich', 'enriched.mp4'),
    join(projectPath, '2-assemble', 'rough.mp4'),
  ].find((p) => existsSync(p));
  if (!input) throw new Error(`nothing to polish. Run \`vp assemble ${project}\` first.`);

  const info = await probe(input);
  if (!info.hasAudio) throw new Error(`${relative(projectPath, input)} has no audio to polish.`);

  const dir = join(projectPath, '4-polish');
  mkdirSync(dir, { recursive: true });
  console.log(kleur.cyan(`  • normalising loudness to ${lufs} LUFS (input: ${relative(projectPath, input)})...`));
  await ffmpeg([
    '-i', input,
    '-af', `loudnorm=I=${lufs}:TP=-1.5:LRA=11`,
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-movflags', '+faststart',
    join(dir, 'fine.mp4'),
  ], { logFile: join(dir, 'polish.log') });
  console.log(kleur.green('  ✓ 4-polish/fine.mp4'));
  console.log(kleur.bold('\n  Next:'), kleur.gray(`vp render ${project}`));
}
