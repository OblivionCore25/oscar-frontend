import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide } from 'd3-force';

interface FluidGraphCanvasProps {
  data: {
    nodes: any[];
    edges: any[];
    root?: string;
  };
  mode: 'dependency' | 'method';
  highlightedNodes?: string[];
  vulnerableNodes?: string[];
  externalFocusNodeId?: string | null;
  onNodeSelect?: (nodeId: string) => void;
  onNodeHover?: (node: any | null, event?: MouseEvent) => void;
  onEdgeSelect?: (edge: { source: string; target: string; constraint?: string } | null) => void;
  onEdgeHover?: (edge: any | null, x: number, y: number) => void;
}

export default function FluidGraphCanvas({ data, mode, highlightedNodes, vulnerableNodes, externalFocusNodeId, onNodeSelect, onNodeHover, onEdgeSelect, onEdgeHover }: FluidGraphCanvasProps) {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoverNode, setHoverNode] = useState<any | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

  // Resize observer to maintain canvas layout size
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const nodeCache = useRef(new Map<string, any>());

  // Format data and calculate physical analytics mappings consistently
  const graphData = useMemo(() => {
    return {
      nodes: data.nodes.map(n => {
        const id = n.id || n.name;
        let size = 4;
        if (id === data.root) size = 8;
        else if (mode === 'method' && n.blast_radius !== undefined) {
          size = Math.min(12, 3 + (n.blast_radius / 2));
        }
        else if (mode === 'dependency' && n.fan_in !== undefined) {
          size = Math.min(12, 3 + Math.sqrt(n.fan_in));
        }

        const newNode: any = { ...n, id, size };
        const cached = nodeCache.current.get(id);
        if (cached) {
          // Preserve live physics state to prevent jumping when data changes
          if (cached.x !== undefined) newNode.x = cached.x;
          if (cached.y !== undefined) newNode.y = cached.y;
          if (cached.vx !== undefined) newNode.vx = cached.vx;
          if (cached.vy !== undefined) newNode.vy = cached.vy;
          if (cached.fx !== undefined) newNode.fx = cached.fx;
          if (cached.fy !== undefined) newNode.fy = cached.fy;
        }
        
        nodeCache.current.set(id, newNode);
        return newNode;
      }),
      links: data.edges.map(e => ({ ...e, source: e.source, target: e.target }))
    };
  }, [data, mode]);

  // Compute adjacency list for fast O(1) neighborhood lookups
  const neighborsMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    graphData.nodes.forEach(n => { map[n.id] = new Set(); });
    graphData.links.forEach((l: any) => {
      const source = typeof l.source === 'object' ? l.source.id : l.source;
      const target = typeof l.target === 'object' ? l.target.id : l.target;
      if (map[source]) map[source].add(target);
      if (map[target]) map[target].add(source);
    });
    return map;
  }, [graphData]);

  // When the parent externally selects a node (e.g. table row click), sync focus + auto-center
  useEffect(() => {
    if (externalFocusNodeId === undefined || externalFocusNodeId === null) return;
    setFocusNodeId(externalFocusNodeId);
    if (fgRef.current && externalFocusNodeId) {
      // Find the node in the current data to get its coordinates
      const node = graphData.nodes.find((n: any) => n.id === externalFocusNodeId);
      if (node && node.x !== undefined) {
        fgRef.current.centerAt(node.x, node.y, 700);
        fgRef.current.zoom(5, 700);
      }
    }
  }, [externalFocusNodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isMassive = graphData.nodes.length > 300;

  // Inject d3-force physics rules
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('collide', forceCollide((node: any) => (node.size || 4) + 4));
      fgRef.current.d3Force('charge').strength(isMassive ? -30 : -150);
    }
  }, [graphData, isMassive]);

  // Color mappings
  const getNodeColor = useCallback((node: any) => {
    if (node.id === data.root) return '#818cf8'; // Indigo for root
    
    if (mode === 'dependency') {
      if (node.bottleneck_score >= 90) return '#f43f5e'; // Red
      if (node.bottleneck_score >= 70) return '#f59e0b'; // Amber
      return '#94a3b8'; // Slate
    }
    
    if (mode === 'method') {
      // Ego graph specific coloring
      if (node.egoRole === 'focal') return '#fbbf24'; // Amber
      if (node.egoRole === 'caller') return '#38bdf8'; // Light Blue (Upstream)
      if (node.egoRole === 'callee') return '#e879f9'; // Pink (Downstream)
      if (node.egoRole === 'bidirectional') return '#c084fc'; // Purple

      // Color by Community ID using distinct neon colors
      const colors = ['#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fbbf24', '#2dd4bf'];
      const idx = node.community_id ?? 0;
      return colors[idx % colors.length];
    }
    return '#94a3b8';
  }, [mode, data.root]);

  // Build a Set of vulnerable package names for O(1) lookup
  const vulnerableSet = useMemo(() => new Set(vulnerableNodes || []), [vulnerableNodes]);

  const isNodeVulnerable = useCallback((node: any) => {
    if (!vulnerableSet.size) return false;
    const id = node.id || '';
    // Extract package name from "ecosystem:pkg@ver" format
    let core = id.includes(':') ? id.split(':', 2)[1] : id;
    if (core.startsWith('@')) {
      const parts = core.split('@');
      core = '@' + parts[1];
    } else {
      core = core.split('@')[0];
    }
    return vulnerableSet.has(core);
  }, [vulnerableSet]);

  // Custom node paint for the glassmorphic / glowing aesthetic
  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isHovered = node === hoverNode;
    const color = getNodeColor(node);
    
    // Size logic
    const size = node.size || 4;

    // Check isolation FIRST
    let isFaded = false;
    if (focusNodeId) {
      if (node.id !== focusNodeId && !(neighborsMap[focusNodeId] && neighborsMap[focusNodeId].has(node.id))) {
        isFaded = true;
      }
    } else if (highlightedNodes && highlightedNodes.length > 0 && !highlightedNodes.includes(node.id)) {
      isFaded = true;
    }

    let glowScale = isHovered ? 1.5 : 1.2;
    if (mode === 'dependency' && node.bottleneck_score) {
      glowScale += (node.bottleneck_score / 100) * 0.6; // Higher bottleneck = wider burn
    } else if (mode === 'method' && node.complexity) {
      glowScale += (node.complexity / 20) * 0.4;
    }

    // Draw the glowing aura only if not faded
    if (!isFaded) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size * glowScale, 0, 2 * Math.PI, false);
      ctx.fillStyle = `${color}33`; // 20% opacity
      ctx.fill();
    }

    // Draw the core
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    
    // Dim if unhighlighted or out of focus neighborhood
    if (isFaded) {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.2)'; // Heavy dim
      ctx.fill();
    } else {
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = isHovered ? 15 : (5 * glowScale);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw vulnerability red ring overlay
    if (!isFaded && isNodeVulnerable(node)) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size + 3, 0, 2 * Math.PI, false);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw label
    // Rule 1: Never draw a label if the node is currently faded out (Focus Mode active)
    if (!isFaded) {
      // Rule 2: Only globally draw all labels if zoomed in AND it's not a massive spaghetti graph
      const showGlobalLabel = globalScale > 1.2 && !isMassive;
      
      // Rule 3: Always show labels if explicitly hovered, clicked, or is the root node
      const overrideLabel = isHovered || node.id === focusNodeId || node.id === data.root;

      if (showGlobalLabel || overrideLabel) {
        const label = node.label || node.package || node.id;
        // Make hovered labels slightly larger
        const fontSize = overrideLabel ? 14 / globalScale : 11 / globalScale;
        ctx.font = `600 ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = overrideLabel ? '#ffffff' : '#94a3b8';
        ctx.fillText(label, node.x, node.y + size + (fontSize * 1.5));
      }
    }
  }, [hoverNode, mode, data.root, getNodeColor, focusNodeId, neighborsMap, highlightedNodes, isMassive, isNodeVulnerable]);

  const handleNodeClick = useCallback((node: any) => {
    if (onNodeSelect) onNodeSelect(node.id);
    
    // Set internal focus isolation
    if (focusNodeId === node.id) {
       setFocusNodeId(null);
    } else {
       setFocusNodeId(node.id);
    }
    
    // Auto center only for full ecosystem dependency maps
    if (fgRef.current && mode === 'dependency') {
      fgRef.current.centerAt(node.x, node.y, 1000);
      fgRef.current.zoom(3, 1000);
    }
  }, [onNodeSelect, mode]);

  const handleLinkClick = useCallback((link: any) => {
    if (onEdgeSelect) {
      onEdgeSelect({
        source: link.source.id || link.source,
        target: link.target.id || link.target,
        constraint: link.constraint
      });
    }
  }, [onEdgeSelect]);

  const handleBackgroundClick = useCallback(() => {
    setFocusNodeId(null);
    if (onNodeSelect) onNodeSelect('');
    if (onEdgeSelect) onEdgeSelect(null);
  }, [onNodeSelect, onEdgeSelect]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative cursor-crosshair"
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
    >
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        backgroundColor="rgba(0,0,0,0)" // Transparent to let our CSS #12121a shine through
        nodeCanvasObject={paintNode}
        nodeLabel={() => ''} // We draw our own labels or use external tooltips
        onNodeHover={(node: any) => {
          setHoverNode(node);
          document.body.style.cursor = node ? 'pointer' : 'default';
          if (onNodeHover) {
            // Build a synthetic event from the tracked mouse position
            const syntheticEvent = { clientX: mousePos.x, clientY: mousePos.y } as MouseEvent;
            onNodeHover(node, node ? syntheticEvent : undefined);
          }
        }}
        onLinkHover={(link) => {
          if (onEdgeHover) {
            onEdgeHover(link, mousePos.x, mousePos.y);
          }
        }}
        onNodeClick={handleNodeClick}
        onLinkClick={handleLinkClick}
        onBackgroundClick={handleBackgroundClick}
        
        // Dark Universe visual elements
        linkColor={(link: any) => {
          const sid = link.source.id || link.source;
          const tid = link.target.id || link.target;

          // Check neighborhood focus
          if (focusNodeId) {
            if (sid !== focusNodeId && tid !== focusNodeId) {
               return 'rgba(255,255,255,0.02)'; // Almost invisible
            }
          } else if (highlightedNodes && highlightedNodes.length > 0) {
            if (!highlightedNodes.includes(sid) || !highlightedNodes.includes(tid)) {
               return 'rgba(255,255,255,0)';
            }
          }

          if (mode === 'dependency') {
             if (link.constraint && link.constraint.includes('==')) return 'rgba(245, 158, 11, 0.4)'; // amber pinned
             if (!link.constraint || link.constraint === 'unconstrained') return 'rgba(244, 63, 94, 0.4)'; // red unconstrained
             return 'rgba(52, 211, 153, 0.4)'; // green ok
          }
          if (mode === 'method') {
             if (link.call_type === 'dynamic') return 'rgba(244, 63, 94, 0.8)'; // bright red for dynamic trace
          }
          return 'rgba(148, 163, 184, 0.2)'; // slate for methods
        }}
        linkWidth={(link) => {
          if (mode === 'dependency' && link.constraint) return 2;
          if (mode === 'method' && link.call_type === 'dynamic') return 3;
          return 1.5;
        }}
        linkDirectionalParticles={(link: any) => {
          if (isMassive) return 0; // Throttle dynamic particles on mass scale
          
          if (mode === 'dependency') return 3;
          if (mode === 'method' && link.call_type === 'dynamic') return 4;
          return 1;
        }}
        linkDirectionalParticleWidth={(link: any) => (link.call_type === 'dynamic' ? 3 : 1.5)}
        linkDirectionalParticleSpeed={(link: any) => {
          if (mode === 'dependency' && link.constraint && link.constraint.includes('==')) return 0.002; // Pinned constraints flow slow and steady
          if (mode === 'method') return 0.008; // Methods flow fast
          return 0.005; 
        }}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        
        // Physics constraints
        d3VelocityDecay={isMassive ? 0.6 : 0.3} // Aggressively settle massive graphs
        warmupTicks={isMassive ? 150 : 50} // Pre-calculate entirely if massive
        cooldownTicks={isMassive ? 0 : 100} // Freeze immediately if massive
      />
    </div>
  );
}
