import { Command } from 'commander';
import kleur from 'kleur';
import { loadConfig } from './config.js';
import { runInit } from './init.js';
import { runDoctor } from './doctor.js';
import { runPlan } from './stages/0-plan/index.js';
import { runLog } from './stages/1-log/index.js';
import { runAssemble } from './stages/2-assemble/index.js';
import { runEnrich } from './stages/3-enrich/index.js';
import { runPolish } from './stages/4-polish/index.js';
import { runRender } from './stages/5-render/index.js';
import { runSchedule } from './stages/6-schedule/index.js';

const banner = () => {
  console.log(kleur.cyan().bold('\n  ▲ Goobs'));
  console.log(kleur.gray('  ───────────────────────\n'));
};

// Every command: print the banner, load config, and turn errors into a
// readable message plus a non-zero exit code.
const action = (fn) => async (...args) => {
  banner();
  try {
    const cfg = await loadConfig();
    await fn(cfg, ...args);
  } catch (err) {
    console.log(kleur.red(`  ✗ ${err.message}`));
    process.exitCode = 1;
  }
};

export async function run(argv) {
  const program = new Command();

  program
    .name('vp')
    .description('Goobs — plan, transcribe, cut, render. Local-first video editing for people who talk for a living.')
    .version('0.1.0');

  program
    .command('init')
    .description('First-run setup. Writes .env and creates your projects folder.')
    .option('-y, --yes', 'accept the defaults without asking')
    .action(action((cfg, opts) => runInit(opts)));

  program
    .command('doctor')
    .description('Check that FFmpeg, whisper.cpp and a Whisper model are ready')
    .action(action((cfg) => runDoctor(cfg)));

  program
    .command('plan [project]')
    .description('Stage 0 — create a project with brief.md + a slides.html prompter')
    .option('-t, --topic <topic>', 'topic or angle for the video')
    .action(action((cfg, project, opts) => runPlan({ project, ...opts }, cfg)));

  program
    .command('log <project>')
    .description('Stage 1 — transcribe locally, extract director cues, find pauses')
    .option('--transcriber <name>', 'override TRANSCRIBER from .env')
    .action(action((cfg, project, opts) => runLog({ project, ...opts }, cfg)));

  program
    .command('assemble <project>')
    .description('Stage 2 — rough cut: write cut-plan.json, then encode rough.mp4 + rough.srt')
    .option('--replan', 'ignore an existing cut-plan.json and plan again')
    .option('--dry-run', 'write cut-plan.json without encoding video')
    .option('--max-pause <seconds>', 'tighten pauses longer than this (default 1.0)')
    .option('--verify', 're-transcribe rough.mp4 into rough-transcript.md to check the splices')
    .action(action((cfg, project, opts) => runAssemble({ project, ...opts }, cfg)));

  program
    .command('enrich <project>')
    .description('Stage 3 — set up a HyperFrames project for motion graphics (beta)')
    .option('-l, --layout <name>', 'talking-head (default)')
    .option('--render', 'also render 3-enrich/enriched.mp4 with HyperFrames')
    .option('--force', 'overwrite an existing 3-enrich/index.html')
    .action(action((cfg, project, opts) => runEnrich({ project, ...opts }, cfg)));

  program
    .command('polish <project>')
    .description('Stage 4 — normalise loudness to -16 LUFS → fine.mp4')
    .option('--lufs <value>', 'loudness target', '-16')
    .action(action((cfg, project, opts) => runPolish({ project, ...opts }, cfg)));

  program
    .command('render <project>')
    .description('Stage 5 — encode masters/{horizontal,vertical,square}.mp4 + captions.srt')
    .option('--formats <list>', 'comma-separated: horizontal,vertical,square', 'horizontal,vertical,square')
    .option('--focus <0-1>', 'horizontal position of the vertical/square crop', '0.5')
    .action(action((cfg, project, opts) => runRender({ project, ...opts }, cfg)));

  program
    .command('schedule <project>')
    .description('Stage 6 — social drafts for review (roadmap, not in v0.1)')
    .action(action((cfg, project, opts) => runSchedule({ project, ...opts }, cfg)));

  program
    .command('run <project>')
    .description('Run log → assemble → polish → render in one go')
    .action(action(async (cfg, project) => {
      console.log(kleur.gray('Running log → assemble → polish → render.\n'));
      await runLog({ project }, cfg);
      await runAssemble({ project }, cfg);
      await runPolish({ project }, cfg);
      await runRender({ project }, cfg);
    }));

  await program.parseAsync(argv);
}
