// Pure timeline helpers: cut planning, time remapping, captions.
// No I/O here, so it is easy to test (see test/timeline.test.js).
import { round, srtTime } from './media.js';

export const DEFAULTS = {
  maxPause: 1.0,          // pauses longer than this (seconds) get tightened
  keepPause: 0.25,        // ...down to this much air on each side
  leadIn: 0.3,            // air kept before the first word
  tail: 0.5,              // air kept after the last word
  wordGap: 0.12,          // never cut closer than this to a kept word
  sentencePause: 0.6,     // a pause this long counts as a sentence boundary
  falseStartWindow: 30,   // a restart cue this early drops everything before it
  minKeep: 0.2,           // keep slivers shorter than this are dropped
  fillers: ['um', 'uh', 'uhm', 'umm', 'erm', 'er', 'ah', 'hmm', 'mm'],
};

const norm = (w) => (w || '').toLowerCase().replace(/[^a-z']/g, '');
const endsSentence = (w) => /[.?!]["')\]]*$/.test(w || '');

/**
 * Whisper word timings drift by a few hundred milliseconds and tend to
 * stretch words across pauses. FFmpeg's silence detection is exact, so use
 * it to pull word edges out of silence: a word cannot start or end inside
 * a pause.
 */
export function refineWords(words, silences, { minSilence = 0.2 } = {}) {
  const sil = silences.filter((s) => s.end - s.start >= minSilence);
  const out = words.map((w) => ({ ...w }));
  for (const w of out) {
    for (const s of sil) {
      if (s.end <= w.start || s.start >= w.end) continue; // no overlap
      if (w.start >= s.start && w.start < s.end) {
        // Starts inside a pause. Nearer the pause's start: it is the tail of
        // the previous phrase. Nearer its end: it opens the next one.
        const len = Math.min(w.end - w.start, 0.4);
        if (w.start - s.start < s.end - w.start) {
          w.end = s.start;
          w.start = s.start - len;
        } else {
          w.start = s.end;
          if (w.end <= w.start) w.end = w.start + len;
        }
      } else if (w.end > s.start) {
        // Runs into (or across) a pause: it ended when the pause began.
        w.end = s.start;
      }
    }
  }
  for (let i = 1; i < out.length; i++) {
    if (out[i].start < out[i - 1].start) out[i].start = out[i - 1].start;
    if (out[i - 1].end > out[i].start && out[i - 1].end - out[i].start < 0.3) out[i - 1].end = Math.max(out[i - 1].start + 0.05, out[i].start);
  }
  for (const w of out) {
    w.start = round(w.start);
    w.end = round(Math.max(w.end, w.start + 0.05));
  }
  return out;
}

// Move a cut edge into the nearest pause, so cuts land in silence instead
// of clipping a word. The edge never moves past the bounds [lo, hi], which
// are set so it cannot swallow a whole kept word.
function snapToSilence(t, silences, side, lo = -Infinity, hi = Infinity, window = 0.6) {
  let best = null;
  let bestDist = Infinity;
  for (const s of silences) {
    if (s.end < lo || s.start > hi) continue;
    const dist = t < s.start ? s.start - t : t > s.end ? t - s.end : 0;
    if (dist < bestDist) { bestDist = dist; best = s; }
  }
  if (!best || bestDist > window) return t;
  const air = Math.min(0.06, (best.end - best.start) / 3);
  const snapped = side === 'start'
    ? Math.min(Math.max(t, best.start + air), best.end - 0.01)
    : Math.max(Math.min(t, best.end - air), best.start + 0.01);
  return Math.min(hi, Math.max(lo, snapped));
}

// Index range of the words a cue covers.
function wordSpan(words, cue) {
  let i0 = words.findIndex((w) => w.end > cue.start - 0.01);
  if (i0 < 0) return null;
  let i1 = i0;
  for (let i = i0; i < words.length; i++) {
    if (words[i].start < cue.end - 0.01) i1 = i; else break;
  }
  return [i0, i1];
}

// Walk back from word index i0 to the start of the sentence before it.
function sentenceStart(words, i0, opts) {
  let k = i0 - 1;
  if (k < 0) return i0;
  const limit = words[i0].start - 20; // never reach back more than 20 s
  while (k > 0) {
    const prev = words[k - 1];
    const gap = words[k].start - prev.end;
    if (endsSentence(prev.word) || gap >= opts.sentencePause || words[k].start < limit) break;
    k--;
  }
  return k;
}

// Range that removes words[s..e] plus the air around them, without
// touching the kept neighbours. Edges snap into nearby silence.
function rangeForWords(words, s, e, duration, opts, quiet = []) {
  const before = words[s - 1];
  const after = words[e + 1];
  let start = before ? before.end + opts.wordGap : Math.max(0, words[s].start - opts.leadIn);
  let end = after ? after.start - opts.wordGap : Math.min(duration, words[e].end + opts.tail);
  start = snapToSilence(start, quiet, 'start', before ? (before.start + before.end) / 2 : 0, words[s].end);
  end = snapToSilence(end, quiet, 'end', words[e].start, after ? (after.start + after.end) / 2 : duration);
  return start < end ? [start, end] : null;
}

/**
 * Build a first-pass cut plan. It follows the "radio version" rule: tighten
 * the spoken story (false starts, scratched takes, spoken directions to the
 * editor, filler words, dead air) and leave the content alone.
 */
export function planCuts({ duration, words = [], cues = [], silences = [] }, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const cuts = [];
  const quiet = silences.filter((sil) => sil.end - sil.start >= 0.15);
  const add = (range, reason) => {
    if (!range) return;
    const [start, end] = range;
    if (end - start > 0.04) cuts.push({ start: Math.max(0, start), end: Math.min(duration, end), reasons: [reason] });
  };

  if (words.length) {
    const first = words[0];
    const last = words[words.length - 1];
    if (first.start - opts.leadIn > opts.minKeep) add([0, snapToSilence(first.start - opts.leadIn, quiet, 'end', 0, first.start)], 'dead air before the first word');
    if (duration - (last.end + opts.tail) > opts.minKeep) add([snapToSilence(last.end + opts.tail, quiet, 'start', last.end, duration), duration], 'dead air after the last word');
  }

  for (const cue of cues) {
    if (!cue.direction) continue;
    const span = wordSpan(words, cue);
    if (!span) continue;
    let [s, e] = span;
    let reason = `spoken direction "${cue.match}"`;
    if (cue.type === 'restart' && cue.start < opts.falseStartWindow) {
      s = 0;
      reason = `false start, restarted with "${cue.match}"`;
    } else if (cue.type === 'remove' || cue.type === 'restart') {
      s = sentenceStart(words, s, opts);
      reason = `"${cue.match}" drops the sentence before it`;
    }
    add(rangeForWords(words, s, e, duration, opts, quiet), reason);
  }

  words.forEach((w, i) => {
    if (opts.fillers.includes(norm(w.word))) add(rangeForWords(words, i, i, duration, opts, quiet), `filler "${w.word}"`);
  });

  for (const sil of silences) {
    if (sil.end - sil.start > opts.maxPause) {
      add([sil.start + opts.keepPause, sil.end - opts.keepPause], `pause of ${(sil.end - sil.start).toFixed(1)}s tightened`);
    }
  }

  // Merge overlapping cuts, and swallow keep slivers too short to matter.
  cuts.sort((a, b) => a.start - b.start);
  const merged = [];
  for (const c of cuts) {
    const prev = merged[merged.length - 1];
    if (prev && c.start - prev.end < opts.minKeep) {
      prev.end = Math.max(prev.end, c.end);
      for (const r of c.reasons) if (!prev.reasons.includes(r)) prev.reasons.push(r);
    } else {
      merged.push({ ...c, reasons: [...c.reasons] });
    }
  }
  if (merged.length && merged[0].start < opts.minKeep) merged[0].start = 0;
  const lastCut = merged[merged.length - 1];
  if (lastCut && duration - lastCut.end < opts.minKeep) lastCut.end = duration;

  const keepSegments = [];
  let cursor = 0;
  for (const c of merged) {
    if (c.start > cursor) keepSegments.push({ startOrig: round(cursor), endOrig: round(c.start) });
    cursor = Math.max(cursor, c.end);
  }
  if (cursor < duration) keepSegments.push({ startOrig: round(cursor), endOrig: round(duration) });

  for (const seg of keepSegments) seg.covers = coverText(words, seg);

  const finalDuration = keepSegments.reduce((sum, s) => sum + (s.endOrig - s.startOrig), 0);
  return {
    sourceDuration: round(duration),
    finalDuration: round(finalDuration),
    keepSegments,
    cutRanges: merged.map((c) => ({ startOrig: round(c.start), endOrig: round(c.end), reason: c.reasons.join('; ') })),
    settings: Object.fromEntries(Object.entries(opts).filter(([k]) => k !== 'fillers')),
  };
}

function coverText(words, seg) {
  const inside = words.filter((w) => (w.start + w.end) / 2 >= seg.startOrig && (w.start + w.end) / 2 <= seg.endOrig);
  if (!inside.length) return '';
  const text = inside.map((w) => w.word);
  return text.length <= 14 ? text.join(' ') : `${text.slice(0, 8).join(' ')} … ${text.slice(-4).join(' ')}`;
}

// Map a time on the original recording to the cut timeline. Returns null
// when that moment was cut.
export function mapToCut(t, keepSegments) {
  let offset = 0;
  for (const seg of keepSegments) {
    if (t >= seg.startOrig && t <= seg.endOrig) return offset + (t - seg.startOrig);
    offset += seg.endOrig - seg.startOrig;
  }
  return null;
}

// Like mapToCut, but a moment that was cut maps to where the video picks
// up again. Used for overlays triggered by spoken directions, which are cut.
export function mapToCutOrNext(t, keepSegments) {
  let offset = 0;
  for (const seg of keepSegments) {
    if (t <= seg.endOrig) return offset + Math.max(0, t - seg.startOrig);
    offset += seg.endOrig - seg.startOrig;
  }
  return null;
}

// Group words into caption lines on the cut timeline.
export function buildCaptions(words, keepSegments, { maxChars = 42, maxDuration = 3.5 } = {}) {
  const captions = [];
  let cur = null;
  for (const w of words) {
    const start = mapToCut(w.start, keepSegments);
    const end = mapToCut(w.end, keepSegments);
    const mid = mapToCut((w.start + w.end) / 2, keepSegments);
    if (mid === null) continue; // word was cut
    const s = start ?? mid;
    const e = end ?? mid;
    const tooLong = cur && (cur.text.length + 1 + w.word.length > maxChars || e - cur.start > maxDuration);
    const gap = cur && s - cur.end > 0.6;
    if (!cur || tooLong || gap || cur.closed) {
      if (cur) captions.push(cur);
      cur = { start: s, end: e, text: w.word, closed: false };
    } else {
      cur.text += ` ${w.word}`;
      cur.end = e;
    }
    if (endsSentence(w.word)) cur.closed = true;
  }
  if (cur) captions.push(cur);
  return captions.map(({ start, end, text }) => ({ start: round(start), end: round(Math.max(end, start + 0.3)), text }));
}

export function toSrt(captions) {
  return captions
    .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`)
    .join('\n');
}

// ffmpeg filter graph that keeps `keepSegments` and joins them.
export function concatFilter(keepSegments, { hasAudio = true } = {}) {
  const parts = [];
  const labels = [];
  keepSegments.forEach((seg, i) => {
    const a = seg.startOrig.toFixed(3);
    const b = seg.endOrig.toFixed(3);
    parts.push(`[0:v]trim=start=${a}:end=${b},setpts=PTS-STARTPTS[v${i}]`);
    labels.push(`[v${i}]`);
    if (hasAudio) {
      parts.push(`[0:a]atrim=start=${a}:end=${b},asetpts=PTS-STARTPTS[a${i}]`);
      labels.push(`[a${i}]`);
    }
  });
  const n = keepSegments.length;
  parts.push(`${labels.join('')}concat=n=${n}:v=1:a=${hasAudio ? 1 : 0}[v]${hasAudio ? '[a]' : ''}`);
  return parts.join(';');
}
