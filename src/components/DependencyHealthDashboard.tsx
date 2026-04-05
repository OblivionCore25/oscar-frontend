import { useState, useMemo } from 'react';
import { 
  Network, AlertTriangle, Layers, Watch, Search, 
  CheckCircle2, Lock, ShieldAlert, ShieldCheck
} from 'lucide-react';
import type { TransitiveGraphResponse, PackageDetailsResponse } from '../types/api';

interface DependencyHealthDashboardProps {
  data: TransitiveGraphResponse;
  metrics: PackageDetailsResponse | undefined;
  depths: Record<string, number> | undefined;
  libyearsBreakdown: Record<string, number> | undefined;
  onExploreEdge: (edge: { source: string; target: string }) => void;
}

export default function DependencyHealthDashboard({ data, metrics, depths, libyearsBreakdown, onExploreEdge }: DependencyHealthDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [constraintFilter, setConstraintFilter] = useState<'All' | 'Unconstrained' | 'Pinned' | 'Healthy'>('All');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'riskPriority', // Custom heuristic
    direction: 'desc'
  });
  const [selectedEdge, setSelectedEdge] = useState<any | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const m = metrics?.metrics;

  // --- 1. Edge Classification ---
  const classifyConstraint = (constraint: string | null) => {
    if (!constraint || constraint === 'unconstrained') return 'Unconstrained';
    if (constraint.startsWith('==') || constraint.includes('===')) return 'Pinned';
    return 'Healthy';
  };

  const getConstraintBadgeStyle = (classification: string) => {
    if (classification === 'Unconstrained') return 'bg-red-500/20 text-red-400 border border-red-500/30';
    if (classification === 'Pinned') return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
  };

  const mappedEdges = useMemo(() => {
    // Compute Local Fan-In (how many things in this tree depend on the target)
    const localFanIn: Record<string, number> = {};
    data.edges.forEach(e => {
       localFanIn[e.target] = (localFanIn[e.target] || 0) + 1;
    });

    const extractPkgId = (id: string) => {
      if (!id) return '';
      let core = id.includes(':') ? id.split(':', 2)[1] : id;
      if (core.startsWith('@')) {
        const parts = core.split('@');
        return '@' + parts[1]; // keep scoped name, drop version
      }
      return core.split('@')[0];
    };

    const depthByPkg = Object.fromEntries(
      Object.entries(depths || {}).map(([k, v]) => [extractPkgId(k), v])
    );
    const libyearsByPkg = Object.fromEntries(
      Object.entries(libyearsBreakdown || {}).map(([k, v]) => [extractPkgId(k), v])
    );

    return data.edges.map(e => {
      const tgtId = extractPkgId(e.target);

      const cls = classifyConstraint(e.constraint);
      const depth = depthByPkg[tgtId] ?? 0;
      const libyears = libyearsByPkg[tgtId];
      
      // Compute sort heuristic: Unconstrained first, then deeper, then more local dependents
      let priority = 0;
      if (cls === 'Unconstrained') priority += 10000;
      if (cls === 'Pinned') priority += 5000;
      priority += depth * 100;
      priority += (libyears || 0) * 50;
      priority += (localFanIn[e.target] || 0);

      return {
        ...e,
        classification: cls,
        depth,
        libyears,
        localFanIn: localFanIn[e.target] || 1,
        riskPriority: priority
      };
    });
  }, [data.edges, depths]);

  // Constraint Stats for KPI
  const constraintStats = useMemo(() => {
    let unconstrained = 0;
    let pinned = 0;
    let healthy = 0;
    mappedEdges.forEach(e => {
      if (e.classification === 'Unconstrained') unconstrained++;
      else if (e.classification === 'Pinned') pinned++;
      else healthy++;
    });
    return { unconstrained, pinned, healthy, total: mappedEdges.length };
  }, [mappedEdges]);

  // --- 2. Filter ---
  const filteredEdges = useMemo(() => {
    return mappedEdges.filter(e => {
      const matchSearch = e.target.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.source.toLowerCase().includes(searchTerm.toLowerCase());
      const matchConstraint = constraintFilter === 'All' ? true : e.classification === constraintFilter;
      return matchSearch && matchConstraint;
    });
  }, [mappedEdges, searchTerm, constraintFilter]);

  // --- 3. Sorting ---
  const sortedEdges = useMemo(() => {
    return [...filteredEdges].sort((a: any, b: any) => {
       const valA = a[sortConfig.key] || 0;
       const valB = b[sortConfig.key] || 0;
       if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
       if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
       return 0;
    });
  }, [filteredEdges, sortConfig]);

  // Pagination Slice
  const totalPages = Math.ceil(sortedEdges.length / Math.max(1, pageSize));
  const validCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedEdges = sortedEdges.slice((validCurrentPage - 1) * pageSize, validCurrentPage * pageSize);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <span className="opacity-0 group-hover:opacity-30 inline-block w-4">↕</span>;
    return <span className="text-indigo-400 inline-block w-4">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="w-full h-full flex flex-col relative bg-[#0a0a12] overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Main Scrolling Content */}
        <div className="flex-1 overflow-y-auto w-full p-4 md:p-6 pb-20 scroll-smooth custom-scrollbar">
          
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
             <div className="bg-[#12121a] p-4 rounded-xl border border-white/5 shadow-sm">
                <div className="flex items-center text-slate-400 mb-1">
                   <Network className="w-4 h-4 mr-2" />
                   <span className="text-xs font-semibold uppercase tracking-wider">Direct Deps</span>
                </div>
                <div className="text-2xl font-bold text-slate-100">{m?.directDependencies ?? '-'}</div>
             </div>
             
             <div className="bg-[#12121a] p-4 rounded-xl border border-white/5 shadow-sm">
                <div className="flex items-center text-slate-400 mb-1">
                   <Layers className="w-4 h-4 mr-2" />
                   <span className="text-xs font-semibold uppercase tracking-wider">Transitive Depth</span>
                </div>
                <div className="flex items-end gap-2">
                   <div className="text-2xl font-bold text-slate-100">{m?.transitiveDepth ?? '-'}</div>
                   {m && (
                     <div className={`text-xs px-2 py-0.5 rounded-full mb-1 font-bold ${m.transitiveDepth! >= 7 ? 'bg-rose-500/20 text-rose-400' : m.transitiveDepth! >= 4 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {m.transitiveDepth! >= 7 ? 'Deep' : m.transitiveDepth! >= 4 ? 'Moderate' : 'Shallow'}
                     </div>
                   )}
                </div>
             </div>

             <div className="bg-[#12121a] p-4 rounded-xl border border-white/5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full flex items-center justify-center blur-lg"></div>
                <div className="flex items-center text-slate-400 mb-1 relative z-10">
                   <Watch className="w-4 h-4 mr-2 text-amber-500/70" />
                   <span className="text-xs font-semibold uppercase tracking-wider">Libyears Debt</span>
                </div>
                <div className="flex items-end gap-2 relative z-10">
                   <div className="text-2xl font-bold text-slate-100">{m?.libyears !== undefined ? m.libyears.toFixed(1) : '-'}</div>
                   {m && (
                     <div className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold mb-1 ${m.libyears! > 10 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' : m.libyears! > 2 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'}`}>
                        {m.libyears! > 10 ? 'Severe' : m.libyears! > 2 ? 'Lagging' : 'Fresh'}
                     </div>
                   )}
                </div>
             </div>

             <div className="bg-[#12121a] p-4 rounded-xl border border-white/5 shadow-sm">
                <div className="flex items-center text-slate-400 mb-1">
                   <AlertTriangle className="w-4 h-4 mr-2 text-rose-400/70" />
                   <span className="text-xs font-semibold uppercase tracking-wider">Diamond Conflicts</span>
                </div>
                <div className="text-2xl font-bold text-slate-100">{m?.diamondCount ?? '-'}</div>
             </div>

             <div 
               className="bg-[#12121a] p-3 rounded-xl border border-white/5 shadow-sm flex flex-col justify-center relative overflow-hidden cursor-pointer hover:border-indigo-500/30 transition-colors group"
               onClick={() => {
                 setConstraintFilter(constraintFilter === 'Unconstrained' ? 'All' : 'Unconstrained');
                 setCurrentPage(1);
               }}
               title="Click to filter Unconstrained edges"
             >
                <div className="flex justify-between items-center mb-2">
                   <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-indigo-400 transition-colors">Constraint Health</span>
                   {constraintStats.unconstrained > 0 ? <ShieldAlert className="w-4 h-4 text-rose-500" /> : <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                </div>
                <div className="flex h-3 w-full rounded-full overflow-hidden bg-[#0a0a12] border border-white/10 mb-2">
                   {constraintStats.total > 0 && (
                     <>
                        <div style={{ width: `${(constraintStats.unconstrained / constraintStats.total) * 100}%` }} className="bg-rose-500 h-full"></div>
                        <div style={{ width: `${(constraintStats.pinned / constraintStats.total) * 100}%` }} className="bg-amber-500 h-full"></div>
                        <div style={{ width: `${(constraintStats.healthy / constraintStats.total) * 100}%` }} className="bg-emerald-500 h-full"></div>
                     </>
                   )}
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase">
                   <span className="text-rose-400/80">{constraintStats.unconstrained} Unconstrained</span>
                   <span className="text-emerald-400/80">{constraintStats.healthy} Healthy</span>
                </div>
             </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-4 items-center justify-between bg-[#12121a] p-3 rounded-lg border border-white/5 shadow-sm">
             <div className="w-full sm:w-80 relative">
               <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
               <input 
                 type="text" 
                 placeholder="Search dependency or parent..." 
                 value={searchTerm}
                 onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                 className="w-full pl-9 pr-4 py-2 bg-[#0a0a12] border border-[#2a2a35] focus:border-indigo-500 rounded-md text-sm text-slate-200 outline-none transition-colors"
               />
             </div>
             
             <div className="flex gap-2 border bg-[#0a0a12] border-[#2a2a35] p-1 rounded-lg">
               {['All', 'Unconstrained', 'Pinned', 'Healthy'].map(k => (
                 <button 
                   key={k}
                   onClick={() => { setConstraintFilter(k as any); setCurrentPage(1); }}
                   className={`px-3 py-1.5 text-xs font-semibold tracking-wide rounded-md transition-colors ${constraintFilter === k ? 'bg-indigo-500/20 text-indigo-300 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1a24]'}`}
                 >
                   {k === 'Unconstrained' && '⚠️ '}
                   {k === 'Pinned' && '🔒 '}
                   {k === 'Healthy' && '✓ '}
                   {k}
                 </button>
               ))}
             </div>
          </div>

          <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl shadow-sm overflow-x-auto min-h-[500px]">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="bg-[#0a0a12] border-b border-[#2a2a35] text-slate-300 select-none">
                <tr>
                  <th className="px-4 py-3 font-semibold group cursor-pointer w-1/3" onClick={() => requestSort('target')}>
                    Dependency <SortIcon columnKey="target" />
                  </th>
                  <th className="px-4 py-3 font-semibold group cursor-pointer w-1/3" onClick={() => requestSort('source')}>
                    Required By <SortIcon columnKey="source" />
                  </th>
                  <th className="px-4 py-3 font-semibold group cursor-pointer" onClick={() => requestSort('riskPriority')}>
                    Constraint <SortIcon columnKey="riskPriority" />
                  </th>
                  <th className="px-4 py-3 font-semibold group cursor-pointer text-center" onClick={() => requestSort('depth')}>
                    Depth <SortIcon columnKey="depth" />
                  </th>
                  <th className="px-4 py-3 font-semibold group cursor-pointer text-center" onClick={() => requestSort('libyears')}>
                    Libyears <SortIcon columnKey="libyears" />
                  </th>
                  <th className="px-4 py-3 font-semibold group cursor-pointer text-center" onClick={() => requestSort('localFanIn')}>
                    Local Fan-In <SortIcon columnKey="localFanIn" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedEdges.map((e, idx) => (
                  <tr 
                    key={`${e.source}-${e.target}-${idx}`} 
                    onClick={() => setSelectedEdge(e)}
                    className={`cursor-pointer transition-colors ${selectedEdge?.source === e.source && selectedEdge?.target === e.target ? 'bg-indigo-900/20 hover:bg-indigo-900/30' : 'hover:bg-white/[0.02]'}`}
                  >
                    <td className="px-4 py-3 min-w-0 max-w-xs">
                       <span className="font-mono font-medium text-slate-200 truncate block" title={e.target}>{e.target}</span>
                       <span className="text-[10px] text-slate-500 font-mono block truncate">Edge Target</span>
                    </td>
                    <td className="px-4 py-3 min-w-0 max-w-xs">
                       <span className="font-mono text-slate-400 truncate block" title={e.source}>{e.source}</span>
                       <span className="text-[10px] text-slate-500 font-mono block truncate">Edge Source</span>
                    </td>
                    <td className="px-4 py-3">
                       {e.constraint ? (
                         <span className={`font-mono text-xs px-2 py-0.5 rounded-full font-bold ${getConstraintBadgeStyle(e.classification)}`}>
                            {e.constraint}
                         </span>
                       ) : (
                         <span className={`font-mono text-xs px-2 py-0.5 rounded-full font-bold ${getConstraintBadgeStyle('Unconstrained')}`}>
                            unconstrained
                         </span>
                       )}
                    </td>
                    <td className="px-4 py-3 text-center">
                       {e.depth === 0 ? (
                         <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 border border-indigo-500/20 rounded text-xs">ROOT</span>
                       ) : e.depth === 1 ? (
                         <span className="text-slate-300 font-semibold bg-slate-800 px-2 py-0.5 border border-white/10 rounded text-xs">Direct (1)</span>
                       ) : (
                         <span className="text-slate-500 font-medium">Transitive ({e.depth})</span>
                       )}
                    </td>
                    <td className="px-4 py-3 text-center">
                       {e.libyears !== undefined ? (
                         <span className={`font-mono text-xs px-2 py-0.5 rounded-full font-bold ${e.libyears > 5 ? 'bg-rose-500/20 text-rose-400' : e.libyears > 1 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                           {e.libyears === 0 ? '0.0' : e.libyears.toFixed(1)}
                         </span>
                       ) : (
                         <span className="text-slate-600 font-medium">-</span>
                       )}
                    </td>
                    <td className="px-4 py-3 text-center">
                       <span className="text-emerald-400 font-mono font-semibold">{e.localFanIn}</span>
                    </td>
                  </tr>
                ))}
                
                {paginatedEdges.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      No dependencies matched the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-[#2a2a35] bg-[#0a0a12] flex items-center justify-between text-sm text-slate-400">
                 <div>
                   Showing <span className="font-bold text-slate-300">{(validCurrentPage - 1) * pageSize + 1}</span> to <span className="font-bold text-slate-300">{Math.min(validCurrentPage * pageSize, sortedEdges.length)}</span> of <span className="font-bold text-slate-300">{sortedEdges.length}</span> edges
                 </div>
                 <div className="flex gap-1">
                   <button 
                     onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                     disabled={validCurrentPage === 1}
                     className="p-1 px-3 bg-[#12121a] border border-[#2a2a35] rounded disabled:opacity-50 hover:bg-[#1a1a24] transition-colors"
                   >
                     Prev
                   </button>
                   <button 
                     onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                     disabled={validCurrentPage === totalPages}
                     className="p-1 px-3 bg-[#12121a] border border-[#2a2a35] rounded disabled:opacity-50 hover:bg-[#1a1a24] transition-colors"
                   >
                     Next
                   </button>
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Slide-in Detail Panel (right) ── */}
        <div 
          className={`absolute top-0 right-0 bottom-0 w-80 bg-[#12121a] border-l border-[#2a2a35] shadow-2xl z-20 flex flex-col transition-transform duration-300 ease-in-out transform ${selectedEdge ? 'translate-x-0' : 'translate-x-[105%]'}`}
        >
           {selectedEdge && (
             <>
               <div className="px-5 py-6 border-b border-white/5 flex items-start justify-between bg-[#1a1a2e]/30">
                 <div>
                   <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                     <span className={`w-3 h-3 rounded-full flex-shrink-0 ${selectedEdge.classification === 'Unconstrained' ? 'bg-rose-500' : selectedEdge.classification === 'Pinned' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                     Edge Details
                   </h3>
                   <p className="text-xs text-slate-500 mt-1 font-mono break-all">{selectedEdge.target}</p>
                 </div>
                 <button 
                   onClick={() => setSelectedEdge(null)}
                   className="p-1 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded transition-colors"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                 </button>
               </div>

               <div className="flex-1 overflow-y-auto p-5 scroll-smooth custom-scrollbar">
                 <div className="space-y-6">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Target Node</span>
                      <div className="bg-[#0a0a12] p-3 rounded-lg border border-[#2a2a35] font-mono text-sm text-slate-200 break-all shadow-inner">
                        {selectedEdge.target}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Required By (Source)</span>
                      <div className="bg-[#0a0a12] p-3 rounded-lg border border-[#2a2a35] font-mono text-sm text-slate-200 break-all shadow-inner">
                        {selectedEdge.source}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                       <div className="bg-[#1a1a2e]/50 p-3 rounded-lg border border-white/5 shadow-sm">
                         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Depth</span>
                         <span className="text-xl font-bold text-slate-200">
                           {selectedEdge.depth === 0 ? '0' : selectedEdge.depth}
                           <span className="text-[10px] text-slate-500 font-normal ml-1 border border-slate-700 rounded px-1">{selectedEdge.depth === 1 ? 'Direct' : selectedEdge.depth === 0 ? 'Root' : 'Transitive'}</span>
                         </span>
                       </div>
                       <div className="bg-[#1a1a2e]/50 p-3 rounded-lg border border-white/5 shadow-sm">
                         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Libyears</span>
                         <span className={`text-xl font-bold ${selectedEdge.libyears > 5 ? 'text-rose-400' : selectedEdge.libyears > 1 ? 'text-amber-400' : selectedEdge.libyears !== undefined ? 'text-emerald-400' : 'text-slate-600'}`}>
                           {selectedEdge.libyears !== undefined ? (selectedEdge.libyears === 0 ? '0.0' : selectedEdge.libyears.toFixed(1)) : '-'}
                         </span>
                       </div>
                       <div className="bg-[#1a1a2e]/50 p-3 rounded-lg border border-white/5 shadow-sm">
                         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1 hover:text-indigo-400 transition-colors" title="How many dependencies in this graph rely on this node">
                           Local Fan-In
                         </span>
                         <span className="text-xl font-bold text-emerald-400">{selectedEdge.localFanIn}</span>
                       </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 flex items-center gap-2">
                        Constraint Health
                        {selectedEdge.classification === 'Unconstrained' ? <AlertTriangle className="w-3 h-3 text-rose-500" /> : selectedEdge.classification === 'Pinned' ? <Lock className="w-3 h-3 text-amber-500" /> : <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                      </span>
                      <div className={`p-4 rounded-lg border shadow-sm ${selectedEdge.classification === 'Unconstrained' ? 'bg-rose-900/10 border-rose-500/20' : selectedEdge.classification === 'Pinned' ? 'bg-amber-900/10 border-amber-500/20' : 'bg-emerald-900/10 border-emerald-500/20'}`}>
                         <span className={`block font-mono text-sm font-bold mb-2 ${selectedEdge.classification === 'Unconstrained' ? 'text-rose-400' : selectedEdge.classification === 'Pinned' ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {selectedEdge.constraint || 'unconstrained'}
                         </span>
                         <p className="text-xs text-slate-400 leading-relaxed">
                            {selectedEdge.classification === 'Unconstrained' && "This edge uses an unconstrained version mapping (like '*' or 'latest'). This introduces maximal supply chain risk as any upstream breaking change is instantly pulled down."}
                            {selectedEdge.classification === 'Pinned' && "This edge pins to a singular exact version. While deterministic, it is highly brittle and entirely blocks patching of newly discovered vulnerabilities in transitives."}
                            {selectedEdge.classification === 'Healthy' && "This edge uses a healthy semver range (e.g. '^1.2.0'), allowing automatic minor and patch security updates while preventing major breaking architectural API changes."}
                         </p>
                      </div>
                    </div>
                 </div>
               </div>

               <div className="p-5 border-t border-white/5 bg-[#0a0a12]">
                 <button 
                   onClick={() => onExploreEdge(selectedEdge)}
                   className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                 >
                   <Network className="w-4 h-4" />
                   Explore Call Graph
                 </button>
                 <p className="text-[10px] text-center text-slate-500 mt-3 leading-relaxed px-2">
                   Transitions to the physical node topology layout, isolating the local network graph to ±2 degrees of separation from this edge.
                 </p>
               </div>
             </>
           )}
        </div>
      </div>
    </div>
  );
}
