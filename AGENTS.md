# AGENTS.md: working rules for AI agents running Goobs

You are editing a talking-head video with Goobs. The human directs; you do the
mechanical work and show your decisions as files they can check.

## The loop

1. `./bin/vp doctor` if anything fails. Use `whisper-cli` (whisper.cpp). Never
   call a bare `whisper` command: on many machines that is OpenAI's Python
   package, which does not understand whisper.cpp flags and fails at once.
2. `./bin/vp log <project>`, then **read `1-log/transcript.md` in full** before
   proposing any cut. Look for false starts, tangents the speaker asked to drop,
   asides to someone off camera, and duplicate retakes.
3. `./bin/vp assemble <project>` writes `2-assemble/cut-plan.json`. To change
   the cut, edit `keepSegments` / `cutRanges` in that file (times are seconds
   on the original recording, `startOrig` / `endOrig`) and rerun
   `vp assemble`. Give every cut a `reason`.
4. Land every cut in a silence (`1-log/silences.json`), never mid-word.
5. **Check the cut by reading it back:** `vp assemble <project> --verify`
   re-transcribes `rough.mp4` into `2-assemble/rough-transcript.md`. Read it.
   Clipped words and missing punchlines are invisible in timestamps.
6. Optional: `./bin/vp enrich <project>` creates a HyperFrames project in
   `3-enrich/`. Before writing composition HTML, read `3-enrich/DESIGN.md`.
   Run `npm run check` (lint, validate, inspect) in `3-enrich/` and fix every
   error before `vp enrich <project> --render`. Keep the pinned HyperFrames
   version; older 0.6.x previews crash.
7. `./bin/vp polish <project>` and `./bin/vp render <project>`. Verify outputs
   with `ffprobe` (duration, an audio stream, dimensions), not the render log.

## Editorial rules (from `editorial-dna/goobs-principles.md`)

- Cut the radio version first. If the story does not work with eyes closed,
  graphics will not save it.
- Keep the edit invisible. No transitions for their own sake.
- A visual must help an idea stick. No decorative B-roll, no tiny text, no dev
  clutter (timecodes, file names, scene numbers) on screen.
- For shorts: a clip lifted from a long video often hooks without paying off.
  Find where the payoff is actually said and stitch hook to payoff.

## Hard limits

- Never publish, upload or schedule anything without the human's explicit
  approval for that specific video.
- Screen recordings can show inboxes, keys and client data. Scan any screen
  footage before it goes into a render, and ask when unsure.
- Never commit anything in `hangar/` (footage, transcripts, renders). It is
  gitignored on purpose.
