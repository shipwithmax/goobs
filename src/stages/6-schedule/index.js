import kleur from 'kleur';

// Stage 6 is on the roadmap. The plan: read 5-render/masters and brief.md,
// upload media, and create social posts as DRAFTS for human review
// (never auto-publish by default). Until then, upload the masters yourself.
export async function runSchedule({ project }) {
  console.log(kleur.yellow('  ⚠ vp schedule is not implemented in v0.1.'));
  console.log(kleur.gray(`    Upload hangar/${project}/5-render/masters/* to your platform or scheduler of choice.`));
  console.log(kleur.gray('    captions.srt in the same folder is ready to upload as a caption track.'));
}
