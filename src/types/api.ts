/**
 * Shared API Response specifications matching backend Pydantic models exactly.
 */

export interface DependencyItem {
  name: string;
  constraint: string;
}

export interface DirectDependenciesResponse {
  package: string;
  version: string;
  ecosystem: string;
  dependencies: DependencyItem[];
}

export interface GraphNode {
  id: string;
  label: string;
  ecosystem: string;
  package: string;
  version: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  constraint: string | null;
}

export interface TransitiveGraphResponse {
  root: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface PackageMetrics {
  directDependencies: number;
  transitiveDependencies: number;
  fanIn: number;
  fanOut: number;
  bottleneckScore: number;
  diamondCount: number;
  pageRank?: number;
  eigenvectorCentrality?: number;
  closenessCentrality?: number;
  betweennessCentrality?: number;
  blastRadius?: number;
  libyears?: number;
  transitiveDepth?: number;
  // External enrichment
  globalFanIn?: number;
  globalDirectDependents?: number;
  globalIndirectDependents?: number;
  monthlyDownloads?: number;
  scorecardScore?: number;
  scorecardChecks?: Record<string, number>;
  sourceRepoUrl?: string;
}

export interface PackageDetailsResponse {
  id: string;
  ecosystem: string;
  name: string;
  version: string;
  metrics: PackageMetrics;
}

// Analytics -----------------------------------------------------------------

export interface TopRiskItem {
  id: string;
  ecosystem: string;
  name: string;
  version: string;
  fanIn: number;
  fanOut: number;
  versionFanOut: number;
  bottleneckScore: number;
  bottleneckPercentile: number;
  pageRank?: number;
  eigenvectorCentrality?: number;
  closenessCentrality?: number;
  betweennessCentrality?: number;
  blastRadius?: number;
  // External enrichment
  globalFanIn?: number;
  monthlyDownloads?: number;
  scorecardScore?: number;
  sourceRepoUrl?: string;
}

export interface TopRiskResponse {
  items: TopRiskItem[];
  totalPackages: number;
}

export interface CoverageResponse {
  ecosystem: string;
  ingestedPackages: number;
  estimatedTotal: number;
  coveragePct: number;
}

// Ingested Packages --------------------------------------------------------

export interface IngestedPackageItem {
  ecosystem: string;
  name: string;
  version: string;
}

export interface IngestedPackagesResponse {
  ecosystem: string;
  packages: IngestedPackageItem[];
  total: number;
}

// Streaming Progress -------------------------------------------------------

export interface StreamProgressEvent {
  type: 'progress';
  processed: number;
  discovered: number;
  inQueue: number;
  missing: number;
}

export interface StreamCompleteEvent {
  type: 'complete';
  data: TransitiveGraphResponse;
}

export type TransitiveStreamEvent = StreamProgressEvent | StreamCompleteEvent;

// Vulnerability ---------------------------------------------------------

export interface VulnerabilitySummary {
  id: string;
  aliases: string[];
  summary: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'UNKNOWN';
  published: string;
  fixedVersions: string[];
}

export interface VulnerabilityBreakdownResponse {
  breakdown: Record<string, VulnerabilitySummary[]>;
  totalAffected: number;
  totalVulns: number;
  severityCounts: {
    CRITICAL: number;
    HIGH: number;
    MODERATE: number;
    LOW: number;
    UNKNOWN: number;
  };
}

// Enrichment ---------------------------------------------------------------

export interface EnrichmentResponse {
  ecosystem: string;
  package: string;
  version: string;
  globalFanIn?: number;
  globalDirectDependents?: number;
  globalIndirectDependents?: number;
  monthlyDownloads?: number;
  scorecardScore?: number;
  scorecardChecks?: Record<string, number>;
  sourceRepoUrl?: string;
  licenses?: string[];
  isDeprecated?: boolean;
}

// Temporal Analytics --------------------------------------------------------

export interface TemporalDataPoint {
  version: string;
  published_at: string;
  fan_out: number;
  global_fan_in: number | null;
  vuln_count: number;
}

export interface TemporalReport {
  ecosystem: string;
  package_name: string;
  data_points: TemporalDataPoint[];
  total_versions_available: number;
  sampled_versions: number;
}
