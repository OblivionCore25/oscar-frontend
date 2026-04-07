import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { PackageProvider } from '../context/PackageContext';
import Breadcrumbs from '../components/Breadcrumbs';
import OverviewTab from './tabs/OverviewTab';
import SupplyChainTab from './tabs/SupplyChainTab';
import SecurityTab from './tabs/SecurityTab';
import ArchitectureTab from './tabs/ArchitectureTab';
import { Package, ChevronDown, AlertCircle } from 'lucide-react';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'supply-chain', label: 'Supply Chain' },
  { key: 'security', label: 'Security' },
  { key: 'architecture', label: 'Internal Architecture' },
] as const;

type TabKey = typeof TABS[number]['key'];

const TAB_COLORS: Record<TabKey, string> = {
  'overview': 'border-indigo-500 text-indigo-400',
  'supply-chain': 'border-sky-500 text-sky-400',
  'security': 'border-rose-500 text-rose-400',
  'architecture': 'border-emerald-500 text-emerald-400',
};

export default function PackageDetail() {
  const { ecosystem = 'npm', name = '', version = '' } = useParams<{
    ecosystem: string;
    name: string;
    version: string;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Decode the package name (handles scoped packages like @scope/name)
  const packageName = decodeURIComponent(name);

  // Tab from URL
  const tabParam = searchParams.get('tab') as TabKey | null;
  const activeTab: TabKey = TABS.some(t => t.key === tabParam) ? tabParam! : 'overview';

  const setActiveTab = (tab: TabKey) => {
    setSearchParams({ tab });
  };

  // Version selector state
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);

  // Fetch available versions for the version selector
  const { data: versionList } = useQuery({
    queryKey: ['package-versions', ecosystem, packageName],
    queryFn: async () => {
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_OSCAR_API_URL}/packages/${ecosystem}/${encodeURIComponent(packageName)}/versions`
        );
        return data as string[];
      } catch {
        return null;
      }
    },
    enabled: !!ecosystem && !!packageName,
    staleTime: 5 * 60 * 1000,
  });

  // Save to recently explored in localStorage
  useEffect(() => {
    if (!ecosystem || !packageName || !version) return;
    try {
      const key = 'oscar_recent';
      const recent: Array<{ ecosystem: string; packageName: string; version: string; ts: number }> = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = recent.filter(r => !(r.ecosystem === ecosystem && r.packageName === packageName && r.version === version));
      filtered.unshift({ ecosystem, packageName, version, ts: Date.now() });
      localStorage.setItem(key, JSON.stringify(filtered.slice(0, 15)));
    } catch { /* ignore storage errors */ }
  }, [ecosystem, packageName, version]);

  if (!ecosystem || !packageName || !version) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-100">Invalid Package Reference</h2>
        <p className="text-gray-500 mt-2">Missing ecosystem, package name, or version.</p>
        <button onClick={() => navigate('/')} className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors">
          Back to Search
        </button>
      </div>
    );
  }

  const breadcrumbSegments = [
    { label: 'Explore', to: '/' },
    { label: `${ecosystem}:${packageName}@${version}` },
    ...(activeTab !== 'overview' ? [{ label: TABS.find(t => t.key === activeTab)!.label }] : []),
  ];

  return (
    <PackageProvider ecosystem={ecosystem} packageName={packageName} version={version}>
      <div className="h-full flex flex-col bg-[#0a0a12] overflow-y-auto">
        <div className="max-w-[1400px] mx-auto w-full px-6 py-4 flex flex-col flex-1">

          {/* Breadcrumbs */}
          <Breadcrumbs segments={breadcrumbSegments} />

          {/* Package Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 mt-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/15 rounded-xl">
                <Package className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="bg-indigo-900/40 text-indigo-300 text-[10px] px-2 py-0.5 uppercase tracking-wider rounded-md font-bold">
                    {ecosystem}
                  </span>
                  <h1 className="text-xl font-bold text-gray-100 tracking-tight">{packageName}</h1>
                </div>
                {/* Version Selector */}
                <div className="relative mt-0.5">
                  <button
                    onClick={() => setVersionDropdownOpen(!versionDropdownOpen)}
                    className="text-sm text-gray-400 font-mono flex items-center gap-1 hover:text-indigo-400 transition-colors"
                  >
                    v{version}
                    {versionList && <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {versionDropdownOpen && versionList && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setVersionDropdownOpen(false)} />
                      <div className="absolute top-full left-0 mt-1 bg-[#12121a] border border-[#2a2a35] rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto w-48 custom-scrollbar">
                        {versionList.map(v => (
                          <button
                            key={v}
                            onClick={() => {
                              setVersionDropdownOpen(false);
                              navigate(`/package/${ecosystem}/${encodeURIComponent(packageName)}/${encodeURIComponent(v)}?tab=${activeTab}`);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm font-mono hover:bg-white/5 transition-colors ${
                              v === version ? 'text-indigo-400 font-bold bg-indigo-500/10' : 'text-gray-400'
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex gap-1 border-b border-[#2a2a35] mb-6">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3 text-sm font-semibold transition-all border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? TAB_COLORS[tab.key]
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active Tab Content */}
          <div className="flex-1 pb-8">
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'supply-chain' && <SupplyChainTab />}
            {activeTab === 'security' && <SecurityTab />}
            {activeTab === 'architecture' && <ArchitectureTab />}
          </div>

        </div>
      </div>
    </PackageProvider>
  );
}
