import { Command } from 'commander';
import kleur from 'kleur';
import { loadConfig } from './config.js';
import { runInit } from './init.js';
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

export async function run(argv) {
  const program = new Command();

  program
    .name('vp')
    .description('Goobs — plan, transcribe, cut, animate, render, schedule.')
    .version('0.1.0');

  program
    .command('init')
    .description('First-run wizard. Sets up .env and your projects folder.')
    .action(async () => {
      banner();
      await runInit();
    });

  // Each stage takes a project path (e.g., hangar/Y26-04-25-my-video) and runs that stage.
  program
    .command('plan [project]')
    .description('Stage 0 — generate brief.md + slides.html for a new video')
    .option('-t, --topic <topic>', 'topic or angle for the video')
    .action(async (project, opts) => {
      banner();
      const cfg = await loadConfig();
      await runPlan({ project, ...opts }, cfg);
    });

  program
    .command('log <project>')
    .description('Stage 1 — transcribe + extract director cues + flag fillers')
    .option('--transcriber <name>', 'override TRANSCRIBER from .env')
    .action(async (project, opts) => {
      banner();
      const cfg = await loadConfig();
      await runLog({ project, ...opts }, cfg);
    });

  program
    .command('assemble <project>')
    .description('Stage 2 — rough cut: drop fillers + flagged sections → rough.mp4')
    .action(async (project, opts) => {
      banner();
      const cfg = await loadConfig();
      await runAssemble({ project, ...opts }, cfg);
    });

  program
    .command('enrich <project>')
    .description('Stage 3 — apply motion graphics overlays via HyperFrames')
    .option('-l, --layout <name>', 'talking-head | split-screen | vertical-short')
    .action(async (project, opts) => {
      banner();
      const cfg = await loadConfig();
      await runEnrich({ project, ...opts }, cfg);
    });

  program
    .command('polish <project>')
    .description('Stage 4 — fine cut: audio levels, transitions, color')
    .action(async (project, opts) => {
      banner();
      const cfg = await loadConfig();
      await runPolish({ project, ...opts }, cfg);
    });

  program
    .command('render <project>')
    .description('Stage 5 — encode masters/{horizontal,vertical,square}.mp4')
    .option('--formats <list>', 'comma-separated: horizontal,vertical,square', 'horizontal,vertical,square')
    .action(async (project, opts) => {
      banner();
      const cfg = await loadConfig();
      await runRender({ project, ...opts }, cfg);
    });

  program
    .command('schedule <project>')
    .description('Stage 6 — create Zernio drafts for review (HITL by default)')
    .option('--auto-publish', 'skip the human-in-the-loop step')
    .action(async (project, opts) => {
      banner();
      const cfg = await loadConfig();
      await runSchedule({ project, ...opts }, cfg);
    });

  program
    .command('run <project>')
    .description('Run all stages 1→6 in sequence')
    .action(async (project) => {
      banner();
      const cfg = await loadConfig();
      console.log(kleur.gray('Running all stages — this is a multi-minute operation.\n'));
      await runLog({ project }, cfg);
      await runAssemble({ project }, cfg);
      await runEnrich({ project }, cfg);
      await runPolish({ project }, cfg);
      await runRender({ project }, cfg);
      await runSchedule({ project }, cfg);
    });

  await program.parseAsync(argv);
}
