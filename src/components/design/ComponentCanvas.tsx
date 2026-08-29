import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  ViewportPortal,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  COMPONENT_TYPES,
  CONNECTION_TYPES,
  allowedConnectionTypes,
  isSchemaValidEdge,
  type ComponentType,
  type ConnectionType,
} from "@/lib/design/registry";
import type { DesignGraph } from "@/lib/design/types";
import { Button } from "@/components/ui/button";

type NodeData = { componentType: ComponentType; instances: number };
type CanvasNode = Node<NodeData, "component">;
type EdgeData = { connectionType: ConnectionType; illegal: boolean };
type CanvasEdge = Edge<EdgeData>;

/** Distance (in flow units) within which a node snaps to a neighbour's axis. */
const SNAP_THRESHOLD = 7;

interface Guide {
  axis: "x" | "y";
  /** Position along the snapped axis. */
  at: number;
  /** Extent of the guide line along the other axis. */
  from: number;
  to: number;
}

function edgeVisuals(type: ConnectionType, illegal: boolean) {
  const def = CONNECTION_TYPES[type];
  const color = illegal ? "#E5484D" : def.color;
  return {
    style: {
      stroke: color,
      strokeWidth: 1.75,
      strokeDasharray: def.style === "dashed" ? "6 4" : def.style === "dotted" ? "2 4" : undefined,
    },
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 18, height: 18 },
    label: illegal ? `${def.label} · illegal` : def.label,
    labelStyle: { fill: color, fontSize: 10, fontFamily: "var(--font-mono, monospace)" },
    labelBgStyle: { fill: "#0B1120", fillOpacity: 0.85 },
  };
}

function makeEdge(
  id: string,
  source: string,
  target: string,
  type: ConnectionType,
  illegal: boolean,
): CanvasEdge {
  return {
    id,
    source,
    target,
    data: { connectionType: type, illegal },
    ...edgeVisuals(type, illegal),
  };
}

function ComponentNodeView({ data, selected }: NodeProps<CanvasNode>) {
  const def = COMPONENT_TYPES[data.componentType];
  return (
    <div
      className="relative flex items-center justify-center border-2 px-4 py-3 text-center font-mono text-[11px] leading-tight shadow-lg transition-shadow"
      style={{
        width: def.defaultSize.w,
        minHeight: def.defaultSize.h,
        borderColor: def.color,
        background: `color-mix(in srgb, ${def.color} 14%, #0B1120)`,
        color: "#E7EDF4",
        borderRadius: def.shape === "pill" ? 999 : def.shape === "cylinder" ? 26 : 10,
        boxShadow: selected ? `0 0 0 2px ${def.color}` : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: def.color }} />
      <Handle type="target" position={Position.Left} style={{ background: def.color }} />
      <span>
        {def.label}
        {data.instances > 1 && (
          <span
            className="ml-1 rounded bg-black/40 px-1 py-0.5 text-[10px]"
            style={{ color: def.color }}
          >
            x{data.instances}
          </span>
        )}
      </span>
      <Handle type="source" position={Position.Right} style={{ background: def.color }} />
      <Handle type="source" position={Position.Bottom} style={{ background: def.color }} />
    </div>
  );
}

const nodeTypes = { component: ComponentNodeView };

export interface ComponentCanvasProps {
  palette?: ComponentType[];
  value?: DesignGraph;
  nodes?: DesignGraph["nodes"];
  edges?: DesignGraph["edges"];
  onChange: (next: DesignGraph) => void;
}

function nodeSize(node: CanvasNode) {
  const def = COMPONENT_TYPES[node.data.componentType];
  return { w: def.defaultSize.w, h: def.defaultSize.h };
}

