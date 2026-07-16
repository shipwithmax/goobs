/**
 * faster-whisper — Whisper via CTranslate2.
 *
 * Setup:
 *   pip install faster-whisper
 *
 * Multilingual. Lighter than Parakeet. Solid quality, slower than Parakeet
 * but still 4x faster than vanilla openai-whisper.
 */
import { execa } from 'execa';

export async function isAvailable() {
  try {
    await execa('python3', ['-c', 'import faster_whisper']);
    return true;
  } catch {
    return false;
  }
}

export async function run(_sourcePath, _cfg) {
  throw new Error('faster-whisper: is not implemented yet.');
}
