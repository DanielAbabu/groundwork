import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
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

function edgeVisuals(type: ConnectionType, illegal: boolean) {
  const def = CONNECTION_TYPES[type];
  const color = illegal ? "#E5484D" : def.color;
  return {
    style: {
      stroke: color,
      strokeWidth: 1.75,
      strokeDasharray:
        def.style === "dashed" ? "6 4" : def.style === "dotted" ? "2 4" : undefined,
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
      className="relative flex items-center justify-center rounded-lg border-2 px-4 py-3 text-center font-mono text-[11px] leading-tight shadow-lg transition-shadow"
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
          <span className="ml-1 rounded bg-black/40 px-1 py-0.5 text-[10px]" style={{ color: def.color }}>
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
  palette: ComponentType[];
  value: DesignGraph;
  onChange: (next: DesignGraph) => void;
}

function CanvasInner({ palette, value, onChange }: ComponentCanvasProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  const idRef = useRef(1);

  const initial = useMemo(() => {
    const nodes: CanvasNode[] = (value.nodes ?? []).map((node, index) => ({
      id: node.id,
      type: "component" as const,
      position: { x: 80 + (index % 3) * 220, y: 60 + Math.floor(index / 3) * 130 },
      data: { componentType: node.type, instances: node.instances ?? 1 },
    }));
    const byId = new Map((value.nodes ?? []).map((node) => [node.id, node.type]));
    const edges: CanvasEdge[] = (value.edges ?? []).flatMap((edge, index) => {
      const from = byId.get(edge.from);
      const to = byId.get(edge.to);
      if (!from || !to) return [];
      return [
        makeEdge(
          `e${index}`,
          edge.from,
          edge.to,
          edge.type,
          !isSchemaValidEdge(from, to),
        ),
      ];
    });
    idRef.current = nodes.length + 1;
    return { nodes, edges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<CanvasEdge>(initial.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

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
      const count = nodes.filter((node) => node.data.componentType === type).length;
      setNodes((prev) => [
        ...prev,
        {
          id,
          type: "component" as const,
          position: position ?? { x: 120 + count * 40, y: 80 + prev.length * 30 },
          data: { componentType: type, instances: 1 },
        },
      ]);
    },
    [nodes, setNodes],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const from = nodes.find((node) => node.id === connection.source)?.data.componentType;
      const to = nodes.find((node) => node.id === connection.target)?.data.componentType;
      if (!from || !to || connection.source === connection.target) return;
      const type = allowedConnectionTypes(from, to)[0]!;
      const illegal = !isSchemaValidEdge(from, to);
      setEdges((prev) =>
        addEdge(makeEdge(`e${prev.length}-${Date.now()}`, connection.source!, connection.target!, type, illegal), prev),
      );
    },
    [nodes, setEdges],
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
                instances: Math.min(
                  max ?? 99,
                  Math.max(1, node.data.instances + delta),
                ),
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
            ? { ...node, position: { x: node.position.x + nudge[0], y: node.position.y + nudge[1] } }
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
    <div className="grid gap-4 lg:grid-cols-[190px_1fr]">
      <aside className="space-y-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          palette — drag or click
        </p>
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
                  className="w-full cursor-grab rounded-md border-2 px-2 py-2 text-left font-mono text-[11px] text-foreground transition-colors hover:brightness-125"
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
      </aside>

      <div className="space-y-3">
        <div
          ref={wrapper}
          className="h-[460px] rounded-lg border border-border bg-background"
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
          }}
          onDrop={(event) => {
            event.preventDefault();
            const type = event.dataTransfer.getData("application/x-component-type");
            if (!type || !(type in COMPONENT_TYPES)) return;
            const bounds = wrapper.current?.getBoundingClientRect();
            addNode(type as ComponentType, {
              x: event.clientX - (bounds?.left ?? 0) - 70,
              y: event.clientY - (bounds?.top ?? 0) - 28,
            });
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
            snapToGrid
            snapGrid={[8, 8]}
            fitView
            proOptions={{ hideAttribution: true }}
            className="rounded-lg"
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#1E293B" />
            <Controls showInteractive={false} />
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
                <Button size="sm" variant="outline" className="h-7 w-7 p-0 font-mono" onClick={() => setInstances(-1)}>
                  −
                </Button>
                <span className="w-8 text-center font-mono text-xs text-foreground">
                  {selectedNode.data.instances}
                </span>
                <Button size="sm" variant="outline" className="h-7 w-7 p-0 font-mono" onClick={() => setInstances(1)}>
                  +
                </Button>
              </div>
              <Button size="sm" variant="ghost" className="ml-auto font-mono text-xs text-fail" onClick={removeSelection}>
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
              <Button size="sm" variant="ghost" className="ml-auto font-mono text-xs text-fail" onClick={removeSelection}>
                Delete
              </Button>
            </div>
          ) : (
            <p className="font-mono text-[11px] text-muted-foreground">
              Click a node or connection to edit it · drag handles to connect · delete/backspace removes ·
              ctrl+D adds an instance · arrows nudge
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
