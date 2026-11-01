import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import kleur from 'kleur';
import { resolveProjectPath } from '../../config.js';
import { ffmpeg, findSource, probe } from '../../media.js';
import { buildCaptions, concatFilter, planCuts, toSrt } from '../../timeline.js';
import { transcribe } from '../../transcribers/index.js';

const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback);

export async function runAssemble({ project, replan = false, dryRun = false, maxPause, verify = false }, cfg) {
  const projectPath = resolveProjectPath(cfg.projectsRoot, project);
  const sourcePath = findSource(projectPath || '');
  if (!sourcePath) throw new Error(`no recording in ${project}/ (expected source.mp4 or source.mov).`);

  const logDir = join(projectPath, '1-log');
  const transcript = readJson(join(logDir, 'transcript.json'), null);
  if (!transcript) throw new Error(`no 1-log/transcript.json. Run \`vp log ${project}\` first.`);
  const cues = readJson(join(logDir, 'cues.json'), []);
  const silences = readJson(join(logDir, 'silences.json'), []);

  const dir = join(projectPath, '2-assemble');
  mkdirSync(dir, { recursive: true });
  const planPath = join(dir, 'cut-plan.json');
  const info = await probe(sourcePath);

  let plan;
  if (existsSync(planPath) && !replan) {
    plan = JSON.parse(readFileSync(planPath, 'utf8'));
    console.log(kleur.cyan('  • using your existing 2-assemble/cut-plan.json'));
    console.log(kleur.gray('    (edit it by hand or with your agent, or pass --replan to start over)'));
  } else {
    const options = maxPause ? { maxPause: Number(maxPause) } : {};
    plan = {
      status: 'planned',
      source: relative(dir, sourcePath),
      output: 'rough.mp4',
      transcript: '../1-log/transcript.json',
      ...planCuts({ duration: info.duration, words: transcript.words, cues, silences }, options),
    };
    console.log(kleur.cyan('  • first-pass cut plan (the radio version)'));
  }

  if (!plan.keepSegments?.length) throw new Error('cut plan keeps nothing. Check cut-plan.json.');

  for (const c of plan.cutRanges || []) {
    console.log(kleur.gray(`    cut ${fmt(c.startOrig)} → ${fmt(c.endOrig)}  ${c.reason || ''}`));
  }
  const removed = (plan.sourceDuration || info.duration) - plan.finalDuration;
  console.log(kleur.gray(`    ${plan.cutRanges?.length || 0} cuts, ${removed.toFixed(1)}s removed, ${fmt(plan.finalDuration)} left`));

  if (dryRun) {
    writeFileSync(planPath, JSON.stringify(plan, null, 2));
    console.log(kleur.green('  ✓ cut-plan.json written (dry run, no video encoded)'));
    return;
  }

  console.log(kleur.cyan('  • encoding rough.mp4 (frame-accurate, re-encoded at each splice)...'));
  await ffmpeg([
    '-i', sourcePath,
    '-filter_complex', concatFilter(plan.keepSegments, { hasAudio: info.hasAudio }),
    '-map', '[v]', ...(info.hasAudio ? ['-map', '[a]'] : []),
    '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
    ...(info.hasAudio ? ['-c:a', 'aac', '-b:a', '160k'] : []),
    '-movflags', '+faststart',
    join(dir, 'rough.mp4'),
  ], { logFile: join(dir, 'encode.log') });

  plan.status = 'applied';
  plan.encode = 'libx264 crf20 preset veryfast, aac 160k, +faststart';
  writeFileSync(planPath, JSON.stringify(plan, null, 2));

  const captions = buildCaptions(transcript.words, plan.keepSegments);
  writeFileSync(join(dir, 'rough.srt'), toSrt(captions));

  const out = await probe(join(dir, 'rough.mp4'));
  console.log(kleur.green(`  ✓ rough.mp4 (${fmt(out.duration)}), rough.srt (${captions.length} captions), cut-plan.json`));

  if (verify) {
    // Re-transcribe the cut and read it back: clipped words and missing
    // punchlines are easy to hear as text and invisible in timestamps.
    console.log(kleur.cyan('  • re-transcribing rough.mp4 to check the splices...'));
    const checkDir = join(dir, 'check');
    mkdirSync(checkDir, { recursive: true });
    const t = await transcribe(join(dir, 'rough.mp4'), cfg.transcriber, cfg, { workDir: checkDir });
    const lines = ['# Rough cut, re-transcribed', '', ...t.segments.map((s) => `**[${fmt(s.start)}]** ${s.text}`), ''];
    writeFileSync(join(dir, 'rough-transcript.md'), lines.join('\n'));
    console.log(kleur.green('  ✓ rough-transcript.md (read it end to end)'));
  }
  console.log(kleur.bold('\n  Next:'), kleur.gray(`watch 2-assemble/rough.mp4 first. Then vp enrich ${project} (optional) or vp render ${project}`));
}

function fmt(seconds) {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1).padStart(4, '0');
  return `${m}:${s}`;
}
