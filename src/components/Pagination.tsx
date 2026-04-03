interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPage: (p: number) => void;
  compact?: boolean; // smaller variant for the library panel
}

export default function Pagination({ page, totalPages, totalItems, pageSize, onPage, compact = false }: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  // Build the window of page numbers to show (at most 5 buttons)
  const window = 2;
  const pages: (number | '…')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - window && i <= page + window)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50 shrink-0">
        <span className="text-[10px] text-gray-400">{from}–{to} of {totalItems}</span>
        <div className="flex gap-1">
          <button
            onClick={() => onPage(page - 1)}
            disabled={page === 1}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
          >‹</button>
          <span className="w-6 h-6 flex items-center justify-center text-[10px] font-semibold text-gray-600">
            {page}/{totalPages}
          </span>
          <button
            onClick={() => onPage(page + 1)}
            disabled={page === totalPages}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
          >›</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100 shrink-0">
      <span className="text-xs text-gray-500">
        Showing <span className="font-semibold text-gray-700">{from}–{to}</span> of{' '}
        <span className="font-semibold text-gray-700">{totalItems}</span> packages
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(1)}
          disabled={page === 1}
          className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:bg-white hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >«</button>
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:bg-white hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >‹ Prev</button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              className={`w-7 h-7 text-xs rounded border transition-colors font-medium ${
                p === page
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:bg-white hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >Next ›</button>
        <button
          onClick={() => onPage(totalPages)}
          disabled={page === totalPages}
          className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:bg-white hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >»</button>
      </div>
    </div>
  );
}
