import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft, Loader2, AlertCircle, Microscope, Box, Database, Activity, GitCommit, GitPullRequest } from 'lucide-react';
import type { PackageDetailsResponse } from '../types/api';

export default function ResearchConsole() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isIngesting, setIsIngesting] = useState(false);
  
  const ecosystem = searchParams.get('ecosystem') || 'npm';
  const packageName = searchParams.get('package');
  const version = searchParams.get('version');
  
  // The Method Observatory simply uses the package name as the project slug for PyPI tracking
  const projectSlug = packageName;

  // 1. Fetch Dependency Observatory Stats
  const { data: pkgData, isLoading: pkgLoading, error: pkgError } = useQuery({
    queryKey: ['package', ecosystem, packageName, version],
    queryFn: async () => {
      const { data } = await axios.get<PackageDetailsResponse>(
        `${import.meta.env.VITE_OSCAR_API_URL}/packages/${ecosystem}/${packageName}/${version}`
      );
      return data;
    },
    enabled: !!(ecosystem && packageName && version),
  });

  // 2. Fetch Method Observatory Stats
  const { data: metaData, isLoading: metaLoading } = useQuery({
    queryKey: ['method-meta', projectSlug],
    queryFn: async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_METHOD_API_URL}/methods/${projectSlug}`);
        return data;
      } catch (err) {
        // Return null if it hasn't been ingested into method observatory yet
        return null;
      }
    },
    enabled: !!packageName,
    retry: false
  });

  const { data: hotspots, isLoading: hotspotsLoading } = useQuery({
    queryKey: ['method-hotspots', projectSlug],
    queryFn: async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_METHOD_API_URL}/methods/${projectSlug}/hotspots?limit=1`);
        return data as any[];
      } catch (e) {
        return null;
      }
    },
    enabled: !!packageName,
    retry: false
  });

  const { data: communities } = useQuery({
    queryKey: ['method-communities', projectSlug],
    queryFn: async () => {
      try {
         const { data } = await axios.get(`${import.meta.env.VITE_METHOD_API_URL}/methods/${projectSlug}/communities`);
         return data as Record<string, any[]>;
      } catch(e) {
         return null;
      }
    },
    enabled: !!packageName,
    retry: false
  });

  const queryClient = { invalidateQueries: (v: any) => {} }; /* will use query-client proper if needed, but simple re-fetch works */

  const handleIngest = async () => {
    if (!ecosystem || !packageName) return;
    setIsIngesting(true);
    try {
      await axios.post(`${import.meta.env.VITE_METHOD_API_URL}/methods/ingest/${ecosystem}/${packageName}`);
      // Force reload page to fetch newly ingested data naturally
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Failed to ingest method data.");
      setIsIngesting(false);
    }
  };


  if (!packageName || !version) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <AlertCircle className="w-12 h-12 text-blue-500 mb-4" />
        <h2 className="text-xl font-bold">No Target Selected</h2>
        <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 border rounded shadow-sm hover:bg-gray-50">Back to Search</button>
      </div>
    );
  }

  const m = pkgData?.metrics;
  const I = m ? (m.fanOut / (m.fanOut + m.fanIn || 1)) : 0;
  const A = "n/a"; // Not mapped yet
  const zone = I < 0.2 ? "Zone of Pain" : I > 0.8 ? "Zone of Uselessness" : "Main Sequence Transition";
  
  const orphanRatio = metaData ? ((hotspots?.[0]?.metrics?.is_orphan ? 1 : 0) / (metaData.method_count || 1) * 100).toFixed(1) : "0.0"; // Placeholder formula for now

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] text-gray-300 font-sans">
      <header className="bg-[#12121a] border-b border-[#2a2a35] px-6 py-4 flex items-center justify-between shrink-0 shadow-md z-10">
        <div className="flex items-center">
          <button onClick={() => navigate(`/`)} className="mr-4 p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center tracking-tight">
              <Microscope className="w-6 h-6 text-fuchsia-500 mr-2" />
              OSCAR Research Console
            </h1>
            <p className="text-sm text-gray-500 font-mono mt-0.5">{ecosystem}:{packageName}@{version}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-10 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-900/10 to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto space-y-6 relative z-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SUPPLY CHAIN PANEL */}
            <div className="bg-[#12121a] rounded-2xl border border-[#2a2a35] shadow-xl overflow-hidden backdrop-blur-sm shadow-fuchsia-900/5">
              <div className="bg-gradient-to-r from-[#1c1c28] to-[#12121a] px-6 py-4 border-b border-[#2a2a35] flex items-center">
                 <GitPullRequest className="w-5 h-5 text-indigo-400 mr-2" />
                 <h2 className="font-bold text-gray-100 tracking-wide text-sm uppercase">Supply Chain (Dependency Obs.)</h2>
              </div>
              
              {pkgLoading ? (
                 <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
              ) : pkgError ? (
                 <div className="p-6 text-red-400 text-sm">Failed to load package metrics.</div>
              ) : m ? (
                 <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-4 font-mono text-sm">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                       <span className="text-gray-500">Fan-In</span>
                       <span className="text-gray-100">{m.fanIn.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                       <span className="text-gray-500">Fan-Out</span>
                       <span className="text-gray-100">{m.fanOut.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                       <span className="text-gray-500">Bottleneck</span>
                       <span className="text-amber-400 font-bold">{m.bottleneckScore.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                       <span className="text-gray-500">Blast Radius</span>
                       <span className="text-indigo-400">{m.blastRadius?.toLocaleString() || 0}</span>
                    </div>
                    
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                       <span className="text-gray-500">PageRank</span>
                       <span className="text-gray-100">{(m.pageRank || 0).toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                       <span className="text-gray-500">Eigenvector</span>
                       <span className="text-purple-400 font-bold">{(m.eigenvectorCentrality || 0).toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                       <span className="text-gray-500">Betweenness</span>
                       <span className="text-gray-100">{(m.betweennessCentrality || 0).toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                       <span className="text-gray-500">Closeness</span>
                       <span className="text-gray-100">{(m.closenessCentrality || 0).toFixed(6)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center pb-2 col-span-2">
                       <span className="text-gray-500">Instability (I)</span>
                       <span className="text-rose-400">{I.toFixed(2)}</span>
                    </div>
                 </div>
              ) : null}
            </div>

            {/* INTERNAL ARCHITECTURE PANEL */}
            <div className="bg-[#12121a] rounded-2xl border border-[#2a2a35] shadow-xl overflow-hidden backdrop-blur-sm shadow-emerald-900/5">
              <div className="bg-gradient-to-r from-[#1c1c28] to-[#12121a] px-6 py-4 border-b border-[#2a2a35] flex items-center justify-between">
                 <div className="flex items-center">
                   <Box className="w-5 h-5 text-emerald-400 mr-2" />
                   <h2 className="font-bold text-gray-100 tracking-wide text-sm uppercase">Internal Arch (Method Obs.)</h2>
                 </div>
                 {!metaData && !metaLoading && (
                    <button 
                       onClick={handleIngest}
                       disabled={isIngesting}
                       className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center"
                    >
                       {isIngesting && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                       {isIngesting ? "Ingesting..." : "Ingest Now"}
                    </button>
                 )}
              </div>
              
              {metaLoading ? (
                 <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
              ) : !metaData ? (
                 <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                    <Database className="w-8 h-8 mb-3 opacity-20" />
                    No internal call graph data available.<br/>Analyze package to unlock method-level metrics.
                 </div>
              ) : (
                 <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-4 font-mono text-sm">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                       <span className="text-gray-500">Methods</span>
                       <span className="text-gray-100">{metaData.method_count.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                       <span className="text-gray-500">Classes</span>
                       <span className="text-gray-100">{metaData.class_count.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                       <span className="text-gray-500">Modules</span>
                       <span className="text-gray-100">{metaData.module_count.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                       <span className="text-gray-500">Edge Count</span>
                       <span className="text-emerald-400 font-bold">{metaData.edge_count.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between items-center border-b border-white/5 pb-2 col-span-2">
                       <span className="text-gray-500">Resolution Rate</span>
                       <span className="text-gray-100">{(metaData.resolution_rate * 100).toFixed(1)}%</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-white/5 pb-2 col-span-2">
                       <span className="text-gray-500">Top Hotspot</span>
                       <span className="text-rose-400 truncate max-w-[200px]" title={hotspots?.[0]?.method.name}>
                         {hotspots?.[0]?.method.name || "N/A"} <span className="opacity-50 text-xs">(risk: {hotspots?.[0]?.composite_risk ? (hotspots[0].composite_risk > 1000 ? (hotspots[0].composite_risk/1000).toFixed(1)+'k' : Math.round(hotspots[0].composite_risk)) : '0'})</span>
                       </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2 col-span-2">
                       <span className="text-gray-500">Eigenv. (Top Method)</span>
                       <span className="text-purple-400 font-bold">{hotspots?.[0]?.metrics.eigenvector_centrality?.toFixed(6) || "N/A"}</span>
                    </div>
                    
                    <div className="flex justify-between items-center pb-2">
                       <span className="text-gray-500">Orphan Ratio</span>
                       <span className="text-amber-400">~{orphanRatio}%</span>
                    </div>
                    <div className="flex justify-between items-center pb-2">
                       <span className="text-gray-500">Communities</span>
                       <span className="text-gray-100">{communities ? Object.keys(communities).length : 0}</span>
                    </div>
                 </div>
              )}
            </div>
          </div>
          
          {/* SYNTHESIS PANEL */}
          <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 rounded-2xl border border-indigo-500/20 p-6 shadow-xl backdrop-blur-md flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-indigo-500/20">
             <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
                <Activity className="w-8 h-8 text-rose-400 mb-2" />
                <div className="text-xs font-bold tracking-widest text-indigo-400 uppercase mb-1">Zone Analysis</div>
                <div className="font-mono text-gray-200">I={I.toFixed(2)}, A={A} <span className="text-rose-400 ml-2">→ {zone}</span></div>
             </div>
             
             <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
                <GitCommit className="w-8 h-8 text-amber-400 mb-2 opacity-50" />
                <div className="text-xs font-bold tracking-widest text-indigo-400 uppercase mb-1">Libyears (Tech Lag)</div>
                <div className="font-mono text-gray-200 opacity-50 italic">computation deferred</div>
             </div>
             
             <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
                <GitPullRequest className="w-8 h-8 text-blue-400 mb-2" />
                <div className="text-xs font-bold tracking-widest text-indigo-400 uppercase mb-1">Transitive Chain</div>
                <div className="font-mono text-gray-200">
                  <span className="font-bold text-white">{m?.blastRadius?.toLocaleString() || "N/A"}</span> deps <span className="text-blue-400 opacity-60 ml-1">(tier-2 depth)</span>
                </div>
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}
