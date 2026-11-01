import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import kleur from 'kleur';
import { resolveProjectPath } from '../../config.js';
import { transcribe } from '../../transcribers/index.js';
import { extractCues } from './director-patterns.js';
import { DEFAULTS, refineWords } from '../../timeline.js';
import { detectSilences, findSource, probe, requireBinary, SOURCE_NAMES } from '../../media.js';

export async function runLog({ project, transcriber: override }, cfg) {
  const projectPath = resolveProjectPath(cfg.projectsRoot, project);
  if (!existsSync(projectPath)) {
    throw new Error(`project not found: ${projectPath}\n    Run \`vp plan ${project}\` first, or create the folder and drop your recording in it.`);
  }

  const sourcePath = findSource(projectPath);
  if (!sourcePath) {
    throw new Error(`no recording in ${project}/. Save it as one of: ${SOURCE_NAMES.join(', ')}`);
  }

  await requireBinary('ffmpeg', 'Install FFmpeg (macOS: brew install ffmpeg).');
  const logDir = join(projectPath, '1-log');
  mkdirSync(logDir, { recursive: true });

  const info = await probe(sourcePath);
  if (!info.hasAudio) throw new Error(`${relative(projectPath, sourcePath)} has no audio track to transcribe.`);
  console.log(kleur.gray(`    source: ${relative(projectPath, sourcePath)} (${info.duration.toFixed(1)}s, ${info.width}x${info.height})`));

  const engine = override || cfg.transcriber;
  console.log(kleur.cyan(`  • transcribing locally with ${engine}...`));
  const t0 = Date.now();
  const transcript = await transcribe(sourcePath, engine, cfg, { workDir: logDir });
  transcript.source = relative(projectPath, sourcePath);
  transcript.duration = info.duration;
  const secs = ((Date.now() - t0) / 1000).toFixed(1);

  // Pauses: used to tighten dead air, to snap cuts into silence, and to
  // clean up Whisper's word timings.
  const silences = await detectSilences(sourcePath, { minDuration: 0.2 });
  writeFileSync(join(logDir, 'silences.json'), JSON.stringify(silences, null, 2));
  transcript.words = refineWords(transcript.words, silences);

  writeFileSync(join(logDir, 'transcript.json'), JSON.stringify(transcript, null, 2));
  if (existsSync(join(logDir, 'whisper.srt'))) renameSync(join(logDir, 'whisper.srt'), join(logDir, 'transcript.srt'));
  writeFileSync(join(logDir, 'transcript.md'), transcriptMarkdown(transcript));
  console.log(kleur.green(`  ✓ transcript.json, transcript.md, transcript.srt (${transcript.words.length} words in ${secs}s)`));

  const cues = extractCues(transcript);
  writeFileSync(join(logDir, 'cues.json'), JSON.stringify(cues, null, 2));
  console.log(kleur.green(`  ✓ cues.json (${cues.length} director cues)`));

  const longPauses = silences.filter((s) => s.end - s.start > DEFAULTS.maxPause).length;
  const fillers = transcript.words.filter((w) => DEFAULTS.fillers.includes(w.word.toLowerCase().replace(/[^a-z']/g, '')));
  console.log(kleur.green(`  ✓ silences.json (${silences.length} pauses, ${longPauses} longer than ${DEFAULTS.maxPause}s)`));
  if (fillers.length) console.log(kleur.gray(`    ${fillers.length} filler words flagged (${[...new Set(fillers.map((f) => f.word))].join(', ')})`));

  if (cues.length > 0) {
    console.log(kleur.bold('\n  Cues found:'));
    for (const cue of cues.slice(0, 10)) {
      console.log(kleur.gray(`    [${formatTime(cue.start)}] ${cue.type}: ${cue.match}`));
    }
    if (cues.length > 10) console.log(kleur.gray(`    ...and ${cues.length - 10} more.`));
  }

  console.log(kleur.bold('\n  Next:'), kleur.gray(`read 1-log/transcript.md, then vp assemble ${project}`));
}

function transcriptMarkdown(t) {
  const lines = ['# Transcript', '', `Source: \`${t.source}\` · engine: ${t.engine}${t.model ? ` (${t.model})` : ''}`, ''];
  for (const seg of t.segments || []) lines.push(`**[${formatTime(seg.start)}]** ${seg.text}`, '');
  return lines.join('\n');
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
