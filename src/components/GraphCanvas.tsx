import { useState } from 'react';
import FluidGraphCanvas from './FluidGraphCanvas';
import type { TransitiveGraphResponse } from '../types/api';

interface GraphCanvasProps {
  data: TransitiveGraphResponse;
  onEdgeSelect?: (edge: { source: string; target: string } | null) => void;
  onNodeSelect?: (nodeId: string | null) => void;
  vulnerableNodes?: string[];
}

interface EdgeTooltip {
  source: string;
  target: string;
  constraint: string;
  x: number;
  y: number;
}

export default function GraphCanvas({ data, onEdgeSelect, onNodeSelect, vulnerableNodes }: GraphCanvasProps) {
  const [tooltip, setTooltip] = useState<EdgeTooltip | null>(null);

  // Classify the constraint severity for color coding
  const getConstraintBadgeStyle = (constraint?: string): string => {
    if (!constraint || constraint === 'unconstrained') return 'bg-red-900/40 text-red-400 border border-red-900/50';
    if (constraint.startsWith('==') || constraint.includes('===')) return 'bg-amber-900/40 text-amber-400 border border-amber-500/20';
    return 'bg-green-900/40 text-green-400 border border-green-500/20';
  };

  const getConstraintLabel = (constraint?: string): string => {
    if (!constraint || constraint === 'unconstrained') return 'Unconstrained ⚠️';
    if (constraint.startsWith('==') || constraint.includes('===')) return 'Pinned 🔒';
    return 'Range Bounded ✓';
  };

  const handleEdgeHover = (link: any | null, x: number, y: number) => {
    if (link) {
      setTooltip({
        source: link.source.id || link.source,
        target: link.target.id || link.target,
        constraint: link.constraint,
        x,
        y
      });
    } else {
      setTooltip(null);
    }
  };

  return (
    <div className="w-full h-full relative">
      <FluidGraphCanvas
        data={data as any}
        mode="dependency"
        onEdgeSelect={onEdgeSelect}
        onNodeSelect={onNodeSelect}
        onEdgeHover={handleEdgeHover}
        vulnerableNodes={vulnerableNodes}
      />

      {/* Edge hover tooltip */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{ left: tooltip.x + 16, top: tooltip.y - 8 }}
        >
          <div className="bg-[#12121a] border border-[#2a2a35] shadow-lg rounded-lg p-3 text-xs min-w-[180px]">
            <div className="font-semibold text-gray-300 mb-2 flex items-center gap-1">
              <span className="text-gray-500">Edge Constraint</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">From:</span>
                <span className="font-mono font-medium text-gray-200 truncate max-w-[110px]">{tooltip.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">To:</span>
                <span className="font-mono font-medium text-gray-200 truncate max-w-[110px]">{tooltip.target}</span>
              </div>
              <div className="border-t border-white/5 pt-1.5 mt-1.5">
                <span className="text-gray-500 block mb-1">Constraint:</span>
                <span className={`font-mono text-xs px-2 py-0.5 rounded-full font-semibold ${getConstraintBadgeStyle(tooltip.constraint)}`}>
                  {tooltip.constraint || 'unconstrained'}
                </span>
              </div>
              <div className="text-[10px] text-gray-500 pt-0.5">
                {getConstraintLabel(tooltip.constraint)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hint badge */}
      {data.edges.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-[#12121a]/80 backdrop-blur-sm border border-[#2a2a35] rounded-md px-3 py-1.5 text-xs text-gray-500 pointer-events-none shadow-sm z-10">
          Hover over edge particles to inspect version constraints
        </div>
      )}
    </div>
  );
}
