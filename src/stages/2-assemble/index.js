import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import kleur from 'kleur';
import { resolveProjectPath } from '../../config.js';

export async function runAssemble({ project }, cfg) {
  const projectPath = resolveProjectPath(cfg.projectsRoot, project);
  const sourcePath = join(projectPath, 'source.mp4');
  const cuesPath = join(projectPath, '1-log', 'cues.json');

  if (!existsSync(sourcePath)) {
    console.log(kleur.red(`  ✗ no source.mp4 in ${project}/`));
    return;
  }
  if (!existsSync(cuesPath)) {
    console.log(kleur.red(`  ✗ no cues.json — run \`vp log ${project}\` first.`));
    return;
  }

  const cues = JSON.parse(readFileSync(cuesPath, 'utf8'));
  const removeCues = cues.filter((c) => c.type === 'remove' || c.type === 'restart');

  console.log(kleur.cyan(`  • assembling rough cut...`));
  console.log(kleur.gray(`    Source: ${sourcePath}`));
  console.log(kleur.gray(`    Cuts to remove: ${removeCues.length}`));

  const assembleDir = join(projectPath, '2-assemble');
  mkdirSync(assembleDir, { recursive: true });

  // TODO(phase-2): implement FFmpeg trim-and-concat using removeCues + filler-word ranges.
  //   1. Build keep-ranges from full-duration minus remove-ranges
  //   2. Run `ffmpeg -ss <start> -to <end> -i source -c copy slice_N.mp4` per range
  //   3. Concat slices into rough.mp4
  //   4. Write a manifest.json so phase 4 (Polish) can re-derive timecodes
  console.log(kleur.yellow(`  ⚠ stage 2 implementation lands during phase 2 dogfood.`));
  console.log(kleur.gray(`    This stage is scaffolded but not implemented yet.`));
  console.log(kleur.gray(`    For now, you can manually trim ${sourcePath} → ${assembleDir}/rough.mp4`));
}