function CanvasInner({ palette = Object.keys(COMPONENT_TYPES) as ComponentType[], value, nodes: propNodes, edges: propEdges, onChange }: ComponentCanvasProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  const idRef = useRef(1);
  const { screenToFlowPosition, zoomIn, zoomOut, fitView } = useReactFlow();

  const graphValue = value ?? { nodes: propNodes ?? [], edges: propEdges ?? [] };

  const initial = useMemo(() => {
    const nodes: CanvasNode[] = (graphValue.nodes ?? []).map((node, index) => ({
      id: node.id,
      type: "component" as const,
      position: { x: 80 + (index % 3) * 240, y: 60 + Math.floor(index / 3) * 150 },
      data: { componentType: node.type, instances: node.instances ?? 1 },
    }));
    const byId = new Map((graphValue.nodes ?? []).map((node) => [node.id, node.type]));
    const edges: CanvasEdge[] = (graphValue.edges ?? []).flatMap((edge, index) => {
      const from = byId.get(edge.from);
      const to = byId.get(edge.to);
      if (!from || !to) return [];
      return [makeEdge(`e${index}`, edge.from, edge.to, edge.type, !isSchemaValidEdge(from, to))];
    });
    idRef.current = nodes.length + 1;
    return { nodes, edges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<CanvasEdge>(initial.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [snapping, setSnapping] = useState(true);

  // Serialize UI state down to the plain graph the grader sees.
  useEffect(() => {
    onChange({
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.data.componentType,
        instances: node.data.instances,
      })),
      edges: edges.map((edge) => ({
        from: edge.source,
        to: edge.target,
        type: edge.data?.connectionType ?? "SYNC_REQUEST",
      })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  const addNode = useCallback(
    (type: ComponentType, position?: { x: number; y: number }) => {
      const id = `n${idRef.current++}`;
      setNodes((prev) => [
        ...prev,
        {
          id,
          type: "component" as const,
          position: position ?? {
            x: 60 + (prev.length % 3) * 240,
            y: 50 + Math.floor(prev.length / 3) * 150,
          },
          data: { componentType: type, instances: 1 },
        },
      ]);
    },
    [setNodes],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const from = nodes.find((node) => node.id === connection.source)?.data.componentType;
      const to = nodes.find((node) => node.id === connection.target)?.data.componentType;
      if (!from || !to || connection.source === connection.target) return;
      const type = allowedConnectionTypes(from, to)[0]!;
      const illegal = !isSchemaValidEdge(from, to);
      setEdges((prev) =>
        addEdge(
          makeEdge(
            `e${prev.length}-${Date.now()}`,
            connection.source!,
            connection.target!,
            type,
            illegal,
          ),
          prev,
        ),
      );
    },
    [nodes, setEdges],
  );

  /**
   * Alignment guides: while dragging, compare the dragged node's left/center/right
   * and top/middle/bottom against every other node and snap onto the nearest match.
   */
  const onNodeDrag = useCallback(
    (_event: unknown, dragged: CanvasNode) => {
      if (!snapping) {
        setGuides([]);
        return;
      }
      const size = nodeSize(dragged);
      const others = nodes.filter((node) => node.id !== dragged.id);
      if (others.length === 0) {
        setGuides([]);
        return;
      }

      const xCandidates = [
        dragged.position.x,
        dragged.position.x + size.w / 2,
        dragged.position.x + size.w,
      ];
      const yCandidates = [
        dragged.position.y,
        dragged.position.y + size.h / 2,
        dragged.position.y + size.h,
      ];

      let bestX: { delta: number; at: number } | null = null;
      let bestY: { delta: number; at: number } | null = null;

      for (const other of others) {
        const os = nodeSize(other);
        const otherX = [other.position.x, other.position.x + os.w / 2, other.position.x + os.w];
        const otherY = [other.position.y, other.position.y + os.h / 2, other.position.y + os.h];
        for (const candidate of xCandidates) {
          for (const target of otherX) {
            const delta = target - candidate;
            if (
              Math.abs(delta) <= SNAP_THRESHOLD &&
              (!bestX || Math.abs(delta) < Math.abs(bestX.delta))
            ) {
              bestX = { delta, at: target };
            }
          }
        }
        for (const candidate of yCandidates) {
          for (const target of otherY) {
            const delta = target - candidate;
            if (
              Math.abs(delta) <= SNAP_THRESHOLD &&
              (!bestY || Math.abs(delta) < Math.abs(bestY.delta))
            ) {
              bestY = { delta, at: target };
            }
          }
        }
      }

      const nextGuides: Guide[] = [];
      const ys = [
        dragged.position.y,
        dragged.position.y + size.h,
        ...others.flatMap((n) => [n.position.y, n.position.y + nodeSize(n).h]),
      ];
      const xs = [
        dragged.position.x,
        dragged.position.x + size.w,
        ...others.flatMap((n) => [n.position.x, n.position.x + nodeSize(n).w]),
      ];
      if (bestX)
        nextGuides.push({
          axis: "x",
          at: bestX.at,
          from: Math.min(...ys) - 24,
          to: Math.max(...ys) + 24,
        });
      if (bestY)
        nextGuides.push({
          axis: "y",
          at: bestY.at,
          from: Math.min(...xs) - 24,
          to: Math.max(...xs) + 24,
        });
      setGuides(nextGuides);

      if (bestX || bestY) {
        setNodes((prev) =>
          prev.map((node) =>
            node.id === dragged.id
              ? {
                  ...node,
                  position: {
                    x: node.position.x + (bestX?.delta ?? 0),
                    y: node.position.y + (bestY?.delta ?? 0),
                  },
                }
              : node,
          ),
        );
      }
    },
    [nodes, setNodes, snapping],
  );

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId) ?? null;

  const setInstances = (delta: number) => {
    if (!selectedNode) return;
    const max = COMPONENT_TYPES[selectedNode.data.componentType].maxInstances;
    setNodes((prev) =>
      prev.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                instances: Math.min(max ?? 99, Math.max(1, node.data.instances + delta)),
              },
            }
          : node,
      ),
    );
  };

  const setEdgeType = (type: ConnectionType) => {
    if (!selectedEdge) return;
    setEdges((prev) =>
      prev.map((edge) =>
        edge.id === selectedEdge.id
          ? {
              ...edge,
              data: { connectionType: type, illegal: edge.data?.illegal ?? false },
              ...edgeVisuals(type, edge.data?.illegal ?? false),
            }
          : edge,
      ),
    );
  };

  const removeSelection = () => {
    if (selectedEdge) setEdges((prev) => prev.filter((edge) => edge.id !== selectedEdge.id));
    if (selectedNode) {
      setNodes((prev) => prev.filter((node) => node.id !== selectedNode.id));
      setEdges((prev) =>
        prev.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id),
      );
    }
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  };

  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    setSelectedNodeId(params.nodes[0]?.id ?? null);
    setSelectedEdgeId(params.edges[0]?.id ?? null);
  }, []);

  // Keyboard: cmd/ctrl+D bumps instance count, arrows nudge position.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!selectedNodeId) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        setInstances(1);
        return;
      }
      const nudges: Record<string, [number, number]> = {
        ArrowUp: [0, -8],
        ArrowDown: [0, 8],
        ArrowLeft: [-8, 0],
        ArrowRight: [8, 0],
      };
      const nudge = nudges[event.key];
      if (!nudge) return;
      event.preventDefault();
      setNodes((prev) =>
        prev.map((node) =>
          node.id === selectedNodeId
            ? {
                ...node,
                position: { x: node.position.x + nudge[0], y: node.position.y + nudge[1] },
              }
            : node,
        ),
      );
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId]);

  const grouped = useMemo(() => {
    const map = new Map<string, ComponentType[]>();
    for (const type of palette) {
      const category = COMPONENT_TYPES[type].category;
      map.set(category, [...(map.get(category) ?? []), type]);
    }
    return [...map.entries()];
  }, [palette]);

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100vh-19rem)] lg:max-h-[820px] lg:min-h-[520px] lg:flex-row">
      <aside className="shrink-0 space-y-4 overflow-y-auto rounded-lg border border-border bg-surface p-3 lg:w-[208px]">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          palette — drag or click
        </p>
        <div className="grid grid-cols-2 gap-2 lg:block lg:space-y-4">
          {grouped.map(([category, types]) => (
            <div key={category} className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                {category}
              </p>
              {types.map((type) => {
                const def = COMPONENT_TYPES[type];
                return (
                  <button
                    key={type}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("application/x-component-type", type);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => addNode(type)}
                    title={def.blurb}
                    className="mb-2 w-full cursor-grab rounded-md border-2 px-2 py-2 text-left font-mono text-[11px] text-foreground transition-transform hover:scale-[1.02] hover:brightness-125"
                    style={{
                      borderColor: def.color,
                      background: `color-mix(in srgb, ${def.color} 12%, transparent)`,
                    }}
                  >
                    {def.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div
          ref={wrapper}
          className="relative min-h-[440px] flex-1 overflow-hidden rounded-lg border border-border bg-background"
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
          }}
          onDrop={(event) => {
            event.preventDefault();
            const type = event.dataTransfer.getData("application/x-component-type");
            if (!type || !(type in COMPONENT_TYPES)) return;
            const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
            addNode(type as ComponentType, { x: point.x - 70, y: point.y - 28 });
          }}
        >
          <ReactFlow<CanvasNode, CanvasEdge>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange as (changes: NodeChange<CanvasNode>[]) => void}
            onEdgesChange={onEdgesChange as (changes: EdgeChange<CanvasEdge>[]) => void}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={() => setGuides([])}
            connectionRadius={70}
            fitView
            fitViewOptions={{ maxZoom: 1, padding: 0.25 }}
            minZoom={0.25}
            maxZoom={2.5}
            zoomOnScroll
            zoomOnPinch
            zoomOnDoubleClick={false}
            panOnDrag
            panOnScroll={false}
            selectionOnDrag={false}
            preventScrolling
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#1E293B" />
            <ViewportPortal>
              {guides.map((guide, i) => (
                <div
                  key={i}
                  className="pointer-events-none absolute"
                  style={
                    guide.axis === "x"
                      ? {
                          left: guide.at,
                          top: guide.from,
                          height: guide.to - guide.from,
                          borderLeft: "1px dashed var(--primary)",
                        }
                      : {
                          top: guide.at,
                          left: guide.from,
                          width: guide.to - guide.from,
                          borderTop: "1px dashed var(--primary)",
                        }
                  }
                />
              ))}
            </ViewportPortal>
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              className="!bg-surface-strong"
              maskColor="rgba(11,17,32,0.72)"
              nodeColor={(node) =>
                COMPONENT_TYPES[(node as CanvasNode).data.componentType]?.color ?? "#64748B"
              }
            />
            <Panel
              position="top-right"
              className="flex items-center gap-1 rounded-md border border-border bg-card/90 p-1 backdrop-blur"
            >
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 font-mono"
                onClick={() => zoomOut({ duration: 200 })}
                title="Zoom out"
              >
                −
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 font-mono"
                onClick={() => zoomIn({ duration: 200 })}
                title="Zoom in"
              >
                +
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 font-mono text-[10px] uppercase"
                onClick={() => fitView({ duration: 300, padding: 0.25, maxZoom: 1 })}
              >
                fit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={`h-7 px-2 font-mono text-[10px] uppercase ${snapping ? "text-primary" : "text-muted-foreground"}`}
                onClick={() => setSnapping((prev) => !prev)}
                title="Toggle alignment snapping"
              >
                snap {snapping ? "on" : "off"}
              </Button>
            </Panel>
          </ReactFlow>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          {selectedNode ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-widest text-primary">
                {COMPONENT_TYPES[selectedNode.data.componentType].label}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">instances</span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0 font-mono"
                  onClick={() => setInstances(-1)}
                >
                  −
                </Button>
                <span className="w-8 text-center font-mono text-xs text-foreground">
                  {selectedNode.data.instances}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0 font-mono"
                  onClick={() => setInstances(1)}
                >
                  +
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto font-mono text-xs text-fail"
                onClick={removeSelection}
              >
                Delete
              </Button>
            </div>
          ) : selectedEdge ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-widest text-primary">
                Connection
              </span>
              <select
                value={selectedEdge.data?.connectionType ?? "SYNC_REQUEST"}
                onChange={(event) => setEdgeType(event.target.value as ConnectionType)}
                className="rounded border border-border bg-background px-2 py-1 font-mono text-xs text-foreground"
              >
                {(() => {
                  const from = nodes.find((n) => n.id === selectedEdge.source)?.data.componentType;
                  const to = nodes.find((n) => n.id === selectedEdge.target)?.data.componentType;
                  const options =
                    from && to
                      ? allowedConnectionTypes(from, to)
                      : (Object.keys(CONNECTION_TYPES) as ConnectionType[]);
                  return options.map((type) => (
                    <option key={type} value={type}>
                      {CONNECTION_TYPES[type].label}
                    </option>
                  ));
                })()}
              </select>
              {selectedEdge.data?.illegal && (
                <span className="font-mono text-[11px] text-fail">
                  not a valid connection for these component types
                </span>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto font-mono text-xs text-fail"
                onClick={removeSelection}
              >
                Delete
              </Button>
            </div>
          ) : (
            <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
              Click a node or connection to edit it · drag handles to connect · scroll to zoom, drag
              the canvas to pan · nodes snap to their neighbours&apos; edges and centers ·
              delete/backspace removes · ctrl+D adds an instance · arrows nudge
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ComponentCanvas(props: ComponentCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
