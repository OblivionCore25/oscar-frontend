import { useState, useMemo } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Search, Globe, Shield, Download, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TopRiskItem } from '../types/api';
import MetricTooltip from './MetricTooltip';
import { ALL_SUPPLY_METRICS as SUPPLY_CHAIN_METRICS } from '../data/metricDefinitions';
import { useEnrichment } from '../hooks/useEnrichment';
import { getEnrichment } from '../services/api';

// Percentile thresholds for colour coding
const getPercentileColor = (pct: number | null | undefined) => {
  if (pct == null) return { bar: 'bg-gray-600', badge: 'text-gray-400 bg-gray-900/30 ring-gray-500/20' };
  if (pct >= 90) return { bar: 'bg-red-500', badge: 'text-red-400 bg-red-900/30 ring-red-500/20' };
  if (pct >= 70) return { bar: 'bg-amber-500', badge: 'text-amber-400 bg-amber-900/30 ring-amber-500/20' };
  return { bar: 'bg-blue-500', badge: 'text-indigo-400 bg-indigo-900/30 ring-indigo-500/20' };
};

// Ordinal suffix helper
const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
};

// Formatter for large numbers
const fmtNum = (n: number | undefined | null) => {
  if (n == null) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

function TopRiskTableRow({ item }: { item: TopRiskItem }) {
  const { data: enrichment, isLoading } = useEnrichment(item.ecosystem, item.name, item.version);

  const colors = getPercentileColor(item.bottleneckPercentile);
  const pct = item.bottleneckPercentile;
  
  const effectiveFanIn = enrichment?.globalFanIn ?? item.fanIn;
  const effectiveBottleneck = enrichment?.globalFanIn ? enrichment.globalFanIn * item.fanOut : item.bottleneckScore;

  const shimmer = <div className="h-4 w-12 bg-[#2a2a35] rounded animate-pulse inline-block" />;

  const scorecardScore = enrichment?.scorecardScore;
  const scorecardBadge = scorecardScore != null ? (
    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
      scorecardScore >= 7 ? 'text-emerald-400 bg-emerald-500/15' :
      scorecardScore >= 4 ? 'text-amber-400 bg-amber-500/15' :
      'text-rose-400 bg-rose-500/15'
    }`}>{scorecardScore.toFixed(1)}</span>
  ) : <span className="text-gray-600 text-xs">—</span>;

  return (
    <tr className="hover:bg-[#0a0a12] transition-colors group">
      <td className="px-6 py-4">
        <div className="font-bold text-gray-100">{item.name}</div>
        <div className="text-xs text-gray-500 mt-0.5">{item.ecosystem}</div>
      </td>
      <td className="px-6 py-4 font-mono text-xs text-gray-500">
        v{item.version || 'latest'}
      </td>
      <td className="px-6 py-4 min-w-[200px]">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset tabular-nums ${colors.badge}`}>
              {pct != null ? `${ordinal(Math.round(pct))} pct` : 'N/A'}
            </span>
            <span className="text-[10px] text-gray-500 tabular-nums">
              raw: {isLoading ? shimmer : effectiveBottleneck?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '—'}
            </span>
          </div>
          {pct != null && (
            <div className="h-1.5 w-full bg-[#2a2a35] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${colors.bar}`}
                style={{ width: `${Math.max(2, pct)}%` }}
              />
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-4 text-right tabular-nums">
        <div className="flex items-center justify-end gap-1.5">
          {enrichment?.globalFanIn != null && <span title="via deps.dev" className="flex items-center"><Globe className="w-3 h-3 text-sky-500/70" /></span>}
          <span className="text-gray-300">{isLoading ? shimmer : effectiveFanIn?.toLocaleString() || '—'}</span>
        </div>
      </td>
      <td className="px-4 py-4 text-right tabular-nums">
        <span className="text-gray-300">{item.fanOut?.toLocaleString() || '—'}</span>
      </td>
      <td className="px-4 py-4 text-right tabular-nums">
        {isLoading ? shimmer : <span className="text-cyan-400 font-medium">{fmtNum(enrichment?.monthlyDownloads)}</span>}
      </td>
      <td className="px-4 py-4 text-center">
        {isLoading ? shimmer : scorecardBadge}
      </td>
      <td className="px-4 py-4 text-right tabular-nums font-mono text-xs text-indigo-600">
        {item.pageRank ? item.pageRank.toFixed(6) : 'N/A'}
      </td>
      <td className="px-4 py-4 text-right tabular-nums font-mono text-xs text-purple-400">
        {item.eigenvectorCentrality ? item.eigenvectorCentrality.toFixed(6) : 'N/A'}
      </td>
      <td className="px-6 py-4 text-right">
        {item.pageRank != null && (
          <Link
            to={`/package/${item.ecosystem}/${encodeURIComponent(item.name)}/${encodeURIComponent(item.version)}`}
            className="inline-flex items-center justify-center p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Explore Package"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </td>
    </tr>
  );
}

interface TopRiskTableProps {
  items: TopRiskItem[];
}

export default function TopRiskTable({ items }: TopRiskTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  
  const ecosystem = items[0]?.ecosystem || 'npm';
  
  // Track dynamically looked up items so they persist
  const [extraItems, setExtraItems] = useState<TopRiskItem[]>([]);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const combinedItems = useMemo(() => {
    // Put extra (searched) items at top
    return [...extraItems, ...items];
  }, [items, extraItems]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return combinedItems;
    const lower = searchTerm.toLowerCase();
    return combinedItems.filter(i => i.name.toLowerCase().includes(lower));
  }, [searchTerm, combinedItems]);

  const handleLookup = async () => {
    try {
      setIsLookingUp(true);
      const res = await getEnrichment(ecosystem, searchTerm.trim(), 'latest'); // Backend will resolve latest version
      
      const newItem: TopRiskItem = {
         id: `${ecosystem}-${res.package}-lookup`,
         ecosystem,
         name: res.package,
         version: res.version,
         fanIn: 0,
         fanOut: 0,
         versionFanOut: 0,
         bottleneckScore: 0,
         bottleneckPercentile: 0 // Will show as 0 or N/A
      };
      
      setExtraItems(prev => [newItem, ...prev.filter(i => i.name !== newItem.name)]);
      setSearchTerm('');
    } catch (err) {
      console.error("Lookup failed", err);
      // Let the user know somehow, or just let it fail silently for now
    } finally {
      setIsLookingUp(false);
    }
  };

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + pageSize);

  return (
    <div className="bg-[#12121a] rounded-xl shadow-sm border border-[#2a2a35] flex flex-col">
      {/* Search Bar */}
      <div className="px-6 py-4 border-b border-[#2a2a35] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-[#2a2a35] rounded-lg leading-5 bg-[#0a0a12] text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Filter list or search deps.dev..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="text-xs text-gray-500 italic">
          {items.length > 0 ? `Showing top ${items.length} items from cache` : 'No local items'}
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#0a0a12] border-b border-[#2a2a35] text-gray-500 font-semibold tracking-wide uppercase text-xs">
            <tr>
              <th className="px-6 py-4">Package</th>
              <th className="px-6 py-4">Version</th>
              <th className="px-6 py-4 w-56">
                <MetricTooltip metric={SUPPLY_CHAIN_METRICS.bottleneck}>
                  <span className="cursor-help font-semibold">Bottleneck</span>
                </MetricTooltip>
              </th>
              <th className="px-4 py-4 text-right w-24">
                <MetricTooltip metric={SUPPLY_CHAIN_METRICS.fanIn}>
                  <span className="cursor-help font-semibold">Fan-In</span>
                </MetricTooltip>
              </th>
              <th className="px-4 py-4 text-right w-24">
                <MetricTooltip metric={SUPPLY_CHAIN_METRICS.fanOut}>
                  <span className="cursor-help font-semibold">Fan-Out</span>
                </MetricTooltip>
              </th>
              <th className="px-4 py-4 text-right w-28">
                <MetricTooltip metric={SUPPLY_CHAIN_METRICS.monthlyDownloads}>
                  <span className="cursor-help font-semibold flex items-center justify-end"><Download className="w-3 h-3 mr-1" /> D/L (30d)</span>
                </MetricTooltip>
              </th>
              <th className="px-4 py-4 text-center w-24">
                <MetricTooltip metric={SUPPLY_CHAIN_METRICS.scorecardScore}>
                  <span className="cursor-help font-semibold flex items-center justify-center"><Shield className="w-3 h-3 mr-1" /> Security</span>
                </MetricTooltip>
              </th>
              <th className="px-4 py-4 text-right">
                <MetricTooltip metric={SUPPLY_CHAIN_METRICS.pageRank}>
                  <span className="cursor-help font-semibold">PageRank</span>
                </MetricTooltip>
              </th>
              <th className="px-4 py-4 text-right">
                <MetricTooltip metric={SUPPLY_CHAIN_METRICS.eigenvector}>
                  <span className="cursor-help font-semibold">Eigenvec.</span>
                </MetricTooltip>
              </th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/5">
            {filteredItems.length === 0 && searchTerm ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <p className="text-gray-400">Package "<span className="text-gray-200 font-medium">{searchTerm}</span>" isn't in the top {items.length} locally ingested items.</p>
                    <button
                      onClick={handleLookup}
                      disabled={isLookingUp}
                      className="inline-flex items-center px-4 py-2 bg-indigo-500/10 text-indigo-400 font-medium rounded-lg hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors disabled:opacity-50"
                    >
                      {isLookingUp ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Looking up on deps.dev...</>
                      ) : (
                        <><Globe className="w-4 h-4 mr-2" /> Look up on deps.dev (Ecosystem-wide)</>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                  No high-risk dependencies found in this ecosystem.
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => <TopRiskTableRow key={item.id} item={item} />)
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer */}
      {filteredItems.length > 0 && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-[#2a2a35] flex items-center justify-between bg-[#12121a] rounded-b-xl shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-sm border border-[#3a3a45] bg-[#0a0a12] text-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 py-1 pl-2 pr-6"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          
          <div className="flex items-center gap-6">
            <span className="text-sm text-gray-300">
              Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + pageSize, filteredItems.length)}</span> of <span className="font-medium">{filteredItems.length}</span> results
            </span>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={validCurrentPage === 1}
                className="p-1 rounded hover:bg-[#2a2a35] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={validCurrentPage === totalPages}
                className="p-1 rounded hover:bg-[#2a2a35] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

