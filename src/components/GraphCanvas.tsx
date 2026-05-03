import { useState, useRef, useCallback } from 'react';
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

interface NodeTooltip {
  label: string;
  isVulnerable: boolean;
  x: number;
  y: number;
}

export default function GraphCanvas({ data, onEdgeSelect, onNodeSelect, vulnerableNodes }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [edgeTooltip, setEdgeTooltip] = useState<EdgeTooltip | null>(null);
  const [nodeTooltip, setNodeTooltip] = useState<NodeTooltip | null>(null);
  const vulnerableSet = new Set(vulnerableNodes || []);

  /** Convert viewport coords (clientX/Y) to coords relative to our container div */
  const toLocal = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: clientX, y: clientY };
    const rect = containerRef.current.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

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

  const handleEdgeHover = (link: any | null, clientX: number, clientY: number) => {
    if (link) {
      const { x, y } = toLocal(clientX, clientY);
      setEdgeTooltip({
        source: link.source.id || link.source,
        target: link.target.id || link.target,
        constraint: link.constraint,
        x,
        y
      });
    } else {
      setEdgeTooltip(null);
    }
  };

  const handleNodeHover = (node: any | null, event?: MouseEvent) => {
    if (node && event) {
      const { x, y } = toLocal(event.clientX, event.clientY);
      const id = node.id || node.label || '';
      const pkgName = id.includes(':') ? id.split(':')[1] : id;
      const isVulnerable = vulnerableSet.has(pkgName.split('@')[0]) ||
        vulnerableSet.has(pkgName);
      setNodeTooltip({ label: node.label || pkgName, isVulnerable, x, y });
    } else {
      setNodeTooltip(null);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <FluidGraphCanvas
        data={data as any}
        mode="dependency"
        onEdgeSelect={onEdgeSelect}
        onNodeSelect={onNodeSelect}
        onEdgeHover={handleEdgeHover}
        onNodeHover={handleNodeHover}
        vulnerableNodes={vulnerableNodes}
      />

      {/* Edge hover tooltip */}
      {edgeTooltip && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{ left: edgeTooltip.x + 16, top: edgeTooltip.y - 8 }}
        >
          <div className="bg-[#12121a] border border-[#2a2a35] shadow-lg rounded-lg p-3 text-xs min-w-[180px]">
            <div className="font-semibold text-gray-300 mb-2 flex items-center gap-1">
              <span className="text-gray-500">Edge Constraint</span>
            </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">From:</span>
                  <span className="font-mono font-medium text-gray-200 truncate max-w-[110px]">{edgeTooltip.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">To:</span>
                  <span className="font-mono font-medium text-gray-200 truncate max-w-[110px]">{edgeTooltip.target}</span>
                </div>
                <div className="border-t border-white/5 pt-1.5 mt-1.5">
                  <span className="text-gray-500 block mb-1">Constraint:</span>
                  <span className={`font-mono text-xs px-2 py-0.5 rounded-full font-semibold ${getConstraintBadgeStyle(edgeTooltip.constraint)}`}>
                    {edgeTooltip.constraint || 'unconstrained'}
                  </span>
                </div>
                <div className="text-[10px] text-gray-500 pt-0.5">
                  {getConstraintLabel(edgeTooltip.constraint)}
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Node hover tooltip */}
      {nodeTooltip && (
        <div
          className="absolute z-50 pointer-events-none bg-[#12121a] border border-[#2a2a35] shadow-lg rounded-lg px-3 py-2 text-xs"
          style={{ left: nodeTooltip.x + 12, top: nodeTooltip.y + 12 }}
        >
          <span className={`font-mono font-medium ${nodeTooltip.isVulnerable ? 'text-red-400' : 'text-gray-200'}`}>
            {nodeTooltip.label}
          </span>
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
