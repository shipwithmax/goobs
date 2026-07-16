/**
 * ElevenLabs Scribe — cloud transcription.
 *
 * Multilingual, emotion tags, strong on accents. Set ELEVENLABS_API_KEY
 * in .env. The same key unlocks voice cloning, SFX/music, and audio
 * cleanup in stages 3 and 4.
 */

export async function isAvailable(cfg) {
  return Boolean(cfg.keys.elevenlabs);
}

export async function run(_sourcePath, _cfg) {
  // TODO(phase-2): POST to ElevenLabs Scribe endpoint with timestamp granularity.
  throw new Error('elevenlabs-scribe: is not implemented yet.');
}
