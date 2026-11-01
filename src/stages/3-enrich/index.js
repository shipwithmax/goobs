import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import kleur from 'kleur';
import { resolveProjectPath } from '../../config.js';
import { ffmpeg, probe } from '../../media.js';
import { mapToCutOrNext } from '../../timeline.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// The HyperFrames version Goobs is tested against. Override with
// HYPERFRAMES_VERSION if you want a newer one.
export const HYPERFRAMES_VERSION = process.env.HYPERFRAMES_VERSION || '0.7.18';

const LABELS = { viz: 'Chart', 'lower-third': 'Name', 'b-roll': 'B-roll', keep: 'Key point' };
const OVERLAY_TYPES = new Set(['viz', 'lower-third', 'b-roll']);

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function buildOverlays(cues, keepSegments, duration, hold = 4.5) {
  const items = [];
  for (const cue of cues) {
    if (!OVERLAY_TYPES.has(cue.type)) continue;
    const at = mapToCutOrNext(cue.start, keepSegments);
    if (at === null) continue; // after the end of the cut
    const groups = cue.groups || [];
    const text = (cue.type === 'lower-third' ? groups.join(', ') : groups[groups.length - 1]) || cue.match;
    items.push({ type: cue.type, inT: Math.max(0, at), text });
  }
  items.sort((a, b) => a.inT - b.inT);
  items.forEach((it, i) => {
    const next = items[i + 1];
    it.outT = Math.min(duration - 0.1, it.inT + hold, next ? next.inT - 0.3 : Infinity);
  });
  return items.filter((it) => it.outT - it.inT > 0.8);
}

export async function runEnrich({ project, layout = 'talking-head', render = false, force = false }, cfg) {
  const projectPath = resolveProjectPath(cfg.projectsRoot, project);
  const rough = join(projectPath, '2-assemble', 'rough.mp4');
  if (!existsSync(rough)) throw new Error(`no 2-assemble/rough.mp4. Run \`vp assemble ${project}\` first.`);
  if (layout !== 'talking-head') {
    throw new Error(`layout "${layout}" is on the roadmap. v0.1 ships the talking-head layout.`);
  }

  const dir = join(projectPath, '3-enrich');
  mkdirSync(dir, { recursive: true });
  const indexPath = join(dir, 'index.html');
  const info = await probe(rough);
  const duration = Number(info.duration.toFixed(2));

  if (existsSync(indexPath) && !force) {
    console.log(kleur.yellow('  • 3-enrich/index.html already exists — leaving your composition alone'));
  } else {
    // Video-only copy with a keyframe every second (smooth scrubbing in the
    // HyperFrames preview) and the audio split out without re-encoding.
    console.log(kleur.cyan('  • preparing media for HyperFrames...'));
    await ffmpeg(['-i', rough, '-an', '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast', '-g', '30', '-keyint_min', '30',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(dir, 'talking-head.mp4')]);
    if (info.hasAudio) await ffmpeg(['-i', rough, '-vn', '-c:a', 'copy', join(dir, 'talking-head-audio.m4a')]);

    const plan = JSON.parse(readFileSync(join(projectPath, '2-assemble', 'cut-plan.json'), 'utf8'));
    const cuesPath = join(projectPath, '1-log', 'cues.json');
    const cues = existsSync(cuesPath) ? JSON.parse(readFileSync(cuesPath, 'utf8')) : [];
    const overlays = buildOverlays(cues, plan.keepSegments, duration);

    const template = readFileSync(resolve(__dirname, '..', '..', 'layouts', layout, 'composition.html'), 'utf8');
    const overlayHtml = overlays.map((o, i) =>
      `    <div id="callout-${i + 1}" class="callout"><div class="kicker">${LABELS[o.type] || 'Note'}</div><div class="body">${esc(o.text)}</div></div>`).join('\n');
    const timeline = overlays.map((o, i) =>
      `    callout("#callout-${i + 1}", ${o.inT.toFixed(2)}, ${o.outT.toFixed(2)});`).join('\n');
    writeFileSync(indexPath, template
      .replaceAll('{{DURATION}}', String(duration))
      .replace('<!--GOOBS:OVERLAYS-->', overlayHtml)
      .replace('/*GOOBS:TIMELINE*/', timeline));

    const hf = `HYPERFRAMES_NO_TELEMETRY=1 npx --yes hyperframes@${HYPERFRAMES_VERSION}`;
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      name: `${project.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}-enrich`,
      private: true,
      type: 'module',
      scripts: {
        dev: `${hf} preview --port 3017`,
        check: `${hf} lint && ${hf} validate && ${hf} inspect`,
        render: `${hf} render --output enriched.mp4`,
      },
    }, null, 2));
    writeFileSync(join(dir, 'hyperframes.json'), JSON.stringify({
      $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json',
      paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' },
    }, null, 2));
    writeFileSync(join(dir, 'DESIGN.md'), designDoc());
    console.log(kleur.green(`  ✓ 3-enrich/index.html (${layout}, ${overlays.length} callouts from cues), DESIGN.md, package.json`));
  }

  if (!render) {
    console.log(kleur.bold('\n  Next:'));
    console.log(kleur.gray(`    cd ${join('hangar', project, '3-enrich')} && npm run dev     # live preview in the HyperFrames studio`));
    console.log(kleur.gray('    Ask your agent (Claude Code, Codex) to design the scenes with the HyperFrames skills.'));
    console.log(kleur.gray(`    Then: vp enrich ${project} --render   → 3-enrich/enriched.mp4, picked up by polish and render`));
    return;
  }

  console.log(kleur.cyan(`  • rendering with hyperframes@${HYPERFRAMES_VERSION} (needs Node 22+, downloads a headless browser the first time)...`));
  const t0 = Date.now();
  const r = await execa('npx', ['--yes', `hyperframes@${HYPERFRAMES_VERSION}`, 'render', '--output', 'enriched.mp4'], {
    // Goobs is private by default: switch off HyperFrames' anonymous usage telemetry.
    cwd: dir, reject: false, all: true, env: { ...process.env, CI: '1', HYPERFRAMES_NO_TELEMETRY: '1' },
  });
  writeFileSync(join(dir, 'render.log'), r.all || '');
  if (r.exitCode !== 0 || !existsSync(join(dir, 'enriched.mp4'))) {
    const tail = (r.all || '').split('\n').slice(-12).join('\n');
    throw new Error(`HyperFrames render failed (exit ${r.exitCode}). See 3-enrich/render.log\n${tail}`);
  }
  const out = await probe(join(dir, 'enriched.mp4'));
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(kleur.green(`  ✓ 3-enrich/enriched.mp4 (${out.width}x${out.height}, ${out.duration.toFixed(1)}s, rendered in ${secs}s)`));
  console.log(kleur.bold('\n  Next:'), kleur.gray(`vp polish ${project}`));
}

function designDoc() {
  return `# DESIGN.md

The look for this Goobs composition. HyperFrames agents read this file before
writing any HTML, so change it here first.

## Style Prompt
Warm, editorial and calm. The speaker is the hero. Graphics only appear when
they help an idea stick (Goobs rule: no visual glitter).

## Colors
- Ink \`#14110f\`: background and text on paper
- Paper \`#fbf7f0\`: callout cards
- Accent \`#e85d26\`: one accent only (rules, kickers, progress bar)

## Typography
- Archivo Black for short punchy lines
- Inter for labels and body text (both resolve automatically in HyperFrames)

## What NOT to Do
- No tiny text: nothing under 28px at 1080p
- No dev clutter: no timecodes, file names or scene numbers on screen
- No transitions between every sentence
- Never cover the speaker's face
`;
}
