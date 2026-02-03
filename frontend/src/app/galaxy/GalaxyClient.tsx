"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, Info, ZoomIn, ZoomOut, Maximize2, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false }); // client-side only

interface GalaxyNode {
  id: string;
  name: string;
  sector: string;
  color: string;
  marketCap: number;
  price: number;
  change: number;
  x?: number;
  y?: number;
}

interface GalaxyLink {
  source: string | GalaxyNode;
  target: string | GalaxyNode;
  correlation: number;
}

interface GalaxyData {
  nodes: GalaxyNode[];
  links: GalaxyLink[];
  threshold?: number;
}

const SECTOR_COLORS: Record<string, string> = {
  "Financials": "#F59E0B",
  "Financial Services": "#F59E0B",
  "Materials": "#10B981",
  "Basic Materials": "#10B981",
  "Energy": "#EF4444",
  "Health Care": "#EC4899",
  "Healthcare": "#EC4899",
  "Industrials": "#6366F1",
  "Consumer Discretionary": "#8B5CF6",
  "Consumer Cyclical": "#8B5CF6",
  "Consumer Staples": "#14B8A6",
  "Consumer Defensive": "#14B8A6",
  "Information Technology": "#3B82F6",
  "Technology": "#3B82F6",
  "Communication Services": "#F97316",
  "Real Estate": "#84CC16",
  "Utilities": "#06B6D4",
  "Other": "#888888",
};

