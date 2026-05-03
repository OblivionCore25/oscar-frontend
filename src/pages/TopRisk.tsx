import { useState } from 'react';
import { useAnalyticsQuery, useCoverageQuery } from '../hooks/useAnalyticsQuery';
import TopRiskTable from '../components/TopRiskTable';
import { AlertTriangle, Loader2, AlertCircle, DatabaseZap, Info } from 'lucide-react';

export default function TopRisk() {
  const [ecosystem, setEcosystem] = useState<'npm' | 'pypi'>('npm');
  const [limit, setLimit] = useState(50); // Fetch top N items

  const { data, isLoading, error } = useAnalyticsQuery({
    ecosystem,
    limit,
  });

  const { data: coverage } = useCoverageQuery(ecosystem);

  return (
    <div className="h-full flex flex-col bg-[#0a0a12] overflow-y-auto w-full">
      <div className="max-w-7xl mx-auto w-full px-6 py-8 mt-4">
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-7 h-7 text-red-500" />
              <h1 className="text-3xl font-bold text-gray-100 leading-none tracking-tight">Ecosystem Risks</h1>
            </div>
            <p className="text-sm text-gray-500 max-w-2xl leading-relaxed mt-3">
              Packages ranked by their ecosystem-wide bottleneck score. A high bottleneck score indicates 
              a package is heavily depended upon (high fan-in) and acts as an exclusive bridge to other 
              critical infrastructure in the dependency graph.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-[#12121a] p-1.5 rounded-lg border border-[#2a2a35] shadow-sm">
            <div className="flex bg-[#2a2a35] rounded-md p-1">
              <button
                onClick={() => setEcosystem('npm')}
                className={`px-4 py-1.5 text-sm font-medium rounded ${
                  ecosystem === 'npm'
                    ? 'bg-[#12121a] text-indigo-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                NPM
              </button>
              <button
                onClick={() => setEcosystem('pypi')}
                className={`px-4 py-1.5 text-sm font-medium rounded ${
                  ecosystem === 'pypi'
                    ? 'bg-[#12121a] text-indigo-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                PyPI
              </button>
            </div>
            
            <div className="h-6 w-px bg-gray-200 mx-1 border-r" />

            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="bg-transparent text-sm font-medium text-gray-300 pl-2 pr-8 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value={50}>Fetch Top 50</option>
              <option value={100}>Fetch Top 100</option>
              <option value={200}>Fetch Top 200</option>
            </select>
          </div>
        </div>

        {/* Graph Coverage Banner */}
        {coverage && (
          <div className="mb-6 bg-[#12121a] border border-[#2a2a35] rounded-xl px-5 py-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none"></div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 relative z-10">
              <div className="flex items-center gap-2.5 shrink-0">
                <DatabaseZap className="w-5 h-5 text-indigo-500" />
                <span className="text-sm font-semibold text-gray-200">Graph Coverage</span>
                <span className="text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full ring-1 ring-indigo-500/20">
                  {coverage.coveragePct < 0.01
                    ? `<0.01%`
                    : `${coverage.coveragePct.toFixed(2)}%`}
                </span>
              </div>

              <div className="flex-1 flex flex-col gap-1.5">
                <div className="h-2 w-full bg-[#2a2a35] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${Math.max(0.4, Math.min(100, coverage.coveragePct))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-gray-500 font-mono">
                  <span>{coverage.ingestedPackages.toLocaleString()} packages local</span>
                  <span>est. {(coverage.estimatedTotal / 1_000_000).toFixed(1)}M total in {coverage.ecosystem.toUpperCase()}</span>
                </div>
              </div>

              <div className="flex items-start gap-1.5 text-[11px] text-amber-400 bg-amber-900/30 border border-amber-500/30 rounded-lg px-3 py-2 max-w-xs shrink-0">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Percentile ranks are calculated relative to locally ingested packages, but upstream metrics bridge local gaps using external OSV/deps.dev data where possible.</span>
              </div>
            </div>
          </div>
        )}

        {/* Content State Handling */}
        <div className="min-h-[400px]">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
              <p className="text-gray-500 font-medium">Computing ecosystem risk variants...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-64 bg-[#12121a] rounded-xl shadow-sm border border-red-900/30">
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <h3 className="text-lg font-bold text-gray-100 mb-1">Failed to load analytics</h3>
              <p className="text-red-400 text-sm">{(error as any)?.response?.data?.detail || error.message}</p>
            </div>
          )}

          {data && !isLoading && !error && (
            <TopRiskTable items={data.items} />
          )}
        </div>
        
      </div>
    </div>
  );
}
