/**
 * whisper.cpp — local Whisper, the default Goobs transcriber.
 *
 * Free, private (audio never leaves your machine) and fast on Apple Silicon
 * (Metal). Word timings come from whisper.cpp's DTW token alignment and are
 * then checked against FFmpeg silence detection in the Log stage.
 *
 * Setup:
 *   macOS:  brew install whisper-cpp          (gives you `whisper-cli`)
 *   Linux:  build https://github.com/ggml-org/whisper.cpp and put
 *           `whisper-cli` on your PATH (or set WHISPER_CPP_BIN).
 *
 * The model (default `small.en`, ~488 MB) downloads on first run to
 * ~/.cache/goobs/whisper/. Set WHISPER_MODEL to a model name
 * (tiny.en, base.en, small.en, medium.en, large-v3-turbo, ...) or to the
 * path of a ggml .bin file you already have.
 *
 * Note: Goobs calls `whisper-cli` by name on purpose. A `whisper` command
 * on your PATH is often OpenAI's Python package, which does not understand
 * whisper.cpp flags.
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, isAbsolute } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execa } from 'execa';
import kleur from 'kleur';
import { ffmpeg } from '../media.js';

export const implemented = true;

const MODEL_URL = (name) => `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${name}.bin`;

export function binary() {
  return process.env.WHISPER_CPP_BIN || 'whisper-cli';
}

export async function isAvailable() {
  try {
    const r = await execa(binary(), ['--help'], { reject: false, all: true, timeout: 20000 });
    return /whisper/i.test(r.all || '');
  } catch {
    return false;
  }
}

// Where a model would live, in the order we look.
export function modelCandidates(name) {
  if (name.endsWith('.bin') || isAbsolute(name)) return [name.replace(/^~/, homedir())];
  const file = `ggml-${name}.bin`;
  return [
    join(homedir(), '.cache', 'goobs', 'whisper', file),
    // Reuse a model HyperFrames already downloaded, if any.
    join(homedir(), '.cache', 'hyperframes', 'whisper', 'models', file),
  ];
}

export async function resolveModel(name, { download = true } = {}) {
  const candidates = modelCandidates(name);
  const found = candidates.find((p) => existsSync(p));
  if (found) return found;
  if (name.endsWith('.bin') || isAbsolute(name)) {
    throw new Error(`whisper model not found: ${candidates[0]}`);
  }
  if (!download) return null;

  const target = candidates[0];
  mkdirSync(join(homedir(), '.cache', 'goobs', 'whisper'), { recursive: true });
  const url = MODEL_URL(name);
  console.log(kleur.cyan(`  • downloading whisper model ${name} (one time)...`));
  console.log(kleur.gray(`    ${url}`));
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`model download failed: HTTP ${res.status} for ${url}`);
  const partial = `${target}.partial`;
  const total = Number(res.headers.get('content-length') || 0);
  let seen = 0;
  let lastPct = -10;
  const body = Readable.fromWeb(res.body);
  body.on('data', (chunk) => {
    seen += chunk.length;
    if (total) {
      const pct = Math.floor((seen / total) * 100);
      if (pct >= lastPct + 10) {
        lastPct = pct;
        process.stdout.write(kleur.gray(`    ${pct}% of ${(total / 1e6).toFixed(0)} MB\n`));
      }
    }
  });
  try {
    await pipeline(body, createWriteStream(partial));
  } catch (err) {
    rmSync(partial, { force: true });
    throw err;
  }
  renameSync(partial, target);
  console.log(kleur.green(`  ✓ model saved to ${target}`));
  return target;
}

// whisper.cpp models that have DTW alignment heads built in. DTW gives much
// better word timing than the default token offsets.
const DTW_PRESETS = new Set([
  'tiny', 'tiny.en', 'base', 'base.en', 'small', 'small.en', 'medium', 'medium.en',
  'large.v1', 'large.v2', 'large.v3', 'large.v3.turbo',
]);
export function dtwPreset(modelName) {
  const preset = String(modelName).replace(/^.*ggml-/, '').replace(/\.bin$/, '').replace(/-/g, '.');
  return DTW_PRESETS.has(preset) ? preset : null;
}

// Turn whisper.cpp `--output-json-full` into the Goobs transcript schema:
//   { text, words: [{word, start, end}], segments: [{start, end, text}] }
// With DTW, each token carries `t_dtw` (centiseconds), which lands a little
// after the spoken onset, so we shift it back by DTW_LEAD.
const DTW_LEAD = 0.2;
export function parseWhisperJson(data) {
  const words = [];
  const segments = [];
  for (const seg of data.transcription || []) {
    const segText = (seg.text || '').trim();
    if (!segText || /^[[(].*[\])]$/.test(segText)) continue; // [BLANK_AUDIO], (music)
    const segStart = (seg.offsets?.from ?? 0) / 1000;
    const segEnd = (seg.offsets?.to ?? 0) / 1000;
    segments.push({ start: segStart, end: segEnd, text: segText });
    for (const tok of seg.tokens || []) {
      const raw = tok.text || '';
      if (!raw || raw.startsWith('[_')) continue; // [_BEG_], [_TT_123] timing tokens
      const hasDtw = typeof tok.t_dtw === 'number' && tok.t_dtw >= 0;
      const start = hasDtw ? Math.max(0, tok.t_dtw / 100 - DTW_LEAD) : (tok.offsets?.from ?? 0) / 1000;
      const end = hasDtw ? null : (tok.offsets?.to ?? 0) / 1000;
      const last = words[words.length - 1];
      if (raw.startsWith(' ') || !last) {
        const word = raw.trim();
        if (word) words.push({ word, start, end, segEnd });
      } else {
        // Sub-word piece or trailing punctuation: glue to the previous word.
        last.word += raw;
        if (end !== null) last.end = Math.max(last.end ?? end, end);
      }
    }
  }
  // DTW only gives onsets. Estimate each end from the next onset and the
  // word length; Log then trims ends that run into detected silence.
  words.forEach((w, i) => {
    if (w.end === null) {
      const next = words[i + 1];
      const guess = w.start + 0.12 + 0.07 * w.word.length;
      w.end = Math.min(next ? next.start : guess, guess, Math.max(w.segEnd, w.start + 0.1));
    }
    w.end = Math.max(w.end, w.start + 0.05);
    delete w.segEnd;
  });
  return {
    text: segments.map((s) => s.text).join(' '),
    words,
    segments,
  };
}

export async function run(sourcePath, cfg, { workDir } = {}) {
  const modelName = process.env.WHISPER_MODEL || cfg?.whisperModel || 'small.en';
  const model = await resolveModel(modelName);
  const dir = workDir || '.';
  const wav = join(dir, 'audio-16k.wav');
  const outBase = join(dir, 'whisper');

  // whisper.cpp wants 16 kHz mono PCM.
  await ffmpeg(['-i', sourcePath, '-vn', '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);

  const args = [
    '-m', model,
    '-f', wav,
    '-l', process.env.WHISPER_LANGUAGE || 'en',
    '--output-json-full',
    '--output-srt',
    '--output-file', outBase,
    '--no-prints',
  ];
  const preset = dtwPreset(modelName);
  // DTW needs flash attention off in whisper.cpp.
  if (preset) args.push('--dtw', preset, '--no-flash-attn');
  const r = await execa(binary(), args, { reject: false, all: true });
  if (r.exitCode !== 0 || !existsSync(`${outBase}.json`)) {
    const tail = (r.all || '').split('\n').slice(-10).join('\n');
    throw new Error(`whisper-cli failed (exit ${r.exitCode}).\n${tail}`);
  }
  const data = JSON.parse(readFileSync(`${outBase}.json`, 'utf8'));
  const parsed = parseWhisperJson(data);
  rmSync(wav, { force: true });
  return { ...parsed, engine: 'whisper-cpp', model: modelName, timing: preset ? 'dtw' : 'token-offsets' };
}
