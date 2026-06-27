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

function edgePath(edge: ArchEdge, from: DOMRect, to: DOMRect, canvas: DOMRect) {
  const startX = from.left - canvas.left + from.width / 2;
  const startY = from.top - canvas.top + from.height / 2;
  const endX = to.left - canvas.left + to.width / 2;
  const endY = to.top - canvas.top + to.height / 2;
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  if (edge.relation === "feedback" || edge.relation === "dependency") {
    const lift = Math.max(34, Math.abs(startX - endX) * 0.16);
    return {
      labelX: midX,
      labelY: Math.min(startY, endY) - lift - 6,
      path: `M ${startX} ${startY} C ${startX} ${startY - lift}, ${endX} ${endY - lift}, ${endX} ${endY}`
    };
  }

  if (edge.relation === "branch" || edge.relation === "guard") {
    const offset = Math.max(18, Math.abs(startY - endY) * 0.18);
    return {
      labelX: midX,
      labelY: midY - offset,
      path: `M ${startX} ${startY} Q ${midX} ${midY - offset * 2}, ${endX} ${endY}`
    };
  }

  return {
    labelX: midX,
    labelY: midY - 8,
    path: `M ${startX} ${startY} L ${endX} ${endY}`
  };
}

function ConnectorLayer({ edges, nodes, paths, width, height }: { edges: ArchEdge[]; nodes: ArchNode[]; paths: ConnectorPath[]; width: number; height: number }) {
  const markerSeed = useId().replace(/:/g, "");
  const labelFor = (id: string) => nodes.find((node) => node.id === id)?.label ?? id;
  const fallbackPaths = useMemo(
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
        <marker id={`${markerSeed}-arrow`} markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="strokeWidth">
          <path d="M 0 0 L 9 4.5 L 0 9 z" />
        </marker>
      </defs>
      {visiblePaths.map(({ edge, labelX, labelY, path }, index) => (
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
            <text x={labelX} y={Math.max(14, labelY)} textAnchor="middle">
              {edge.label}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

function ArchitectureCanvas({ children, edges = [], nodes }: { children: ReactNode; edges?: ArchEdge[]; nodes: ArchNode[] }) {
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
        return [{ edge, ...edgePath(edge, from.getBoundingClientRect(), to.getBoundingClientRect(), canvasRect) }];
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
  }, [edges]);

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
      <ArchitectureCanvas edges={edges} nodes={nodes}>
        <div className="architecture-node-list">
          {nodes.map((node) => (
            <NodeView key={node.id} node={node} />
          ))}
        </div>
      </ArchitectureCanvas>
    );
  }

  return (
    <ArchitectureCanvas edges={edges} nodes={nodes}>
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
