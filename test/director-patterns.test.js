import test from 'node:test';
import assert from 'node:assert/strict';

import { extractCues } from '../src/stages/1-log/director-patterns.js';

function transcript(text) {
  let time = 0;
  return {
    text,
    words: text.split(/\s+/).map((word) => {
      const entry = { word, start: time, end: time + 0.4 };
      time += 0.5;
      return entry;
    }),
  };
}

test('extracts keep, visualization, and removal cues', () => {
  const cues = extractCues(transcript(
    'Editor, keep this. Imagine a bar chart showing revenue growth. Scratch that.',
  ));

  assert.ok(cues.some((cue) => cue.type === 'keep'));
  assert.ok(cues.some((cue) => cue.type === 'viz' && cue.vizKind === 'chart'));
  assert.ok(cues.some((cue) => cue.type === 'remove'));
});

test('returns cues in timestamp order', () => {
  const cues = extractCues(transcript(
    'Start over. Remember this. B-roll of the storefront.',
  ));

  assert.deepEqual(
    cues.map((cue) => cue.start),
    [...cues.map((cue) => cue.start)].sort((a, b) => a - b),
  );
});

test('handles transcripts without words or text', () => {
  assert.deepEqual(extractCues({}), []);
  const [cue] = extractCues({ text: 'Remember this.' });
  assert.equal(cue.type, 'keep');
  assert.equal(cue.start, 0);
  assert.equal(cue.end, 0);
});
