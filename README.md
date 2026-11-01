# Goobs

> **Local-first video editing for people who talk for a living.** Transcribe on your own machine, cut the radio version first, render masters for every platform. Built to be driven from the terminal, by you or by an AI agent.

Goobs is a free, open-source editing pipeline with the editorial DNA of a professional editor baked in. Built by [MaxShip](https://max-ship.com).

It is built for the **subject-matter expert** who can talk for hours about what they know but gets stuck on editing.

## Quickstart

You need Node.js 20+, [FFmpeg](https://ffmpeg.org) and [whisper.cpp](https://github.com/ggml-org/whisper.cpp).

```bash
# macOS
brew install ffmpeg whisper-cpp

git clone https://github.com/shipwithmax/goobs.git
cd goobs
npm install
./bin/vp init              # writes .env and checks your tools
npm run sample             # builds a synthetic 36-second test clip
./bin/vp run sample-clip   # log → assemble → polish → render
```

The first `vp log` downloads the Whisper `small.en` model (about 490 MB) to `~/.cache/goobs/whisper/`. After that, transcription runs offline.

When it finishes, open `hangar/sample-clip/`:

- `1-log/transcript.md`: what was said, with timestamps
- `2-assemble/cut-plan.json`: every cut and why it was made
- `2-assemble/rough.mp4`: the radio version, with the scratched take, the spoken direction and the long pause gone
- `5-render/masters/`: `horizontal.mp4`, `vertical.mp4`, `square.mp4` and `captions.srt`

On Linux, build whisper.cpp from source and put `whisper-cli` on your `PATH` (or set `WHISPER_CPP_BIN`), and install `espeak-ng` for the sample clip.

## Your own video

```bash
./bin/vp plan --topic "why folders beat prompts"   # brief.md + a slides.html prompter
# record, then save it as hangar/<project>/source.mp4 (or source.mov)
./bin/vp log <project>        # transcript, director cues, pauses
./bin/vp assemble <project>   # cut-plan.json + rough.mp4 + rough.srt
```

Watch `rough.mp4` before anything else. If a cut is wrong, edit the ranges in `2-assemble/cut-plan.json` (or ask your agent to) and run `vp assemble` again: it reuses your plan instead of starting over. Pass `--replan` to start fresh.

Then finish:

```bash
./bin/vp enrich <project> --render   # optional, beta: motion graphics with HyperFrames
./bin/vp polish <project>            # loudness to -16 LUFS
./bin/vp render <project>            # horizontal, vertical and square masters + captions.srt
```

## What works in v0.1

| Stage | Command | Status | What you get |
|---|---|---|---|
| 0. Plan | `vp plan` | Works | `brief.md` and a `slides.html` prompter to record against |
| 1. Log | `vp log` | Works | Local Whisper transcript with word timings, director cues, pauses |
| 2. Assemble | `vp assemble` | Works | A first-pass cut plan you can edit, `rough.mp4`, `rough.srt` |
| 3. Enrich | `vp enrich` | Beta | A [HyperFrames](https://github.com/heygen-com/hyperframes) project with callout cards from your cues; `--render` makes `enriched.mp4` |
| 4. Polish | `vp polish` | Works (audio only) | `fine.mp4` with loudness normalised to -16 LUFS |
| 5. Render | `vp render` | Works | `horizontal.mp4`, `vertical.mp4`, `square.mp4` (centre crop, `--focus` to shift it) and `captions.srt` |
| 6. Schedule | `vp schedule` | Not yet | See the roadmap |

`vp doctor` checks your setup at any time.

Each stage writes real files you can open, and you can rerun any stage on its own.

### How the first cut is made

Assemble follows rule one of the editorial DNA: cut the radio version first. It only removes things that are not part of the story:

- false starts and flubbed sentences you flagged out loud (*"scratch that"*, *"let me redo"*)
- phrases you said to the editor (*"editor, keep this"*)
- filler words, when the transcript contains them
- dead air before you start and after you finish
- pauses longer than one second, tightened to half a second (`--max-pause` to change)

Every cut lands in a detected silence, so words are not clipped. Whisper's word timings drift by a few hundred milliseconds, so Goobs checks them against FFmpeg's silence detection. Treat the plan as a first pass: read the transcript, read `cut-plan.json`, and adjust.

## Director cues

While filming, say these out loud. `vp log` turns them into structured cues in `1-log/cues.json`.

| You say | What happens |
|---|---|
| *"scratch that"* / *"cut this"* | Drops the sentence before it, and the phrase itself |
| *"start over"* / *"let me redo"* | Drops the flubbed sentence. In the first 30 seconds, drops the whole false start |
| *"editor, keep this"* | Marks a key moment; the phrase itself is cut |
| *"editor, <any note>"* | Saved as a note; the phrase is cut |
| *"imagine a chart showing X"* | A callout card at that moment in `vp enrich` |
| *"lower-third: <Name>, <Title>"* | A name card in `vp enrich`; the phrase is cut |

Add the phrases *you* actually say in [`src/stages/1-log/director-patterns.js`](src/stages/1-log/director-patterns.js). That file is what makes Goobs feel like your editor.

## Working with an AI agent

Goobs is built to be run by a coding agent such as Claude Code or Codex. Every decision is a file the agent can read and edit, so you can say *"read the transcript and tighten the cut-plan around the tangent at 4:37"* and rerun one stage.

[`AGENTS.md`](AGENTS.md) holds the working rules for agents: read the transcript before cutting, land cuts in silence, re-transcribe the cut to check it, pin the HyperFrames version, never publish without a human.

## Editorial DNA

Goobs is the nickname of the professional editor whose philosophy is encoded into this tool. Without that point of view, Goobs would be another wrapper around AI models.

The engine follows principles documented in [`editorial-dna/goobs-principles.md`](editorial-dna/goobs-principles.md):

1. **Cut the radio version first.** Make the spoken story work before adding visuals.
2. **Keep editing invisible.** The edit should move the story along without drawing attention to itself.
3. **Do not treat everything like a music video.** Build the story before hanging visual glitter on it.
4. **Use visuals to improve retention.** B-roll, charts, and text should imprint the idea, not merely fill space.
5. **Ship.** An edit is never truly finished; it becomes concise, artful, and ready to publish.

## Privacy and cost

- **Free.** Every stage in v0.1 runs on your machine with no API keys and no paid services.
- **Your footage stays local.** Transcription runs with whisper.cpp on your computer. Nothing in Log, Assemble, Polish or Render uploads audio or video.
- **What does touch the network:** the one-time Whisper model download from Hugging Face; and, for `vp enrich`, `npx` fetching HyperFrames, its headless browser, and fonts and GSAP from public CDNs. Goobs runs HyperFrames with `HYPERFRAMES_NO_TELEMETRY=1`.

## Project layout

Projects live in `hangar/`, one folder per video. Everything in `hangar/` except its README is gitignored.

```text
hangar/Y26-04-25-my-first-video/
├── source.mp4
├── 0-plan/      brief.md, slides.html
├── 1-log/       transcript.{json,md,srt}, cues.json, silences.json, whisper.json
├── 2-assemble/  cut-plan.json, rough.mp4, rough.srt
├── 3-enrich/    index.html, DESIGN.md, talking-head.mp4, enriched.mp4   (optional)
├── 4-polish/    fine.mp4
└── 5-render/    masters/{horizontal,vertical,square}.mp4, masters/captions.srt
```

## Roadmap

Not in v0.1 yet. Contributions welcome.

- **Schedule:** upload masters and create social posts as drafts for human review
- **More transcribers:** NVIDIA Parakeet, faster-whisper, and optional cloud engines (OpenAI, ElevenLabs Scribe, Deepgram). Adapters are stubbed in `src/transcribers/`
- **Smarter cue extraction** with an optional LLM, beyond the regex patterns
- **Enrich:** charts generated from cue numbers, split-screen and vertical-short layouts, slides synced to the transcript
- **Polish:** colour, crossfades at cut points, voice isolation
- **Render:** burned-in captions for vertical, face-aware crops
- **Shorts:** find the strongest moments in a long video and cut hook-to-payoff clips
- **A real example project** you can scrub

## Open-source promise

1. **The license is MIT and stays MIT.**
2. **Features released in the public repository stay free.** Paid brand kits and implementation services remain separate offerings.
3. **The public version is the real version.** This repository is intended to become the same pipeline used in production.

## Built on

- [whisper.cpp](https://github.com/ggml-org/whisper.cpp) (MIT) running OpenAI's [Whisper](https://github.com/openai/whisper) models: local transcription
- [FFmpeg](https://ffmpeg.org): cutting, loudness and encoding
- [HyperFrames](https://github.com/heygen-com/hyperframes) by HeyGen (Apache-2.0): HTML-native video composition for `vp enrich`
- [GSAP](https://gsap.com): animation inside HyperFrames compositions

## Built by MaxShip

[MaxShip](https://max-ship.com) builds agent-native tools for one-person operators and small teams.

For implementation help or a custom variant, [say hello](https://max-ship.com).

## License

[MIT](./LICENSE)
