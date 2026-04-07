import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePackageIdentity } from '../../context/PackageContext';
import { useMethodMeta, useMethodHotspots, useMethodCommunities, useMethodGraph, ingestMethodData } from '../../hooks/useMethodQuery';
import MetricTooltip from '../../components/MetricTooltip';
import { METHOD_METRICS } from '../../data/metricDefinitions';
import MethodCallGraph from '../../components/MethodCallGraph';
import MethodHealthDashboard from '../../components/MethodHealthDashboard';
import { Loader2, Database, Box, BarChart3, Users, PlayCircle, AlertCircle } from 'lucide-react';

type SubView = 'summary' | 'callgraph' | 'hotspots' | 'communities';

export default function ArchitectureTab() {
  const { ecosystem, packageName, version, projectSlug } = usePackageIdentity();
  const queryClient = useQueryClient();

  const [subView, setSubView] = useState<SubView>('summary');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestProgress, setIngestProgress] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const { data: metaData, isLoading: metaLoading } = useMethodMeta(projectSlug);
  const { data: hotspots, isLoading: hotspotsLoading } = useMethodHotspots(projectSlug, 50);
  const { data: communities } = useMethodCommunities(projectSlug);
  const { data: graphData, isLoading: graphLoading } = useMethodGraph(projectSlug, subView === 'callgraph');

  const handleIngest = useCallback(async () => {
    if (!packageName) return;
    setIsIngesting(true);
    setIngestProgress('Submitting ingestion request…');
    try {
      setIngestProgress('Downloading and parsing AST…');
      await ingestMethodData(ecosystem, packageName, version);
      setIngestProgress('Ingestion complete! Refreshing data…');
      // Invalidate all method queries for this project
      await queryClient.invalidateQueries({ queryKey: ['method-meta', projectSlug] });
      await queryClient.invalidateQueries({ queryKey: ['method-hotspots', projectSlug] });
      await queryClient.invalidateQueries({ queryKey: ['method-communities', projectSlug] });
      await queryClient.invalidateQueries({ queryKey: ['method-graph', projectSlug] });
      setIngestProgress('');
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Ingestion failed';
      setIngestProgress(`Error: ${detail}`);
      setTimeout(() => setIngestProgress(''), 5000);
    } finally {
      setIsIngesting(false);
    }
  }, [ecosystem, packageName, projectSlug, queryClient]);

  const isSupportedEcosystem = ['pypi', 'npm'].includes(ecosystem?.toLowerCase() || '');

  const hasNoResults = !metaLoading && (!metaData || metaData.method_count === 0);

  // No method data available — show ingest prompt
  if (hasNoResults) {
    const wasAnalyzedEmpty = metaData && metaData.method_count === 0;
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Database className="w-12 h-12 text-gray-600 mb-4" />
        {isSupportedEcosystem ? (
          <>
            <h3 className="text-lg font-bold text-gray-200 mb-2">
              {wasAnalyzedEmpty ? 'No Methods Detected' : 'No Internal Architecture Data'}
            </h3>
            <p className="text-gray-500 text-sm max-w-md mb-6">
              {wasAnalyzedEmpty
                ? 'A previous analysis returned 0 methods — this may be a meta-package or the source code was not correctly extracted. Click below to re-analyze with updated extraction logic.'
                : 'Analyze this package\'s source code to extract method-level call graphs, hotspots, and community structures.'}
            </p>
            <button
              onClick={handleIngest}
              disabled={isIngesting}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
            >
              {isIngesting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Box className="w-5 h-5" />
                  {wasAnalyzedEmpty ? 'Re-Analyze' : 'Ingest & Analyze'}
                </>
              )}
            </button>
            {ingestProgress && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                {isIngesting && <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />}
                <span className={ingestProgress.startsWith('Error') ? 'text-rose-400' : 'text-emerald-400'}>
                  {ingestProgress}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <AlertCircle className="w-12 h-12 text-amber-500/50 mb-4" />
            <h3 className="text-lg font-bold text-gray-200 mb-2">Ecosystem Not Yet Supported</h3>
            <p className="text-amber-400/70 text-sm max-w-md">
              Internal architecture extraction for <strong>{ecosystem}</strong> packages requires an additional parser plugin.
              Currently supporting: PyPI, NPM.
            </p>
          </>
        )}
      </div>
    );
  }

  if (metaLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-4" />
        <p className="text-gray-500">Loading internal architecture data…</p>
      </div>
    );
  }

  const orphanRatio = metaData ? ((hotspots?.[0]?.metrics?.is_orphan ? 1 : 0) / (metaData.method_count || 1) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Sub-view toggle */}
      <div className="flex items-center gap-2">
        <div className="flex bg-[#1a1a2e]/60 p-1 rounded-lg border border-[#2a2a35]">
          {[
            { key: 'summary' as SubView, label: 'Summary', icon: Box },
            { key: 'callgraph' as SubView, label: 'Call Graph', icon: PlayCircle },
            { key: 'hotspots' as SubView, label: 'Hotspots', icon: BarChart3 },
            { key: 'communities' as SubView, label: 'Communities', icon: Users },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSubView(tab.key)}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                subView === tab.key ? 'bg-[#12121a] text-emerald-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Sub-View */}
      {subView === 'summary' && metaData && (
        <div className="bg-[#12121a] rounded-xl border border-[#2a2a35] p-6">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Box className="w-4 h-4 text-emerald-400" />
            Internal Architecture Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 font-mono text-sm">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <MetricTooltip metric={METHOD_METRICS.methods}><span className="text-gray-500">Methods</span></MetricTooltip>
              <span className="text-gray-100">{metaData.method_count.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <MetricTooltip metric={METHOD_METRICS.classes}><span className="text-gray-500">Classes</span></MetricTooltip>
              <span className="text-gray-100">{metaData.class_count.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <MetricTooltip metric={METHOD_METRICS.modules}><span className="text-gray-500">Modules</span></MetricTooltip>
              <span className="text-gray-100">{metaData.module_count.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <MetricTooltip metric={METHOD_METRICS.edgeCount}><span className="text-gray-500">Edge Count</span></MetricTooltip>
              <span className="text-emerald-400 font-bold">{metaData.edge_count.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <MetricTooltip metric={METHOD_METRICS.resolutionRate}><span className="text-gray-500">Resolution Rate</span></MetricTooltip>
              <span className={`font-bold ${metaData.resolution_rate < 0.75 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {(metaData.resolution_rate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <MetricTooltip metric={METHOD_METRICS.communities}><span className="text-gray-500">Communities</span></MetricTooltip>
              <span className="text-gray-100">{communities ? Object.keys(communities).length : 0}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <MetricTooltip metric={METHOD_METRICS.orphanRatio}><span className="text-gray-500">Orphan Ratio</span></MetricTooltip>
              <span className="text-amber-400">~{orphanRatio}%</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-2 col-span-2">
              <MetricTooltip metric={METHOD_METRICS.topHotspot}><span className="text-gray-500">Top Hotspot</span></MetricTooltip>
              <span className="text-rose-400 truncate max-w-[200px]" title={hotspots?.[0]?.method.name}>
                {hotspots?.[0]?.method.name || 'N/A'}{' '}
                <span className="opacity-50 text-xs">
                  (risk: {hotspots?.[0]?.composite_risk ? (hotspots[0].composite_risk > 1000 ? (hotspots[0].composite_risk/1000).toFixed(1)+'k' : Math.round(hotspots[0].composite_risk)) : '0'})
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Call Graph Sub-View */}
      {subView === 'callgraph' && (
        graphLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-4" />
            <p className="text-gray-500">Loading call graph…</p>
          </div>
        ) : graphData ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-[#2a2a35] overflow-hidden bg-[#0a0a12]" style={{ minHeight: '500px' }}>
              <MethodCallGraph
                data={graphData}
                onNodeSelect={setSelectedNodeId}
                highlightedNodes={selectedNodeId ? [selectedNodeId] : undefined}
              />
            </div>
            {selectedNodeId && graphData?.nodes && (
              <MethodHealthDashboard
                data={graphData}
                onMethodSelect={setSelectedNodeId}
              />
            )}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">No call graph data available.</div>
        )
      )}

      {/* Hotspots Sub-View */}
      {subView === 'hotspots' && (
        hotspotsLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-rose-400 animate-spin mb-4" />
            <p className="text-gray-500">Loading hotspots…</p>
          </div>
        ) : hotspots && hotspots.length > 0 ? (
          <div className="bg-[#12121a] rounded-xl border border-[#2a2a35] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#2a2a35] bg-[#0a0a12]">
              <h3 className="font-bold text-gray-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-rose-500" />
                Method Hotspots
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Risk Score = <code className="bg-[#2a2a35] px-1 py-0.5 rounded text-rose-400">Complexity × Centrality × Blast Radius</code>
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0a0a12] text-gray-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3 text-center">Fan-In</th>
                    <th className="px-4 py-3 text-center">Fan-Out</th>
                    <th className="px-4 py-3 text-center">Complexity</th>
                    <th className="px-4 py-3 text-center">Centrality</th>
                    <th className="px-4 py-3 text-center">Blast Radius</th>
                    <th className="px-4 py-3 text-right">Risk Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {hotspots.map((h: any, i: number) => (
                    <tr key={h.method.name} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-gray-500 font-mono">{i + 1}</td>
                      <td className="px-4 py-3 font-mono text-gray-200 truncate max-w-[300px]" title={h.method.name}>
                        {h.method.name}
                      </td>
                      <td className="px-4 py-3 text-center text-emerald-400 font-mono">{h.metrics.in_degree}</td>
                      <td className="px-4 py-3 text-center text-blue-400 font-mono">{h.metrics.out_degree}</td>
                      <td className="px-4 py-3 text-center text-amber-400 font-mono">{h.metrics.cyclomatic_complexity ?? '—'}</td>
                      <td className="px-4 py-3 text-center text-purple-400 font-mono">{h.metrics.betweenness_centrality?.toFixed(4) ?? '—'}</td>
                      <td className="px-4 py-3 text-center text-indigo-400 font-mono">{h.metrics.blast_radius ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-rose-400 font-mono">
                        {h.composite_risk > 1000 ? `${(h.composite_risk / 1000).toFixed(1)}k` : Math.round(h.composite_risk)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">No hotspot data available.</div>
        )
      )}

      {/* Communities Sub-View */}
      {subView === 'communities' && (
        communities ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(communities).map(([communityId, members]) => (
              <div key={communityId} className="bg-[#12121a] rounded-xl border border-[#2a2a35] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-200 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Community {communityId}
                  </h4>
                  <span className="text-xs text-gray-500 font-mono">{(members as any[]).length} members</span>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                  {(members as any[]).slice(0, 20).map((m: any) => (
                    <div key={m.id || m} className="text-xs font-mono text-gray-400 truncate px-2 py-1 rounded bg-white/[0.02]">
                      {m.id || m.name || m}
                    </div>
                  ))}
                  {(members as any[]).length > 20 && (
                    <div className="text-xs text-gray-600 px-2 py-1">+{(members as any[]).length - 20} more…</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">No community data available.</div>
        )
      )}
    </div>
  );
}
