import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, AlertCircle, Network, ArrowRight, FlaskConical, Database, CheckCircle2 } from 'lucide-react';
import { usePackageQuery } from '../hooks/usePackageQuery';
import { useIngestedPackages } from '../hooks/useIngestedPackages';
import { ingestPackageMethod } from '../services/methodApi';
import Pagination from '../components/Pagination';
import type { IngestedPackageItem } from '../types/api';

const PAGE_SIZE = 15;

export default function PackageSearch() {
  const navigate = useNavigate();
  const [ecosystem, setEcosystem] = useState<string>('npm');
  const [packageName, setPackageName] = useState<string>('');
  const [version, setVersion] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dbPage, setDbPage] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Only trigger backend package query when form is explicitly submitted
  const [queryParams, setQueryParams] = useState<{ ecosystem: string; packageName: string; version: string } | null>(null);
  
  const [isIngestingMethod, setIsIngestingMethod] = useState(false);
  const [metaPrompt, setMetaPrompt] = useState<{isOpen: boolean, dependencies: string[], originalSlug: string}>({
    isOpen: false,
    dependencies: [],
    originalSlug: ''
  });

  const { data, isLoading, error } = usePackageQuery({
    ecosystem: queryParams?.ecosystem || '',
    packageName: queryParams?.packageName || '',
    version: queryParams?.version || '',
    enabled: !!queryParams,
  });

  // Live prefix-filtered list of already-ingested packages
  const { data: ingestedData, isLoading: ingestedLoading } = useIngestedPackages(
    ecosystem,
    packageName.length >= 1 ? packageName : '',
  );

  const suggestions: IngestedPackageItem[] = ingestedData?.packages ?? [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !suggestionsRef.current?.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (packageName && version) {
      setShowSuggestions(false);
      setQueryParams({ ecosystem, packageName, version });
    }
  };

  const handleSelectSuggestion = (pkg: IngestedPackageItem) => {
    setPackageName(pkg.name);
    setVersion(pkg.version);
    setShowSuggestions(false);
    setQueryParams({ ecosystem: pkg.ecosystem, packageName: pkg.name, version: pkg.version });
  };

  const handleViewGraph = () => {
    if (data) {
      navigate(`/graph?ecosystem=${data.ecosystem}&package=${encodeURIComponent(data.name)}&version=${encodeURIComponent(data.version)}`);
    }
  };

  const handleMethodInsights = async () => {
    if (!data) return;
    setIsIngestingMethod(true);
    try {
      const res = await ingestPackageMethod(data.ecosystem, data.name);
      if (res.is_meta_package && res.resolved_core_slug) {
        navigate(`/methods/graph?project=${res.resolved_core_slug}&meta_redirect=true&original_slug=${data.name}`);
      } else if (res.is_meta_package && !res.resolved_core_slug) {
        setMetaPrompt({isOpen: true, dependencies: res.meta_dependencies, originalSlug: data.name});
      } else {
        navigate(`/methods/graph?project=${res.project_slug}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.detail || err.message || 'Failed to ingest method data.');
    } finally {
      setIsIngestingMethod(false);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col overflow-y-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Package Search</h1>
        <p className="text-gray-500 mt-2">Find and explore dependencies for any package.</p>
      </header>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-8 shrink-0">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ecosystem</label>
            <select
              value={ecosystem}
              onChange={(e) => { setEcosystem(e.target.value); setPackageName(''); setVersion(''); setDbPage(1); }}
              className="w-full h-10 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="npm">NPM</option>
              <option value="pypi">PyPI</option>
            </select>
          </div>

          {/* Package Name with autocomplete */}
          <div className="flex-[2] min-w-[200px] relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Package Name</label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={packageName}
                onChange={(e) => { setPackageName(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="e.g. react or fastapi"
                required
                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {ingestedLoading && packageName.length >= 1 && (
                <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>

            {/* Suggestion dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
              >
                <div className="px-3 py-1.5 border-b border-gray-100 flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-blue-500" />
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    {suggestions.length} in Observatory DB
                  </span>
                </div>
                {suggestions.slice(0, 30).map((pkg) => (
                  <button
                    key={`${pkg.ecosystem}:${pkg.name}`}
                    type="button"
                    onMouseDown={() => handleSelectSuggestion(pkg)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between group transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-800 font-mono">{pkg.name}</span>
                    <span className="text-xs text-gray-400 group-hover:text-blue-600 font-mono transition-colors">
                      v{pkg.version}
                    </span>
                  </button>
                ))}
                {suggestions.length > 30 && (
                  <div className="px-3 py-2 text-[11px] text-gray-400 border-t border-gray-100">
                    + {suggestions.length - 30} more — keep typing to narrow down
                  </div>
                )}
              </div>
            )}

            {showSuggestions && packageName.length >= 2 && !ingestedLoading && suggestions.length === 0 && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2.5 text-sm text-gray-500">
                Not in DB yet — will be fetched from registry on search.
              </div>
            )}
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="e.g. 18.2.0"
              required
              className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !packageName || !version}
            className="h-10 px-6 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Search className="w-5 h-5 mr-2" />}
            Search
          </button>
        </form>
      </div>

      {/* DB table skeleton while loading */}
      {!queryParams && !isLoading && ingestedLoading && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-8 shrink-0 animate-pulse">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
            <div className="w-4 h-4 bg-gray-200 rounded-full" />
            <div className="h-3.5 bg-gray-200 rounded w-36" />
            <div className="h-5 bg-gray-200 rounded-full w-20 ml-1" />
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Package', 'Version', 'Ecosystem', ''].map((_, i) => (
                  <th key={i} className="px-5 py-2">
                    <div className="h-2.5 bg-gray-200 rounded w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-5 py-3"><div className="h-3 bg-gray-100 rounded w-40" /></td>
                  <td className="px-4 py-3"><div className="h-3 bg-gray-100 rounded w-16" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-12" /></td>
                  <td className="px-4 py-3"><div className="h-3 bg-gray-100 rounded-full w-4 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Ingested packages browser (shown when search bar is idle and DB has data) */}
      {!queryParams && !isLoading && (ingestedData?.total ?? 0) > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-8 shrink-0">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-gray-700">Observatory Database</span>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {ingestedData?.total} packages
              </span>
            </div>
            <span className="text-xs text-gray-400">Click any row to explore</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Package</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Version</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ecosystem</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const all = ingestedData?.packages ?? [];
                  const totalPages = Math.ceil(all.length / PAGE_SIZE);
                  const page = Math.min(dbPage, totalPages || 1);
                  const slice = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
                  return (
                    <>
                      {slice.map((pkg) => (
                        <tr
                          key={`${pkg.ecosystem}:${pkg.name}`}
                          onClick={() => handleSelectSuggestion(pkg)}
                          className="border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors group"
                        >
                          <td className="px-5 py-2.5 font-mono font-medium text-gray-800 group-hover:text-blue-700">{pkg.name}</td>
                          <td className="px-4 py-2.5 font-mono text-gray-500">v{pkg.version}</td>
                          <td className="px-4 py-2.5">
                            <span className="inline-block bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-md uppercase">
                              {pkg.ecosystem}
                            </span>
                          </td>
                          <td className="pr-4 py-2.5 text-right">
                            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 ml-auto transition-colors" />
                          </td>
                        </tr>
                      ))}
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>
          <Pagination
            page={Math.min(dbPage, Math.ceil((ingestedData?.packages.length ?? 0) / PAGE_SIZE) || 1)}
            totalPages={Math.ceil((ingestedData?.packages.length ?? 0) / PAGE_SIZE)}
            totalItems={ingestedData?.packages.length ?? 0}
            pageSize={PAGE_SIZE}
            onPage={setDbPage}
          />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-8 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-red-800 font-medium">Search Failed</h3>
            <p className="text-red-700 mt-1 text-sm">
              {(error as any)?.response?.data?.detail || error.message || 'The specified package or version could not be found.'}
            </p>
          </div>
        </div>
      )}

      {/* Search results */}
      {data && !isLoading && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col slide-in-bottom">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 uppercase tracking-wide rounded-md mr-3 font-semibold">
                  {data.ecosystem}
                </span>
                {data.name} <span className="text-gray-400 font-normal ml-2">v{data.version}</span>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/research?ecosystem=${data.ecosystem}&package=${data.name}&version=${data.version}`)}
                className="px-4 py-2 bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-700 rounded-md font-medium hover:bg-fuchsia-100 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 flex items-center shadow-sm transition-colors"
                title="Open comprehensive Research Console"
              >
                Deep Analysis
              </button>
              <button
                onClick={handleMethodInsights}
                disabled={isIngestingMethod}
                className="px-4 py-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-md font-medium hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center shadow-sm transition-colors disabled:opacity-75 disabled:cursor-wait"
              >
                {isIngestingMethod ? (
                  <Loader2 className="w-4 h-4 mr-2 text-purple-600 animate-spin" />
                ) : (
                  <FlaskConical className="w-4 h-4 mr-2 text-purple-600" />
                )}
                {isIngestingMethod ? 'Parsing AST...' : 'Method Insights'}
              </button>
              <button
                onClick={handleViewGraph}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center shadow-sm transition-colors"
              >
                <Network className="w-4 h-4 mr-2 text-blue-600" />
                View Graph
                <ArrowRight className="w-4 h-4 ml-2 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <span className="text-gray-500 text-sm font-medium mb-1 block">Direct Dependencies</span>
              <span className="text-3xl font-bold text-gray-900">{data.metrics.directDependencies}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <span className="text-gray-500 text-sm font-medium mb-1 block">Fan-Out (Graph Size)</span>
              <span className="text-3xl font-bold text-gray-900">{data.metrics.fanOut}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <span className="text-gray-500 text-sm font-medium mb-1 block">Fan-In (Dependents)</span>
              <span className="text-3xl font-bold text-blue-600">{data.metrics.fanIn}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-red-100 rounded-bl-full opacity-50 -mr-8 -mt-8"></div>
              <span className="text-gray-500 text-sm font-medium mb-1 block relative z-10">Bottleneck Score</span>
              <span className="text-3xl font-bold text-red-600 relative z-10">{data.metrics.bottleneckScore.toFixed(1)}</span>
            </div>
          </div>
        </div>
      )}
      {/* Meta-Package Selection Modal */}
      {metaPrompt.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 bg-slate-50 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Network className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Meta-Package Detected</h2>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-mono bg-gray-200 px-1 py-0.5 rounded text-gray-700">{metaPrompt.originalSlug}</span> contains no computational AST nodes. It is a meta-wrapper pointer. Please select its core dependency below to natively trace:
                </p>
              </div>
            </div>
            <div className="p-4 max-h-[300px] overflow-y-auto bg-gray-50">
              <div className="grid gap-2">
                {metaPrompt.dependencies.map(dep => (
                  <button
                    key={dep}
                    onClick={() => {
                        setMetaPrompt(prev => ({...prev, isOpen: false}));
                        navigate(`/methods/graph?project=${dep}&meta_redirect=true&original_slug=${metaPrompt.originalSlug}`);
                    }}
                    className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-200 hover:border-indigo-400 hover:shadow-sm group transition-all text-left"
                  >
                    <span className="font-mono font-medium text-gray-700 group-hover:text-indigo-600">{dep}</span>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500" />
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end bg-white">
              <button 
                onClick={() => setMetaPrompt({isOpen: false, dependencies: [], originalSlug: ''})}
                className="px-4 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isIngestingMethod}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
