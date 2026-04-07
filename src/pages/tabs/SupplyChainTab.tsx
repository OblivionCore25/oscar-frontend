import { useState, useRef, useEffect, useMemo } from 'react';
import { usePackageIdentity } from '../../context/PackageContext';
import { useGraphQuery, usePackageDetailsQuery, usePackageDepthsQuery, usePackageLibyearsQuery, useVulnerabilityQuery } from '../../hooks/useGraphQuery';
import GraphCanvas from '../../components/GraphCanvas';
import DependencyHealthDashboard from '../../components/DependencyHealthDashboard';
import { Loader2, AlertCircle, Network, Table2 } from 'lucide-react';

type SubView = 'dashboard' | 'topology';

export default function SupplyChainTab() {
  const { ecosystem, packageName, version } = usePackageIdentity();
  const [subView, setSubView] = useState<SubView>('dashboard');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [exploreMode, setExploreMode] = useState(false);
  const [exploreEdge, setExploreEdge] = useState<{ source: string; target: string } | null>(null);

  const { data, isLoading, error, progress } = useGraphQuery({ ecosystem, packageName, version });
  const { data: metricsData } = usePackageDetailsQuery({ ecosystem, packageName, version });
  const { data: depthsData } = usePackageDepthsQuery({ ecosystem, packageName, version });
  const { data: libyearsData } = usePackageLibyearsQuery({ ecosystem, packageName, version });
  const { data: vulnData } = useVulnerabilityQuery({ ecosystem, packageName, version });

  // Progress tracking
  const maxPctRef = useRef(0);
  useEffect(() => { maxPctRef.current = 0; }, [ecosystem, packageName, version]);

  let currentPct = 0;
  if (progress) {
    const total = Math.max(progress.discovered, progress.processed + progress.inQueue);
    currentPct = Math.floor((progress.processed / total) * 100);
    if (currentPct > maxPctRef.current) maxPctRef.current = currentPct;
  }
  const displayPct = maxPctRef.current;

  const handleExploreEdge = (edge: { source: string; target: string }) => {
    setExploreEdge(edge);
    setExploreMode(true);
    setSubView('topology');
  };

  // Ego-graph filtering for explore mode
  const explorerSubgraph = useMemo(() => {
    if (!data || !exploreMode || !exploreEdge) return data;
    const targetId = exploreEdge.target;
    const nearby = new Set<string>();
    // BFS ± 2 degrees
    const queue: [string, number][] = [[targetId, 0]];
    nearby.add(targetId);
    while (queue.length > 0) {
      const [node, depth] = queue.shift()!;
      if (depth >= 2) continue;
      data.edges.forEach((e: any) => {
        if (e.source === node && !nearby.has(e.target)) { nearby.add(e.target); queue.push([e.target, depth + 1]); }
        if (e.target === node && !nearby.has(e.source)) { nearby.add(e.source); queue.push([e.source, depth + 1]); }
      });
    }
    return {
      ...data,
      nodes: data.nodes.filter((n: any) => nearby.has(n.id)),
      edges: data.edges.filter((e: any) => nearby.has(e.source) && nearby.has(e.target)),
    };
  }, [data, exploreMode, exploreEdge]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
        {progress ? (
          <div className="w-64 flex flex-col items-center gap-2">
            <div className="w-full h-2 bg-[#2a2a35] rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${displayPct}%` }} />
            </div>
            <p className="text-gray-500 text-sm">{displayPct}% — Resolving {progress.processed}/{progress.discovered} nodes…</p>
          </div>
        ) : (
          <p className="text-gray-500">Initiating BFS graph resolution…</p>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-gray-100 mb-1">Graph Resolution Failed</h3>
        <p className="text-red-400 text-sm">{(error as any)?.message || 'Unknown error'}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Sub-view toggle */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex bg-[#1a1a2e]/60 p-1 rounded-lg border border-[#2a2a35]">
          <button
            onClick={() => setSubView('dashboard')}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              subView === 'dashboard' ? 'bg-[#12121a] text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Table2 className="w-4 h-4" /> Dashboard
          </button>
          <button
            onClick={() => setSubView('topology')}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              subView === 'topology' ? 'bg-[#12121a] text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Network className="w-4 h-4" /> Topology
          </button>
        </div>

        {exploreMode && (
          <button
            onClick={() => { setExploreMode(false); setExploreEdge(null); }}
            className="text-xs text-amber-400 bg-amber-900/30 px-3 py-1.5 rounded-lg border border-amber-500/30 hover:bg-amber-900/50 transition-colors"
          >
            ✕ Exit Explore Mode
          </button>
        )}

        <div className="ml-auto text-xs text-gray-500">
          {data.nodes.length} nodes · {data.edges.length} edges
        </div>
      </div>

      {/* Content */}
      {subView === 'dashboard' ? (
        <DependencyHealthDashboard
          data={data}
          metrics={metricsData}
          depths={depthsData}
          libyearsBreakdown={libyearsData}
          vulnData={vulnData}
          onExploreEdge={handleExploreEdge}
        />
      ) : (
        <div className="flex-1 rounded-xl border border-[#2a2a35] overflow-hidden bg-[#0a0a12] relative" style={{ minHeight: '500px' }}>
          <GraphCanvas
            data={explorerSubgraph || data}
            onNodeSelect={setSelectedNode}
            selectedNode={selectedNode}
          />
        </div>
      )}
    </div>
  );
}
