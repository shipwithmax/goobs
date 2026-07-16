# For creators

This doc is for the person *in* the video — the subject-matter expert recording themselves.

## The promise

You can talk for hours about what you know. The hard part has always been planning + editing. MaxShip removes that bottleneck. You speak naturally on camera, and the tool listens for your *director cues* — phrases that tell it what to do.

## Director cues — the magic

While filming, just say these out loud. The tool extracts them automatically.

| You say | What happens |
|---|---|
| *"editor, keep this"* | Marks the surrounding 10s as high-priority |
| *"cut this"* / *"scratch that"* | Removes the surrounding sentence |
| *"start over"* / *"take two"* | Drops everything before this point |
| *"imagine a chart showing X going from 2020 to 2024"* | Adds a chart at this moment |
| *"lower-third: <Name>, <Title>"* | Adds a name graphic at this moment |
| *"b-roll of <subject>"* | Flags this for B-roll insertion |

The full list lives in [`src/stages/1-log/director-patterns.js`](../src/stages/1-log/director-patterns.js). Add your own phrases there — that's how the tool gets to feel like *your* editor.

## Workflow

1. **Plan** — `vp plan --topic "your topic"` creates a brief and a slides prompter
2. **Record** — open `slides.html` in a browser, use as prompter, record yourself
3. **Drop the file** — save your recording at `hangar/<project>/source.mp4`
4. **Run** — `vp run <project>` runs the whole pipeline
5. **Review** — watch `2-assemble/rough.mp4` first. If it's good, the rest goes faster.

## Tips

- **Speak the visuals you want.** Even if you don't know the chart will land — describe it. The tool catches it.
- **Don't be afraid to flub takes.** Say *"start over"* and keep going. The tool will drop the bad take.
- **Talk to the editor.** If you have a thought *about* the edit, say *"editor, <thought>"*. It becomes a comment on the cue track.
- **The brief is your friend.** Filling out `0-plan/brief.md` before recording makes every downstream stage smarter.
