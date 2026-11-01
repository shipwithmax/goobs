/**
 * Deepgram — cloud transcription with best-in-class disfluency detection.
 *
 * Set DEEPGRAM_API_KEY in .env. Use this if filler-word accuracy is the
 * critical thing — Deepgram returns "uh"/"um"/"like" tokens flagged as
 * disfluencies natively.
 */

// Planned adapter: not implemented yet, so Goobs skips it (see README roadmap).
export const implemented = false;

export async function isAvailable(cfg) {
  return Boolean(cfg.keys.deepgram);
}

export async function run(_sourcePath, _cfg) {
  // TODO(phase-2): POST to Deepgram with smart_format=true, filler_words=true.
  throw new Error('deepgram: is not implemented yet.');
}
