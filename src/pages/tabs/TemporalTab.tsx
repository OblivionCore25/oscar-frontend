import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, ShieldAlert, GitMerge } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import type { TemporalReport } from '../../types/api';

const API_BASE = import.meta.env.VITE_OSCAR_API_URL || 'http://localhost:8000';

interface TemporalTabProps {
  ecosystem: string;
  name: string;
}

export default function TemporalTab({ ecosystem, name }: TemporalTabProps) {
  const [data, setData] = useState<TemporalReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchTemporal() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/analytics/${encodeURIComponent(ecosystem)}/${encodeURIComponent(name)}/temporal?versions=15`);
        if (!response.ok) {
          throw new Error('Failed to fetch temporal analysis.');
        }
        const json = await response.json();
        
        // Transform dates for the chart mapping
        const transformedData = {
          ...json,
          data_points: json.data_points.map((pt: any) => ({
            ...pt,
            // Extract just the year/month for cleaner X-Axis
            formattedDate: new Date(pt.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }),
          }))
        };

        if (active) setData(transformedData);
      } catch (err: any) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchTemporal();
    return () => { active = false; };
  }, [ecosystem, name]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-400" />
        <p>Sampling historical versions and running temporal analysis...</p>
        <p className="text-xs text-gray-500 mt-2">This queries OSV and deps.dev across 15 versions.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-900/20 border border-red-500/20 rounded-xl text-red-400">
        <h3 className="font-semibold flex items-center gap-2 mb-2">
          <ShieldAlert className="w-5 h-5" /> Analysis Failed
        </h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!data || data.data_points.length === 0) {
    return (
      <div className="p-6 bg-[#12121a] border border-[#2a2a35] rounded-xl text-gray-400 text-center">
        No temporal data available for this package.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
          <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Versions Tracked</h3>
          <div className="text-3xl font-bold text-gray-100 tabular-nums">
            {data.sampled_versions} <span className="text-sm font-normal text-gray-500">of {data.total_versions_available} total</span>
          </div>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
          <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Total Vulnerabilities</h3>
          <div className="text-3xl font-bold text-gray-100 tabular-nums">
            {data.data_points.reduce((acc, curr) => acc + curr.vuln_count, 0)}
          </div>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
          <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Latest Fan-Out</h3>
          <div className="text-3xl font-bold text-gray-100 tabular-nums">
            {data.data_points[data.data_points.length - 1].fan_out}
          </div>
        </div>
      </div>

      <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl overflow-hidden drop-shadow-xl">
        <div className="px-6 py-4 border-b border-[#2a2a35] bg-[#0a0a12]/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <GitMerge className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="font-bold text-gray-100">Structural Blast Radius Evolution</h2>
              <p className="text-xs text-gray-400">Direct dependencies (Fan-Out) and Ecosystem dependents (Fan-In) over time</p>
            </div>
          </div>
        </div>
        <div className="p-6 h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.data_points} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorFanOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFanIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c084fc" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#c084fc" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="formattedDate" stroke="#4b5563" tick={{fill: '#9ca3af', fontSize: 12}} />
              <YAxis yAxisId="left" stroke="#4b5563" tick={{fill: '#9ca3af', fontSize: 12}} />
              <YAxis yAxisId="right" orientation="right" stroke="#4b5563" tick={{fill: '#9ca3af', fontSize: 12}} />
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" vertical={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#12121a', borderColor: '#2a2a35', color: '#f3f4f6' }}
                itemStyle={{ color: '#f3f4f6' }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Legend />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="fan_out" 
                name="Fan-Out (Direct Deps)" 
                stroke="#818cf8" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorFanOut)" 
              />
              <Area 
                yAxisId="right"
                type="monotone" 
                dataKey="global_fan_in" 
                name="Global Fan-In" 
                stroke="#c084fc" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorFanIn)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl overflow-hidden drop-shadow-xl">
        <div className="px-6 py-4 border-b border-[#2a2a35] bg-[#0a0a12]/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="font-bold text-gray-100">Vulnerability Density Timeline</h2>
              <p className="text-xs text-gray-400">Total number of applicable CVEs per historical version</p>
            </div>
          </div>
        </div>
        <div className="p-6 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.data_points} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <XAxis dataKey="formattedDate" stroke="#4b5563" tick={{fill: '#9ca3af', fontSize: 12}} />
              <YAxis stroke="#4b5563" tick={{fill: '#9ca3af', fontSize: 12}} />
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" vertical={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#12121a', borderColor: '#2a2a35', color: '#f3f4f6' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="vuln_count" 
                name="Vulnerabilities" 
                stroke="#fb7185" 
                strokeWidth={3}
                activeDot={{ r: 8 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
