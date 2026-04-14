import { useState, useEffect } from 'react';
import { Loader2, Zap, ShieldAlert, Package, TrendingUp, Activity } from 'lucide-react';
import type { CrossLevelReport } from '../../types/api';
import MetricTooltip from '../../components/MetricTooltip';
import { CROSS_LEVEL_METRICS, METHOD_METRICS, SUPPLY_CHAIN_METRICS } from '../../data/metricDefinitions';

const API_BASE = import.meta.env.VITE_OSCAR_API_URL || 'http://localhost:8000';

interface CrossLevelTabProps {
  ecosystem: string;
  name: string;
  version: string;
}

function riskColor(risk: number): string {
  if (risk >= 20) return 'text-red-400';
  if (risk >= 10) return 'text-orange-400';
  if (risk >= 5) return 'text-yellow-400';
  if (risk >= 1) return 'text-emerald-400';
  return 'text-gray-400';
}

function riskBg(risk: number): string {
  if (risk >= 20) return 'bg-red-500/10 border-red-500/20';
  if (risk >= 10) return 'bg-orange-500/10 border-orange-500/20';
  if (risk >= 5) return 'bg-yellow-500/10 border-yellow-500/20';
  return 'bg-emerald-500/10 border-emerald-500/20';
}

function formatFanIn(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function CrossLevelTab({ ecosystem, name, version }: CrossLevelTabProps) {
  const [data, setData] = useState<CrossLevelReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topN, setTopN] = useState(5);

  useEffect(() => {
    let active = true;

    async function fetchCrossLevel() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${API_BASE}/analytics/${encodeURIComponent(ecosystem)}/${encodeURIComponent(name)}/${encodeURIComponent(version)}/cross-level?top_n=${topN}`
        );
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || 'Failed to fetch cross-level analysis.');
        }
        const json = await response.json();
        if (active) setData(json);
      } catch (err: any) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchCrossLevel();
    return () => { active = false; };
  }, [ecosystem, name, version, topN]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-fuchsia-400" />
        <p className="font-semibold">Running Cross-Level Risk Analysis...</p>
        <p className="text-xs text-gray-500 mt-2">
          Analyzing top-{topN} dependencies at the method level. This may take 15–30 seconds on first run.
        </p>
        <div className="mt-6 flex gap-2">
          {[3, 5, 10].map(n => (
            <button
              key={n}
              onClick={() => setTopN(n)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                topN === n
                  ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30'
                  : 'bg-white/5 text-gray-500 border border-white/10 hover:text-gray-300'
              }`}
            >
              Top {n}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-900/20 border border-red-500/20 rounded-xl text-red-400">
        <h3 className="font-semibold flex items-center gap-2 mb-2">
          <ShieldAlert className="w-5 h-5" /> Cross-Level Analysis Failed
        </h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!data || data.top_risks.length === 0) {
    return (
      <div className="p-6 bg-[#12121a] border border-[#2a2a35] rounded-xl text-gray-400 text-center">
        No cross-level risk data available. The dependency graph may be too shallow for method-level analysis.
      </div>
    );
  }

  const topMethod = data.top_risks[0];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Hero Card — Most Dangerous Method */}
      <div className="relative overflow-hidden rounded-xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-900/20 via-[#12121a] to-[#12121a] p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-fuchsia-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-fuchsia-400" />
            </div>
            <div>
              <h2 className="font-bold text-gray-100 text-lg">Highest Cross-Level Risk</h2>
              <p className="text-xs text-gray-500">The most structurally dangerous method in this supply chain</p>
            </div>
          </div>

          <div className="flex items-baseline gap-3 mb-3">
            <code className="text-2xl font-bold text-fuchsia-300">{topMethod.method_qualified_name}()</code>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-500">Package: </span>
              <span className="text-gray-200 font-medium">{topMethod.dependency_package}</span>
            </div>
            <div>
              <span className="text-gray-500">Complexity: </span>
              <span className="text-orange-400 font-bold">{topMethod.complexity}</span>
            </div>
            <div>
              <span className="text-gray-500">Blast Radius: </span>
              <span className="text-rose-400 font-bold">{topMethod.method_blast_radius}</span>
            </div>
            <div>
              <span className="text-gray-500">Ecosystem Fan-In: </span>
              <span className="text-indigo-400 font-bold">{formatFanIn(topMethod.ecosystem_fan_in)}</span>
            </div>
            <div>
              <span className="text-gray-500">Cross-Level Risk: </span>
              <span className="text-fuchsia-400 font-bold text-lg">{topMethod.cross_level_risk.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <MetricTooltip metric={CROSS_LEVEL_METRICS.analysisCoverage}>
              <span className="cursor-help hover:text-gray-300 transition-colors border-b border-gray-500/30 border-dashed pb-0.5">Coverage</span>
            </MetricTooltip>
          </h3>
          <div className="text-2xl font-bold text-gray-100 tabular-nums">
            {data.analyzed_deps} <span className="text-sm font-normal text-gray-500">/ {data.total_deps} deps</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">{data.analysis_coverage_pct}% analyzed</div>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <MetricTooltip metric={CROSS_LEVEL_METRICS.methodsAnalyzed}>
              <span className="cursor-help hover:text-gray-300 transition-colors border-b border-gray-500/30 border-dashed pb-0.5">Methods Analyzed</span>
            </MetricTooltip>
          </h3>
          <div className="text-2xl font-bold text-gray-100 tabular-nums">
            {data.top_risks.length}
          </div>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <MetricTooltip metric={METHOD_METRICS.methodComplexity}>
              <span className="cursor-help hover:text-gray-300 transition-colors border-b border-gray-500/30 border-dashed pb-0.5">Max Complexity</span>
            </MetricTooltip>
          </h3>
          <div className="text-2xl font-bold text-orange-400 tabular-nums">
            {Math.max(...data.top_risks.map(r => r.complexity))}
          </div>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <MetricTooltip metric={SUPPLY_CHAIN_METRICS.fanIn}>
              <span className="cursor-help hover:text-gray-300 transition-colors border-b border-gray-500/30 border-dashed pb-0.5">Max Ecosystem Fan-In</span>
            </MetricTooltip>
          </h3>
          <div className="text-2xl font-bold text-indigo-400 tabular-nums">
            {formatFanIn(Math.max(...data.top_risks.map(r => r.ecosystem_fan_in)))}
          </div>
        </div>
      </div>

      {/* Depth Control */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">Analysis Depth:</span>
        {[3, 5, 10].map(n => (
          <button
            key={n}
            onClick={() => setTopN(n)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              topN === n
                ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 shadow-sm shadow-fuchsia-500/10'
                : 'bg-white/5 text-gray-500 border border-white/10 hover:text-gray-300 hover:bg-white/10'
            }`}
          >
            Top {n} deps
          </button>
        ))}
      </div>

      {/* Analyzed Dependencies Summary */}
      <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2a2a35] bg-[#0a0a12]/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Package className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="font-bold text-gray-100">Analyzed Dependencies</h2>
            <p className="text-xs text-gray-400">Method-level analysis performed on top bottleneck packages</p>
          </div>
        </div>
        <div className="divide-y divide-[#2a2a35]">
          {data.analyzed_dependencies.map((dep, i) => (
            <div key={i} className="px-6 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-gray-200">{dep.package}</span>
                <span className="text-xs text-gray-500">v{dep.version}</span>
                {dep.analysis_cached ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">cached</span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">ingested</span>
                )}
              </div>
              <div className="flex items-center gap-6 text-xs">
                <div className="text-gray-400">
                  <span className="text-gray-500">Methods: </span>
                  <span className="text-gray-200 font-medium">{dep.method_count}</span>
                </div>
                <div className="text-gray-400">
                  <span className="text-gray-500">Fan-In: </span>
                  <span className="text-indigo-400 font-medium">{formatFanIn(dep.ecosystem_fan_in)}</span>
                </div>
                {dep.top_method && (
                  <div className="text-gray-400">
                    <span className="text-gray-500">Top: </span>
                    <code className="text-fuchsia-400">{dep.top_method}()</code>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full Risk Table */}
      <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2a2a35] bg-[#0a0a12]/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h2 className="font-bold text-gray-100">Unified Risk Ranking</h2>
            <p className="text-xs text-gray-400">All methods across analyzed dependencies, sorted by cross-level risk</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a35] text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3 font-semibold">#</th>
                <th className="text-left px-4 py-3 font-semibold">Method</th>
                <th className="text-left px-4 py-3 font-semibold">Package</th>
                <th className="text-right px-4 py-3 font-semibold">
                  <MetricTooltip metric={METHOD_METRICS.methodComplexity}>
                    <span className="cursor-help hover:text-gray-300 transition-colors underline decoration-gray-500/50 decoration-dashed underline-offset-4">Complexity</span>
                  </MetricTooltip>
                </th>
                <th className="text-right px-4 py-3 font-semibold">
                  <MetricTooltip metric={METHOD_METRICS.methodBlastRadius}>
                    <span className="cursor-help hover:text-gray-300 transition-colors underline decoration-gray-500/50 decoration-dashed underline-offset-4">Blast Radius</span>
                  </MetricTooltip>
                </th>
                <th className="text-right px-4 py-3 font-semibold">
                  <MetricTooltip metric={SUPPLY_CHAIN_METRICS.fanIn}>
                    <span className="cursor-help hover:text-gray-300 transition-colors underline decoration-gray-500/50 decoration-dashed underline-offset-4">Ecosystem Fan-In</span>
                  </MetricTooltip>
                </th>
                <th className="text-right px-4 py-3 font-semibold">
                  <MetricTooltip metric={METHOD_METRICS.compositeRisk}>
                    <span className="cursor-help hover:text-gray-300 transition-colors underline decoration-gray-500/50 decoration-dashed underline-offset-4">Composite Risk</span>
                  </MetricTooltip>
                </th>
                <th className="text-right px-6 py-3 font-semibold">
                  <MetricTooltip metric={CROSS_LEVEL_METRICS.crossLevelRisk}>
                    <span className="cursor-help hover:text-gray-300 transition-colors underline decoration-gray-500/50 decoration-dashed underline-offset-4">Cross-Level Risk</span>
                  </MetricTooltip>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a35]/50">
              {data.top_risks.map((method, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-3 text-gray-600 font-mono text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    <code className="text-gray-200 group-hover:text-fuchsia-300 transition-colors">
                      {method.method_qualified_name}()
                    </code>
                    <div className="text-[10px] text-gray-600 font-mono mt-0.5 truncate max-w-[300px]">
                      {method.method_module}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-300 font-medium">{method.dependency_package}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={method.complexity >= 15 ? 'text-orange-400 font-bold' : 'text-gray-400'}>
                      {method.complexity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={method.method_blast_radius >= 10 ? 'text-rose-400 font-bold' : 'text-gray-400'}>
                      {method.method_blast_radius}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-indigo-400">
                    {formatFanIn(method.ecosystem_fan_in)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-400">
                    {method.method_composite_risk.toFixed(4)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-sm font-bold tabular-nums ${riskBg(method.cross_level_risk)} ${riskColor(method.cross_level_risk)}`}>
                      {method.cross_level_risk.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formula explanation */}
      <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Formula
        </h3>
        <code className="text-xs text-gray-500 leading-relaxed block">
          Cross-Level Risk = Method_Composite_Risk × log₁₀(Ecosystem_Fan_In + 1)<br />
          <span className="text-gray-600">where Method_Composite_Risk = Complexity × Centrality × Blast_Radius × Temporal_Factor</span>
        </code>
      </div>
    </div>
  );
}
