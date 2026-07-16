/**
 * OpenAI Whisper API — cloud transcription.
 *
 * No local install. Pay-per-minute (~$0.006/min). Fast, accurate.
 * Set OPENAI_API_KEY in .env.
 */

export async function isAvailable(cfg) {
  return Boolean(cfg.keys.openai);
}

export async function run(_sourcePath, _cfg) {
  // TODO(phase-2): POST sourcePath to /v1/audio/transcriptions with
  //   response_format=verbose_json, timestamp_granularities=['word'].
  //   Map words[].word/start/end into our schema.
  throw new Error('whisper-cloud: is not implemented yet.');
}
