import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Architecture } from "../content/schema";

type ArchNode = Architecture["nodes"][number];
type ArchEdge = Architecture["edges"][number];
type ArchGroup = Architecture["groups"][number];

const loopTypes = new Set(["feedback", "flywheel"]);

type ConnectorPath = {
  edge: ArchEdge;
  labelX: number;
  labelY: number;
  path: string;
  anchor?: "start" | "middle";
};

function groupNodes(nodes: ArchNode[], groups: ArchGroup[] = []) {
  if (groups.length === 0) return [];
  return groups.map((group) => ({
    ...group,
    nodes: nodes.filter((node) => node.group === group.id)
  }));
}

function NodeView({ node }: { node: ArchNode }) {
  return (
    <span className="architecture-node" data-node-id={node.id} data-tone={node.tone ?? "neutral"}>
      <span className="architecture-node-label">{node.label}</span>
    </span>
  );
}

// Point on a node's border in the direction of (towardX, towardY) from its center.
// Clipping endpoints to the border keeps the arrowhead visible at the node edge
// instead of buried under the node box (which sits above the connector layer).
function borderPoint(cx: number, cy: number, hw: number, hh: number, towardX: number, towardY: number) {
  const dx = towardX - cx;
  const dy = towardY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const sx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
}

function edgePath(edge: ArchEdge, from: DOMRect, to: DOMRect, canvas: DOMRect, allowGutter: boolean): Omit<ConnectorPath, "edge"> {
  const fx = from.left - canvas.left;
  const fy = from.top - canvas.top;
  const tx = to.left - canvas.left;
  const ty = to.top - canvas.top;
  const fcx = fx + from.width / 2;
  const fcy = fy + from.height / 2;
  const tcx = tx + to.width / 2;
  const tcy = ty + to.height / 2;
  const span = Math.abs(fcy - tcy);

  // Long feedback / dependency edges route around the left gutter rather than
  // cutting diagonally across every layer.
  const routeAround = allowGutter && (edge.relation === "feedback" || edge.relation === "dependency") && span > 160;
  if (routeAround) {
    const gutter = 6;
    const r = 10;
    const startX = fx - 4;
    const startY = fcy;
    const endX = tx - 4;
    const endY = tcy;
    const dir = endY < startY ? -1 : 1;
    const path =
      `M ${startX} ${startY} L ${gutter + r} ${startY} ` +
      `Q ${gutter} ${startY} ${gutter} ${startY + dir * r} ` +
      `L ${gutter} ${endY - dir * r} ` +
      `Q ${gutter} ${endY} ${gutter + r} ${endY} ` +
      `L ${endX} ${endY}`;
    return { labelX: gutter + 6, labelY: (startY + endY) / 2, path, anchor: "start" };
  }

  const start = borderPoint(fcx, fcy, from.width / 2, from.height / 2, tcx, tcy);
  const end = borderPoint(tcx, tcy, to.width / 2, to.height / 2, fcx, fcy);
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  if (edge.relation === "branch" || edge.relation === "guard") {
    const offset = Math.max(16, Math.abs(start.y - end.y) * 0.18);
    return { labelX: midX, labelY: midY - offset, path: `M ${start.x} ${start.y} Q ${midX} ${midY - offset * 2}, ${end.x} ${end.y}` };
  }

  return { labelX: midX, labelY: midY - 8, path: `M ${start.x} ${start.y} L ${end.x} ${end.y}` };
}

