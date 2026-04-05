import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useGraphQuery, usePackageDetailsQuery, usePackageDepthsQuery, usePackageLibyearsQuery, useVulnerabilityQuery } from '../hooks/useGraphQuery';
import { useIngestedPackages } from '../hooks/useIngestedPackages';
import { ingestPackageMethod } from '../services/methodApi';
import GraphCanvas from '../components/GraphCanvas';
import DependencyHealthDashboard from '../components/DependencyHealthDashboard';
import Pagination from '../components/Pagination';
import { Network, Loader2, ArrowLeft, AlertCircle, FlaskConical, Database, Search } from 'lucide-react';

const LIB_PAGE_SIZE = 15;

export default function GraphViewer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [libOpen, setLibOpen] = useState(false);
  const [libSearch, setLibSearch] = useState('');
  const [libPage, setLibPage] = useState(1);
  const [selectedEdge, setSelectedEdge] = useState<{ source: string; target: string } | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const ecosystem = searchParams.get('ecosystem') ?? 'npm';
  const packageName = searchParams.get('package');
  const version = searchParams.get('version');

  const hasParams = !!(ecosystem && packageName && version);
  
  const [isIngestingMethod, setIsIngestingMethod] = useState(false);

  const [exploreMode, setExploreMode] = useState(false);
  const [exploreEdge, setExploreEdge] = useState<{ source: string; target: string } | null>(null);

  const { data, isLoading, error, progress } = useGraphQuery({ ecosystem, packageName, version });
  const { data: metricsData } = usePackageDetailsQuery({ ecosystem, packageName, version });
  const { data: depthsData } = usePackageDepthsQuery({ ecosystem, packageName, version });
  const { data: libyearsData } = usePackageLibyearsQuery({ ecosystem, packageName, version });
  const { data: vulnData } = useVulnerabilityQuery({ ecosystem, packageName, version });

  // Track monotonic maximum percentage
  const maxPctRef = useRef(0);
  useEffect(() => {
    maxPctRef.current = 0;
  }, [ecosystem, packageName, version]);

  let currentPct = 0;
  if (progress) {
    const total = Math.max(progress.discovered, progress.processed + progress.inQueue);
    currentPct = Math.floor((progress.processed / total) * 100);
    // Never let it jump backwards visually
    if (currentPct > maxPctRef.current) maxPctRef.current = currentPct;
  }
  const displayPct = maxPctRef.current;

  const handleMethodCallGraph = async () => {
    if (!packageName) return;
    setIsIngestingMethod(true);
    try {
      const res = await ingestPackageMethod(ecosystem, packageName);
      navigate(`/methods/graph?project=${res.project_slug}`);
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.detail || err.message || 'Failed to ingest method data.');
    } finally {
      setIsIngestingMethod(false);
    }
  };

  // Ingested packages for the library panel
  const { data: ingestedData } = useIngestedPackages(ecosystem);
  const filteredPackages = useMemo(() => {
    const q = libSearch.toLowerCase();
    return (ingestedData?.packages ?? []).filter(p =>
      !q || p.name.toLowerCase().includes(q)
    );
  }, [ingestedData, libSearch]);

  // Reset to page 1 whenever filter changes
  const libTotalPages = Math.ceil(filteredPackages.length / LIB_PAGE_SIZE);
  const libPageClamped = Math.min(libPage, libTotalPages || 1);
  const libPageSlice = filteredPackages.slice(
    (libPageClamped - 1) * LIB_PAGE_SIZE,
    libPageClamped * LIB_PAGE_SIZE,
  );

  // When the user jumps to a package from the library panel, navigate via URL
  const handleJump = (name: string, ver: string) => {
    navigate(`/graph?ecosystem=${ecosystem}&package=${encodeURIComponent(name)}&version=${encodeURIComponent(ver)}`);
    setLibOpen(false);
    setLibSearch('');
  };

  // Left-panel offset when lib is open
  const canvasClass = [
    'relative flex-1 transition-all duration-200 flex flex-col',
    libOpen ? 'ml-64' : '',
  ].join(' ');

  const handleExploreEdge = (edge: { source: string; target: string }) => {
    setExploreEdge(edge);
    setExploreMode(true);
  };

  const extractPkgId = (id: string) => {
    if (!id) return '';
    let core = id.includes(':') ? id.split(':', 2)[1] : id;
    if (core.startsWith('@')) {
      const parts = core.split('@');
      return '@' + parts[1];
    }
    return core.split('@')[0];
  };

  const renderNodeDetailsPanel = () => {
    if (!selectedNode || !data) return null;

    const nodeMeta = data.nodes.find((n: any) => n.id === selectedNode || n.name === selectedNode);
    // Pre-process variables so they ignore version discrepancies between constraint regexes and edge resolution algorithms
    const depthByPkg: Record<string, number> = {};
    if (depthsData) Object.entries(depthsData).forEach(([k, v]) => { depthByPkg[extractPkgId(k)] = v as number; });

    const libyearsByPkg: Record<string, number> = {};
    if (libyearsData) Object.entries(libyearsData).forEach(([k, v]) => { libyearsByPkg[extractPkgId(k)] = v as number; });

    const targetId = extractPkgId(selectedNode);

    const localFanIn = data.edges.filter((e: any) => (e.target.id || e.target) === selectedNode).length;
    const localFanOut = data.edges.filter((e: any) => (e.source.id || e.source) === selectedNode).length;

    const depth = depthByPkg[targetId] ?? 0;
    const libyears = libyearsByPkg[targetId];

    // Vulnerability data for this node
    const nodeVulns = (() => {
      if (!vulnData?.breakdown) return [];
      for (const [key, vulns] of Object.entries(vulnData.breakdown)) {
        const keyPkg = key.includes('@') ? key.split('@').slice(0, -1).join('@') : key;
        if (key === targetId || keyPkg === targetId || extractPkgId(key) === targetId) {
          return vulns as any[];
        }
      }
      return [];
    })();

    return (
      <div className="absolute top-0 right-0 bottom-0 w-80 bg-[#12121a]/95 backdrop-blur-xl border-l border-[#2a2a35] shadow-2xl flex flex-col z-50 shrink-0 transform-gpu transition-transform pointer-events-auto">
        <div className="px-5 py-4 border-b border-[#2a2a35]">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Selected Dependency</h3>
            <button onClick={() => setSelectedNode(null)} className="text-gray-500 hover:text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <p className="text-sm font-mono font-bold text-indigo-400 break-words">{nodeMeta?.name || targetId}</p>
          <p className="text-xs text-gray-500 font-mono mt-1">v{nodeMeta?.version || 'unknown'}</p>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-5">
           <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1a1a2e]/50 p-3 rounded-lg border border-white/5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Fan-In</span>
                <span className="text-xl font-bold text-emerald-400">{localFanIn}</span>
              </div>
              <div className="bg-[#1a1a2e]/50 p-3 rounded-lg border border-white/5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Fan-Out</span>
                <span className="text-xl font-bold text-blue-400">{localFanOut}</span>
              </div>
           </div>

           <div className="bg-[#1a1a2e]/50 p-3 rounded-lg border border-white/5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Path Depth</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-slate-200">{depth === 0 ? '0' : depth}</span>
                <span className="text-[10px] text-slate-500 font-normal border border-slate-700 rounded px-1">{depth === 1 ? 'Direct' : depth === 0 ? 'Root' : 'Transitive'}</span>
              </div>
           </div>

           <div className="bg-[#1a1a2e]/50 p-3 rounded-lg border border-white/5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Libyears Debt</span>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-bold ${libyears > 5 ? 'text-rose-400' : libyears > 1 ? 'text-amber-400' : libyears !== undefined ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {libyears !== undefined ? (libyears === 0 ? '0.0' : libyears.toFixed(1)) : '-'}
                </span>
                {libyears > 5 && <span className="bg-rose-500/20 text-rose-400 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Severe</span>}
              </div>
           </div>

           {/* Vulnerability section */}
           {nodeVulns.length > 0 ? (
             <div className="bg-rose-950/30 p-3 rounded-lg border border-rose-500/20">
               <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block mb-2">⚠ Known Vulnerabilities ({nodeVulns.length})</span>
               <div className="space-y-2 max-h-48 overflow-y-auto">
                 {nodeVulns.map((v: any) => (
                   <div key={v.id} className="bg-[#12121a]/60 p-2 rounded border border-white/5">
                     <div className="flex items-center justify-between mb-1">
                       <span className="text-xs font-mono font-bold text-rose-300">{v.id}</span>
                       <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                         v.severity === 'CRITICAL' ? 'bg-red-500/30 text-red-300' :
                         v.severity === 'HIGH' ? 'bg-orange-500/30 text-orange-300' :
                         v.severity === 'MODERATE' ? 'bg-amber-500/30 text-amber-300' :
                         v.severity === 'LOW' ? 'bg-sky-500/30 text-sky-300' :
                         'bg-slate-500/30 text-slate-400'
                       }`}>{v.severity}</span>
                     </div>
                     {v.summary && <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">{v.summary}</p>}
                     {v.aliases?.length > 0 && (
                       <div className="mt-1 flex gap-1 flex-wrap">
                         {v.aliases.map((a: string) => (
                           <span key={a} className="text-[9px] font-mono bg-slate-800 text-slate-400 px-1 rounded">{a}</span>
                         ))}
                       </div>
                     )}
                   </div>
                 ))}
               </div>
             </div>
           ) : (
             <div className="bg-emerald-950/20 p-3 rounded-lg border border-emerald-500/10">
               <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block mb-1">Vulnerability Status</span>
               <span className="text-sm text-emerald-400 font-medium">✓ No known CVEs</span>
             </div>
           )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a12] relative overflow-hidden">
      {/* Overlay Header */}
      <header className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto bg-[#12121a]/90 backdrop-blur-sm border border-[#2a2a35] shadow-sm rounded-lg px-4 py-3 flex items-center">
          <Network className="w-5 h-5 text-indigo-400 mr-3" />
          <div>
            <h1 className="text-sm font-bold text-gray-100 leading-none">
              {hasParams ? `${packageName} v${version}` : 'Dependency Health Dashboard'}
            </h1>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">
              {hasParams ? ecosystem : 'Awaiting Selection'}
            </p>
          </div>
        </div>

        <div className="pointer-events-auto flex gap-2">
          {/* Library toggle */}
          <button
            onClick={() => { setLibOpen((o: boolean) => !o); }}
            className={`border shadow-sm px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${
              libOpen
                ? 'bg-indigo-900/30 border-indigo-500/30 text-indigo-400'
                : 'bg-[#12121a] border-[#2a2a35] text-gray-300 hover:bg-[#1a1a2e]'
            }`}
          >
            <Database className="w-4 h-4" />
            DB Library
            {(ingestedData?.total ?? 0) > 0 && (
              <span className="bg-indigo-900/40 text-indigo-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {ingestedData!.total}
              </span>
            )}
          </button>

          {hasParams && (
            <button
              onClick={handleMethodCallGraph}
              disabled={isIngestingMethod}
              className="bg-[#12121a] border border-indigo-200 shadow-sm text-indigo-700 px-3 py-2 rounded-lg font-medium text-sm hover:bg-indigo-50 flex items-center transition-colors disabled:opacity-75 disabled:cursor-wait"
            >
              {isIngestingMethod ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FlaskConical className="w-4 h-4 mr-2" />
              )}
              {isIngestingMethod ? 'Parsing...' : 'Method Call Graph'}
            </button>
          )}

          {data && (
            <button
              onClick={() => {
                  if (exploreMode) {
                    setExploreMode(false);
                    setExploreEdge(null);
                    setSelectedNode(null);
                 } else {
                    setExploreMode(true);
                 }
              }}
              className={`bg-[#12121a] border shadow-sm px-3 py-2 rounded-lg font-medium text-sm flex items-center transition-colors gap-2 ${
                exploreMode
                  ? 'border-indigo-500/30 text-indigo-400 bg-indigo-900/30'
                  : 'border-[#2a2a35] text-gray-300 hover:bg-[#1a1a2e]'
              }`}
            >
              {exploreMode ? <ArrowLeft className="w-4 h-4" /> : <Network className="w-4 h-4" />}
              {exploreMode ? 'Back to Dashboard' : 'Explore Topology'}
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="bg-[#12121a] border border-[#2a2a35] shadow-sm text-gray-300 px-4 py-2 rounded-lg font-medium text-sm hover:bg-[#1a1a2e] flex items-center transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden pt-20">

        {/* ── DB Library Panel (left) ────────────────────────────────── */}
        {libOpen && (
          <div className="absolute top-0 left-0 bottom-0 pt-20 w-64 bg-[#12121a] border-r border-[#2a2a35] shadow-md flex flex-col z-20">
            <div className="px-4 py-3 border-b border-white/5 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-blue-500" />
                  <h2 className="text-sm font-bold text-gray-100">Observatory DB</h2>
                </div>
                <button
                  onClick={() => setLibOpen(false)}
                  className="text-gray-500 hover:text-gray-500 hover:bg-[#2a2a35] rounded p-0.5 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  value={libSearch}
                  onChange={e => { setLibSearch(e.target.value); setLibPage(1); }}
                  placeholder="Filter packages…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs text-white bg-black border border-[#2a2a35] rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1.5">
                {filteredPackages.length} of {ingestedData?.total ?? 0} packages
              </p>
            </div>

            <div className="overflow-y-auto flex-1">
              {libPageSlice.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-10">Nothing in DB yet.</p>
              ) : (
                libPageSlice.map((pkg: any) => {
                  const isCurrent = pkg.name === packageName && pkg.version === version;
                  return (
                    <button
                      key={`${pkg.ecosystem}:${pkg.name}`}
                      onClick={() => handleJump(pkg.name, pkg.version)}
                      className={`w-full text-left px-4 py-2.5 border-b border-gray-50/10 flex items-center justify-between group transition-colors ${
                        isCurrent ? 'bg-indigo-900/30' : 'hover:bg-[#1a1a2e]'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`text-[12px] font-mono font-medium truncate ${isCurrent ? 'text-indigo-400' : 'text-gray-200 group-hover:text-indigo-400'}`}>
                          {pkg.name}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">v{pkg.version}</p>
                      </div>
                      {isCurrent && (
                        <span className="shrink-0 text-[9px] font-bold text-indigo-400 bg-indigo-900/40 px-1.5 py-0.5 rounded-full ml-2">
                          CURRENT
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <Pagination
              page={libPageClamped}
              totalPages={libTotalPages}
              totalItems={filteredPackages.length}
              pageSize={LIB_PAGE_SIZE}
              onPage={setLibPage}
              compact
            />
          </div>
        )}

        {/* Dynamic Content Area */}
        <div className={canvasClass}>
          {!hasParams && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="bg-[#12121a] p-8 rounded-xl shadow-sm border border-[#2a2a35] max-w-md text-center">
                <Network className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-100 mb-2">No Package Selected</h2>
                <p className="text-gray-500 mb-6">Return to search to select a package to visualize.</p>
                <button
                  onClick={() => navigate('/')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors inline-flex items-center"
                >
                  Go to Search <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                </button>
              </div>
            </div>
          )}

          {hasParams && isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a12]/80 backdrop-blur-sm z-20">
              <div className="bg-[#12121a] p-8 rounded-xl shadow-lg border border-[#2a2a35] w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-100 flex items-center">
                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin mr-3" />
                    Resolving Supply Chain
                  </h2>
                  {progress && (
                    <span className="text-sm font-bold text-indigo-400">{displayPct}%</span>
                  )}
                </div>
                
                <div className="w-full h-2.5 bg-[#2a2a35] rounded-full overflow-hidden mb-4 relative">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-300 ease-out absolute left-0 top-0 rounded-full"
                    style={{ width: `${progress ? displayPct : 5}%` }}
                  ></div>
                </div>

                <div className="text-sm text-gray-500 space-y-2">
                  {!progress ? (
                    <p>Initializing connection to observatory...</p>
                  ) : (
                    <>
                      <div className="flex justify-between items-center bg-[#1a1a2e] px-3 py-2 rounded border border-white/5">
                        <span>Nodes resolved:</span>
                        <span className="font-semibold text-gray-200">{progress.processed} <span className="text-gray-500 font-normal">/ {progress.discovered}</span></span>
                      </div>
                      <div className="flex justify-between items-center px-3">
                        <span>Currently fetching:</span>
                        <span className="font-semibold text-indigo-600 whitespace-nowrap">{progress.missing} missing packages</span>
                      </div>
                      <div className="flex justify-between items-center px-3">
                        <span>BFS Queue size:</span>
                        <span className="font-semibold text-gray-300">{progress.inQueue}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {hasParams && error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a12]/80 z-20">
              <div className="bg-[#12121a] p-8 rounded-xl shadow-sm border border-red-900/50 max-w-md text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-100 mb-2">Supply Chain Resolution Failed</h2>
                <p className="text-red-400 mb-6 text-sm">
                  {(error as any)?.response?.data?.detail || error.message}
                </p>
                <button onClick={() => navigate('/')} className="bg-[#2a2a35] text-gray-200 px-6 py-2 border border-[#3a3a45] rounded-md font-medium">
                  Return to Search
                </button>
              </div>
            </div>
          )}

          {/* Render Dashboard if not exploring */}
          {hasParams && data && !isLoading && !error && !exploreMode && (
            <DependencyHealthDashboard
              data={data}
              metrics={metricsData}
              depths={depthsData}
              libyearsBreakdown={libyearsData}
              vulnData={vulnData}
              onExploreEdge={handleExploreEdge}
            />
          )}

          {/* Render GraphCanvas if exploring */}
          {hasParams && data && !isLoading && !error && exploreMode && (
             <div className="absolute inset-0 flex flex-col bg-[#0a0a12]">
               <div className="bg-indigo-900/20 text-indigo-200 border-b border-indigo-500/20 px-6 py-3 flex justify-between items-center z-10 shrink-0 shadow-sm backdrop-blur">
                  <div className="flex items-center gap-3">
                    <Network className="w-5 h-5 text-indigo-400" />
                    <span className="font-bold tracking-wide">Targeted Network Visualizer</span>
                    {exploreEdge && (
                      <>
                        <span className="w-px h-5 bg-white/20 block mx-2"></span>
                        <span className="text-xs font-mono bg-black/40 px-2 py-0.5 rounded-md border border-white/5 shadow-inner">
                           Focus Edge: <span className="text-emerald-400">{exploreEdge.source}</span> → <span className="text-blue-400">{exploreEdge.target}</span>
                        </span>
                      </>
                    )}
                  </div>
               </div>
               <div className="flex-1 relative flex">
                 <div className="flex-1 relative">
                   <GraphCanvas data={data} onEdgeSelect={setSelectedEdge} onNodeSelect={setSelectedNode} vulnerableNodes={vulnData ? Object.keys(vulnData.breakdown).map(k => extractPkgId(k)) : undefined} />
                 </div>
                 {renderNodeDetailsPanel()}
               </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
}
