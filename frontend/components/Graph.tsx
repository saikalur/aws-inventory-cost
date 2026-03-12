"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { GraphNode as GN, GraphEdge } from "@/lib/types";
import { SERVICE_COLORS, NODE_SIZES } from "@/lib/constants";
import GraphLegend from "./GraphLegend";
import NodePopup from "./NodePopup";
import { exportResources } from "@/lib/exportXlsx";
import { useAccount } from "@/hooks/useAccount";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

interface ForceNode extends GN {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphProps {
  nodes: GN[];
  links: GraphEdge[];
}

export default function Graph({ nodes, links }: GraphProps) {
  const { data: accountData } = useAccount();
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState<ForceNode | null>(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set());
  const [selectedRegion, setSelectedRegion] = useState<string>("all");

  // Build neighbor maps for highlighting
  const neighborMap = useRef<Map<string, Set<string>>>(new Map());
  const linkKeySet = useRef<Set<string>>(new Set());

  useEffect(() => {
    const nm = new Map<string, Set<string>>();
    const lk = new Set<string>();
    for (const l of links) {
      const s = typeof l.source === "object" ? (l.source as any).id : l.source;
      const t = typeof l.target === "object" ? (l.target as any).id : l.target;
      if (!nm.has(s)) nm.set(s, new Set());
      if (!nm.has(t)) nm.set(t, new Set());
      nm.get(s)!.add(t);
      nm.get(t)!.add(s);
      lk.add(`${s}__${t}`);
    }
    neighborMap.current = nm;
    linkKeySet.current = lk;
  }, [links]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setDims({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const handleNodeClick = useCallback((node: any, event: MouseEvent) => {
    setSelectedNode(node);
    setPopupPos({ x: event.clientX + 10, y: event.clientY + 10 });

    // Highlight connected nodes
    const connected = neighborMap.current.get(node.id) || new Set();
    setHighlightNodes(new Set([node.id, ...connected]));

    const hl = new Set<string>();
    connected.forEach((nid) => {
      hl.add(`${node.id}__${nid}`);
      hl.add(`${nid}__${node.id}`);
    });
    setHighlightLinks(hl);

    // Center on node
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 500);
      fgRef.current.zoom(2, 500);
    }
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
  }, []);

  const services = [...new Set(nodes.map((n) => n.service))].sort();
  // Only show regions that have at least one non-VPC asset (default VPCs exist everywhere)
  const regions = [
    ...new Set(
      nodes
        .filter((n) => n.region !== "global" && n.service !== "vpc")
        .map((n) => n.region)
    ),
  ].sort();

  const visibleNodes =
    selectedRegion === "all"
      ? nodes
      : nodes.filter((n) => n.region === selectedRegion || n.region === "global");

  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  const visibleLinks = links.filter(
    (l) => visibleNodeIds.has(l.source as string) && visibleNodeIds.has(l.target as string)
  );

  // Collapse multiple Route53 zones into a single group node
  const ROUTE53_GROUP_ID = "__route53_group__";
  const route53Nodes = visibleNodes.filter((n) => n.service === "route53");
  const route53Ids = new Set(route53Nodes.map((n) => n.id));

  let graphNodes: GN[];
  let graphLinks: GraphEdge[];

  if (route53Nodes.length > 1) {
    const groupNode: GN = {
      id: ROUTE53_GROUP_ID,
      label: `Route 53 (${route53Nodes.length} zones)`,
      service: "route53",
      resource_type: "Route53Group",
      region: "global",
      metadata: { zones: route53Nodes.map((n) => n.label).join(", ") },
    };
    graphNodes = [...visibleNodes.filter((n) => n.service !== "route53"), groupNode];

    const seenEdges = new Set<string>();
    graphLinks = visibleLinks
      .map((l) => ({
        ...l,
        source: route53Ids.has(l.source as string) ? ROUTE53_GROUP_ID : l.source,
        target: route53Ids.has(l.target as string) ? ROUTE53_GROUP_ID : l.target,
      }))
      .filter((l) => {
        if (l.source === l.target) return false;
        const key = `${l.source}__${l.target}`;
        if (seenEdges.has(key)) return false;
        seenEdges.add(key);
        return true;
      });
  } else {
    graphNodes = visibleNodes;
    graphLinks = visibleLinks;
  }

  const graphData = {
    nodes: graphNodes.map((n) => ({ ...n })),
    links: graphLinks.map((l) => ({ ...l })),
  };

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <ForceGraph2D
        ref={fgRef}
        width={dims.width}
        height={dims.height}
        graphData={graphData}
        nodeId="id"
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const size = NODE_SIZES[node.resource_type] || 5;
          const color = SERVICE_COLORS[node.service] || "#6b7280";
          const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(node.id);
          const alpha = isHighlighted ? 1 : 0.15;

          // Draw node circle
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.globalAlpha = alpha;
          ctx.fill();

          // Glow effect for selected node
          if (selectedNode?.id === node.id) {
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, size + 3, 0, 2 * Math.PI);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            ctx.stroke();
          }

          // Label on zoom
          if (globalScale > 1.5) {
            ctx.globalAlpha = alpha;
            ctx.font = `${Math.max(10 / globalScale, 2)}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillStyle = "#e4e6f0";
            const label =
              node.label.length > 20
                ? node.label.slice(0, 20) + "..."
                : node.label;
            ctx.fillText(label, node.x!, node.y! + size + 2);
          }

          ctx.globalAlpha = 1;
        }}
        nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
          const size = NODE_SIZES[node.resource_type] || 5;
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, size + 2, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={0.9}
        linkColor={(link: any) => {
          const s = typeof link.source === "object" ? link.source.id : link.source;
          const t = typeof link.target === "object" ? link.target.id : link.target;
          const key = `${s}__${t}`;
          if (highlightLinks.size > 0 && highlightLinks.has(key)) return "#818cf8";
          if (highlightLinks.size > 0) return "rgba(46,51,72,0.2)";
          return "rgba(99,102,241,0.3)";
        }}
        linkWidth={(link: any) => {
          const s = typeof link.source === "object" ? link.source.id : link.source;
          const t = typeof link.target === "object" ? link.target.id : link.target;
          const key = `${s}__${t}`;
          return highlightLinks.has(key) ? 2 : 0.5;
        }}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        backgroundColor="#0f1117"
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />

      {/* Region filter + export */}
      <div className="absolute left-4 top-4 flex items-center gap-2">
        <label className="text-xs text-[#8b93b0]">Region</label>
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="rounded-md border border-[#2e3348] bg-[#1a1d29]/90 px-3 py-1.5 text-sm text-[#e4e6f0] backdrop-blur focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="all">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {selectedRegion !== "all" && (
          <span className="text-xs text-[#8b93b0]">
            {visibleNodes.length} resources
          </span>
        )}
        <button
          onClick={() => void exportResources(graphNodes, selectedRegion, accountData?.account_name ?? "Unknown")}
          className="flex items-center gap-1.5 rounded-lg border border-[#2e3348] bg-[#1a1d29]/90 px-3 py-1.5 text-sm text-[#e4e6f0] backdrop-blur transition-colors hover:border-indigo-500/50 hover:text-indigo-400"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export XLSX
        </button>
      </div>

      <GraphLegend services={services} />

      {selectedNode && (
        <NodePopup
          node={selectedNode}
          x={popupPos.x}
          y={popupPos.y}
          onClose={() => {
            setSelectedNode(null);
            setHighlightNodes(new Set());
            setHighlightLinks(new Set());
          }}
        />
      )}
    </div>
  );
}
