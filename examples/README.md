# Examples

## Synthetic sample clip

```bash
npm run sample             # writes hangar/sample-clip/source.mp4
./bin/vp run sample-clip   # log → assemble → polish → render
```

`make-sample.js` builds a short test recording from scratch: a text-to-speech
voice (macOS `say`, or `espeak-ng` on Linux) over FFmpeg's test pattern. The
pattern shows a running clock, so you can see exactly where Goobs cut.

The script has the mistakes a real take has, so every stage has work to do:

- a sentence followed by *"Scratch that."* (Assemble drops both)
- a spoken direction, *"Editor, keep this."* (Assemble cuts the words, Log records the cue)
- a 2.6-second pause (Assemble tightens it)
- *"Imagine a chart showing..."* (Enrich turns it into a callout card)

No real footage is involved, so the output is safe to share and delete.
