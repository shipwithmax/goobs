import kleur from 'kleur';

export async function runSchedule({ project, autoPublish }, cfg) {
  const willAutoPublish = autoPublish || cfg.autoPublish;

  console.log(kleur.cyan(`  • scheduling ${project} via Zernio...`));

  if (!cfg.keys.zernio) {
    console.log(kleur.yellow(`  ⚠ no ZERNIO_API_KEY in .env`));
    console.log(kleur.gray(`    Either add a key, or copy your renders manually to your scheduler of choice.`));
    return;
  }

  if (willAutoPublish) {
    console.log(kleur.red().bold(`  ⚠ AUTO-PUBLISH MODE — posts will go live without review.`));
  } else {
    console.log(kleur.green(`  ✓ HITL mode — posts will be created as DRAFTS for your review.`));
  }

  // TODO(phase-2):
  //   1. Read render/masters/ for available files
  //   2. Read brief.md for caption, hashtags, schedule hint
  //   3. Upload media via Zernio media API
  //   4. Create posts (one per platform) — drafts unless auto-publish
  //   5. Write zernio-drafts.json with post IDs and review URLs
  console.log(kleur.yellow(`  ⚠ stage 6 implementation lands during phase 2 dogfood.`));
}