function ConnectorLayer({ edges, nodes, paths, width, height }: { edges: ArchEdge[]; nodes: ArchNode[]; paths: ConnectorPath[]; width: number; height: number }) {
  const markerSeed = useId().replace(/:/g, "");
  const labelFor = (id: string) => nodes.find((node) => node.id === id)?.label ?? id;
  const fallbackPaths = useMemo<ConnectorPath[]>(
    () =>
      edges.map((edge, index) => ({
        edge,
        labelX: 0,
        labelY: 0,
        path: `M 0 ${index * 10} L 20 ${index * 10}`
      })),
    [edges]
  );
  const visiblePaths = paths.length > 0 ? paths : fallbackPaths;
  const viewWidth = width || 1;
  const viewHeight = height || 1;

  if (edges.length === 0) return null;

  return (
    <svg className="architecture-connectors" viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <marker id={`${markerSeed}-arrow`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M 0 0 L 8 4 L 0 8 z" fill="context-stroke" />
        </marker>
      </defs>
      {visiblePaths.map(({ edge, labelX, labelY, path, anchor }, index) => (
        <g
          key={`${edge.from}-${edge.to}-${edge.label ?? ""}-${index}`}
          className="architecture-connector"
          data-relation={edge.relation ?? "primary"}
          data-from={edge.from}
          data-to={edge.to}
          aria-label={`${labelFor(edge.from)} 到 ${labelFor(edge.to)}${edge.label ? `：${edge.label}` : ""}`}
        >
          <path d={path} markerEnd={`url(#${markerSeed}-arrow)`} />
          {edge.label && paths.length > 0 ? (
            <text x={labelX} y={Math.max(14, labelY)} textAnchor={anchor ?? "middle"}>
              {edge.label}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

function ArchitectureCanvas({ children, edges = [], nodes, allowGutter = false }: { children: ReactNode; edges?: ArchEdge[]; nodes: ArchNode[]; allowGutter?: boolean }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ height: number; paths: ConnectorPath[]; width: number }>({ height: 0, paths: [], width: 0 });

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const measure = () => {
      const canvasRect = canvas.getBoundingClientRect();
      const paths = edges.flatMap((edge) => {
        const from = canvas.querySelector<HTMLElement>(`[data-node-id="${edge.from}"]`);
        const to = canvas.querySelector<HTMLElement>(`[data-node-id="${edge.to}"]`);
        if (!from || !to) return [];
        return [{ edge, ...edgePath(edge, from.getBoundingClientRect(), to.getBoundingClientRect(), canvasRect, allowGutter) }];
      });

      setLayout({ height: canvasRect.height, paths, width: canvasRect.width });
    };

    measure();

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(canvas);
    window.addEventListener("resize", measure);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [edges, allowGutter]);

  return (
    <div className="architecture-canvas" ref={canvasRef}>
      <ConnectorLayer edges={edges} height={layout.height} nodes={nodes} paths={layout.paths} width={layout.width} />
      {children}
    </div>
  );
}

function GroupedDiagram({ nodes, groups = [], edges = [] }: { nodes: ArchNode[]; groups?: ArchGroup[]; edges?: ArchEdge[] }) {
  const grouped = groupNodes(nodes, groups);
  if (grouped.length === 0) {
    return (
      <ArchitectureCanvas edges={edges} nodes={nodes} allowGutter>
        <div className="architecture-node-list">
          {nodes.map((node) => (
            <NodeView key={node.id} node={node} />
          ))}
        </div>
      </ArchitectureCanvas>
    );
  }

  return (
    <ArchitectureCanvas edges={edges} nodes={nodes} allowGutter>
      <div className="architecture-groups">
        {grouped.map((group) => (
          <section key={group.id} className="architecture-group" data-kind={group.kind ?? "lane"}>
            <h3>{group.label}</h3>
            <div className="architecture-node-list">
              {group.nodes.map((node) => (
                <NodeView key={node.id} node={node} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </ArchitectureCanvas>
  );
}

function LoopDiagram({ nodes, edges = [] }: { nodes: ArchNode[]; edges?: ArchEdge[] }) {
  return (
    <ArchitectureCanvas edges={edges} nodes={nodes}>
      <div className="architecture-loop" data-count={nodes.length} style={{ "--loop-count": nodes.length } as CSSProperties}>
        {nodes.map((node, index) => (
          <div key={node.id} className="architecture-loop-slot" style={{ "--slot": index } as CSSProperties}>
            <NodeView node={node} />
          </div>
        ))}
      </div>
    </ArchitectureCanvas>
  );
}

export function ArchitectureDiagram({ architecture }: { architecture: Architecture }) {
  if (!architecture || architecture.renderMode === "none") return null;

  const content = loopTypes.has(architecture.type) ? (
    <LoopDiagram nodes={architecture.nodes} edges={architecture.edges} />
  ) : (
    <GroupedDiagram nodes={architecture.nodes} groups={architecture.groups} edges={architecture.edges} />
  );

  return (
    <figure className="architecture-diagram" data-type={architecture.type} role="img" aria-label={architecture.summary}>
      <div className="diagram-heading">
        <span>{architecture.summary}</span>
      </div>
      {content}
      {architecture.conclusion ? <figcaption>{architecture.conclusion}</figcaption> : null}
    </figure>
  );
}
