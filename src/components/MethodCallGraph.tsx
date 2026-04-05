import { useState } from "react";
import FluidGraphCanvas from "./FluidGraphCanvas";

interface MethodCallGraphProps {
  data: {
    nodes: any[];
    edges: any[];
    root?: string;
  };
  highlightedNodes?: string[];
  onNodeSelect?: (nodeId: string | null) => void;
  hideLegend?: boolean;
}

export default function MethodCallGraph({
  data,
  highlightedNodes,
  onNodeSelect,
  hideLegend = false,
}: MethodCallGraphProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (errorMsg) {
    return (
      <div className="w-full h-full bg-red-900/30 text-red-400 font-medium p-6 rounded-lg overflow-auto border border-red-900/50">
        <h3 className="font-bold text-lg mb-2">Graph Render Crash</h3>
        <pre className="text-xs whitespace-pre-wrap">{errorMsg}</pre>
      </div>
    );
  }

  // Ensure nodes have community_id mapping compatibility
  const normalizedData = {
    ...data,
    nodes: data.nodes.map(n => ({ ...n, id: n.id || n.name })),
    edges: data.edges.map(e => ({ ...e, source: e.source_id || e.source, target: e.target_id || e.target }))
  };

  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative" }}
      className="bg-[#0a0a12] border border-[#2a2a35] rounded-lg overflow-hidden"
    >
      <FluidGraphCanvas
        data={normalizedData}
        mode="method"
        highlightedNodes={highlightedNodes}
        onNodeSelect={(id) => onNodeSelect?.(id || null)}
      />

      {/* Legend overlays */}
      {!hideLegend && (
        <div className="absolute bottom-4 left-4 bg-[#12121a]/90 backdrop-blur-sm p-3 rounded shadow-sm border border-[#2a2a35] text-xs pointer-events-none z-10 w-fit">
          <h4 className="font-bold text-gray-300 mb-2">Graph Legend</h4>
          {normalizedData.nodes.some(n => n.egoRole) ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)] bg-amber-400" />
                <span className="text-gray-400">Focal Method</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.5)] bg-sky-400" />
                <span className="text-gray-400">Upstream Caller</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(232,121,249,0.5)] bg-fuchsia-400" />
                <span className="text-gray-400">Downstream Callee</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.4)] bg-slate-400" />
                <span className="text-gray-500">Method Node</span>
              </div>
              <div className="mt-2 text-[10px] text-gray-500">
                Node color: Louvain Community
                <br />
                Node size: Blast Radius & Complexity
              </div>
            </>
          )}
          <div className="my-2 border-t border-white/5" />
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-0.5 bg-[#475569]" />
            <span className="text-gray-600">Static AST Edge</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
            <span className="text-gray-600">Dynamic Trace Edge</span>
          </div>
        </div>
      )}
    </div>
  );
}
