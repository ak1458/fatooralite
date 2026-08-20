/**
 * Minimal bidirectional text segmentation for PDF rendering.
 *
 * fontkit (which pdf-lib uses for OpenType layout) shapes Arabic correctly —
 * contextual joining forms and lam-alef ligatures all resolve — but it applies a
 * SINGLE direction to whatever string it is handed. Measured against
 * Amiri-Regular:
 *
 *   "شركة"          -> ة ك ر ش            correct, reversed for RTL
 *   "Acme شركة"     -> A c m e ش ر ك ة    WRONG: the Arabic run stays logical
 *   "شركة Acme"     -> e m c A ة ك ر ش    WRONG: the Latin run is reversed
 *   "فاتورة 123"    -> 3 2 1 ة ر و ت ا ف  WRONG: the digits are reversed
 *
 * So a mixed string cannot be drawn in one call. Splitting it into runs that are
 * each a single direction, drawing each run separately, and placing the runs in
 * visual order gets all four cases right — because fontkit's per-run behaviour
 * is correct once the run is unambiguous.
 *
 * This is a deliberate subset of the Unicode Bidirectional Algorithm: enough for
 * invoice content (names, addresses, descriptions, amounts), not a general
 * implementation. It has no notion of explicit direction marks, nested embedding
 * levels, or bracket pairing. Anything needing those belongs in a real UBA
 * implementation, not here.
 */

/** Strong RTL: Arabic, Arabic Supplement/Extended, Hebrew, and the presentation forms. */
function isRtlChar(cp: number): boolean {
  return (
    (cp >= 0x0590 && cp <= 0x05ff) || // Hebrew
    (cp >= 0x0600 && cp <= 0x06ff) || // Arabic
    (cp >= 0x0700 && cp <= 0x074f) || // Syriac
    (cp >= 0x0750 && cp <= 0x077f) || // Arabic Supplement
    (cp >= 0x08a0 && cp <= 0x08ff) || // Arabic Extended-A
    (cp >= 0xfb50 && cp <= 0xfdff) || // Arabic Presentation Forms-A
    (cp >= 0xfe70 && cp <= 0xfeff)    // Arabic Presentation Forms-B
  );
}

/** Strong LTR: the Latin ranges this product actually renders. */
function isLtrChar(cp: number): boolean {
  return (
    (cp >= 0x0041 && cp <= 0x005a) || // A-Z
    (cp >= 0x0061 && cp <= 0x007a) || // a-z
    (cp >= 0x00c0 && cp <= 0x024f)    // Latin-1 Supplement + Extended-A/B
  );
}

// Everything else — spaces, punctuation, symbols and European digits — is
// neutral and takes its direction from the text around it (see splitBidiRuns).
//
// Digits are neutral rather than strong LTR on purpose: in "فاتورة 123" the
// number belongs inside the Arabic phrase and must not tear the run apart.

export interface TextRun {
  text: string;
  /** True when this run must be laid out right-to-left. */
  rtl: boolean;
}

export interface BidiResult {
  runs: TextRun[];
  /** Direction of the paragraph, taken from its first strong character. */
  baseRtl: boolean;
}

/**
 * Split `input` into single-direction runs, in LOGICAL order, plus the base
 * direction of the whole string.
 *
 * Neutral characters take the direction of the strong text around them; a
 * neutral sequence between two different directions, or at either edge, falls
 * back to the base direction. That is the same resolution the UBA applies to
 * neutrals (rules N1/N2), reduced to one embedding level.
 */
export function splitBidiRuns(input: string): BidiResult {
  const chars = [...input];
  if (chars.length === 0) return { runs: [], baseRtl: false };

  // Base direction: first strong character wins (UBA rule P2/P3).
  let baseRtl = false;
  for (const ch of chars) {
    const cp = ch.codePointAt(0)!;
    if (isRtlChar(cp)) { baseRtl = true; break; }
    if (isLtrChar(cp)) { baseRtl = false; break; }
  }

  // Per-character direction, with neutrals left undecided for now.
  const dirs: (boolean | null)[] = chars.map((ch) => {
    const cp = ch.codePointAt(0)!;
    if (isRtlChar(cp)) return true;
    if (isLtrChar(cp)) return false;
    return null;
  });

  // Resolve neutrals from their surroundings; fall back to the base direction
  // when the neighbours disagree or there is no neighbour on one side.
  for (let i = 0; i < dirs.length; i++) {
    if (dirs[i] !== null) continue;
    let before: boolean | null = null;
    for (let j = i - 1; j >= 0; j--) if (dirs[j] !== null) { before = dirs[j]; break; }
    let after: boolean | null = null;
    let end = i;
    while (end < dirs.length && dirs[end] === null) end++;
    if (end < dirs.length) after = dirs[end];
    const resolved = before !== null && before === after ? before : baseRtl;
    for (let k = i; k < end; k++) dirs[k] = resolved;
    i = end - 1;
  }

  const runs: TextRun[] = [];
  let current = chars[0];
  let currentRtl = dirs[0] as boolean;
  for (let i = 1; i < chars.length; i++) {
    if (dirs[i] === currentRtl) {
      current += chars[i];
    } else {
      runs.push({ text: current, rtl: currentRtl });
      current = chars[i];
      currentRtl = dirs[i] as boolean;
    }
  }
  runs.push({ text: current, rtl: currentRtl });

  return { runs, baseRtl };
}

/**
 * The same runs, ordered for drawing left to right across the page.
 *
 * In an RTL paragraph the logically-first run sits furthest right, so the draw
 * order is the reverse of the logical order. Each run's own glyphs are already
 * placed correctly by fontkit once the run has a single direction.
 */
export function visualRuns(input: string): TextRun[] {
  const { runs, baseRtl } = splitBidiRuns(input);
  return baseRtl ? [...runs].reverse() : runs;
}

/** Whether a string contains any character needing the Arabic-capable font. */
export function hasRtl(input: string): boolean {
  for (const ch of input) if (isRtlChar(ch.codePointAt(0)!)) return true;
  return false;
}
