import { useState, useMemo } from 'react';
import { 
  ChevronDown,
  ChevronUp, 
  Search, 
  Network, 
  AlertCircle,
  Activity,
  GitMerge,
  Filter,
  Circle, Square, Triangle, Hexagon, Octagon, Box, Database, Cpu, Cloud, Star
} from 'lucide-react';
import { usePackageIdentity } from '../context/PackageContext';
import { useGitFileChurn } from '../hooks/useMethodQuery';
import MetricTooltip from './MetricTooltip';
import { METHOD_METRICS } from '../data/metricDefinitions';

interface MethodNode {
  id: string;
  name: string;
  file_path: string;
  class_name: string | null;
  kind: string;
  complexity: number;
  blast_radius?: number;
  fan_in?: number;
  fan_out?: number;
  betweenness_centrality?: number;
  community_id?: number;
  loc?: number;
  is_orphan?: boolean;
  change_frequency?: number;
  author_count?: number;
  last_modified?: string | null;
  git_scope?: 'method' | 'file' | null;
}

interface MethodHealthDashboardProps {
  data: {
    nodes: MethodNode[];
    edges: any[];
  };
  selectedNodeId?: string | null;
  onMethodSelect: (id: string) => void;
}

export default function MethodHealthDashboard({ data, selectedNodeId, onMethodSelect }: MethodHealthDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [kindFilter, setKindFilter] = useState<string>('All');
  const [communityFilter, setCommunityFilter] = useState<number | null>(null);
  const [showOnlyHotspots, setShowOnlyHotspots] = useState(false);
  const [showOnlyOrphans, setShowOnlyOrphans] = useState(false);
  const [showCommunityChart, setShowCommunityChart] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'risk_score',
    direction: 'desc'
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // --- 1. Compute KPIs ---
  const kpis = useMemo(() => {
    const total = data.nodes.length;
    let totalComplexity = 0;
    let orphans = 0;
    let hotspots = 0;

    data.nodes.forEach(n => {
      totalComplexity += n.complexity || 1;
      if (n.is_orphan) orphans++;
      if ((n.complexity || 1) > 10 && (n.blast_radius || 0) > 5) hotspots++;
    });

    const avgComplexity = total > 0 ? (totalComplexity / total).toFixed(1) : '0';
    const orphanRate = total > 0 ? ((orphans / total) * 100).toFixed(1) : '0';

    return { total, avgComplexity, orphanRate, hotspots };
  }, [data.nodes]);

  // --- 2. Filter & Calculate Risk Score ---
  // Risk Score = Complexity * Blast Radius * Centrality 
  // (using a base of +1 to avoid 0 cancellation)
  const { projectSlug } = usePackageIdentity();
  const { data: fileChurns } = useGitFileChurn(projectSlug);

  const churnMap = useMemo(() => {
    const map = new Map();
    if (fileChurns) {
      fileChurns.forEach((fc: any) => map.set(fc.file_path, fc));
    }
    return map;
  }, [fileChurns]);

  const mappedNodes = useMemo(() => {
    return data.nodes.map(n => {
      const cmp = Math.max(1, n.complexity || 1);
      const br = Math.max(1, n.blast_radius || 0);
      const cent = n.betweenness_centrality || 0;
      // Heuristic risk score mapping if external value provided wasn't pre-computed
      const riskScore = cmp * br * Math.max(0.001, cent * 100); 

      // Heuristic client-side join (Suffix matching for monorepos)
      let churn = churnMap.get(n.file_path);
      if (!churn && fileChurns) {
        churn = fileChurns.find((fc: any) => fc.file_path.endsWith('/' + n.file_path) || fc.file_path === n.file_path);
      }

      return {
        ...n,
        risk_score: riskScore,
        change_frequency: churn ? churn.commits : undefined,
        author_count: churn ? churn.author_count : undefined
      };
    });
  }, [data.nodes, churnMap]);

  const filteredNodes = useMemo(() => {
    return mappedNodes.filter(n => {
      const matchSearch = n.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          n.file_path.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (n.class_name && n.class_name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchKind = kindFilter === 'All' ? true : 
                        kindFilter === 'Function' ? n.kind === 'function' : 
                        kindFilter === 'Method' ? n.kind === 'method' : true;
      const matchCommunity = communityFilter === null || n.community_id === communityFilter;
      const matchHotspot = showOnlyHotspots ? ((n.complexity || 1) > 10 && (n.blast_radius || 0) > 5) : true;
      const matchOrphan = showOnlyOrphans ? n.is_orphan : true;
      
      return matchSearch && matchKind && matchCommunity && matchHotspot && matchOrphan;
    });
  }, [mappedNodes, searchTerm, kindFilter, communityFilter, showOnlyHotspots, showOnlyOrphans]);

  // --- 3. Sorting ---
  const sortedNodes = useMemo(() => {
    const sorted = [...filteredNodes].sort((a: any, b: any) => {
       const valA = a[sortConfig.key] || 0;
       const valB = b[sortConfig.key] || 0;
       
       if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
       if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
       return 0;
    });
    return sorted;
  }, [filteredNodes, sortConfig]);

  // Math references for inline bars
  const maxComplexity = Math.max(1, ...mappedNodes.map(n => n.complexity || 1));
  const maxBlastRadius = Math.max(1, ...mappedNodes.map(n => n.blast_radius || 0));

  // Pagination Slice
  const totalPages = Math.ceil(sortedNodes.length / pageSize);
  const paginatedNodes = sortedNodes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to page 1 on search
  };

  // Keep colors consistent with community view
  const getCommunityColor = (cid: any) => {
    const colors = ['#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fbbf24', '#2dd4bf', '#a3e635', '#38bdf8', '#818cf8', '#f87171'];
    const idx = cid ?? 0;
    return colors[idx % colors.length];
  };

  const getCommunityShape = (cid: any) => {
    const shapes = [Circle, Square, Triangle, Hexagon, Octagon, Box, Database, Cpu, Cloud, Star];
    const idx = cid ?? 0;
    return shapes[idx % shapes.length];
  };

  // Calculate generic community clusters for chart
  const communityCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    mappedNodes.forEach(n => {
      const c = n.community_id ?? 0;
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([id, count]) => ({ id: Number(id), count }))
      .sort((a, b) => b.count - a.count);
  }, [mappedNodes]);
  const maxCommunitySize = Math.max(1, ...communityCounts.map(c => c.count));

  // Table Helpers
  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <span className="opacity-0 group-hover:opacity-30 inline-block w-4">↕</span>;
    return <span className="text-indigo-400 inline-block w-4">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="w-full h-full flex flex-col relative bg-[#0a0a12] overflow-hidden">
      
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto w-full p-4 md:p-6 pb-20">
        
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
           <div className="bg-[#12121a] p-4 rounded-xl border border-white/5 shadow-sm">
              <div className="flex items-center text-slate-400 mb-1">
                 <Network className="w-4 h-4 mr-2" />
                 <span className="text-xs font-semibold uppercase tracking-wider">Total Methods</span>
              </div>
              <div className="text-2xl font-bold text-slate-100">{kpis.total.toLocaleString()}</div>
           </div>
           
           <div className="bg-[#12121a] p-4 rounded-xl border border-white/5 shadow-sm">
              <div className="flex items-center text-slate-400 mb-1">
                 <Activity className="w-4 h-4 mr-2" />
                 <span className="text-xs font-semibold uppercase tracking-wider">Avg Complexity</span>
              </div>
              <div className="flex items-end gap-2">
                 <div className="text-2xl font-bold text-slate-100">{kpis.avgComplexity}</div>
                 <div className={`text-xs px-2 py-0.5 rounded-full mb-1 font-bold ${Number(kpis.avgComplexity) > 8 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {Number(kpis.avgComplexity) > 8 ? 'High Risk' : 'Healthy'}
                 </div>
              </div>
           </div>

           <div 
             className={`p-4 rounded-xl shadow-sm relative overflow-hidden cursor-pointer transition-all ${showOnlyOrphans ? 'bg-slate-800/80 border-2 border-slate-400 scale-100' : 'bg-[#12121a] border border-white/5 hover:bg-[#1a1a24]'}`}
             onClick={() => { setShowOnlyOrphans(!showOnlyOrphans); setCurrentPage(1); }}
             title="Click to toggle Orphan Code filtering"
           >
              <div className="absolute top-0 right-0 w-16 h-16 bg-slate-500/10 rounded-bl-full blur-xl"></div>
              <div className={`flex items-center mb-1 relative z-10 ${showOnlyOrphans ? 'text-slate-200' : 'text-slate-400'}`}>
                 <Search className="w-4 h-4 mr-2" />
                 <span className="text-xs font-semibold uppercase tracking-wider">Orphan Code Rate</span>
              </div>
              <div className={`text-2xl font-bold relative z-10 ${showOnlyOrphans ? 'text-white' : 'text-slate-100'}`}>{kpis.orphanRate}%</div>
              
              {showOnlyOrphans && (
                <div className="absolute bottom-2 right-3 flex items-center text-[10px] text-slate-200 font-bold bg-slate-500/40 px-2 py-0.5 rounded-full">
                  Filtering Active
                </div>
              )}
           </div>

           <div 
             className={`p-4 rounded-xl shadow-sm relative overflow-hidden cursor-pointer transition-all ${showOnlyHotspots ? 'bg-rose-900/40 border-2 border-rose-500 scale-100' : 'bg-[#12121a] border border-rose-900/30 hover:bg-[#1a1a24]'}`}
             onClick={() => { setShowOnlyHotspots(!showOnlyHotspots); setCurrentPage(1); }}
             title="Click to toggle Hotspot filtering"
           >
              <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 rounded-bl-full blur-xl"></div>
              <div className={`flex items-center mb-1 relative z-10 ${showOnlyHotspots ? 'text-rose-300' : 'text-rose-400/80'}`}>
                 <AlertCircle className="w-4 h-4 mr-2" />
                 <span className="text-xs font-semibold uppercase tracking-wider">Top Hotspots</span>
              </div>
              <div className={`text-2xl font-bold relative z-10 ${showOnlyHotspots ? 'text-white' : 'text-rose-400'}`}>{kpis.hotspots}</div>
              
              {showOnlyHotspots && (
                <div className="absolute bottom-2 right-3 flex items-center text-[10px] text-rose-300 font-bold bg-rose-500/20 px-2 py-0.5 rounded-full">
                  Filtering Active
                </div>
              )}
           </div>
        </div>

        {/* Community Chart Collapse */}
        <div className="mb-6 bg-[#12121a] border border-white/5 rounded-xl shadow-sm overflow-hidden">
           <button 
             onClick={() => setShowCommunityChart(!showCommunityChart)}
             className="w-full p-4 flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
           >
             <div className="flex items-center text-sm font-semibold text-slate-300">
               <GitMerge className="w-4 h-4 mr-2 text-indigo-400" />
               Architectural Subsystem Drift (Louvain Communities)
             </div>
             {showCommunityChart ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
           </button>
           
           {showCommunityChart && (
             <div className="p-4 border-t border-white/5 animate-in slide-in-from-top-4 duration-300">
                <div className="flex flex-wrap gap-4 items-end h-32 px-2">
                  {communityCounts.map(c => (
                    <div 
                      key={c.id} 
                      className={`flex flex-col justify-end group cursor-pointer transition-transform hover:scale-105 ${communityFilter === c.id ? 'ring-2 ring-indigo-400 rounded-sm' : ''}`}
                      style={{ width: Math.max(12, Math.min(40, 400 / communityCounts.length)) }}
                      onClick={() => {
                        setCommunityFilter(communityFilter === c.id ? null : c.id);
                        setCurrentPage(1);
                      }}
                      title={`Community #${c.id}: ${c.count} methods`}
                    >
                      <div className="text-center text-[10px] text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{c.count}</div>
                      <div 
                        className="w-full rounded-t-sm" 
                        style={{ 
                          height: `${Math.max(5, (c.count / maxCommunitySize) * 100)}px`,
                          backgroundColor: getCommunityColor(c.id) 
                        }} 
                      />
                      <div className="flex justify-center mt-2 pb-1">
                        {(() => {
                           const Shape = getCommunityShape(c.id);
                           return <Shape className="w-3.5 h-3.5" style={{ color: getCommunityColor(c.id) }} strokeWidth={3} />;
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
                {communityFilter !== null && (
                  <div className="mt-4 flex justify-between items-center text-xs text-indigo-400 border-t border-white/5 pt-3">
                    <span>Filtering table by Community #{communityFilter}</span>
                    <button onClick={() => setCommunityFilter(null)} className="hover:text-indigo-300 underline">Clear Filter</button>
                  </div>
                )}
             </div>
           )}
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4 items-center justify-between bg-[#12121a] p-3 rounded-lg border border-white/5">
           <div className="w-full sm:w-80 relative">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
             <input 
               type="text" 
               placeholder="Search internal names or paths..." 
               value={searchTerm}
               onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
               className="w-full pl-9 pr-4 py-2 bg-[#0a0a12] border border-[#2a2a35] focus:border-indigo-500 rounded-md text-sm text-slate-200 outline-none transition-colors"
             />
           </div>
           
           <div className="flex gap-2">
             <div className="flex items-center text-xs font-semibold text-slate-500 mr-2 uppercase tracking-wider">
               <Filter className="w-3 h-3 mr-1" /> Kind
             </div>
             {['All', 'Function', 'Method'].map(k => (
               <button 
                 key={k}
                 onClick={() => { setKindFilter(k); setCurrentPage(1); }}
                 className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${kindFilter === k ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-[#0a0a12] text-slate-400 border border-[#2a2a35] hover:bg-[#1a1a24]'}`}
               >
                 {k}
               </button>
             ))}
           </div>
        </div>

        {/* Table View */}
        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-[#0a0a12] border-b border-[#2a2a35] text-slate-300 select-none">
              <tr>
                <th className="px-4 py-3 font-semibold group cursor-pointer" onClick={() => requestSort('name')}>
                  Method <SortIcon columnKey="name" />
                </th>
                <th className="px-4 py-3 font-semibold group cursor-pointer w-32" onClick={() => requestSort('complexity')}>
                  <div className="flex justify-between items-center">
                    <MetricTooltip metric={METHOD_METRICS.methodComplexity}><span className="border-b border-dashed border-gray-600 hover:border-gray-400 transition-colors pb-[1px]">Complexity</span></MetricTooltip>
                    <SortIcon columnKey="complexity" />
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold group cursor-pointer w-32" onClick={() => requestSort('blast_radius')}>
                  <div className="flex justify-between items-center">
                    <MetricTooltip metric={METHOD_METRICS.methodBlastRadius}><span className="border-b border-dashed border-gray-600 hover:border-gray-400 transition-colors pb-[1px]">Blast Rad.</span></MetricTooltip>
                    <SortIcon columnKey="blast_radius" />
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold group cursor-pointer w-24 text-center" onClick={() => requestSort('change_frequency')}>
                  <div className="flex flex-col items-center justify-center text-[10px]">
                    <MetricTooltip metric={METHOD_METRICS.methodChangeFrequency}><span className="text-xs mb-0.5 border-b border-dashed border-gray-600 hover:border-gray-400 transition-colors pb-[1px]">File Churn</span></MetricTooltip>
                    <SortIcon columnKey="change_frequency" />
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold group cursor-pointer w-20 text-center" onClick={() => requestSort('author_count')}>
                  <div className="flex flex-col items-center justify-center text-[10px]">
                    <MetricTooltip metric={METHOD_METRICS.methodAuthorCount}><span className="text-xs mb-0.5 border-b border-dashed border-gray-600 hover:border-gray-400 transition-colors pb-[1px]">File Auth.</span></MetricTooltip>
                    <SortIcon columnKey="author_count" />
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold group cursor-pointer w-24" onClick={() => requestSort('fan_in')}>
                  <div className="flex flex-col items-center justify-center text-[10px]">
                    <MetricTooltip metric={METHOD_METRICS.fanIO}><span className="text-xs mb-0.5 border-b border-dashed border-gray-600 hover:border-gray-400 transition-colors pb-[1px]">Fan I/O</span></MetricTooltip>
                    <SortIcon columnKey="fan_in" />
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold group cursor-pointer w-32 text-center" onClick={() => requestSort('community_id')}>
                  <MetricTooltip metric={METHOD_METRICS.communities}><span className="border-b border-dashed border-gray-600 hover:border-gray-400 transition-colors pb-[1px]">Community</span></MetricTooltip> <SortIcon columnKey="community_id" />
                </th>
                <th className="px-4 py-3 font-semibold group cursor-pointer w-28 text-right" onClick={() => requestSort('risk_score')}>
                  <MetricTooltip metric={METHOD_METRICS.compositeRisk}><span className="border-b border-dashed border-gray-600 hover:border-gray-400 transition-colors pb-[1px]">Risk Score</span></MetricTooltip> <SortIcon columnKey="risk_score" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedNodes.map((n) => {
                const isSelected = n.id === selectedNodeId;
                return (
                <tr 
                  key={n.id} 
                  onClick={() => onMethodSelect(n.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-emerald-900/20 border-l-2 border-emerald-500'
                      : 'hover:bg-white/[0.02] border-l-2 border-transparent'
                  }`}
                >
                  <td className="px-4 py-3 max-w-sm overflow-hidden">
                    <div className="flex items-center gap-2">
                       {n.is_orphan && <span className="w-2 h-2 rounded-full bg-slate-600" title="Orphan (Dead Code)" />}
                       <div>
                         <div className="font-mono text-slate-200 font-semibold truncate flex items-center gap-2">
                           {n.name}
                           {n.class_name && <span className="text-[10px] font-sans font-medium px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded">{n.class_name}</span>}
                         </div>
                         <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5" title={n.file_path}>
                           {n.file_path}
                         </div>
                       </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs w-6 text-right">{n.complexity || 1}</span>
                      <div className="flex-1 h-1.5 bg-[#0a0a12] rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${n.complexity && n.complexity > 10 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, ((n.complexity || 1) / maxComplexity) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs w-6 text-right text-purple-400">{n.blast_radius || 0}</span>
                      <div className="flex-1 h-1.5 bg-[#0a0a12] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${Math.min(100, ((n.blast_radius || 0) / maxBlastRadius) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center items-center">
                      {n.change_frequency !== undefined && n.change_frequency > 0 ? (
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                            n.change_frequency > 20 ? 'bg-rose-500/20 text-rose-400' :
                            n.change_frequency >= 5 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                          title={`File-level git churn (commits in analysis window for ${n.file_path})`}
                        >
                          {n.change_frequency}
                        </span>
                      ) : (
                        <span className="text-gray-600 font-mono text-xs">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center items-center">
                      {n.author_count !== undefined && n.author_count > 0 ? (
                        <span
                          className={`font-mono text-xs text-sky-400 font-bold`}
                          title={`Unique authors who touched ${n.file_path}`}
                        >
                          {n.author_count}
                        </span>
                      ) : (
                        <span className="text-gray-600 font-mono text-xs">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center font-mono text-[10px]">
                      <span className="text-emerald-400">{n.fan_in || 0}</span>
                      <span className="mx-1 text-slate-600">/</span>
                      <span className="text-amber-400">{n.fan_out || 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center items-center gap-1.5" title={`Community #${n.community_id}`}>
                      {(() => {
                         const Shape = getCommunityShape(n.community_id);
                         return <Shape className="w-4 h-4" style={{ color: getCommunityColor(n.community_id) }} strokeWidth={2.5} />;
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#0a0a12] font-mono text-xs font-bold text-slate-300">
                      {Math.round(n.risk_score || 0).toLocaleString()}
                    </div>
                  </td>
                </tr>
                );
              })}
              
              {paginatedNodes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No methods matched the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-[#2a2a35] bg-[#0a0a12] flex items-center justify-between text-sm text-slate-400">
               <div>
                 Showing <span className="font-bold text-slate-300">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-bold text-slate-300">{Math.min(currentPage * pageSize, sortedNodes.length)}</span> of <span className="font-bold text-slate-300">{sortedNodes.length}</span> methods
               </div>
               <div className="flex gap-1">
                 <button 
                   onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                   disabled={currentPage === 1}
                   className="p-1 px-3 bg-[#12121a] border border-[#2a2a35] rounded disabled:opacity-50 hover:bg-[#1a1a24]"
                 >
                   Prev
                 </button>
                 <button 
                   onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                   disabled={currentPage === totalPages}
                   className="p-1 px-3 bg-[#12121a] border border-[#2a2a35] rounded disabled:opacity-50 hover:bg-[#1a1a24]"
                 >
                   Next
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
