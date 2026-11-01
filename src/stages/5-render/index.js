import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import kleur from 'kleur';
import { resolveProjectPath } from '../../config.js';
import { ffmpeg, probe } from '../../media.js';

// Each format: output size and the crop that gets there. `focus` (0..1) is
// where the crop sits horizontally: 0.5 keeps a centred speaker centred.
const FORMATS = {
  horizontal: () => 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1',
  vertical: (focus) => `crop=w='min(iw,ih*9/16)':h='min(ih,iw*16/9)':x='(iw-ow)*${focus}':y='(ih-oh)/2',scale=1080:1920,setsar=1`,
  square: (focus) => `crop=w='min(iw,ih)':h='min(iw,ih)':x='(iw-ow)*${focus}':y='(ih-oh)/2',scale=1080:1080,setsar=1`,
};

export async function runRender({ project, formats = 'horizontal,vertical,square', focus = '0.5' }, cfg) {
  const projectPath = resolveProjectPath(cfg.projectsRoot, project);
  const input = [
    join(projectPath, '4-polish', 'fine.mp4'),
    join(projectPath, '3-enrich', 'enriched.mp4'),
    join(projectPath, '2-assemble', 'rough.mp4'),
  ].find((p) => existsSync(p));
  if (!input) throw new Error(`nothing to render. Run \`vp assemble ${project}\` first.`);

  const wanted = String(formats).split(',').map((f) => f.trim()).filter(Boolean);
  const unknown = wanted.filter((f) => !FORMATS[f]);
  if (unknown.length) throw new Error(`unknown format(s): ${unknown.join(', ')}. Use horizontal, vertical, square.`);
  const f = Math.min(1, Math.max(0, Number(focus)));

  const outDir = join(projectPath, '5-render', 'masters');
  mkdirSync(outDir, { recursive: true });
  const info = await probe(input);
  console.log(kleur.cyan(`  • rendering from ${relative(projectPath, input)} (${info.width}x${info.height}, ${info.duration.toFixed(1)}s)`));

  for (const name of wanted) {
    const out = join(outDir, `${name}.mp4`);
    await ffmpeg([
      '-i', input,
      '-vf', FORMATS[name](f),
      '-c:v', 'libx264', '-crf', '19', '-preset', 'fast', '-pix_fmt', 'yuv420p',
      ...(info.hasAudio ? ['-c:a', 'copy'] : []),
      '-movflags', '+faststart',
      out,
    ], { logFile: join(projectPath, '5-render', `render-${name}.log`) });
    const o = await probe(out);
    console.log(kleur.green(`  ✓ masters/${name}.mp4  ${o.width}x${o.height}, ${o.duration.toFixed(1)}s${o.hasAudio ? ', audio' : ''}`));
  }

  const srt = join(projectPath, '2-assemble', 'rough.srt');
  if (existsSync(srt)) {
    copyFileSync(srt, join(outDir, 'captions.srt'));
    console.log(kleur.green('  ✓ masters/captions.srt (upload it as a caption track)'));
  }
  console.log(kleur.bold('\n  Done.'), kleur.gray(`Your files are in ${relative(process.cwd(), outDir) || outDir}/`));
}
