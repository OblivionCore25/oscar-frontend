import { Globe } from 'lucide-react';
import MetricTooltip from './MetricTooltip';
import type { MetricInfo } from './MetricTooltip';
import { fmtNum } from '../utils/format';

export interface MetricCardProps {
  label: string;
  value: string | number | null | undefined;
  source?: 'local' | 'deps.dev' | 'scorecard' | 'registry';
  tooltip?: MetricInfo;
  variant?: 'default' | 'danger' | 'success' | 'info' | 'cyan';
  /** Custom formatter. Defaults to fmtNum for numbers, passthrough for strings. */
  formatter?: (v: number) => string;
  /** Optional subtitle shown below the value (e.g. contextual note). */
  subtitle?: string;
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: 'text-gray-100',
  danger: 'text-red-400',
  success: 'text-emerald-400',
  info: 'text-indigo-400',
  cyan: 'text-cyan-400',
};

export default function MetricCard({
  label,
  value,
  source,
  tooltip,
  variant = 'default',
  formatter,
  subtitle,
  className = '',
}: MetricCardProps) {
  const isExternal = source && source !== 'local';

  const displayValue = (() => {
    if (value == null) return '—';
    if (typeof value === 'string') return value;
    if (formatter) return formatter(value);
    return fmtNum(value);
  })();

  const labelContent = tooltip ? (
    <MetricTooltip metric={tooltip}>{label}</MetricTooltip>
  ) : (
    label
  );

  return (
    <div className={`bg-[#1a1a2e] rounded-lg p-4 border border-white/5 ${className}`}>
      <span className="text-gray-500 text-sm font-medium mb-1 flex items-center justify-between">
        {labelContent}
        {isExternal && (
          <span title={`via ${source}`} className="ml-1.5">
            <Globe className="w-3.5 h-3.5 text-sky-500/70" />
          </span>
        )}
      </span>
      <span className={`text-3xl font-bold block mt-0.5 ${variantStyles[variant] || variantStyles.default}`}>
        {displayValue}
      </span>
      {subtitle && (
        <span className="text-[10px] text-gray-500 mt-1 block leading-tight">{subtitle}</span>
      )}
    </div>
  );
}
