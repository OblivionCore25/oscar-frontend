import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbSegment {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  segments: BreadcrumbSegment[];
}

export default function Breadcrumbs({ segments }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm font-medium gap-1.5 py-2">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />}
            {isLast || !seg.to ? (
              <span className={isLast ? 'text-gray-200 font-semibold' : 'text-gray-500'}>
                {seg.label}
              </span>
            ) : (
              <Link
                to={seg.to}
                className="text-gray-500 hover:text-indigo-400 transition-colors"
              >
                {seg.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
