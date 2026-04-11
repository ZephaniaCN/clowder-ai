'use client';

import type { ParsedAC } from '@cat-cafe/shared/utils';

// --- Icons (Inline SVG, zero dependencies) ---

function TerminalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// --- Components ---

interface ACBadgesProps {
  ac: ParsedAC;
  showLabel?: boolean;
}

/**
 * C1c: Verify/Evidence badges for AC items.
 * Displays inline badges when an AC has verify command or evidence reference.
 */
export function ACBadges({ ac, showLabel = false }: ACBadgesProps) {
  if (!ac.verifyCmd && !ac.evidenceRef) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1">
      {ac.verifyCmd && (
        <span
          className="inline-flex items-center gap-0.5 rounded bg-sky-50 px-1 py-0 text-[10px] font-medium text-sky-700"
          title={`验证命令: ${ac.verifyCmd}`}
        >
          <TerminalIcon className="h-3 w-3" />
          {showLabel && 'verify'}
        </span>
      )}
      {ac.evidenceRef && (
        <span
          className="inline-flex items-center gap-0.5 rounded bg-green-50 px-1 py-0 text-[10px] font-medium text-green-700"
          title={`证据引用: ${ac.evidenceRef}`}
        >
          <LinkIcon className="h-3 w-3" />
          {showLabel && 'evidence'}
        </span>
      )}
    </span>
  );
}

interface ACRowWithBadgesProps {
  ac: ParsedAC;
  showBadges?: boolean;
}

/**
 * AC row with optional verify/evidence badges.
 * Used in feature progress panel.
 */
export function ACRowWithBadges({ ac, showBadges = true }: ACRowWithBadgesProps) {
  return (
    <div className="flex items-start gap-1.5">
      {ac.checked ? (
        <svg
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7CB87C]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ) : (
        <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-[1.5px] border-[#C4B5A0]" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={ac.checked ? 'text-[#9A866F] line-through' : 'text-[#4B3A2A]'}>
            {ac.id}: {ac.description}
          </span>
          {showBadges && <ACBadges ac={ac} />}
        </div>
        {ac.verifyCmd && (
          <p className="mt-0.5 text-[10px] text-sky-600">
            <TerminalIcon className="mr-0.5 inline h-3 w-3" />
            {ac.verifyCmd}
          </p>
        )}
      </div>
    </div>
  );
}

interface ACListWithBadgesProps {
  acs: ParsedAC[];
  showBadges?: boolean;
}

/**
 * List of ACs with verify/evidence badges.
 */
export function ACListWithBadges({ acs, showBadges = true }: ACListWithBadgesProps) {
  if (acs.length === 0) {
    return (
      <p className="text-[11px] text-[#B5A48E]">暂无验收标准</p>
    );
  }

  return (
    <div className="space-y-1">
      {acs.map((ac) => (
        <ACRowWithBadges key={ac.id} ac={ac} showBadges={showBadges} />
      ))}
    </div>
  );
}
