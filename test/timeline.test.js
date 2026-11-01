import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCaptions, concatFilter, mapToCut, planCuts, refineWords } from '../src/timeline.js';
import { extractCues } from '../src/stages/1-log/director-patterns.js';
import { parseWhisperJson, dtwPreset } from '../src/transcribers/whisper-cpp.js';

// Build words for sentences laid out on a clock: each word 0.3 s, 0.1 s
// apart, with a given pause after each sentence. Returns words + silences.
function speak(sentences, { lead = 1 } = {}) {
  const words = [];
  const silences = [{ start: 0, end: lead }];
  let t = lead;
  for (const [text, pause] of sentences) {
    for (const w of text.split(' ')) {
      words.push({ word: w, start: t, end: t + 0.3 });
      t += 0.4;
    }
    silences.push({ start: t - 0.1, end: t - 0.1 + pause });
    t += pause;
  }
  return { words, silences, duration: t };
}

const kept = (plan, words) => words.filter((w) => mapToCut((w.start + w.end) / 2, plan.keepSegments) !== null).map((w) => w.word).join(' ');

test('"scratch that" drops the sentence before it and keeps the rest', () => {
  const { words, silences, duration } = speak([
    ['Rule two is wrong.', 0.5],
    ['Scratch that.', 0.5],
    ['Rule two is right.', 0.5],
  ]);
  const cues = extractCues({ words });
  const plan = planCuts({ duration, words, cues, silences });
  assert.equal(kept(plan, words), 'Rule two is right.');
});

test('a restart in the first 30 seconds drops the false start', () => {
  const { words, silences, duration } = speak([
    ['Do you ever feel stuck?', 0.4],
    ['Oh I can hear myself.', 0.4],
    ["Let's restart.", 0.8],
    ['When you talk to AI it forgets you.', 0.5],
  ]);
  const plan = planCuts({ duration, words, cues: extractCues({ words }), silences });
  assert.equal(kept(plan, words), 'When you talk to AI it forgets you.');
});

test('content cues stay, spoken directions and fillers go', () => {
  const { words, silences, duration } = speak([
    ["Here's the key point.", 0.5],
    ['Editor, keep this.', 0.5],
    ['Stories beat um glitter.', 0.5],
  ]);
  const plan = planCuts({ duration, words, cues: extractCues({ words }), silences });
  assert.equal(kept(plan, words), "Here's the key point. Stories beat glitter.");
});

test('long pauses are tightened, short ones are left alone', () => {
  const { words, silences, duration } = speak([
    ['One.', 0.6],
    ['Two.', 3.0],
    ['Three.', 0.5],
  ]);
  const plan = planCuts({ duration, words, cues: [], silences });
  const pauseCuts = plan.cutRanges.filter((c) => c.reason.includes('pause'));
  assert.equal(pauseCuts.length, 1);
  assert.ok(plan.finalDuration < duration - 2);
  assert.equal(kept(plan, words), 'One. Two. Three.');
});

test('mapToCut and captions follow the cut timeline', () => {
  const keepSegments = [{ startOrig: 0, endOrig: 2 }, { startOrig: 5, endOrig: 7 }];
  assert.equal(mapToCut(1, keepSegments), 1);
  assert.equal(mapToCut(3, keepSegments), null);
  assert.equal(mapToCut(6, keepSegments), 3);
  const words = [
    { word: 'Hello', start: 0.2, end: 0.6 },
    { word: 'gone.', start: 3, end: 3.4 },
    { word: 'World.', start: 5.2, end: 5.6 },
  ];
  const caps = buildCaptions(words, keepSegments);
  assert.deepEqual(caps.map((c) => c.text), ['Hello', 'World.']);
  assert.ok(Math.abs(caps[1].start - 2.2) < 0.001);
  assert.match(concatFilter(keepSegments), /concat=n=2:v=1:a=1\[v\]\[a\]$/);
});

test('refineWords pulls word edges out of silence', () => {
  const words = [
    { word: 'it.', start: 20.1, end: 20.4 }, // starts just inside a pause: tail of the phrase before
    { word: 'Next', start: 22.7, end: 23.1 }, // starts late in the pause: opens the next phrase
  ];
  const out = refineWords(words, [{ start: 20.0, end: 23.0 }]);
  assert.ok(out[0].end <= 20.0);
  assert.equal(out[1].start, 23.0);
});

test('parseWhisperJson glues sub-word tokens and skips timing tokens', () => {
  const data = {
    transcription: [
      { offsets: { from: 0, to: 1000 }, text: ' [BLANK_AUDIO]', tokens: [] },
      {
        offsets: { from: 1000, to: 3000 },
        text: ' Goobs cuts.',
        tokens: [
          { text: '[_BEG_]', offsets: { from: 1000, to: 1000 } },
          { text: ' Go', offsets: { from: 1000, to: 1200 } },
          { text: 'obs', offsets: { from: 1200, to: 1500 } },
          { text: ' cuts', offsets: { from: 1600, to: 2000 } },
          { text: '.', offsets: { from: 2000, to: 2000 } },
          { text: '[_TT_150]', offsets: { from: 3000, to: 3000 } },
        ],
      },
    ],
  };
  const t = parseWhisperJson(data);
  assert.deepEqual(t.words.map((w) => w.word), ['Goobs', 'cuts.']);
  assert.equal(t.segments.length, 1);
  assert.equal(t.words[0].start, 1);
  assert.equal(t.words[0].end, 1.5);
  assert.equal(dtwPreset('small.en'), 'small.en');
  assert.equal(dtwPreset('large-v3-turbo'), 'large.v3.turbo');
  assert.equal(dtwPreset('/models/custom.bin'), null);
});
