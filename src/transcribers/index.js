import * as parakeet from './parakeet-local.js';
import * as fasterWhisper from './faster-whisper.js';
import * as whisperCloud from './whisper-cloud.js';
import * as elevenlabs from './elevenlabs-scribe.js';
import * as deepgram from './deepgram.js';
import kleur from 'kleur';

const ENGINES = {
  'parakeet-local': parakeet,
  'faster-whisper': fasterWhisper,
  'whisper-cloud': whisperCloud,
  'elevenlabs-scribe': elevenlabs,
  'deepgram': deepgram,
};

const FALLBACK_ORDER = ['parakeet-local', 'faster-whisper', 'whisper-cloud', 'elevenlabs-scribe', 'deepgram'];

export async function transcribe(sourcePath, preferredEngine, cfg) {
  const tried = [];
  let engine = preferredEngine;

  // Try preferred → fall back through the list if installation/config is missing
  while (engine) {
    const impl = ENGINES[engine];
    if (!impl) {
      console.log(kleur.red(`  ✗ unknown transcriber: ${engine}`));
      return emptyTranscript();
    }
    tried.push(engine);

    const ok = await impl.isAvailable(cfg);
    if (ok) {
      try {
        return await impl.run(sourcePath, cfg);
      } catch (err) {
        console.log(kleur.yellow(`  ⚠ ${engine} threw: ${err.message}`));
      }
    } else {
      console.log(kleur.yellow(`  ⚠ ${engine} not available — falling through.`));
    }

    engine = nextFallback(tried);
  }

  console.log(kleur.red(`  ✗ no transcriber available. See docs/for-creators.md for setup.`));
  return emptyTranscript();
}

function nextFallback(tried) {
  return FALLBACK_ORDER.find((e) => !tried.includes(e));
}

function emptyTranscript() {
  return { text: '', words: [], engine: null };
}
