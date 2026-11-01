# Hangar

Your video projects live here. One folder per video.

Everything in here except this README is gitignored: your footage, transcripts and renders never get committed.

## Folder convention

```
hangar/Y26-04-25-my-first-video/
├── source.mp4        (or source.mov)
├── 0-plan/
├── 1-log/
├── 2-assemble/
├── 3-enrich/
├── 4-polish/
├── 5-render/
└── 6-schedule/
```

## Naming convention

`Y<YY>-<MM>-<DD>-<slug>` — date prefix sorts naturally, slug is human-readable. Run `vp plan --topic "your topic"` and the folder name is generated for you.
