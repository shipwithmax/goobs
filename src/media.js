// Small FFmpeg / ffprobe helpers shared by the stages.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execa } from 'execa';

export const SOURCE_NAMES = ['source.mp4', 'source.mov', 'source.m4v', 'source.mkv', 'source.webm'];

// Find the raw recording in a project folder. Any of SOURCE_NAMES works.
export function findSource(projectPath) {
  for (const name of SOURCE_NAMES) {
    const p = join(projectPath, name);
    if (existsSync(p)) return p;
  }
  return null;
}

export async function hasBinary(name) {
  try {
    await execa(name, ['-version'], { reject: false, timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

export async function requireBinary(name, hint) {
  if (await hasBinary(name)) return true;
  const err = new Error(`${name} not found on PATH. ${hint || ''}`.trim());
  err.code = 'GOOBS_MISSING_BINARY';
  throw err;
}

// Duration (seconds), video size and whether there is an audio stream.
export async function probe(file) {
  const { stdout } = await execa('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration:stream=codec_type,width,height',
    '-of', 'json',
    file,
  ]);
  const data = JSON.parse(stdout);
  const streams = data.streams || [];
  const video = streams.find((s) => s.codec_type === 'video');
  return {
    duration: Number(data.format?.duration || 0),
    width: video?.width || 0,
    height: video?.height || 0,
    hasVideo: Boolean(video),
    hasAudio: streams.some((s) => s.codec_type === 'audio'),
  };
}

// Run ffmpeg and keep its noisy stderr in a log file instead of the terminal.
export async function ffmpeg(args, { logFile } = {}) {
  const result = await execa('ffmpeg', ['-hide_banner', '-y', ...args], { reject: false, all: true });
  if (logFile) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(logFile, result.all || '');
  }
  if (result.exitCode !== 0) {
    const tail = (result.all || '').split('\n').slice(-12).join('\n');
    throw new Error(`ffmpeg failed (exit ${result.exitCode}).\n${tail}`);
  }
  return result;
}

// Silences longer than `minDuration` seconds, via ffmpeg silencedetect.
export async function detectSilences(file, { noise = '-30dB', minDuration = 0.5 } = {}) {
  const result = await execa('ffmpeg', [
    '-hide_banner', '-nostats', '-i', file,
    '-af', `silencedetect=noise=${noise}:d=${minDuration}`,
    '-f', 'null', '-',
  ], { reject: false, all: true });
  const silences = [];
  let start = null;
  for (const line of (result.all || '').split('\n')) {
    const s = line.match(/silence_start:\s*(-?[\d.]+)/);
    if (s) start = Math.max(0, Number(s[1]));
    const e = line.match(/silence_end:\s*([\d.]+)/);
    if (e && start !== null) {
      silences.push({ start, end: Number(e[1]) });
      start = null;
    }
  }
  return silences;
}

export function round(n, places = 3) {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

export function srtTime(seconds) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(r, 3)}`;
}
