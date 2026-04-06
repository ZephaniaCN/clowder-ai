/**
 * F152 Phase C C1a: Feature Doc AC parser.
 *
 * Parses acceptance criteria lines from feature doc markdown.
 * Supports both the existing format and the new verify/evidence extensions.
 *
 * Existing: - [ ] AC-A1: description
 * Extended: - [ ] AC-A1: description [verify: pnpm build] [evidence: commit:abc123]
 */

/** Parsed acceptance criterion entry. */
export interface ParsedAC {
  readonly id: string;
  readonly description: string;
  readonly checked: boolean;
  readonly verifyCmd?: string;
  readonly evidenceRef?: string;
}

/**
 * Regex breakdown:
 * ^- \[([ x])\]         checkbox (group 1: space or x)
 * \s+AC-([A-Za-z0-9]+)  AC id   (group 2: "A1", "B2", "1", etc.)
 * :\s+                  separator
 * (.+)                  rest    (group 3: description + optional extensions)
 */
const AC_LINE_RE = /^- \[([ x])\]\s+AC-([A-Za-z0-9]+):\s+(.+)$/;

/** Extract `[verify: ...]` from the tail of a description. */
const VERIFY_RE = /\[verify:\s*([^\]]+)\]/;

/** Extract `[evidence: ...]` from the tail of a description. */
const EVIDENCE_RE = /\[evidence:\s*([^\]]+)\]/;

/**
 * Parse AC lines from feature doc markdown.
 *
 * Extracts all lines matching `- [x] AC-{id}: {description}` and optional
 * `[verify: {cmd}]` / `[evidence: {ref}]` extensions.
 *
 * Non-AC lines are silently skipped.
 */
export function parseFeatureACs(markdown: string): ParsedAC[] {
  const results: ParsedAC[] = [];

  for (const line of markdown.split('\n')) {
    const trimmed = line.trim();
    const match = AC_LINE_RE.exec(trimmed);
    if (!match) continue;

    const checked = match[1] === 'x';
    const id = `AC-${match[2]}`;
    let rest = match[3].trim();

    // Extract optional extensions from the tail
    const verifyMatch = VERIFY_RE.exec(rest);
    const evidenceMatch = EVIDENCE_RE.exec(rest);

    // Remove matched extensions from description
    if (verifyMatch) rest = rest.replace(verifyMatch[0], '');
    if (evidenceMatch) rest = rest.replace(evidenceMatch[0], '');

    results.push({
      id,
      description: rest.trim(),
      checked,
      ...(verifyMatch ? { verifyCmd: verifyMatch[1].trim() } : {}),
      ...(evidenceMatch ? { evidenceRef: evidenceMatch[1].trim() } : {}),
    });
  }

  return results;
}
