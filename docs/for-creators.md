# For creators

This doc is for the person *in* the video — the subject-matter expert recording themselves.

## The promise

You can talk for hours about what you know. The hard part has always been planning + editing. Goobs takes the first, most mechanical pass off your plate. You speak naturally on camera, and the tool listens for your *director cues* — phrases that tell it what to do.

## Director cues — the magic

While filming, just say these out loud. The tool extracts them automatically.

| You say | What happens |
|---|---|
| *"scratch that"* / *"cut this"* | Drops the sentence before it, and the phrase itself |
| *"start over"* / *"let me redo"* | Drops the flubbed sentence. In the first 30 seconds, drops everything before it (the false start) |
| *"editor, keep this"* | Marks a key moment in `cues.json`; the phrase itself is cut |
| *"editor, <any note>"* | Kept in `cues.json` as a note; the phrase is cut from the video |
| *"imagine a chart showing X"* | Becomes a callout card at that moment in `vp enrich` |
| *"lower-third: <Name>, <Title>"* | Becomes a name card in `vp enrich`; the phrase is cut |
| *"b-roll of <subject>"* | Flagged in `cues.json` and shown as a placeholder card in `vp enrich` |

Phrases that are part of your story (*"here's the key point"*, *"remember this"*) are noted but never cut.

The full list lives in [`src/stages/1-log/director-patterns.js`](../src/stages/1-log/director-patterns.js). Add your own phrases there — that's how the tool gets to feel like *your* editor.

## Workflow

1. **Plan** — `vp plan --topic "your topic"` creates a brief and a slides prompter
2. **Record** — open `slides.html` in a browser, use it as a prompter, record yourself
3. **Drop the file** — save your recording as `hangar/<project>/source.mp4` (or `source.mov`)
4. **Log** — `vp log <project>` transcribes on your machine. Read `1-log/transcript.md`.
5. **Assemble** — `vp assemble <project>` writes `2-assemble/cut-plan.json` and `rough.mp4`. Watch it.
6. **Fix the cut** — edit the keep/cut ranges in `cut-plan.json` (or ask your agent to) and run `vp assemble` again. It reuses your plan.
7. **Finish** — `vp polish <project>` then `vp render <project>`. Or `vp run <project>` does log → assemble → polish → render in one go.

## Tips

- **Speak the visuals you want.** Even if you don't know the chart will land — describe it. The tool catches it.
- **Don't be afraid to flub takes.** Say *"start over"* and keep going. The tool will drop the bad take.
- **Talk to the editor.** If you have a thought *about* the edit, say *"editor, <thought>"*. It lands in `cues.json` and is cut from the video.
- **The brief is your friend.** Filling out `0-plan/brief.md` before recording makes every downstream stage smarter.
