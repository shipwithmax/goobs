/**
 * Director-cue patterns.
 *
 * Regexes that match things you say while filming. Matched phrases become
 * structured cues that drive stages 2 (Assemble) and 3 (Enrich).
 *
 * ── HOW TO EXTEND ───────────────────────────────────────────────
 *
 * Add the phrases YOU actually say. This is the file that makes
 * Goobs feel like *your* editor, not a generic one.
 *
 * Cue types:
 *   keep         — keep the surrounding 10s of footage with high priority
 *   remove       — drop the surrounding sentence/take from the assembly
 *   restart      — speaker is about to redo the take; drop everything before this
 *   viz          — emit an on-screen visualization (chart, animation, callout)
 *   lower-third  — emit a lower-third graphic with extracted name/title
 *   b-roll       — flag for B-roll insertion at this timestamp
 *   note         — speaker is talking to the editor; preserve as a comment
 */

export const PATTERNS = [
  // ── KEEP / EMPHASIZE ────────────────────────────────────────────
  { pattern: /\beditor[,]?\s+keep this\b/i,                     type: 'keep',        priority: 'high' },
  { pattern: /\b(this is the|here'?s the) (key|main|big) (point|thing|moment)\b/i, type: 'keep', priority: 'high' },
  { pattern: /\bremember this\b/i,                              type: 'keep',        priority: 'medium' },

  // ── REMOVE / RESTART ────────────────────────────────────────────
  { pattern: /\b(drop this|drop that|delete this|delete that)\b/i, type: 'remove' },
  { pattern: /\b(scratch that|ignore that|forget what i said)\b/i, type: 'remove' },
  { pattern: /\b(start over|let me redo|let me restart|take two)\b/i, type: 'restart' },

  // ── VISUALIZATIONS (the magic) ──────────────────────────────────
  { pattern: /\bimagine (a|the|some|this)?\s*(bar |line |pie )?chart (showing|of|with)\s+(.+?)(?=[.,]|$)/i,
    type: 'viz', vizKind: 'chart' },
  { pattern: /\b(visualize|picture|show)\s+(.+?)(?:\s+going from|\s+from)\s+(\d{4}|\d+%?)\s+to\s+(\d{4}|\d+%?)/i,
    type: 'viz', vizKind: 'comparison' },
  { pattern: /\bthe (?:numbers?|stats?|data) (?:go|jump|move|shift) from (.+?) to (.+?)(?=[.,]|$)/i,
    type: 'viz', vizKind: 'comparison' },
  { pattern: /\b(zoom in|highlight|callout)\s+on\s+(.+?)(?=[.,]|$)/i,
    type: 'viz', vizKind: 'callout' },

  // ── LOWER THIRDS ────────────────────────────────────────────────
  { pattern: /\blower[ -]third[s]?[:\-]\s*([^,.\n]+?)(?:,\s*([^.\n]+))?(?=[.\n])/i,
    type: 'lower-third' },
  { pattern: /\bmy name is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:and\s+)?I'?m\s+(.+?)(?=[.,]|$)/,
    type: 'lower-third' },

  // ── B-ROLL & ANGLE CHANGES ──────────────────────────────────────
  { pattern: /\b(b-?roll|cutaway|insert)\s*(of|to|here)?\s*(.+?)(?=[.,]|$)/i,
    type: 'b-roll' },
  { pattern: /\bchange (?:the )?angle\b/i,                      type: 'note', kind: 'angle-change' },

  // ── EDITOR ASIDES (notes-to-self / notes-to-editor) ─────────────
  { pattern: /\beditor[,]?\s+(.+?)(?=[.\n])/i,                  type: 'note' },
];

export function extractCues(transcript) {
  const cues = [];
  const fullText = transcript.text || (transcript.words || []).map((w) => w.word).join(' ');
  if (!fullText) return cues;

  for (const def of PATTERNS) {
    const flags = def.pattern.flags.includes('g') ? def.pattern.flags : def.pattern.flags + 'g';
    const re = new RegExp(def.pattern.source, flags);
    let m;
    while ((m = re.exec(fullText)) !== null) {
      const charStart = m.index;
      const charEnd = m.index + m[0].length;
      const { start, end } = mapCharsToTimes(charStart, charEnd, transcript);
      cues.push({
        type: def.type,
        priority: def.priority,
        vizKind: def.vizKind,
        kind: def.kind,
        match: m[0],
        groups: m.slice(1).filter(Boolean),
        text: m.slice(1).filter(Boolean).join(' — ') || m[0],
        start,
        end,
      });
    }
  }

  cues.sort((a, b) => a.start - b.start);
  return cues;
}

function mapCharsToTimes(charStart, charEnd, transcript) {
  const words = transcript.words || [];
  if (!words.length) return { start: 0, end: 0 };

  let cursor = 0;
  let start = words[0].start;
  let end = words[words.length - 1].end;

  for (const w of words) {
    const wStart = cursor;
    const wEnd = cursor + (w.word?.length ?? 0) + 1;
    if (wStart <= charStart && charStart <= wEnd) start = w.start;
    if (wStart <= charEnd && charEnd <= wEnd) end = w.end;
    cursor = wEnd;
  }
  return { start, end };
}
