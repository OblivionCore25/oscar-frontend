import { useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TopRiskItem } from '../types/api';
import MetricTooltip from './MetricTooltip';
import { SUPPLY_CHAIN_METRICS } from '../data/metricDefinitions';

interface TopRiskTableProps {
  items: TopRiskItem[];
}

export default function TopRiskTable({ items }: TopRiskTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  if (!items.length) {
    return (
      <div className="text-center py-12 bg-[#12121a] rounded-xl shadow-sm border border-white/5">
        <p className="text-gray-500">No high-risk dependencies found in this ecosystem.</p>
      </div>
    );
  }

  // Calculate pagination
  const totalPages = Math.ceil(items.length / pageSize);
  // Ensure current page is valid when items or page size changes
  const validCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedItems = items.slice(startIndex, startIndex + pageSize);

  // Percentile thresholds for colour coding
  const getPercentileColor = (pct: number) => {
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

  return (
    <div className="bg-[#12121a] rounded-xl shadow-sm border border-[#2a2a35] flex flex-col">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#0a0a12] border-b border-[#2a2a35] text-gray-500 font-semibold tracking-wide uppercase text-xs">
            <tr>
              <th className="px-6 py-4">Package</th>
              <th className="px-6 py-4">Version</th>
              <th className="px-6 py-4 w-64">
                <MetricTooltip metric={SUPPLY_CHAIN_METRICS.bottleneck}>
                  <span className="cursor-help font-semibold">Bottleneck Score</span>
                </MetricTooltip>
                <span className="font-normal text-gray-500 lowercase ml-1">(percentile rank)</span>
              </th>
              <th className="px-4 py-4 text-right">
                <MetricTooltip metric={SUPPLY_CHAIN_METRICS.fanIn}>
                  <span className="cursor-help font-semibold">Fan-In</span>
                </MetricTooltip>
              </th>
              <th className="px-4 py-4 text-right">
                <MetricTooltip metric={SUPPLY_CHAIN_METRICS.fanOut}>
                  <span className="cursor-help font-semibold">Fan-Out</span>
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
              <th className="px-4 py-4 text-right">
                <MetricTooltip metric={SUPPLY_CHAIN_METRICS.blastRadius}>
                  <span className="cursor-help font-semibold">Blast Rad.</span>
                </MetricTooltip>
              </th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedItems.map((item) => {
              const colors = getPercentileColor(item.bottleneckPercentile);
              const pct = item.bottleneckPercentile;

              return (
                <tr key={item.id} className="hover:bg-[#0a0a12] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-100">{item.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.ecosystem}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">
                    v{item.version}
                  </td>
                  <td className="px-6 py-4 min-w-[200px]">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset tabular-nums ${colors.badge}`}>
                          {ordinal(Math.round(pct))} pct
                        </span>
                        <span className="text-[10px] text-gray-500 tabular-nums">
                          raw: {item.bottleneckScore.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-[#2a2a35] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${colors.bar}`}
                          style={{ width: `${Math.max(2, pct)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right tabular-nums">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300">{item.fanIn.toLocaleString()}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right tabular-nums">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300">{item.fanOut.toLocaleString()}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right tabular-nums font-mono text-xs text-indigo-600">
                    {item.pageRank ? item.pageRank.toFixed(6) : '0.000000'}
                  </td>
                  <td className="px-4 py-4 text-right tabular-nums font-mono text-xs text-purple-400">
                    {item.eigenvectorCentrality ? item.eigenvectorCentrality.toFixed(6) : '0.000000'}
                  </td>
                  <td className="px-4 py-4 text-right tabular-nums font-mono text-xs text-amber-400">
                    {item.blastRadius ? item.blastRadius.toLocaleString() : '0'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/graph?ecosystem=${item.ecosystem}&package=${item.name}&version=${item.version}`}
                      className="inline-flex items-center justify-center p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="View Graph"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-[#2a2a35] flex items-center justify-between bg-[#12121a] rounded-b-xl shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1); // Reset to first page
              }}
              className="text-sm border-[#3a3a45] rounded focus:ring-blue-500 focus:border-blue-500 py-1 pl-2 pr-6"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          
          <div className="flex items-center gap-6">
            <span className="text-sm text-gray-300">
              Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + pageSize, items.length)}</span> of <span className="font-medium">{items.length}</span> results
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
