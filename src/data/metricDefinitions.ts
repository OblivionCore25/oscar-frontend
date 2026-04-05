import type { MetricInfo } from '../components/MetricTooltip';

/**
 * Central catalog of all OSCAR metric definitions.
 * Used by both MetricTooltip (inline) and MetricsGlossary (full page).
 */

// ─── Supply Chain Observatory (Dependency-Level) ─────────────────────────────

export const SUPPLY_CHAIN_METRICS: Record<string, MetricInfo> = {
  fanIn: {
    name: 'Fan-In',
    definition: 'The number of unique packages in the local cache that declare this package as a direct dependency.',
    formula: 'Fan-In = |{ p : p → this_package }|',
    whyItMatters: 'High Fan-In means many packages rely on this one. A vulnerability here would cascade upstream to all dependents.',
    citation: 'Martin, R. C. (2003). Agile Software Development: Principles, Patterns, and Practices.',
    glossaryAnchor: 'fan-in',
  },
  fanOut: {
    name: 'Fan-Out',
    definition: 'The number of direct runtime dependencies declared by this specific version of the package.',
    formula: 'Fan-Out = |direct_dependencies(pkg@version)|',
    whyItMatters: 'High Fan-Out increases the attack surface — each dependency is a potential point of failure or compromise.',
    citation: 'Martin, R. C. (2003). Agile Software Development.',
    glossaryAnchor: 'fan-out',
  },
  bottleneck: {
    name: 'Bottleneck Score',
    definition: 'A composite risk indicator calculated by multiplying Fan-In by Fan-Out. Packages that are both heavily depended upon AND heavily dependent carry the highest structural risk.',
    formula: 'Bottleneck = Fan-In × Fan-Out',
    whyItMatters: 'The highest-scoring packages are structural chokepoints — replacing or patching them is simultaneously critical and dangerous.',
    citation: 'OSCAR composite metric.',
    glossaryAnchor: 'bottleneck',
  },
  pageRank: {
    name: 'PageRank',
    definition: 'An iterative algorithm (originally from Google Search) that ranks nodes by the importance of their incoming links. A package depended upon by other important packages scores higher.',
    formula: 'PR(p) = (1-d)/N + d × Σ(PR(q)/L(q)) for all q linking to p, where d=0.85',
    whyItMatters: 'Unlike Fan-In, PageRank captures recursive importance — being depended upon by "important" packages matters more than raw count.',
    citation: 'Brin, S. & Page, L. (1998). The Anatomy of a Large-Scale Hypertextual Web Search Engine.',
    glossaryAnchor: 'pagerank',
  },
  eigenvector: {
    name: 'Eigenvector Centrality',
    definition: 'Measures a node\'s influence based on how well-connected its neighbors are. Computed as the leading eigenvector of the adjacency matrix.',
    formula: 'Ax = λx, where A is the adjacency matrix',
    whyItMatters: 'Captures "prestige" — a package connected to other highly connected packages scores higher, even if its direct link count is modest.',
    citation: 'Bonacich, P. (1972). Factoring and Weighting Approaches to Status Scores and Clique Identification.',
    glossaryAnchor: 'eigenvector',
  },
  betweenness: {
    name: 'Betweenness Centrality',
    definition: 'The fraction of all shortest paths in the dependency network that pass through this package. Measures the "bridge" or gatekeeper role.',
    formula: 'CB(v) = Σ σ(s,t|v) / σ(s,t) for all pairs s,t',
    whyItMatters: 'A package with high betweenness acts as a critical bridge — removing it could disconnect large portions of the ecosystem graph.',
    citation: 'Freeman, L. C. (1977). A Set of Measures of Centrality Based on Betweenness.',
    glossaryAnchor: 'betweenness',
  },
  closeness: {
    name: 'Closeness Centrality',
    definition: 'The inverse of the average shortest-path distance from this node to all other reachable nodes in the graph.',
    formula: 'CC(v) = (N-1) / Σ d(v,u) for all reachable u',
    whyItMatters: 'High closeness means a failure at this node propagates quickly to the rest of the ecosystem — it is "close" to everything.',
    citation: 'Freeman, L. C. (1979). Centrality in Social Networks: Conceptual Clarification.',
    glossaryAnchor: 'closeness',
  },
  blastRadius: {
    name: 'Blast Radius',
    definition: 'The total count of all packages transitively reachable downstream from this package in the dependency graph.',
    formula: 'Blast Radius = |descendants(G, package)|',
    whyItMatters: 'If this package is compromised or breaks, this is the total number of packages in your cache that would be directly or indirectly affected.',
    citation: 'OSCAR composite metric.',
    glossaryAnchor: 'blast-radius',
  },
  instability: {
    name: 'Instability (I)',
    definition: 'A ratio measuring how susceptible a package is to breaking due to external changes. Ranges from 0.0 (fully stable) to 1.0 (fully unstable).',
    formula: 'I = Fan-Out / (Fan-In + Fan-Out)',
    whyItMatters: 'I=1.0 means the package depends on many things but nothing depends on it — it is a pure consumer. I=0.0 means it\'s a stable foundation that many things rely on.',
    citation: 'Martin, R. C. (1994). OO Design Quality Metrics: An Analysis of Dependencies.',
    glossaryAnchor: 'instability',
  },
  abstractness: {
    name: 'Abstractness (A)',
    definition: 'The ratio of abstract interfaces to concrete implementations within the package. Only applicable at source-code level (Method Observatory).',
    formula: 'A = abstract_classes / total_classes',
    whyItMatters: 'At the dependency level, Abstractness is N/A because OSCAR analyzes structural links, not internal code. Use the Method Observatory for this metric.',
    citation: 'Martin, R. C. (1994). OO Design Quality Metrics.',
    glossaryAnchor: 'abstractness',
  },
  zoneAnalysis: {
    name: 'Zone Analysis',
    definition: 'Classifies a package based on its position relative to the "Main Sequence" line (I + A = 1). Packages far from this line are architecturally suspect.',
    formula: 'Distance = |A + I - 1|',
    whyItMatters: 'Zone of Pain: stable but hard to change (I≈0, A≈0). Zone of Uselessness: unstable and over-abstract (I≈1, A≈1). Healthy packages sit on or near the Main Sequence.',
    citation: 'Martin, R. C. (2003). Agile Software Development.',
    glossaryAnchor: 'zone-analysis',
  },
  libyears: {
    name: 'Libyears (Technical Lag)',
    definition: 'The cumulative calendar-time difference between each transitive dependency\'s used version release date and its latest available version release date, summed across the entire tree.',
    formula: 'Libyears = Σ (latest_date(pkg) - used_date(pkg)) / 365.25, for all transitive deps',
    whyItMatters: 'High Libyears indicates the supply chain is "frozen in time" — missing years of security patches, bug fixes, and performance improvements.',
    citation: 'Cox, J. et al. (2015). Measuring Dependency Freshness in Software Systems.',
    glossaryAnchor: 'libyears',
  },
  transitiveDepth: {
    name: 'Transitive Depth',
    definition: 'The length of the longest dependency chain from the root package to its deepest transitive dependency.',
    formula: 'Transitive Depth = dag_longest_path_length(subgraph)',
    whyItMatters: 'Deep chains amplify cascading failures — a vulnerability buried 7 levels deep is nearly impossible to audit manually.',
    citation: 'Kikas, R. et al. (2017). Structure and Evolution of Package Dependency Networks.',
    glossaryAnchor: 'transitive-depth',
  },
  diamondConflicts: {
    name: 'Diamond Conflicts',
    definition: 'The count of packages that appear in the transitive dependency tree in two or more distinct versions.',
    formula: 'Diamonds = |{ pkg : |versions_in_tree(pkg)| > 1 }|',
    whyItMatters: 'Diamond conflicts create "dependency hell" — the package manager must pick one version, potentially breaking the other consumer\'s expectations.',
    citation: 'Abate, P. et al. (2012). Dependency Solving: A Separate Concern in Component Evolution Management.',
    glossaryAnchor: 'diamond-conflicts',
  },
};

