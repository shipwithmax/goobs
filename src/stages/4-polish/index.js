import kleur from 'kleur';

export async function runPolish({ project }, cfg) {
  console.log(kleur.cyan(`  • polishing ${project}...`));
  // TODO(phase-2):
  //   1. Audio: ffmpeg loudnorm filter to -16 LUFS (broadcast standard)
  //   2. Audio: dynamic compression to keep voice consistent
  //   3. Color: simple LUT pass (we ship a default warm-neutral LUT)
  //   4. Transitions: detect cut boundaries from manifest.json, add 100ms crossfade
  //   5. ElevenLabs voice isolation pass if ELEVENLABS_API_KEY is set
  console.log(kleur.yellow(`  ⚠ stage 4 implementation lands during phase 2 dogfood.`));
  console.log(kleur.gray(`    Defaults will be: -16 LUFS audio, soft compression, warm LUT, 100ms crossfades.`));
  console.log(kleur.bold('\n  Next:'), kleur.gray(`vp render ${project}`));
}