export default function GalaxyClient() {
  const router = useRouter();
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<GalaxyData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<GalaxyNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GalaxyNode | null>(null);
  const [threshold, setThreshold] = useState(0.6); // lower default for more links
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const [connectedNodes, setConnectedNodes] = useState<Set<string>>(new Set());
  const [showGuide, setShowGuide] = useState(false);

  // fetch galaxy data
  const fetchGalaxy = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:8000/market-galaxy?threshold=${threshold}`);
      if (!res.ok) throw new Error("failed to fetch galaxy");
      const json = await res.json();
    
      const nodesWithColors = json.nodes.map((node: any) => ({
        ...node,
        color: SECTOR_COLORS[node.sector] || SECTOR_COLORS["Other"] || "#888888"
      }));

      setData({ ...json, nodes: nodesWithColors });
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, [threshold]);

  useEffect(() => {
    fetchGalaxy();
  }, [fetchGalaxy]);

  // resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // find connected nodes upon hover
  const handleNodeHover = useCallback((node: any) => {
    setHoveredNode(node);
    
    if (node) {
      const connected = new Set<string>();
      connected.add(node.id);
      
      data.links.forEach(link => {
        const sourceId = typeof link.source === "string" ? link.source : link.source.id;
        const targetId = typeof link.target === "string" ? link.target : link.target.id;
        
        if (sourceId === node.id) connected.add(targetId);
        if (targetId === node.id) connected.add(sourceId);
      });
      
      setConnectedNodes(connected);
    } else {
      setConnectedNodes(new Set());
    }
  }, [data.links]);

  // click to go to node ticker page
  const handleNodeClick = useCallback((node: any) => {
    router.push(`/stock/${node.id}`);
  }, [router]);

  // zoom controls
  const handleZoomIn = () => graphRef.current?.zoom(graphRef.current.zoom() * 1.5, 300);
  const handleZoomOut = () => graphRef.current?.zoom(graphRef.current.zoom() / 1.5, 300);
  const handleReset = () => {
    graphRef.current?.zoomToFit(400, 50);
    setSelectedNode(null);
    setHoveredNode(null);
    setConnectedNodes(new Set());
  };

  // node size based on market cap 
  const getNodeSize = useCallback((node: GalaxyNode) => {
    if (!node.marketCap || node.marketCap <= 0) return 6;
    
    const logCap = Math.log10(node.marketCap);
    
    const minLog = 8;   // 100M
    const maxLog = 11.5; // ~300B
    const minSize = 6;
    const maxSize = 32;
    
    const normalized = (logCap - minLog) / (maxLog - minLog);
    const clamped = Math.max(0, Math.min(1, normalized));
    
    return minSize + clamped * (maxSize - minSize);
  }, []);

  const sectors = [...new Set(data.nodes.map(n => n.sector))].sort();

  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const size = getNodeSize(node);
    const isHovered = hoveredNode?.id === node.id;
    const isConnected = connectedNodes.has(node.id);
    const hasHover = hoveredNode !== null;
    
    let opacity = 1;
    if (hasHover && !isConnected) {
      opacity = 0.15;
    }
    
    // hover glow
    if (isHovered || (hasHover && isConnected)) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI);
      ctx.fillStyle = `${node.color}40`;
      ctx.fill();
    }
    
    // main circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = opacity < 1 ? `${node.color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}` : node.color;
    ctx.fill();
    
    // border
    ctx.strokeStyle = isHovered ? "#ffffff" : `${node.color}88`;
    ctx.lineWidth = isHovered ? 2 : 0.5;
    ctx.stroke();
    
    if ((size > 8 || globalScale > 1.5) && opacity > 0.3) {
      const isZoomedOut = globalScale < 2.2;
      const baseAlpha = isZoomedOut ? 0.3 : 0.9;
      const textAlpha = opacity < 1 ? opacity * 0.8 : baseAlpha;

      ctx.font = `${Math.max(3, 10 / globalScale)}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = `rgba(255,255,255,${textAlpha})`;
      ctx.fillText(node.id, node.x, node.y + size + 2);
    }
  }, [hoveredNode, connectedNodes]);

  // link styling
  const getLinkColor = useCallback((link: any) => {
    const hasHover = hoveredNode !== null;
    const sourceId = typeof link.source === "string" ? link.source : link.source.id;
    const targetId = typeof link.target === "string" ? link.target : link.target.id;
    
    if (hasHover) {
      const isConnectedLink = connectedNodes.has(sourceId) && connectedNodes.has(targetId);
      if (!isConnectedLink) return "rgba(255,255,255,0.03)";
      
      //  brighter when correlated
      const corr = link.correlation;
      if (corr >= 0.9) return "rgba(198, 142, 86, 0.9)";
      if (corr >= 0.8) return "rgba(198, 142, 86, 0.7)";
      return "rgba(198, 142, 86, 0.5)";
    }
    
    const corr = link.correlation;
    if (corr >= 0.9) return "rgba(255,255,255,0.5)";
    if (corr >= 0.8) return "rgba(255,255,255,0.35)";
    return "rgba(255,255,255,0.2)";
  }, [hoveredNode, connectedNodes]);

  const getLinkWidth = useCallback((link: any) => {
    const corr = link.correlation;
    if (corr >= 0.9) return 2.5;
    if (corr >= 0.8) return 1.8;
    return 1;
  }, []);

  // format market cap for tooltip
  const formatMarketCap = (val: number) => {
    if (val >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
    return `$${val.toFixed(0)}`;
  };

  return (
    <div className="p-8 max-w-full mx-auto min-h-screen">
      <header className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="mb-1 font-instrument text-4xl tracking-tight bg-linear-to-br via-stone-200 bg-clip-text text-transparent drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.5)] whitespace-nowrap overflow-hidden">
            Market Galaxy
          </h1>
          <p className="text-gray-400 text-sm">Correlation network of ASX stocks</p>
        </div>

        {/* controls */}
        <div className="flex items-center gap-4 bg-surface/50 border border-white/5 rounded-full px-4 py-2 backdrop-blur-md shadow-lg">
          {/* threshold slider */}
          <div className="flex items-center gap-3 border-r border-white/10 pr-4">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Correlation ≥ {threshold.toFixed(2)}</span>
            <input 
              type="range" 
              min="0.4" 
              max="0.9" 
              step="0.05"
              value={threshold}
              onChange={(e) => {
                setThreshold(Number(e.target.value));
                setLoading(true);
              }}
              className="w-28 accent-primary cursor-pointer h-1 bg-white/10 rounded-full appearance-none"
            />
          </div>

          {/* zoom controls */}
          <div className="flex items-center gap-1">
            <button onClick={handleZoomIn} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Zoom In">
              <ZoomIn size={16} className="text-gray-400 hover:text-white" />
            </button>
            <button onClick={handleZoomOut} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Zoom Out">
              <ZoomOut size={16} className="text-gray-400 hover:text-white" />
            </button>
            <button onClick={handleReset} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Reset View">
              <RotateCcw size={16} className="text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>
      </header>

      <div className="luxury-card flex flex-col lg:flex-row overflow-hidden bg-black/40" style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}>
        {/* graph area */}
        <div ref={containerRef} className="flex-1 relative h-full min-h-100">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 z-10">
              <Loader2 className="animate-spin text-primary" size={40} />
              <p className="text-primary font-instrument">Calculating Correlations...</p>
            </div>
          ) : data.nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-4">
              <p className="text-gray-500">No data available</p>
            </div>
          ) : (
            <ForceGraph2D
              ref={graphRef}
              graphData={data}
              width={dimensions.width}
              height={dimensions.height}
              backgroundColor="transparent"
              nodeCanvasObject={paintNode}
              nodePointerAreaPaint={(node: any, color, ctx) => {
                const size = getNodeSize(node); 
                const hitRadius = Math.max(size + 8, 50); // 50px radius interaction area

                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(node.x, node.y, hitRadius, 0, 2 * Math.PI);
                ctx.fill();
              }}
              linkColor={getLinkColor}
              linkWidth={getLinkWidth}
              linkDirectionalParticles={0}
              onNodeHover={handleNodeHover}
              onNodeClick={handleNodeClick}
              cooldownTicks={100}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
              warmupTicks={50}
              enableNodeDrag={true}
              enableZoomInteraction={true}
              enablePanInteraction={true}
            />
          )}

          {/* hovered node tooltip */}
          {hoveredNode && (
            <div className="absolute top-4 left-4 bg-surface/95 border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-md z-20 min-w-50 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center gap-3 mb-3">
                <img 
                  src={`https://files.marketindex.com.au/xasx/96x96-png/${hoveredNode.id.toLowerCase()}.png`}
                  className="w-8 h-8 rounded-full bg-white object-cover"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
                <div>
                  <p className="text-white font-bold text-lg leading-none">{hoveredNode.id}</p>
                  <p className="text-gray-400 text-xs truncate max-w-40">{hoveredNode.name}</p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Sector</span>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hoveredNode.color }}></span>
                    <span className="text-gray-300 text-xs">{hoveredNode.sector}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Market Cap</span>
                  <span className="text-white font-mono text-xs">{formatMarketCap(hoveredNode.marketCap)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Price</span>
                  <span className="text-white font-mono text-xs">${hoveredNode.price?.toFixed(2) || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Change</span>
                  <span className={`font-mono text-xs font-bold ${hoveredNode.change >= 0 ? "text-success" : "text-danger"}`}>
                    {hoveredNode.change > 0 ? "+" : ""}{hoveredNode.change?.toFixed(2) || 0}%
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Gravity ({connectedNodes.size - 1} connections)</p>
                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                  {[...connectedNodes].filter(id => id !== hoveredNode.id).slice(0, 10).map(id => (
                    <span key={id} className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-gray-400">{id}</span>
                  ))}
                  {connectedNodes.size > 11 && (
                    <span className="text-[10px] px-1.5 py-0.5 text-gray-600">+{connectedNodes.size - 11} more</span>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-primary mt-3 opacity-70">Drag to move • Click to view →</p>
            </div>
          )}
        </div>

        {/* legend sidebar */}
        <div className="w-full lg:w-64 border-t lg:border-t-0 lg:border-l border-white/5 bg-background/30 backdrop-blur-sm p-4 overflow-y-auto">
          <h3 className="text-[10px] font-bold uppercase text-gray-500 mb-4 tracking-wider flex items-center gap-2">
            <Info size={12} /> Sectors
          </h3>
          <div className="space-y-1 mb-6">
            {sectors.map((sector) => {
              const count = data.nodes.filter(n => n.sector === sector).length;
              return (
                <div 
                  key={sector} 
                  className="flex items-center gap-3 p-2 rounded-lg transition-all duration-200 group/item hover:bg-white/5"
                >
                  <div 
                    className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] shrink-0" 
                    style={{ backgroundColor: SECTOR_COLORS[sector] || "#888", color: SECTOR_COLORS[sector] || "#888" }} 
                  />
                  <span className="text-xs text-gray-300 font-medium group-hover/item:text-white transition-colors flex-1" title={sector}>{sector}</span>
                  <span className="text-[10px] text-gray-600 font-mono shrink-0">{count}</span>
                </div>
              );
            })}
          </div>

          {/* stats */}
          <div className="border-t border-white/5 pt-4">
            <h3 className="text-[10px] font-bold uppercase text-gray-500 mb-3 tracking-wider">Network Stats</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Nodes</span>
                <span className="text-white font-mono">{data.nodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Links</span>
                <span className="text-white font-mono">{data.links.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Density</span>
                <span className="text-white font-mono">
                  {data.nodes.length > 1 
                    ? ((2 * data.links.length) / (data.nodes.length * (data.nodes.length - 1)) * 100).toFixed(1) 
                    : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* size legend */}
          <div className="border-t border-white/5 pt-4 mt-4">
            <h3 className="text-[10px] font-bold uppercase text-gray-500 mb-3 tracking-wider">Node Size = Market Cap</h3>
            <div className="flex items-end gap-3 justify-center">
              <div className="flex flex-col items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                <span className="text-[9px] text-gray-600">$1M</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                <span className="text-[9px] text-gray-600">$1B</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-gray-500"></div>
                <span className="text-[9px] text-gray-600">$100B</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* explanation cards */}
      <div className="mt-8 border-t border-white/5 pt-6">
        <button 
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mx-auto"
        >
          {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span className="font-instrument tracking-wider uppercase">
            {showGuide ? "Hide Guide" : "How to read the galaxy"}
          </span>
        </button>

        {showGuide && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="luxury-card p-6 rounded-xl border border-white/10 hover:border-white/20 transition-colors bg-white/5">
              <h4 className="font-instrument text-xl font-bold text-white mb-2">Clusters</h4>
              <p className="text-gray-300 text-sm leading-relaxed">
                A High correlation indicates stocks that react similarly to market events. Closely knit groups imply there's shared sector risk or common macroeconomic drivers.
              </p>
            </div>

            <div className="luxury-card p-6 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
              <h4 className="font-instrument text-xl font-bold text-white mb-2">Outliers</h4>
              <p className="text-gray-300 text-sm leading-relaxed">
                Isolated nodes represent stocks with unique price action. These show low correlation to the broader index, offering diversification.
              </p>
            </div>

            <div className="luxury-card p-6 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
              <h4 className="font-instrument text-xl font-bold text-white mb-2">Interconnectivity</h4>
              <p className="text-gray-300 text-sm leading-relaxed">
                Links highlight statistical dependencies regardless of sector. This reveals hidden supply chain ties or underlying commodity exposure.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
