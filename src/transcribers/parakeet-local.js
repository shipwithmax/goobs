/**
 * NVIDIA Parakeet TDT 0.6B v2 — runs locally via NeMo.
 *
 * Setup (~10 min, ~5 GB disk):
 *   pip install nemo_toolkit['asr']
 *   python -c "from nemo.collections.asr.models import EncDecRNNTBPEModel; \
 *              EncDecRNNTBPEModel.from_pretrained('nvidia/parakeet-tdt-0.6b-v2')"
 *
 * The model downloads the first time, then runs offline forever.
 *
 * English-only. Word-level timestamps native. Faster than Whisper-large.
 */
import { execa } from 'execa';

export async function isAvailable() {
  try {
    await execa('python3', ['-c', 'import nemo.collections.asr']);
    return true;
  } catch {
    return false;
  }
}

export async function run(sourcePath, _cfg) {
  // TODO(phase-2): wrap a Python helper script that:
  //   1. Loads the model from cache
  //   2. Transcribes sourcePath with timestamps=True
  //   3. Emits JSON: { text, words: [{word, start, end}], engine: 'parakeet-local' }
  throw new Error('parakeet-local: is not implemented yet.');
}
