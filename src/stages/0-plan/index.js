import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import kleur from 'kleur';
import { resolveProjectPath } from '../../config.js';

export async function runPlan({ project, topic }, cfg) {
  // If no project name passed, generate one from today's date.
  if (!project) {
    const d = new Date();
    const slug = topic
      ? topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
      : 'untitled';
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    project = `Y${yy}-${mm}-${dd}-${slug}`;
  }

  const projectPath = resolveProjectPath(cfg.projectsRoot, project);
  const planDir = join(projectPath, '0-plan');
  mkdirSync(planDir, { recursive: true });

  const briefPath = join(planDir, 'brief.md');
  const slidesPath = join(planDir, 'slides.html');

  if (!existsSync(briefPath)) {
    writeFileSync(briefPath, briefTemplate(topic));
  }
  if (!existsSync(slidesPath)) {
    writeFileSync(slidesPath, slidesTemplate(topic));
  }

  console.log(kleur.green(`  ✓ project ready: ${project}`));
  console.log(kleur.gray(`    ${briefPath}`));
  console.log(kleur.gray(`    ${slidesPath}`));
  console.log(kleur.bold('\n  Next:'));
  console.log(kleur.gray('    1. Open brief.md, fill in your talking points'));
  console.log(kleur.gray('    2. Open slides.html in a browser as your prompter while you record'));
  console.log(kleur.gray(`    3. Drop your recording at hangar/${project}/source.mp4`));
  console.log(kleur.gray(`    4. Run:`), kleur.bold(`vp log ${project}`));
}

function briefTemplate(topic) {
  return `# Brief — ${topic || 'Untitled video'}

> *This is your pre-production brief. Fill it in before you record. The richer this is, the better every downstream stage performs.*

## Hook (first 5 seconds)
What grabs them? One sentence.

## Promise (10 seconds in)
What will the viewer walk away with?

## Talking points
1.
2.
3.
4.
5.

## On-screen visuals
What charts, lower-thirds, b-roll, or text should appear?
- [ ]
- [ ]

## Director cues to drop while filming
Speak these naturally on camera — MaxShip will pick them up automatically:
- *"editor, keep this"* → marks the surrounding 10s as high-priority
- *"cut this"* / *"start over"* → marks for removal
- *"imagine a chart showing X"* → emits a viz cue at that timestamp
- *"lower-third: <name>, <title>"* → emits a lower-third cue

## Outcome
What do you want them to do after watching? Click, share, subscribe, reply?
`;
}

function slidesTemplate(topic) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Prompter — ${topic || 'Untitled'}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; background: #0a0a0a; color: #f5f5f5; padding: 4rem; max-width: 1200px; margin: 0 auto; line-height: 1.6; }
  h1 { font-size: 3rem; margin-bottom: 0.5rem; }
  h2 { color: #E85D26; font-size: 1.5rem; margin-top: 3rem; }
  ul, ol { font-size: 1.4rem; }
  li { margin: 1rem 0; }
  .hook { font-size: 2rem; padding: 1.5rem; background: #1a1a1a; border-left: 4px solid #E85D26; }
</style>
</head>
<body>
  <h1>${topic || 'Untitled video'}</h1>
  <p style="color: #888;">Open this in a browser while you record. Use it as your prompter.</p>

  <h2>Hook</h2>
  <div class="hook">[Your hook goes here — make it punchy.]</div>

  <h2>Talking points</h2>
  <ol>
    <li>[Point 1]</li>
    <li>[Point 2]</li>
    <li>[Point 3]</li>
  </ol>

  <h2>Reminder cues</h2>
  <ul>
    <li>Say <em>"editor, keep this"</em> on the parts you love</li>
    <li>Say <em>"cut this"</em> when you flub a take</li>
    <li>Describe charts out loud: <em>"imagine a chart showing..."</em></li>
  </ul>
</body>
</html>
`;
}
