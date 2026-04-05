import { useState } from 'react';
import { BookOpen, Search, Microscope, Box, ExternalLink } from 'lucide-react';
import { SUPPLY_CHAIN_METRICS, METHOD_METRICS } from '../data/metricDefinitions';
import type { MetricInfo } from '../components/MetricTooltip';

function MetricCard({ metric, index }: { metric: MetricInfo; index: number }) {
  return (
    <div
      id={metric.glossaryAnchor}
      className="bg-[#12121a] rounded-2xl border border-[#2a2a35] p-6 hover:border-indigo-500/30 transition-all duration-300 scroll-mt-24"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-base font-bold text-gray-100">{metric.name}</h3>
        <span className="text-[10px] font-mono text-indigo-400/50 bg-indigo-500/10 px-2 py-0.5 rounded-full">
          #{index + 1}
        </span>
      </div>

      <div className="mb-4">
        <h4 className="text-[10px] uppercase tracking-widest text-indigo-400 mb-1">Definition</h4>
        <p className="text-sm text-gray-300 leading-relaxed">{metric.definition}</p>
      </div>

      {metric.formula && (
        <div className="mb-4">
          <h4 className="text-[10px] uppercase tracking-widest text-emerald-400 mb-1">Formula</h4>
          <div className="font-mono text-xs text-emerald-300/80 bg-emerald-900/15 rounded-lg px-3 py-2 border border-emerald-500/10">
            {metric.formula}
          </div>
        </div>
      )}

      <div className="mb-4">
        <h4 className="text-[10px] uppercase tracking-widest text-amber-400 mb-1">Why It Matters</h4>
        <p className="text-sm text-gray-400 leading-relaxed italic">{metric.whyItMatters}</p>
      </div>

      {metric.citation && (
        <div className="flex items-start gap-1.5 text-[11px] text-indigo-400/60 border-t border-white/5 pt-3 mt-3">
          <ExternalLink className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>{metric.citation}</span>
        </div>
      )}
    </div>
  );
}

export default function MetricsGlossary() {
  const [searchQuery, setSearchQuery] = useState('');

  const supplyMetrics = Object.values(SUPPLY_CHAIN_METRICS);
  const methodMetrics = Object.values(METHOD_METRICS);

  const filterMetrics = (metrics: MetricInfo[]) => {
    if (!searchQuery.trim()) return metrics;
    const q = searchQuery.toLowerCase();
    return metrics.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.definition.toLowerCase().includes(q) ||
        (m.formula && m.formula.toLowerCase().includes(q))
    );
  };

  const filteredSupply = filterMetrics(supplyMetrics);
  const filteredMethod = filterMetrics(methodMetrics);
  const totalResults = filteredSupply.length + filteredMethod.length;

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a12] text-gray-100 relative">
      <div className="max-w-5xl mx-auto px-6 py-10 relative z-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <BookOpen className="w-8 h-8 text-indigo-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              OSCAR Metrics Glossary
            </h1>
          </div>
          <p className="text-gray-400 max-w-2xl leading-relaxed">
            A comprehensive reference of all structural metrics computed by the OSCAR Graph Observatory.
            Each metric includes its mathematical definition, computation formula, interpretation guidance,
            and academic citation for research reproducibility.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search metrics by name, definition, or formula..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#12121a] border border-[#2a2a35] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
          />
          {searchQuery && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500">
              {totalResults} result{totalResults !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Supply Chain Section */}
        {filteredSupply.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Microscope className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-gray-200 uppercase tracking-wide">
                Supply Chain Observatory
              </h2>
              <span className="text-xs text-gray-500 ml-2">Dependency-Level Metrics</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSupply.map((metric, i) => (
                <MetricCard key={metric.glossaryAnchor} metric={metric} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Method Observatory Section */}
        {filteredMethod.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Box className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-gray-200 uppercase tracking-wide">
                Internal Architecture Observatory
              </h2>
              <span className="text-xs text-gray-500 ml-2">Method-Level Metrics</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMethod.map((metric, i) => (
                <MetricCard key={metric.glossaryAnchor} metric={metric} index={i} />
              ))}
            </div>
          </section>
        )}

        {totalResults === 0 && (
          <div className="text-center py-20 text-gray-500">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>No metrics match "<span className="text-gray-300">{searchQuery}</span>"</p>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-[#2a2a35] pt-6 mt-8 text-center">
          <p className="text-xs text-gray-600">
            OSCAR Graph Observatory • Metrics documentation generated from the internal computation engine.
          </p>
        </footer>
      </div>
    </div>
  );
}
