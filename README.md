# Goobs

> **Open-source, agent-native video editing pipeline.** Plan, transcribe, cut, animate, render, and schedule — from your terminal, locally if you want.

Goobs is a free, open-source video editor with the editorial DNA of a professional editor baked in. Built by [MaxShip](https://max-ship.com).

It is built for the **subject-matter expert** who can talk for hours about what they know but gets stuck on planning and editing.

```bash
git clone https://github.com/shipwithmax/goobs.git
cd goobs
npm install
./bin/vp init
```

## What Goobs is

Most people do not know how to edit video. They have valuable content trapped behind technical friction: they cannot film, edit, and publish in a day. Goobs removes that friction.

You speak naturally on camera. You can say things like *“editor, keep this part”* or *“imagine a chart showing the numbers go from 2020 to 2024.”* Goobs extracts those phrases as a **director’s track** and uses them to guide the rough cut and motion graphics.

You stay in creative control; Goobs handles the craft.

## What it does

```text
PRE-PRODUCTION
  0. Plan       → talking points + an on-screen prompter to record against

POST-PRODUCTION
  1. Log        → transcribe + extract director cues + flag fillers
  2. Assemble   → rough cut: fillers and "cut this" sections removed
  3. Enrich     → motion graphics, charts, and lower-thirds
  4. Polish     → fine cut: audio levels, transitions, and color
  5. Render     → horizontal, vertical, and square exports
  6. Schedule   → social drafts for approval before publishing
```

Each stage emits a real file you can inspect. You can rerun a stage independently instead of rebuilding the whole project.

## Editorial DNA

Goobs is the nickname of the professional editor whose philosophy is encoded into this tool. Without that point of view, Goobs would be another wrapper around AI models.

The engine follows principles documented in [`editorial-dna/goobs-principles.md`](editorial-dna/goobs-principles.md):

1. **Cut the radio version first.** Make the spoken story work before adding visuals.
2. **Keep editing invisible.** The edit should move the story along without drawing attention to itself.
3. **Do not treat everything like a music video.** Build the story before hanging visual glitter on it.
4. **Use visuals to improve retention.** B-roll, charts, and text should imprint the idea—not merely fill space.
5. **Ship.** An edit is never truly finished; it becomes concise, artful, and ready to publish.

## Privacy and cost

- **Free forever** — local workflows do not require paid API keys.
- **Private by default** — local transcription options keep footage on your machine.
- **Optional cloud upgrades** — use providers such as OpenAI, ElevenLabs, Deepgram, or Zernio when you choose.

## Project layout

After `vp init`, projects live in `hangar/`, with one folder per video:

```text
hangar/Y26-04-25-my-first-video/
├── source.mp4
├── 0-plan/{brief.md, slides.html}
├── 1-log/{transcript.json, cues.json}
├── 2-assemble/rough.mp4
├── 3-enrich/{composition.html, enriched.mp4}
├── 4-polish/fine.mp4
├── 5-render/masters/{horizontal.mp4, vertical.mp4, square.mp4}
└── 6-schedule/zernio-drafts.json
```

## Current status

Goobs is an early working scaffold. Project creation, layouts, stage boundaries, configuration, and provider adapters are present. Several media-processing stages are still explicit placeholders while the end-to-end production workflow is being implemented and tested.

## Open-source promise

1. **The license is MIT and stays MIT.**
2. **Features released in the public repository stay free.** Paid brand kits and implementation services remain separate offerings.
3. **The public version is the real version.** This repository is intended to become the same pipeline used in production.

## Built on

- [HyperFrames](https://github.com/heygen-com/hyperframes) — HTML-native video composition
- [GSAP](https://gsap.com) — animation
- [FFmpeg](https://ffmpeg.org) — media processing
- [NVIDIA Parakeet](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v2) and Whisper — transcription options
- [Zernio](https://zernio.com) — social scheduling

## Built by MaxShip

[MaxShip](https://max-ship.com) builds agent-native tools for one-person operators and small teams.

For implementation help or a custom variant, [say hello](https://max-ship.com).

## License

[MIT](./LICENSE)
