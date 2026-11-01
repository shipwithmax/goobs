import kleur from 'kleur';
import { hasBinary } from './media.js';
import * as whisperCpp from './transcribers/whisper-cpp.js';

export async function runDoctor() {
  let ok = true;
  const line = (pass, label, hint) => {
    console.log(`  ${pass ? kleur.green('✓') : kleur.red('✗')} ${label}`);
    if (!pass && hint) console.log(kleur.gray(`      ${hint}`));
    if (!pass) ok = false;
  };

  const major = Number(process.versions.node.split('.')[0]);
  line(major >= 20, `Node.js ${process.versions.node} (need 20+)`, 'Install Node.js 20 or newer.');
  line(await hasBinary('ffmpeg'), 'ffmpeg', 'macOS: brew install ffmpeg · Linux: apt install ffmpeg');
  line(await hasBinary('ffprobe'), 'ffprobe', 'Ships with FFmpeg.');
  line(await whisperCpp.isAvailable(), `whisper.cpp (${whisperCpp.binary()})`,
    'macOS: brew install whisper-cpp · Linux: build github.com/ggml-org/whisper.cpp, or set WHISPER_CPP_BIN');

  const modelName = process.env.WHISPER_MODEL || 'small.en';
  const model = await whisperCpp.resolveModel(modelName, { download: false }).catch(() => null);
  if (model) {
    console.log(`  ${kleur.green('✓')} Whisper model ${modelName} → ${model}`);
  } else {
    console.log(`  ${kleur.yellow('•')} Whisper model ${modelName} not downloaded yet (first \`vp log\` fetches it, about 490 MB for small.en)`);
  }

  console.log(kleur.gray(`\n  Optional, for \`vp enrich\`: HyperFrames needs Node 22+ (you have ${process.versions.node}).`));
  console.log(ok ? kleur.green('\n  Ready. Try: npm run sample && ./bin/vp run sample-clip\n') : kleur.red('\n  Fix the items above, then run vp doctor again.\n'));
  if (!ok) process.exitCode = 1;
}
