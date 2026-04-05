import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { BarChart3, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import MetricTooltip from '../components/MetricTooltip';
import { METHOD_METRICS } from '../data/metricDefinitions';

const fetchHotspots = async (slug: string) => {
  const { data } = await axios.get(`${import.meta.env.VITE_METHOD_API_URL}/methods/${slug}/hotspots?limit=50`);
  return data as any[];
};

export default function HotspotDashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const project = searchParams.get('project');

  const { data: hotspots, isLoading, error } = useQuery({
    queryKey: ['method-hotspots', project],
    queryFn: () => fetchHotspots(project!),
    enabled: !!project,
  });

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold">No Project Selected</h2>
        <button onClick={() => navigate('/methods')} className="mt-4 px-4 py-2 border rounded shadow-sm hover:bg-[#1a1a2e]">Back to Explorer</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a12]">
      <header className="bg-[#12121a] border-b border-[#2a2a35] px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center">
          <button onClick={() => navigate('/methods')} className="mr-4 p-2 text-gray-500 hover:text-gray-500 hover:bg-[#2a2a35] rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-100 flex items-center">
              <BarChart3 className="w-6 h-6 text-rose-500 mr-2" />
              Method Hotspots
            </h1>
            <p className="text-sm text-gray-500 font-mono mt-0.5">{project}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-[#12121a] p-6 rounded-xl border border-[#2a2a35] shadow-sm">
             <h2 className="text-lg font-bold text-gray-200 mb-2">Composite Risk Architecture</h2>
             <p className="text-sm text-gray-500 max-w-3xl">
               Methods designated as hotspots sit at critical junctions within the application.
               Their risk score is calculated via <code className="bg-[#2a2a35] px-1 py-0.5 rounded text-rose-400">Complexity × Centrality × Blast Radius</code>.
               Refactoring these limits structural coupling constraints.
             </p>
          </div>

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-4" />
              <p className="text-gray-500 font-medium">Computing topological centrality rankings...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-900/50 p-6 rounded-xl text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
              <p className="text-red-400 font-medium">Failed to compute hotspot limits.</p>
            </div>
          )}

          {hotspots && (
            <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm text-gray-500">
                <thead className="bg-[#0a0a12] border-b border-[#2a2a35] text-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Method Signature</th>
                    <th className="px-6 py-4 font-semibold text-right">
                      <MetricTooltip metric={METHOD_METRICS.methodComplexity}>Complexity</MetricTooltip>
                    </th>
                    <th className="px-6 py-4 font-semibold text-right">
                      <MetricTooltip metric={METHOD_METRICS.methodBlastRadius}>Blast Radius</MetricTooltip>
                    </th>
                    <th className="px-6 py-4 font-semibold text-right">
                      <MetricTooltip metric={METHOD_METRICS.methodCentrality}>Centrality</MetricTooltip>
                    </th>
                    <th className="px-6 py-4 font-semibold text-right">
                      <MetricTooltip metric={METHOD_METRICS.compositeRisk}>Risk Score</MetricTooltip>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {hotspots.map((item, i) => (
                    <tr key={item.method.id} className="hover:bg-[#0a0a12]/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className="font-bold text-gray-500 mr-3 w-4 text-xs">{i + 1}</span>
                          <div>
                            <p className="font-mono font-medium text-gray-200 text-xs">{item.method.name}</p>
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5 max-w-sm truncate" title={item.method.file_path}>
                              {item.method.file_path}:{item.method.start_line}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.metrics.complexity > 10 ? <AlertCircle className="w-3.5 h-3.5 text-amber-500"/> : null}
                          {item.metrics.complexity}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-purple-400">{item.metrics.blast_radius || 0}</td>
                      <td className="px-6 py-4 text-right font-mono text-indigo-400">{(item.metrics.betweenness_centrality || 0).toFixed(4)}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-rose-400">
                         {item.composite_risk > 1000 ? (item.composite_risk / 1000).toFixed(1) + 'k' : Math.round(item.composite_risk)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
