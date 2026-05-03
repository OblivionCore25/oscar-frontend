import { usePackageIdentity } from '../../context/PackageContext';
import { usePackageQuery } from '../../hooks/usePackageQuery';
import { useVulnerabilityQuery } from '../../hooks/useGraphQuery';
import { useReachability } from '../../hooks/useMethodQuery';
import { scorecardColor } from '../../utils/format';
import { Loader2, Shield, ShieldAlert, ExternalLink, Activity } from 'lucide-react';
import React, { useMemo } from 'react';

function PackageVulnRow({ pkg, vulns, ecosystem }: { pkg: string, vulns: any[], ecosystem: string }) {
  const [basePkg] = pkg.split('@'); 
  
  // Collect all unique affected functions for this package
  const affectedFunctions = useMemo(() => {
    return Array.from(new Set(vulns.flatMap(v => v.affectedFunctions || [])));
  }, [vulns]);

  // Construct standard URL slug for method observatory 
  let slug = basePkg.replace('@', '').replace('/', '__');
  if (ecosystem === 'pypi') slug = slug.toLowerCase();

  const { data: reachData } = useReachability(slug, affectedFunctions, affectedFunctions.length > 0);

  const reachMap = useMemo(() => {
    const map = new Map<string, string>();
    if (reachData?.results) {
      for (const r of reachData.results) {
        map.set(r.function, r.status);
      }
    }
    return map;
  }, [reachData]);

  return (
    <div className="bg-[#0a0a12] rounded-lg border border-white/5 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-sm font-bold text-gray-200 truncate">{pkg}</span>
        <span className="text-xs text-rose-400 font-bold">{vulns.length} CVE{vulns.length > 1 ? 's' : ''}</span>
      </div>
      <div className="space-y-2">
        {vulns.map((v: any) => {
          let hasFunctions = v.affectedFunctions && v.affectedFunctions.length > 0;
          return (
            <div key={v.id} className="flex flex-col text-xs bg-white/[0.02] border border-white/[0.03] rounded px-2.5 py-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-rose-300 font-bold">{v.id}</span>
                <span className={`px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] ${
                  v.severity === 'CRITICAL' ? 'bg-red-500/30 text-red-300 border border-red-500/30' :
                  v.severity === 'HIGH' ? 'bg-orange-500/30 text-orange-300 border border-orange-500/30' :
                  v.severity === 'MODERATE' ? 'bg-amber-500/30 text-amber-300 border border-amber-500/30' :
                  'bg-sky-500/30 text-sky-300 border border-sky-500/30'
                }`}>
                  {v.severity}
                </span>
              </div>
              
              {hasFunctions && (
                <div className="mt-2.5 mb-1 flex flex-wrap gap-1.5">
                  {v.affectedFunctions.map((func: string) => {
                    const status = reachMap.get(func);
                    
                    let badgeClass = "bg-white/5 text-gray-500 border-white/10";
                    let icon = "⚪";
                    let titleText = `Function: ${func} (AST Resolution Pending or Missing)`;
                    
                    if (status === "REACHABLE") { 
                      badgeClass = "bg-rose-500/10 text-rose-400 border-rose-500/20"; 
                      icon = "🔴"; 
                      titleText = `Function: ${func} (Confirmed Reachable from Entry Point)`;
                    } else if (status === "UNREACHABLE") { 
                      badgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"; 
                      icon = "🟢"; 
                      titleText = `Function: ${func} (Dead Code / Unreachable)`;
                    } else if (status === "UNKNOWN") {
                      badgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/20"; 
                      icon = "⚪"; 
                      titleText = `Function: ${func} (Low AST Resolution Rate - Assume Reachable)`;
                    }
                    
                    return (
                      <span key={func} title={titleText} className={`px-1.5 py-0.5 border rounded text-[10px] font-mono cursor-help flex items-center transition-colors hover:brightness-125 ${badgeClass}`}>
                        <span className="mr-1 text-[8px]">{icon}</span> {func}()
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
      <div className="bg-[#12121a] rounded-xl border border-[#2a2a35] flex flex-col h-full overflow-hidden">
        <div className="bg-gradient-to-r from-[#1c1c28] to-[#12121a] px-6 py-4 border-b border-[#2a2a35] flex items-center justify-between">
          <div className="flex items-center">
            <ShieldAlert className="w-5 h-5 text-rose-400 mr-2" />
            <h2 className="font-bold text-gray-100 tracking-wide text-sm uppercase">Transitive Vulnerabilities</h2>
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
          <div className="flex-1 flex flex-col min-h-0">
            {/* KPI Banner for Reachability Engine */}
            <div className="bg-[#1a1a24] border-b border-[#2a2a35] px-6 py-3 flex items-start">
               <div className="bg-sky-500/20 p-2 rounded-lg mr-3 mt-0.5">
                   <Activity className="w-4 h-4 text-sky-400" />
               </div>
               <div>
                   <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wide">Method Reachability Engine</h3>
                   <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                     OSCAR calculates AST path resolutions mapping transitive CVEs against public class endpoints. Functions marked 🟢 Unreachable are mathematically inert. 
                   </p>
               </div>
            </div>

            {/* Severity Summary */}
            <div className="px-6 py-4 flex gap-2 flex-wrap border-b border-white/5">
              {vulnData.severityCounts.CRITICAL > 0 && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                  {vulnData.severityCounts.CRITICAL} Critical
                </span>
              )}
              {vulnData.severityCounts.HIGH > 0 && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  {vulnData.severityCounts.HIGH} High
                </span>
              )}
              {vulnData.severityCounts.MODERATE > 0 && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {vulnData.severityCounts.MODERATE} Moderate
                </span>
              )}
              {vulnData.severityCounts.LOW > 0 && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {vulnData.severityCounts.LOW} Low
                </span>
              )}
            </div>

            {/* Per-Package Breakdown List */}
            <div className="p-6 space-y-3 overflow-y-auto custom-scrollbar flex-1">
              {Object.entries(vulnData.breakdown).map(([pkg, vulns]) => (
                <PackageVulnRow key={pkg} pkg={pkg} vulns={vulns as any[]} ecosystem={ecosystem} />
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
