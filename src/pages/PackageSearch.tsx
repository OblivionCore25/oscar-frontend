import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, ArrowRight, Database } from 'lucide-react';
import { useIngestedPackages } from '../hooks/useIngestedPackages';
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
      navigate(`/package/${ecosystem}/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`);
    }
  };

  const handleSelectSuggestion = (pkg: IngestedPackageItem) => {
    setPackageName(pkg.name);
    setVersion(pkg.version);
    setShowSuggestions(false);
    navigate(`/package/${pkg.ecosystem}/${encodeURIComponent(pkg.name)}/${encodeURIComponent(pkg.version)}`);
  };

  return (
    <div className="p-8 h-full flex flex-col overflow-y-auto w-full max-w-5xl mx-auto">
      <header className="mb-10 text-center md:text-left mt-8">
        <h1 className="text-4xl font-bold text-gray-100 tracking-tight mb-3">Package Explorer</h1>
        <p className="text-gray-400 text-lg">Search the registry or browse previously ingested dependency ecosystems.</p>
      </header>

      <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl shadow-xl p-8 mb-10 shrink-0 relative">
        {/* Subtle decorative glow — clipped within its own wrapper so it can't affect dropdown z-stacking */}
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
        </div>

        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-5 items-end relative z-10">
          <div className="flex-1 w-full md:min-w-[200px]">
            <label className="block text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">Ecosystem</label>
            <select
              value={ecosystem}
              onChange={(e) => { setEcosystem(e.target.value); setPackageName(''); setVersion(''); setDbPage(1); }}
              className="w-full h-12 px-4 py-2 bg-[#0a0a12] border border-[#3a3a45] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-200"
            >
              <option value="npm">NPM</option>
              <option value="pypi">PyPI</option>
            </select>
          </div>

          {/* Package Name with autocomplete */}
          <div className="flex-[2] w-full md:min-w-[300px] relative">
            <label className="block text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">Package Name</label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={packageName}
                onChange={(e) => { setPackageName(e.target.value); setShowSuggestions(e.target.value.length > 0); }}
                onFocus={() => { if (packageName.length > 0) setShowSuggestions(true); }}
                placeholder="e.g. react or fastapi"
                required
                className="w-full h-12 px-4 py-2 bg-[#0a0a12] border border-[#3a3a45] rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-200"
              />
              {ingestedLoading && packageName.length >= 1 && (
                <Loader2 className="absolute right-4 top-3 w-5 h-5 text-gray-500 animate-spin" />
              )}
            </div>

            {/* Suggestion dropdown — only shown when user is actively typing */}
            {showSuggestions && packageName.length >= 1 && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 mt-2 w-full bg-[#12121a] border border-[#2a2a35] rounded-lg shadow-2xl max-h-64 overflow-y-auto"
              >
                <div className="px-4 py-2.5 bg-[#1a1a2e] border-b border-white/5 flex items-center gap-2 sticky top-0">
                  <Database className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    {suggestions.length} match{suggestions.length !== 1 ? 'es' : ''} in local database
                  </span>
                </div>
                {suggestions.slice(0, 30).map((pkg) => (
                  <button
                    key={`${pkg.ecosystem}:${pkg.name}`}
                    type="button"
                    onMouseDown={() => handleSelectSuggestion(pkg)}
                    className="w-full text-left px-4 py-3 hover:bg-indigo-900/30 flex items-center justify-between group transition-colors border-b border-white/[0.02] last:border-0"
                  >
                    <span className="text-sm font-medium text-gray-200 font-mono">{pkg.name}</span>
                    <span className="text-xs text-gray-500 group-hover:text-indigo-400 font-mono transition-colors">
                      v{pkg.version}
                    </span>
                  </button>
                ))}
                {suggestions.length > 30 && (
                  <div className="px-4 py-3 text-xs text-gray-500 border-t border-white/5 bg-[#0a0a12]">
                    + {suggestions.length - 30} more — keep typing to refine
                  </div>
                )}
              </div>
            )}

            {showSuggestions && packageName.length >= 2 && !ingestedLoading && suggestions.length === 0 && (
              <div className="absolute z-50 mt-2 w-full bg-[#12121a] border border-[#2a2a35] rounded-lg shadow-2xl px-4 py-3 text-sm text-gray-400">
                Not in local database. Will be analyzed from registry on search.
              </div>
            )}
          </div>

          <div className="flex-1 w-full md:min-w-[150px]">
            <label className="block text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">Version</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="e.g. 18.2.0"
              required
              className="w-full h-12 px-4 py-2 bg-[#0a0a12] border border-[#3a3a45] rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-200 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={!packageName || !version}
            className="w-full md:w-auto h-12 px-8 bg-indigo-600 text-white rounded-md font-bold text-sm tracking-wide hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#1a1a2e] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg hover:shadow-indigo-500/20"
          >
            <Search className="w-4 h-4 mr-2" />
            Analyze
          </button>
        </form>
      </div>

      {/* DB table skeleton while loading */}
      {ingestedLoading && packageName.length === 0 && (
        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl shadow-sm overflow-hidden shrink-0 animate-pulse">
          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
            <div className="w-5 h-5 bg-gray-200/20 rounded-full" />
            <div className="h-4 bg-gray-200/20 rounded w-48" />
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-[#1a1a2e] border-b border-white/5">
                {['Package', 'Version', 'Ecosystem', ''].map((_, i) => (
                  <th key={i} className="px-6 py-3">
                    <div className="h-3 bg-gray-200/20 rounded w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="px-6 py-4"><div className="h-3.5 bg-[#2a2a35] rounded w-48" /></td>
                  <td className="px-6 py-4"><div className="h-3.5 bg-[#2a2a35] rounded w-20" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-[#2a2a35] rounded w-16" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-[#2a2a35] rounded-full w-5 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Ingested packages browser (shown when search bar is idle and DB has data) */}
      {!ingestedLoading && packageName.length === 0 && (ingestedData?.total ?? 0) > 0 && (
        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl shadow-sm overflow-hidden shrink-0 animate-in fade-in duration-500">
          <div className="bg-[#1a1a2e] px-6 py-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-gray-200">Local Observatory Database</h2>
              <span className="bg-indigo-900/40 text-indigo-300 text-xs font-bold px-2.5 py-1 rounded-md ml-2">
                {ingestedData?.total} packages
              </span>
            </div>
            <span className="text-xs font-medium text-gray-500 bg-[#12121a] px-3 py-1.5 rounded border border-[#2a2a35]">
              Select a package to view its metrics
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0a0a12] border-b border-[#2a2a35]">
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Package Name</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Version</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Ecosystem</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
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
                          className="hover:bg-indigo-900/20 cursor-pointer transition-colors group"
                        >
                          <td className="px-6 py-4 font-mono font-medium text-gray-300 group-hover:text-indigo-400 transition-colors">
                            {pkg.name}
                          </td>
                          <td className="px-6 py-4 font-mono text-gray-500 group-hover:text-gray-400">
                            v{pkg.version}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-block bg-[#1a1a2e] border border-white/10 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider group-hover:border-indigo-500/30 group-hover:text-indigo-300">
                              {pkg.ecosystem}
                            </span>
                          </td>
                          <td className="pr-6 py-4 text-right">
                            <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 ml-auto transition-transform group-hover:translate-x-1" />
                          </td>
                        </tr>
                      ))}
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>
          
          <div className="bg-[#0a0a12] border-t border-[#2a2a35]">
            <Pagination
              page={Math.min(dbPage, Math.ceil((ingestedData?.packages.length ?? 0) / PAGE_SIZE) || 1)}
              totalPages={Math.ceil((ingestedData?.packages.length ?? 0) / PAGE_SIZE)}
              totalItems={ingestedData?.packages.length ?? 0}
              pageSize={PAGE_SIZE}
              onPage={setDbPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
