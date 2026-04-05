import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

export interface MetricInfo {
  name: string;
  definition: string;
  formula?: string;
  whyItMatters: string;
  citation?: string;
  glossaryAnchor?: string;
}

interface MetricTooltipProps {
  metric: MetricInfo;
  children: React.ReactNode;
}

export default function MetricTooltip({ metric, children }: MetricTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, position: 'top' as 'top' | 'bottom' });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const isTop = rect.top < 350;
      const pos = isTop ? 'bottom' : 'top';
      
      setCoords({
        top: pos === 'top' ? rect.top - 10 : rect.bottom + 10,
        left: rect.left,
        position: pos
      });
    }
    setVisible(true);
  };

  return (
    <span
      ref={triggerRef}
      className="inline-flex items-center gap-1 cursor-help group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <Info className="w-3 h-3 opacity-30 group-hover:opacity-70 text-indigo-400 transition-opacity flex-shrink-0" />

      {/* Render the tooltip at the document root to escape all stacking contexts */}
      {visible && createPortal(
        <div
          className="fixed z-[9999] w-72 p-4 rounded-xl border border-indigo-500/30 bg-[#1a1a2ebd] backdrop-blur-3xl shadow-2xl shadow-indigo-900/40 text-left transition-all duration-150 animate-in fade-in zoom-in-95 pointer-events-auto"
          style={{
            top: coords.top,
            left: coords.left,
            // If opening 'top', pull it up entirely by its own height
            transform: coords.position === 'top' ? 'translateY(-100%)' : 'none'
          }}
          onMouseEnter={() => setVisible(true)} // Keep alive when hovering tooltip body
          onMouseLeave={() => setVisible(false)}
        >
          {/* Arrow */}
          <div
            className={`absolute w-2.5 h-2.5 bg-[#1a1a2e] border-indigo-500/30 rotate-45 left-4 pointer-events-none ${
              coords.position === 'top'
                ? 'bottom-[-5px] border-b border-r'
                : 'top-[-5px] border-t border-l'
            }`}
          />

          <div className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1.5">
            {metric.name}
          </div>
          <p className="text-xs text-gray-300 leading-relaxed mb-2 drop-shadow-sm">
            {metric.definition}
          </p>
          {metric.formula && (
            <div className="text-[10px] font-mono text-emerald-400/90 bg-emerald-900/30 rounded-md px-2 py-1 mb-2 border border-emerald-500/20">
              {metric.formula}
            </div>
          )}
          <p className="text-[10px] text-gray-400 leading-relaxed italic mb-2">
            {metric.whyItMatters}
          </p>
          {metric.citation && (
            <div className="text-[9px] text-indigo-400/70 border-t border-white/10 pt-1.5 mt-1">
              📎 {metric.citation}
            </div>
          )}
          <a
            href={`/glossary${metric.glossaryAnchor ? `#${metric.glossaryAnchor}` : ''}`}
            className="text-[10px] text-indigo-400 font-bold hover:text-indigo-300 mt-1 inline-block transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Learn more →
          </a>
        </div>,
        document.body
      )}
    </span>
  );
}
