#!/usr/bin/env node
// Builds a synthetic sample recording so you can try Goobs without your own
// footage: a text-to-speech voice (macOS `say`, or espeak-ng on Linux) over
// FFmpeg's test pattern, with a few flubs and director cues baked in.
//
//   npm run sample            → hangar/sample-clip/source.mp4
//   npm run sample -- my-dir  → <my-dir>/source.mp4
//
// Nothing here is real footage, so the output is safe to share and delete.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { execa } from 'execa';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(process.argv[2] || join(repoRoot, 'hangar', 'sample-clip'));

// [line, seconds of silence after it]
const SCRIPT = [
  ['Hi, this is the Goobs sample clip.', 0.6],
  ['Goobs cuts the radio version first, so the story works with your eyes closed.', 0.7],
  ['Rule two is to add a flashy transition between every single sentence.', 0.5],
  ['Scratch that.', 0.8],
  ['Rule two is to keep the edit invisible, so people feel it instead of noticing it.', 2.6],
  ['Editor, keep this.', 0.5],
  ['Rule three. Visuals should help the idea stick, not fill space.', 0.7],
  ['Imagine a chart showing the runtime getting shorter with every cut.', 0.6],
  ['Thanks for watching.', 0.4],
];

async function tts(text, wavPath, work) {
  if (process.platform === 'darwin') {
    const aiff = join(work, 'line.aiff');
    await execa('say', ['-o', aiff, text]);
    await execa('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', aiff, '-ar', '48000', '-ac', '1', wavPath]);
    return;
  }
  for (const bin of ['espeak-ng', 'espeak']) {
    try {
      await execa(bin, ['-w', join(work, 'line.wav'), text]);
      await execa('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', join(work, 'line.wav'), '-ar', '48000', '-ac', '1', wavPath]);
      return;
    } catch { /* try the next one */ }
  }
  throw new Error('No text-to-speech found. On Linux: sudo apt install espeak-ng');
}

async function main() {
  const work = join(tmpdir(), `goobs-sample-${process.pid}`);
  mkdirSync(work, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  const parts = [];
  let i = 0;
  for (const [line, pause] of SCRIPT) {
    const speech = join(work, `s${i}.wav`);
    await tts(line, speech, work);
    const gap = join(work, `g${i}.wav`);
    await execa('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', String(pause), gap]);
    parts.push(speech, gap);
    i++;
  }
  // One second of room tone up front, like a real recording.
  const lead = join(work, 'lead.wav');
  await execa('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', '1', lead]);
  const list = join(work, 'list.txt');
  writeFileSync(list, [lead, ...parts].map((p) => `file '${p}'`).join('\n'));
  const audio = join(work, 'voice.wav');
  await execa('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', audio]);

  const out = join(outDir, 'source.mp4');
  // `testsrc` shows a running clock, so you can see exactly where Goobs cut.
  await execa('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'testsrc=size=1280x720:rate=30',
    '-i', audio,
    '-shortest', '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out,
  ]);
  rmSync(work, { recursive: true, force: true });
  console.log(`Sample recording written to ${out}`);
  console.log('Next: ./bin/vp log sample-clip');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

