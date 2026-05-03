import { usePackageIdentity } from '../../context/PackageContext';
import { usePackageQuery } from '../../hooks/usePackageQuery';
import { useEnrichment } from '../../hooks/useEnrichment';
import MetricCard from '../../components/MetricCard';
import MetricTooltip from '../../components/MetricTooltip';
import { ALL_SUPPLY_METRICS as METRICS } from '../../data/metricDefinitions';
import { fmtNum } from '../../utils/format';
import { Loader2, Activity, GitCommit, GitPullRequest } from 'lucide-react';

export default function OverviewTab() {
  const { ecosystem, packageName, version } = usePackageIdentity();

  const { data, isLoading, error } = usePackageQuery({ ecosystem, packageName, version });
  const { data: enrichment } = useEnrichment(ecosystem, packageName, version);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
        <p className="text-gray-500">Loading package metrics…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="font-medium mb-2">Failed to load package data.</p>
        <p className="text-sm text-red-400">{(error as any)?.response?.data?.detail || (error as any)?.message || 'Unknown error'}</p>
      </div>
    );
  }

  const m = data.metrics;
  const effectiveFanIn = m.globalFanIn ?? m.fanIn ?? 0;
  const I = m.fanOut / (m.fanOut + effectiveFanIn || 1);
  const zone = I < 0.2 ? 'Zone of Pain' : I > 0.8 ? 'Zone of Uselessness' : 'Main Sequence';

  return (
    <div className="space-y-6">
      {/* Primary KPI Grid — uses 3 cols on medium screens, 6 on large+ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          label="Transitive Deps"
          value={m.blastRadius}
          tooltip={METRICS.transitiveDepth}
          subtitle={m.transitiveDepth ? `Depth: ${m.transitiveDepth}` : undefined}
        />
        <MetricCard
          label="Fan-Out"
          value={m.fanOut}
          tooltip={METRICS.fanOut}
        />
        <MetricCard
          label="Fan-In (Dependents)"
          value={m.globalFanIn ?? m.fanIn}
          source={m.globalFanIn != null ? 'deps.dev' : 'local'}
          tooltip={METRICS.fanIn}
          variant="info"
          subtitle={m.globalFanIn === 0 ? 'Application — no reverse deps' : undefined}
        />
        <MetricCard
          label="Bottleneck Score"
          value={m.bottleneckScore?.toFixed(1) ?? '—'}
          tooltip={METRICS.bottleneck}
          variant="danger"
        />
        <MetricCard
          label="Downloads (30d)"
          value={m.monthlyDownloads}
          source={m.monthlyDownloads != null ? 'registry' : 'local'}
          tooltip={METRICS.monthlyDownloads}
          variant="cyan"
          formatter={fmtNum as (v: number) => string}
        />
        {m.scorecardScore != null && (
          <MetricCard
            label="Security Health"
            value={`${m.scorecardScore.toFixed(1)} / 10`}
            source="scorecard"
            tooltip={METRICS.scorecardScore}
            variant={m.scorecardScore >= 7 ? 'success' : m.scorecardScore >= 4 ? 'info' : 'danger'}
          />
        )}
      </div>

      {/* Detailed Metrics Grid — stacks on anything smaller than lg (1024px) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supply Chain Breakdown */}
        <div className="bg-[#12121a] rounded-xl border border-[#2a2a35] p-6">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">Graph Centrality</h3>
          <div className="space-y-3 font-mono text-sm">
            {[
              { label: 'PageRank', value: m.pageRank, tooltip: METRICS.pageRank, format: (v: number) => v.toFixed(6), color: 'text-gray-100' },
              { label: 'Eigenvector', value: m.eigenvectorCentrality, tooltip: METRICS.eigenvector, format: (v: number) => v.toFixed(6), color: 'text-purple-400' },
              { label: 'Betweenness', value: m.betweennessCentrality, tooltip: METRICS.betweenness, format: (v: number) => v.toFixed(6), color: 'text-gray-100' },
              { label: 'Closeness', value: m.closenessCentrality, tooltip: METRICS.closeness, format: (v: number) => v.toFixed(6), color: 'text-gray-100' },
              { label: 'Blast Radius', value: m.blastRadius, tooltip: METRICS.blastRadius, format: (v: number) => v.toLocaleString(), color: 'text-indigo-400' },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center border-b border-white/5 pb-2">
                <MetricTooltip metric={item.tooltip}><span className="text-gray-500">{item.label}</span></MetricTooltip>
                <span className={`${item.color} font-bold`}>{item.value != null ? item.format(item.value) : '—'}</span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-1">
              <MetricTooltip metric={METRICS.instability}><span className="text-gray-500">Instability (I)</span></MetricTooltip>
              <span className="text-rose-400 font-bold">{I.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Source Repo & Enrichment Info */}
        <div className="bg-[#12121a] rounded-xl border border-[#2a2a35] p-6">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">Package Intelligence</h3>
          <div className="space-y-3 text-sm">
            {enrichment?.sourceRepoUrl && (
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-gray-500">Source Repository</span>
                <a href={enrichment.sourceRepoUrl} target="_blank" rel="noopener noreferrer"
                   className="text-sky-400 hover:text-sky-300 font-mono text-xs truncate max-w-[200px] text-right"
                   title={enrichment.sourceRepoUrl}>
                  {enrichment.sourceRepoUrl.replace('https://github.com/', '')}
                </a>
              </div>
            )}
            {enrichment?.licenses && enrichment.licenses.length > 0 && (
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-gray-500">License</span>
                <span className="text-gray-200 font-medium">{enrichment.licenses.join(', ')}</span>
              </div>
            )}
            {enrichment?.isDeprecated != null && (
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-gray-500">Status</span>
                <span className={enrichment.isDeprecated ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                  {enrichment.isDeprecated ? '⚠ Deprecated' : 'Active'}
                </span>
              </div>
            )}
            {enrichment?.globalDirectDependents != null && (
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-gray-500">Direct Dependents (Global)</span>
                <span className="text-gray-200 font-mono">{fmtNum(enrichment.globalDirectDependents)}</span>
              </div>
            )}
            {enrichment?.globalIndirectDependents != null && (
              <div className="flex justify-between items-center pb-2">
                <span className="text-gray-500">Indirect Dependents (Global)</span>
                <span className="text-gray-200 font-mono">{fmtNum(enrichment.globalIndirectDependents)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Synthesis Bar */}
      <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 rounded-xl border border-indigo-500/20 p-5 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-indigo-500/20">
        <div className="flex-1 p-3 flex flex-col items-center text-center">
          <Activity className="w-7 h-7 text-rose-400 mb-1.5" />
          <MetricTooltip metric={METRICS.zoneAnalysis}><div className="text-xs font-bold tracking-widest text-indigo-400 uppercase mb-0.5">Zone Analysis</div></MetricTooltip>
          <div className="font-mono text-gray-200 text-sm">I={I.toFixed(2)} <span className="text-rose-400 ml-1.5">→ {zone}</span></div>
        </div>
        <div className="flex-1 p-3 flex flex-col items-center text-center">
          <GitCommit className={`w-7 h-7 ${m.libyears != null && m.libyears > 5 ? 'text-rose-400' : m.libyears != null && m.libyears > 1 ? 'text-amber-400' : 'text-emerald-400'} mb-1.5`} />
          <MetricTooltip metric={METRICS.libyears}><div className="text-xs font-bold tracking-widest text-indigo-400 uppercase mb-0.5">Libyears (Tech Lag)</div></MetricTooltip>
          <div className="font-mono text-gray-200 text-sm">
            {m.libyears != null ? <span className="font-bold text-white">{m.libyears.toFixed(1)} yrs</span> : <span className="opacity-50 italic">N/A</span>}
          </div>
        </div>
        <div className="flex-1 p-3 flex flex-col items-center text-center">
          <GitPullRequest className={`w-7 h-7 ${m.diamondCount ? 'text-rose-400' : 'text-blue-400'} mb-1.5`} />
          <MetricTooltip metric={METRICS.transitiveDepth}><div className="text-xs font-bold tracking-widest text-indigo-400 uppercase mb-0.5">Transitive Chain</div></MetricTooltip>
          <div className="font-mono text-gray-200 text-sm flex flex-col items-center">
            <div><span className="font-bold text-white">{m.transitiveDepth || 0}</span> <span className="text-gray-500 text-xs">max depth</span></div>
            <div><span className={`font-bold ${m.diamondCount ? 'text-rose-400' : 'text-emerald-400'}`}>{m.diamondCount || 0}</span> <span className="text-gray-500 text-xs">diamonds</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
