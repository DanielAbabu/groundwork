/**
 * Single source of truth for the component/connection type system.
 * Shared by the canvas renderer and the grading engine — every element the
 * user can place carries semantic meaning the grader can inspect.
 */

export type ComponentType =
  | "CLIENT"
  | "CDN"
  | "LOAD_BALANCER"
  | "APP_SERVER"
  | "CACHE"
  | "DATABASE_PRIMARY"
  | "DATABASE_REPLICA"
  | "QUEUE"
  | "WORKER"
  | "OBJECT_STORE";

export type ConnectionType = "SYNC_REQUEST" | "ASYNC_MESSAGE" | "REPLICATION" | "CACHE_LOOKUP";

export type ComponentCategory = "external" | "networking" | "compute" | "data" | "async";

export interface ComponentTypeDef {
  label: string;
  category: ComponentCategory;
  color: string;
  shape: "rect" | "rounded-rect" | "cylinder" | "pill";
  defaultSize: { w: number; h: number };
  maxInstances: number | null;
  validOutgoing: ComponentType[];
  validIncoming: ComponentType[];
  blurb: string;
}

export const COMPONENT_TYPES: Record<ComponentType, ComponentTypeDef> = {
  CLIENT: {
    label: "Client",
    category: "external",
    color: "#94A3B8",
    shape: "pill",
    defaultSize: { w: 140, h: 56 },
    maxInstances: 1,
    validOutgoing: ["CDN", "LOAD_BALANCER"],
    validIncoming: [],
    blurb: "Browsers and apps entering the system.",
  },
  CDN: {
    label: "CDN",
    category: "networking",
    color: "#5AA9E6",
    shape: "rounded-rect",
    defaultSize: { w: 140, h: 56 },
    maxInstances: 1,
    validOutgoing: ["LOAD_BALANCER", "OBJECT_STORE"],
    validIncoming: ["CLIENT"],
    blurb: "Edge cache for static or geo-distributed reads.",
  },
  LOAD_BALANCER: {
    label: "Load Balancer",
    category: "networking",
    color: "#5AA9E6",
    shape: "rounded-rect",
    defaultSize: { w: 150, h: 56 },
    maxInstances: null,
    validOutgoing: ["APP_SERVER"],
    validIncoming: ["CLIENT", "CDN"],
    blurb: "Terminates public traffic and fans out across app servers.",
  },
  APP_SERVER: {
    label: "App Server",
    category: "compute",
    color: "#3DD68C",
    shape: "rect",
    defaultSize: { w: 150, h: 56 },
    maxInstances: null,
    validOutgoing: ["CACHE", "DATABASE_PRIMARY", "DATABASE_REPLICA", "QUEUE", "OBJECT_STORE"],
    validIncoming: ["LOAD_BALANCER", "WORKER"],
    blurb: "Stateless request handlers — the tier you scale horizontally.",
  },
  CACHE: {
    label: "Cache",
    category: "data",
    color: "#F5A623",
    shape: "rounded-rect",
    defaultSize: { w: 140, h: 56 },
    maxInstances: null,
    validOutgoing: ["DATABASE_PRIMARY", "DATABASE_REPLICA"],
    validIncoming: ["APP_SERVER", "WORKER"],
    blurb: "Absorbs the hot working set so reads never hit the primary.",
  },
  DATABASE_PRIMARY: {
    label: "Primary DB",
    category: "data",
    color: "#E5484D",
    shape: "cylinder",
    defaultSize: { w: 150, h: 60 },
    maxInstances: 1,
    validOutgoing: ["DATABASE_REPLICA"],
    validIncoming: ["APP_SERVER", "CACHE", "WORKER"],
    blurb: "System of record for durable writes.",
  },
  DATABASE_REPLICA: {
    label: "Replica DB",
    category: "data",
    color: "#E5484D",
    shape: "cylinder",
    defaultSize: { w: 150, h: 60 },
    maxInstances: null,
    validOutgoing: [],
    validIncoming: ["DATABASE_PRIMARY", "APP_SERVER", "CACHE"],
    blurb: "Read scale-out fed by replication from the primary.",
  },
  QUEUE: {
    label: "Message Queue",
    category: "async",
    color: "#9B7BD8",
    shape: "rounded-rect",
    defaultSize: { w: 150, h: 56 },
    maxInstances: null,
    validOutgoing: ["WORKER"],
    validIncoming: ["APP_SERVER", "WORKER"],
    blurb: "Buffers work that does not belong on the request path.",
  },
  WORKER: {
    label: "Worker",
    category: "async",
    color: "#9B7BD8",
    shape: "rect",
    defaultSize: { w: 140, h: 56 },
    maxInstances: null,
    validOutgoing: ["DATABASE_PRIMARY", "CACHE", "OBJECT_STORE", "QUEUE"],
    validIncoming: ["QUEUE"],
    blurb: "Consumes queued jobs off the critical path.",
  },
  OBJECT_STORE: {
    label: "Object Store",
    category: "data",
    color: "#7C8792",
    shape: "rounded-rect",
    defaultSize: { w: 150, h: 56 },
    maxInstances: 1,
    validOutgoing: [],
    validIncoming: ["APP_SERVER", "WORKER", "CDN"],
    blurb: "Blob storage for large immutable payloads.",
  },
};

export interface ConnectionTypeDef {
  label: string;
  style: "solid" | "dashed" | "dotted";
  arrowhead: "filled" | "open";
  color: string;
}

export const CONNECTION_TYPES: Record<ConnectionType, ConnectionTypeDef> = {
  SYNC_REQUEST: {
    label: "Synchronous request",
    style: "solid",
    arrowhead: "filled",
    color: "#D8DEE4",
  },
  ASYNC_MESSAGE: { label: "Async / queued", style: "dashed", arrowhead: "open", color: "#9B7BD8" },
  REPLICATION: { label: "Replication", style: "dotted", arrowhead: "filled", color: "#E5484D" },
  CACHE_LOOKUP: { label: "Cache read/write", style: "solid", arrowhead: "filled", color: "#F5A623" },
};

export const COMPONENT_LABELS: Record<ComponentType, string> = Object.fromEntries(
  (Object.keys(COMPONENT_TYPES) as ComponentType[]).map((key) => [
    key,
    COMPONENT_TYPES[key].label,
  ]),
) as Record<ComponentType, string>;

export function isComponentType(value: string): value is ComponentType {
  return value in COMPONENT_TYPES;
}

/** Edge types that make sense for a given node-type pair. */
export function allowedConnectionTypes(
  from: ComponentType,
  to: ComponentType,
): ConnectionType[] {
  const types: ConnectionType[] = [];
  if (from === "DATABASE_PRIMARY" && to === "DATABASE_REPLICA") types.push("REPLICATION");
  if (to === "CACHE" || from === "CACHE") types.push("CACHE_LOOKUP");
  if (to === "QUEUE" || from === "QUEUE") types.push("ASYNC_MESSAGE");
  if (!types.includes("REPLICATION")) types.push("SYNC_REQUEST");
  return types;
}

/** Schema-level legality of an edge, independent of any scenario rubric. */
export function isSchemaValidEdge(from: ComponentType, to: ComponentType): boolean {
  if (from === to) return false;
  return (
    COMPONENT_TYPES[from].validOutgoing.includes(to) &&
    COMPONENT_TYPES[to].validIncoming.includes(from)
  );
}
