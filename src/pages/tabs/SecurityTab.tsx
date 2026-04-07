import { usePackageIdentity } from '../../context/PackageContext';
import { usePackageQuery } from '../../hooks/usePackageQuery';
import { useVulnerabilityQuery } from '../../hooks/useGraphQuery';
import { scorecardColor } from '../../utils/format';
import { Loader2, Shield, ShieldAlert, ExternalLink } from 'lucide-react';

export default function SecurityTab() {
  const { ecosystem, packageName, version } = usePackageIdentity();

  const { data: pkgData, isLoading: pkgLoading } = usePackageQuery({ ecosystem, packageName, version });
  const { data: vulnData, isLoading: vulnLoading } = useVulnerabilityQuery({ ecosystem, packageName, version });

  const m = pkgData?.metrics;
  const isLoading = pkgLoading || vulnLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin mb-4" />
        <p className="text-gray-500">Loading security intelligence…</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* OpenSSF Scorecard Panel */}
      <div className="bg-[#12121a] rounded-xl border border-[#2a2a35] overflow-hidden">
        <div className="bg-gradient-to-r from-[#1c1c28] to-[#12121a] px-6 py-4 border-b border-[#2a2a35] flex items-center">
          <Shield className="w-5 h-5 text-sky-400 mr-2" />
          <h2 className="font-bold text-gray-100 tracking-wide text-sm uppercase">OpenSSF Scorecard</h2>
        </div>

        {m?.scorecardScore != null ? (
          <div className="p-6 space-y-5">
            {/* Aggregate Score */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Overall Score</div>
                <div className="text-4xl font-bold tracking-tight">
                  <span className={m.scorecardScore >= 7 ? 'text-emerald-400' : m.scorecardScore >= 4 ? 'text-amber-400' : 'text-rose-400'}>
                    {m.scorecardScore.toFixed(1)}
                  </span>
                  <span className="text-gray-600 text-lg font-normal ml-1">/ 10</span>
                </div>
              </div>
              <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center text-lg font-bold ${
                m.scorecardScore >= 7 ? 'border-emerald-500/50 text-emerald-400' :
                m.scorecardScore >= 4 ? 'border-amber-500/50 text-amber-400' :
                'border-rose-500/50 text-rose-400'
              }`}>
                {m.scorecardScore >= 7 ? 'A' : m.scorecardScore >= 4 ? 'B' : 'C'}
              </div>
            </div>

            {/* Individual Checks */}
            {m.scorecardChecks && (
              <div className="space-y-1.5">
                <h3 className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">Individual Checks</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {Object.entries(m.scorecardChecks).sort(([,a],[,b]) => (b as number) - (a as number)).map(([name, score]) => (
                    <div key={name} className="flex items-center justify-between text-xs font-mono px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5">
                      <span className="text-gray-400 truncate mr-2" title={name}>{name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${scorecardColor(score as number)}`}>
                        {score as number}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Source Repo Link */}
            {m.sourceRepoUrl && (
              <a href={m.sourceRepoUrl} target="_blank" rel="noopener noreferrer"
                 className="flex items-center text-xs text-sky-400/70 hover:text-sky-300 transition-colors mt-3">
                <ExternalLink className="w-3 h-3 mr-1.5" />
                {m.sourceRepoUrl.replace('https://github.com/', '')}
              </a>
            )}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <Shield className="w-8 h-8 mb-3 opacity-20" />
            <span>Scorecard data not available.<br/>Security scoring requires a linked GitHub repository.</span>
          </div>
        )}
      </div>

      {/* Vulnerability Breakdown Panel */}
      <div className="bg-[#12121a] rounded-xl border border-[#2a2a35] overflow-hidden">
        <div className="bg-gradient-to-r from-[#1c1c28] to-[#12121a] px-6 py-4 border-b border-[#2a2a35] flex items-center justify-between">
          <div className="flex items-center">
            <ShieldAlert className="w-5 h-5 text-rose-400 mr-2" />
            <h2 className="font-bold text-gray-100 tracking-wide text-sm uppercase">Known Vulnerabilities</h2>
          </div>
          {vulnData && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              vulnData.totalVulns > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {vulnData.totalVulns} total
            </span>
          )}
        </div>

        {vulnData && vulnData.totalVulns > 0 ? (
          <div className="p-6 space-y-4">
            {/* Severity Summary */}
            <div className="flex gap-2 flex-wrap">
              {vulnData.severityCounts.CRITICAL > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                  {vulnData.severityCounts.CRITICAL} Critical
                </span>
              )}
              {vulnData.severityCounts.HIGH > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  {vulnData.severityCounts.HIGH} High
                </span>
              )}
              {vulnData.severityCounts.MODERATE > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {vulnData.severityCounts.MODERATE} Moderate
                </span>
              )}
              {vulnData.severityCounts.LOW > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {vulnData.severityCounts.LOW} Low
                </span>
              )}
            </div>

            {/* Per-Package Breakdown */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
              {Object.entries(vulnData.breakdown).map(([pkg, vulns]) => (
                <div key={pkg} className="bg-[#0a0a12] rounded-lg border border-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-bold text-gray-200 truncate">{pkg}</span>
                    <span className="text-xs text-rose-400 font-bold">{(vulns as any[]).length} CVE{(vulns as any[]).length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-1.5">
                    {(vulns as any[]).map((v: any) => (
                      <div key={v.id} className="flex items-center justify-between text-xs">
                        <span className="font-mono text-rose-300">{v.id}</span>
                        <span className={`px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] ${
                          v.severity === 'CRITICAL' ? 'bg-red-500/30 text-red-300' :
                          v.severity === 'HIGH' ? 'bg-orange-500/30 text-orange-300' :
                          v.severity === 'MODERATE' ? 'bg-amber-500/30 text-amber-300' :
                          'bg-sky-500/30 text-sky-300'
                        }`}>
                          {v.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <Shield className="w-8 h-8 mb-3 text-emerald-500/30" />
            <p className="font-medium text-emerald-400 mb-1">No Known Vulnerabilities</p>
            <p className="text-xs">Vulnerability data is sourced from the OSV database via the transitive dependency graph.</p>
          </div>
        )}
      </div>
    </div>
  );
}
