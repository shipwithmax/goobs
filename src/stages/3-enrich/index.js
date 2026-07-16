import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import kleur from 'kleur';
import { resolveProjectPath } from '../../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runEnrich({ project, layout = 'talking-head' }, cfg) {
  const projectPath = resolveProjectPath(cfg.projectsRoot, project);
  const enrichDir = join(projectPath, '3-enrich');
  mkdirSync(enrichDir, { recursive: true });

  const layoutSrc = resolve(__dirname, '..', '..', 'layouts', layout, 'composition.html');
  const layoutDst = join(enrichDir, 'composition.html');

  if (!existsSync(layoutSrc)) {
    console.log(kleur.red(`  ✗ unknown layout: ${layout}`));
    console.log(kleur.gray(`    Available: talking-head, split-screen, vertical-short`));
    return;
  }

  if (!existsSync(layoutDst)) {
    copyFileSync(layoutSrc, layoutDst);
    console.log(kleur.green(`  ✓ ${layout} composition copied to ${project}/3-enrich/`));
  } else {
    console.log(kleur.yellow(`  • composition.html already exists — leaving it alone`));
  }

  // TODO(phase-2): merge cues.json into composition.html as GSAP timeline entries
  //   1. Read 3-enrich/composition.html
  //   2. Read 1-log/cues.json (filter type=viz | lower-third | b-roll)
  //   3. Inject GSAP timeline.to() calls for each cue
  //   4. Run hyperframes render → enriched.mp4
  console.log(kleur.yellow(`  ⚠ cue → GSAP timeline injection lands during phase 2.`));
  console.log(kleur.gray(`    For now, edit composition.html manually and run hyperframes render.`));
  console.log(kleur.bold('\n  Next:'), kleur.gray(`vp polish ${project}`));
}
