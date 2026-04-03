import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useGraphQuery } from '../hooks/useGraphQuery';
import { useIngestedPackages } from '../hooks/useIngestedPackages';
import GraphCanvas from '../components/GraphCanvas';
import Pagination from '../components/Pagination';
import { Network, Loader2, ArrowLeft, AlertCircle, PanelRight, FlaskConical, Database, Search } from 'lucide-react';

const LIB_PAGE_SIZE = 15;

export default function GraphViewer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [libSearch, setLibSearch] = useState('');
  const [libPage, setLibPage] = useState(1);
  const [selectedEdge, setSelectedEdge] = useState<{ source: string; target: string } | null>(null);

  const ecosystem = searchParams.get('ecosystem') ?? 'npm';
  const packageName = searchParams.get('package');
  const version = searchParams.get('version');

  const hasParams = !!(ecosystem && packageName && version);

  const { data, isLoading, error, progress } = useGraphQuery({ ecosystem, packageName, version });

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

  const getConstraintBadge = (constraint: string) => {
    if (!constraint || constraint === 'unconstrained') return 'bg-red-100 text-red-700 border border-red-200';
    if (constraint.startsWith('==') || constraint.includes('===')) return 'bg-amber-100 text-amber-700 border border-amber-200';
    return 'bg-green-100 text-green-700 border border-green-200';
  };

  const getConstraintIcon = (constraint: string) => {
    if (!constraint || constraint === 'unconstrained') return '⚠️';
    if (constraint.startsWith('==') || constraint.includes('===')) return '🔒';
    return '✓';
  };

  // When the user jumps to a package from the library panel, navigate via URL
  const handleJump = (name: string, ver: string) => {
    navigate(`/graph?ecosystem=${ecosystem}&package=${encodeURIComponent(name)}&version=${encodeURIComponent(ver)}`);
    setLibOpen(false);
    setLibSearch('');
  };

  // Left-panel offset when lib is open, right offset when constraint sidebar is open
  const canvasClass = [
    'relative flex-1 transition-all duration-200',
    libOpen ? 'ml-64' : '',
    sidebarOpen && data ? 'mr-72' : '',
  ].join(' ');

  return (
    <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden">
      {/* Overlay Header */}
      <header className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm rounded-lg px-4 py-3 flex items-center">
          <Network className="w-5 h-5 text-blue-600 mr-3" />
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">
              {hasParams ? `${packageName} v${version}` : 'Graph Viewer'}
            </h1>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">
              {hasParams ? ecosystem : 'Awaiting Selection'}
            </p>
          </div>
        </div>

        <div className="pointer-events-auto flex gap-2">
          {/* Library toggle */}
          <button
            onClick={() => { setLibOpen(o => !o); setSidebarOpen(false); }}
            className={`border shadow-sm px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${
              libOpen
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Database className="w-4 h-4" />
            DB Library
            {(ingestedData?.total ?? 0) > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {ingestedData!.total}
              </span>
            )}
          </button>

          {hasParams && (
            <button
              onClick={() => navigate(`/methods/graph?project=${packageName}-${version}`)}
              className="bg-white border border-indigo-200 shadow-sm text-indigo-700 px-3 py-2 rounded-lg font-medium text-sm hover:bg-indigo-50 flex items-center transition-colors"
            >
              <FlaskConical className="w-4 h-4 mr-2" />
              Method Call Graph
            </button>
          )}

          {data && (
            <button
              onClick={() => { setSidebarOpen(o => !o); setLibOpen(false); }}
              className={`bg-white border shadow-sm px-3 py-2 rounded-lg font-medium text-sm flex items-center transition-colors gap-2 ${
                sidebarOpen
                  ? 'border-blue-300 text-blue-700 bg-blue-50'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <PanelRight className="w-4 h-4" />
              Edge Constraints
              {data.edges.length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {data.edges.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="bg-white border border-gray-200 shadow-sm text-gray-700 px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-50 flex items-center transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── DB Library Panel (left) ────────────────────────────────── */}
        {libOpen && (
          <div className="absolute top-0 left-0 bottom-0 w-64 bg-white border-r border-gray-200 shadow-md flex flex-col z-10">
            <div className="px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-blue-500" />
                  <h2 className="text-sm font-bold text-gray-900">Observatory DB</h2>
                </div>
                <button
                  onClick={() => setLibOpen(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded p-0.5 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={libSearch}
                  onChange={e => { setLibSearch(e.target.value); setLibPage(1); }}
                  placeholder="Filter packages…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">
                {filteredPackages.length} of {ingestedData?.total ?? 0} packages
              </p>
            </div>

            <div className="overflow-y-auto flex-1">
              {libPageSlice.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-10">Nothing in DB yet.</p>
              ) : (
                libPageSlice.map(pkg => {
                  const isCurrent = pkg.name === packageName && pkg.version === version;
                  return (
                    <button
                      key={`${pkg.ecosystem}:${pkg.name}`}
                      onClick={() => handleJump(pkg.name, pkg.version)}
                      className={`w-full text-left px-4 py-2.5 border-b border-gray-50 flex items-center justify-between group transition-colors ${
                        isCurrent ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`text-[12px] font-mono font-medium truncate ${isCurrent ? 'text-blue-700' : 'text-gray-800 group-hover:text-blue-600'}`}>
                          {pkg.name}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">v{pkg.version}</p>
                      </div>
                      {isCurrent && (
                        <span className="shrink-0 text-[9px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full ml-2">
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

        {/* Graph Canvas */}
        <div className={canvasClass}>
          {!hasParams && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-md text-center">
                <Network className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">No Package Selected</h2>
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
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm z-20">
              <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin mr-3" />
                    Resolving Graph
                  </h2>
                  {progress && (
                    <span className="text-sm font-bold text-blue-600">{displayPct}%</span>
                  )}
                </div>
                
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4 relative">
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
                      <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded border border-gray-100">
                        <span>Nodes resolved:</span>
                        <span className="font-semibold text-gray-800">{progress.processed} <span className="text-gray-400 font-normal">/ {progress.discovered}</span></span>
                      </div>
                      <div className="flex justify-between items-center px-3">
                        <span>Currently fetching:</span>
                        <span className="font-semibold text-indigo-600 whitespace-nowrap">{progress.missing} missing packages</span>
                      </div>
                      <div className="flex justify-between items-center px-3">
                        <span>BFS Queue size:</span>
                        <span className="font-semibold text-gray-700">{progress.inQueue}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {hasParams && error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 z-20">
              <div className="bg-white p-8 rounded-xl shadow-sm border border-red-200 max-w-md text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Graph Resolution Failed</h2>
                <p className="text-red-600 mb-6 text-sm">
                  {(error as any)?.response?.data?.detail || error.message}
                </p>
                <button onClick={() => navigate('/')} className="bg-gray-100 text-gray-800 px-6 py-2 border border-gray-300 rounded-md font-medium">
                  Return to Search
                </button>
              </div>
            </div>
          )}

          {hasParams && data && !isLoading && !error && (
            <GraphCanvas data={data} onEdgeSelect={setSelectedEdge} />
          )}
        </div>

        {/* ── Edge Constraints Sidebar (right) ──────────────────────── */}
        {data && sidebarOpen && (
          <div className="absolute top-0 right-0 bottom-0 w-72 bg-white border-l border-gray-200 shadow-md flex flex-col z-10">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Edge Constraints</h2>
                <p className="text-xs text-gray-500 mt-0.5">{data.edges.length} dependencies</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 text-[10px] font-semibold">
                  <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                    ⚠️ {data.edges.filter(e => !e.constraint).length}
                  </span>
                  <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                    ✓ {data.edges.filter(e => !!e.constraint && !e.constraint.startsWith('==')).length}
                  </span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="ml-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded p-0.5 transition-colors"
                  title="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-2 space-y-1.5">
              {data.edges.length === 0 ? (
                <p className="text-gray-400 text-xs text-center py-8">No dependencies found.</p>
              ) : (
                data.edges.map((edge, i) => {
                  const isSelected = selectedEdge?.source === edge.source && selectedEdge?.target === edge.target;
                  return (
                    <div
                      key={i}
                      className={`rounded-lg p-3 border transition-colors ${
                        isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium text-gray-800 truncate font-mono">{edge.target}</p>
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">from {edge.source}</p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded-full font-semibold ${getConstraintBadge(edge.constraint || '')}`}>
                          {getConstraintIcon(edge.constraint || '')}
                        </span>
                      </div>
                      {edge.constraint && (
                        <code className="block mt-1.5 text-[10px] text-gray-600 bg-white rounded border border-gray-100 px-1.5 py-0.5 truncate">
                          {edge.constraint}
                        </code>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Legend */}
            <div className="border-t border-gray-100 p-3 shrink-0 space-y-1">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Legend</p>
              <div className="flex items-center gap-2 text-[10px] text-gray-500">
                <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">⚠️</span>
                <span>Unconstrained — highest update risk</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-500">
                <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">🔒</span>
                <span>Pinned — brittle, blocks patches</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-500">
                <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">✓</span>
                <span>Range-bounded — healthy</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
