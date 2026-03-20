/**
 * Expand/collapse arrow for parent threads. Renders inline before the avatar.
 */

interface HierarchyArrowProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export function HierarchyArrow({ isExpanded, onToggle }: HierarchyArrowProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="flex-shrink-0 p-0.5 -ml-1"
      title={isExpanded ? '收起子线程' : '展开子线程'}
    >
      <svg
        aria-hidden="true"
        className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        viewBox="0 0 12 12"
        fill="currentColor"
      >
        <path d="M4 2l4 4-4 4V2z" />
      </svg>
    </button>
  );
}

/**
 * Child count badge for the time/meta row. Shows "N 子线程".
 */
export function ChildCountBadge({ count, isExpanded }: { count: number; isExpanded: boolean }) {
  return (
    <span
      className={`text-[10px] font-medium px-1.5 py-px rounded-full whitespace-nowrap ${
        isExpanded ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {count} 子线程
    </span>
  );
}
