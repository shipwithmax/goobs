import * as whisperCpp from './whisper-cpp.js';
import * as parakeet from './parakeet-local.js';
import * as fasterWhisper from './faster-whisper.js';
import * as whisperCloud from './whisper-cloud.js';
import * as elevenlabs from './elevenlabs-scribe.js';
import * as deepgram from './deepgram.js';
import kleur from 'kleur';

export const ENGINES = {
  'whisper-cpp': whisperCpp,
  // Adapters below are planned (see README roadmap). They are skipped until implemented.
  'parakeet-local': parakeet,
  'faster-whisper': fasterWhisper,
  'whisper-cloud': whisperCloud,
  'elevenlabs-scribe': elevenlabs,
  'deepgram': deepgram,
};

export async function transcribe(sourcePath, preferredEngine, cfg, opts = {}) {
  let engine = preferredEngine || 'whisper-cpp';
  let impl = ENGINES[engine];
  if (!impl) {
    throw new Error(`unknown transcriber: ${engine}. Available: ${Object.keys(ENGINES).join(', ')}`);
  }
  if (!impl.implemented) {
    console.log(kleur.yellow(`  ⚠ ${engine} is on the roadmap but not implemented yet. Using whisper-cpp.`));
    engine = 'whisper-cpp';
    impl = ENGINES[engine];
  }
  if (!(await impl.isAvailable(cfg))) {
    throw new Error(
      `${engine} is not available. Install whisper.cpp (macOS: brew install whisper-cpp) ` +
      'so `whisper-cli` is on your PATH, then run `vp doctor`.',
    );
  }
  return impl.run(sourcePath, cfg, opts);
}