// ─── Internal Architecture Observatory (Method-Level) ────────────────────────

export const METHOD_METRICS: Record<string, MetricInfo> = {
  methods: {
    name: 'Methods',
    definition: 'Total count of function and method definitions extracted from the package\'s source code via AST parsing.',
    whyItMatters: 'Provides a baseline for normalizing other metrics. A package with 10 methods and 5 hotspots is riskier than one with 1000 methods and 5 hotspots.',
    glossaryAnchor: 'methods',
  },
  classes: {
    name: 'Classes',
    definition: 'Total count of class definitions found in the source code.',
    whyItMatters: 'High class count with low edge count may suggest over-engineering or an overly fragmented architecture.',
    glossaryAnchor: 'classes',
  },
  modules: {
    name: 'Modules',
    definition: 'Number of source files (Python .py files) that were successfully parsed.',
    whyItMatters: 'Indicates the physical organization of the codebase and how the author chose to structure their project.',
    glossaryAnchor: 'modules',
  },
  edgeCount: {
    name: 'Edge Count',
    definition: 'Number of resolved internal call edges — function A calls function B within the same project.',
    whyItMatters: 'Low edge count relative to method count indicates a fragmented, loosely coupled architecture. High edge count suggests tightly woven internal logic.',
    glossaryAnchor: 'edge-count',
  },
  resolutionRate: {
    name: 'Resolution Rate',
    definition: 'The percentage of all detected function calls that were successfully resolved to internal project methods (as opposed to external library calls).',
    formula: 'Resolution Rate = resolved_calls / total_calls × 100',
    whyItMatters: 'Low rates (e.g. 25%) indicate the package delegates most of its work to external libraries (Facade pattern). High rates indicate self-contained logic.',
    glossaryAnchor: 'resolution-rate',
  },
  topHotspot: {
    name: 'Top Hotspot',
    definition: 'The single method with the highest bottleneck score (Fan-In × Fan-Out) in the internal call graph.',
    formula: 'Hotspot Risk = fan_in × fan_out (or fan_in if fan_out = 0)',
    whyItMatters: 'This is the method whose failure would cascade most widely through the project. It is the single highest-priority target for testing and code review.',
    glossaryAnchor: 'top-hotspot',
  },
  orphanRatio: {
    name: 'Orphan Ratio',
    definition: 'The percentage of methods that have zero incoming calls from other internal methods (excluding known entry points like __init__ and main).',
    formula: 'Orphan Ratio = orphan_methods / total_methods × 100',
    whyItMatters: 'High orphan ratio may indicate dead code, or that the package exposes a wide public API where most methods are called externally.',
    glossaryAnchor: 'orphan-ratio',
  },
  communities: {
    name: 'Communities',
    definition: 'Number of structurally independent clusters detected via the Louvain community detection algorithm on the internal call graph.',
    formula: 'Louvain modularity optimization on undirected call graph',
    whyItMatters: 'High community count relative to method count indicates a highly modular, loosely coupled architecture. Very few communities may indicate monolithic design.',
    citation: 'Blondel, V. et al. (2008). Fast Unfolding of Communities in Large Networks.',
    glossaryAnchor: 'communities',
  },
  methodComplexity: {
    name: 'Cyclomatic Complexity',
    definition: 'A quantitative measure of the number of linearly independent paths through a method\'s source code (AST-based).',
    whyItMatters: 'Higher complexity correlates strongly with lower maintainability and higher defect density. Methods with complexity > 10 are traditionally considered candidates for refactoring.',
    citation: 'McCabe, T. J. (1976). A Complexity Measure.',
    glossaryAnchor: 'method-complexity',
  },
  methodCentrality: {
    name: 'Method Betweenness Centrality',
    definition: 'The fraction of all shortest paths in the internal call graph that pass through this specific method.',
    formula: 'CB(m) = Σ σ(s,t|m) / σ(s,t) for all methods s,t',
    whyItMatters: 'Identifies internal architectural "bridges". A method with high centrality connects disparate parts of the codebase, meaning its return values or side effects likely orchestrate complex flows.',
    citation: 'Freeman, L. C. (1977). A Set of Measures of Centrality Based on Betweenness.',
    glossaryAnchor: 'method-centrality',
  },
  methodFanIn: {
    name: 'Method Fan-In',
    definition: 'The number of other internal methods within the package that call this specific method.',
    whyItMatters: 'A method with high Fan-In is heavily reused (e.g., a utility function or core data access layer). Modifying it has widespread impact.',
    glossaryAnchor: 'method-fan-in',
  },
  methodFanOut: {
    name: 'Method Fan-Out',
    definition: 'The number of other internal methods within the package that this specific method calls.',
    whyItMatters: 'A method with high Fan-Out acts as a heavy coordinator/facade. It is highly coupled to the rest of the system and sensitive to changes in upstream logic.',
    glossaryAnchor: 'method-fan-out',
  },
  methodBlastRadius: {
    name: 'Method Blast Radius',
    definition: 'The total count of all internal methods transitively downstream from this method in the local call graph.',
    formula: 'Blast Radius = |descendants(LocalGraph, method)|',
    whyItMatters: 'Changing the signature or behavior of this method will transitively ripple through this many dependent functions downstream.',
    citation: 'OSCAR composite metric.',
    glossaryAnchor: 'method-blast-radius',
  },
  compositeRisk: {
    name: 'Composite Risk Score',
    definition: 'An aggregated algorithmic risk assessment for identifying architectural hotspots.',
    formula: 'Risk Score = Complexity × Centrality × Blast Radius',
    whyItMatters: 'This focuses code review and refactoring efforts on the most dangerous methods: those that are complex, structurally central, and command a large blast radius.',
    citation: 'OSCAR composite metric.',
    glossaryAnchor: 'composite-risk',
  },
};
