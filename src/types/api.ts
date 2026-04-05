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
