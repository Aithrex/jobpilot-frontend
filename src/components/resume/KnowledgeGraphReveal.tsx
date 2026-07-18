import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { apiService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GraphEdge, GraphNode, KnowledgeGraph } from "@/types/voicegraph";

const GRAPH_KEY = ["voice-graph", "graph"] as const;

/* Fixed drawing surface — the SVG scales to fit via viewBox. */
const W = 720;
const H = 520;
const CX = W / 2;
const CY = H / 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5)); // ~137.5° — even, non-clumping spread

interface PlacedNode extends GraphNode {
  x: number;
  y: number;
  clusterX: number;
  clusterY: number;
}

interface Cluster {
  type: string;
  x: number;
  y: number;
  count: number;
}

interface Layout {
  placed: PlacedNode[];
  byId: Map<string, PlacedNode>;
  clusters: Cluster[];
  types: string[];
}

function computeLayout(nodes: GraphNode[]): Layout {
  const types = Array.from(new Set(nodes.map((n) => n.type))).sort();
  const groups = new Map<string, GraphNode[]>();
  for (const n of nodes) {
    const arr = groups.get(n.type) ?? [];
    arr.push(n);
    groups.set(n.type, arr);
  }

  const clusterR = Math.min(W, H) * 0.3;
  const placed: PlacedNode[] = [];
  const clusters: Cluster[] = [];

  types.forEach((type, ti) => {
    const angle =
      types.length === 1 ? 0 : (ti / types.length) * Math.PI * 2 - Math.PI / 2;
    const clusterX = types.length === 1 ? CX : CX + clusterR * Math.cos(angle);
    const clusterY = types.length === 1 ? CY : CY + clusterR * Math.sin(angle);
    const group = groups.get(type) ?? [];
    // Bigger clusters pack tighter so they stay contained on-canvas.
    const spacing = 15 + 20 / Math.sqrt(group.length + 1);
    // Confirmed facts settle toward the bright cluster core.
    const ordered = [...group].sort(
      (a, b) => Number(b.user_confirmed) - Number(a.user_confirmed),
    );
    ordered.forEach((n, k) => {
      const a = k * GOLDEN;
      const r = k === 0 ? 0 : spacing * Math.sqrt(k);
      placed.push({
        ...n,
        x: clusterX + r * Math.cos(a),
        y: clusterY + r * Math.sin(a),
        clusterX,
        clusterY,
      });
    });
    clusters.push({ type, x: clusterX, y: clusterY, count: group.length });
  });

  const byId = new Map(placed.map((p) => [p.node_id, p]));
  return { placed, byId, clusters, types };
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function nodeRadius(n: GraphNode): number {
  const base = 4.5 + clamp01(n.confidence) * 2.5;
  return n.user_confirmed ? base + 1.5 : base;
}

/** Confirmed facts render bright; inferred ones dim, nudged by confidence. */
function nodeOpacity(n: GraphNode): number {
  return n.user_confirmed ? 0.95 : 0.3 + clamp01(n.confidence) * 0.22;
}

export default function KnowledgeGraphReveal() {
  const reduce = useReducedMotion();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);

  const query = useQuery({
    queryKey: GRAPH_KEY,
    retry: false,
    queryFn: async (): Promise<KnowledgeGraph | null> => {
      const res = await apiService.voiceGraphGraph();
      if (res.status === 404) return null; // feature flag off
      if (res.error) throw new Error(res.error);
      return res.data ?? null;
    },
  });

  const graph = query.data;
  const layout = useMemo(
    () => computeLayout(graph?.nodes ?? []),
    [graph?.nodes],
  );

  return (
    <section aria-labelledby="voice-graph-heading">
      <SectionHeading
        id="voice-graph-heading"
        eyebrow="Your graph"
        title="Here is what you told us."
      />

      {query.isLoading ? (
        <GraphSkeleton />
      ) : query.isError ? (
        <ErrorNote onRetry={() => query.refetch()} />
      ) : !graph || graph.nodes.length === 0 ? (
        <EmptyNote onRefresh={() => query.refetch()} />
      ) : (
        <GraphCanvas
          graph={graph}
          layout={layout}
          reduce={!!reduce}
          selectedId={selectedId}
          hoverId={hoverId}
          activeType={activeType}
          onSelect={setSelectedId}
          onHover={setHoverId}
          onToggleType={(t) =>
            setActiveType((prev) => (prev === t ? null : t))
          }
        />
      )}
    </section>
  );
}

/* ─────────────────────────── Canvas ─────────────────────────── */

function GraphCanvas({
  graph,
  layout,
  reduce,
  selectedId,
  hoverId,
  activeType,
  onSelect,
  onHover,
  onToggleType,
}: {
  graph: KnowledgeGraph;
  layout: Layout;
  reduce: boolean;
  selectedId: string | null;
  hoverId: string | null;
  activeType: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onToggleType: (type: string) => void;
}) {
  const { placed, byId, clusters, types } = layout;
  const selected = selectedId ? byId.get(selectedId) : undefined;
  const ringId = hoverId ?? selectedId;
  const ringNode = ringId ? byId.get(ringId) : undefined;

  const dimFor = (n: GraphNode) =>
    activeType && n.type !== activeType ? 0.12 : 1;

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
      <Card className="overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-manipulation"
          role="img"
          aria-label={`A map of ${placed.length} facts about you across ${types.length} categories.`}
        >
          {/* Edges — thin, quiet; fade in after the nodes settle. */}
          <motion.g
            className="stroke-current text-primary"
            fill="none"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reduce ? { duration: 0 } : { duration: 0.6, delay: 0.5 }}
          >
            {graph.edges.map((e) => (
              <Edge key={e.edge_id} edge={e} byId={byId} />
            ))}
          </motion.g>

          {/* Cluster labels */}
          {clusters.map((c) => (
            <text
              key={c.type}
              x={c.x}
              y={c.y - Math.min(H, W) * 0.14}
              textAnchor="middle"
              className={cn(
                "fill-current text-[11px] font-medium uppercase tracking-wide text-muted-foreground transition-opacity",
                activeType && activeType !== c.type && "opacity-30",
              )}
            >
              {c.type}
            </text>
          ))}

          {/* Nodes */}
          {placed.map((n, i) => {
            const op = nodeOpacity(n) * dimFor(n);
            const delay = reduce ? 0 : Math.min(i * 0.006, 0.8);
            return (
              <motion.circle
                key={n.node_id}
                className="fill-current text-primary focus:outline-none"
                r={nodeRadius(n)}
                initial={
                  reduce
                    ? false
                    : { cx: n.clusterX, cy: n.clusterY, opacity: 0 }
                }
                animate={{ cx: n.x, cy: n.y, opacity: op }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { duration: 0.55, ease: "easeOut", delay }
                }
                tabIndex={0}
                role="button"
                aria-label={`${n.label}: ${n.type}, ${
                  n.user_confirmed ? "confirmed" : "inferred"
                }`}
                style={{ cursor: "pointer" }}
                onClick={() => onSelect(n.node_id)}
                onFocus={() => onSelect(n.node_id)}
                onMouseEnter={() => onHover(n.node_id)}
                onMouseLeave={() => onHover(null)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    onSelect(n.node_id);
                  }
                }}
              />
            );
          })}

          {/* Highlight ring for the hovered / selected node */}
          {ringNode && (
            <circle
              cx={ringNode.x}
              cy={ringNode.y}
              r={nodeRadius(ringNode) + 4}
              className="fill-none stroke-current text-primary"
              strokeWidth={1.5}
              pointerEvents="none"
            />
          )}
        </svg>
      </Card>

      <div className="space-y-4">
        <NodeDetail node={selected} total={placed.length} />
        <Legend
          clusters={clusters}
          activeType={activeType}
          onToggle={onToggleType}
        />
      </div>
    </div>
  );
}

function Edge({
  edge,
  byId,
}: {
  edge: GraphEdge;
  byId: Map<string, PlacedNode>;
}) {
  const a = byId.get(edge.src_id);
  const b = byId.get(edge.dst_id);
  if (!a || !b) return null;
  return (
    <line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      strokeWidth={edge.user_confirmed ? 1 : 0.75}
      strokeOpacity={edge.user_confirmed ? 0.28 : 0.14}
    />
  );
}

/* ─────────────────────────── Side detail ─────────────────────────── */

function NodeDetail({
  node,
  total,
}: {
  node: PlacedNode | undefined;
  total: number;
}) {
  if (!node) {
    return (
      <Card className="p-4 text-sm text-muted-foreground" aria-live="polite">
        <p>
          Tap a point to see what it is. Brighter points are facts you&apos;ve
          confirmed; dimmer ones we inferred from your writing.
        </p>
        <p className="mt-2 tabular-nums text-xs">{total} facts in your graph.</p>
      </Card>
    );
  }
  return (
    <Card className="p-4" aria-live="polite">
      <p className="overline">{node.type}</p>
      <p className="mt-1 font-serif text-lg leading-snug text-foreground">
        {node.label}
      </p>
      {node.canonical_label && node.canonical_label !== node.label && (
        <p className="mt-0.5 text-xs text-muted-foreground">
          {node.canonical_label}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2 text-xs">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 font-medium",
            node.user_confirmed
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {node.user_confirmed ? "You confirmed this" : "We inferred this"}
        </span>
        <span className="tabular-nums text-muted-foreground">
          {Math.round(clamp01(node.confidence) * 100)}% sure
        </span>
      </div>
    </Card>
  );
}

/* ─────────────────────────── Legend ─────────────────────────── */

function Legend({
  clusters,
  activeType,
  onToggle,
}: {
  clusters: Cluster[];
  activeType: string | null;
  onToggle: (type: string) => void;
}) {
  return (
    <Card className="p-4">
      <p className="overline mb-2">By category</p>
      <ul className="flex flex-wrap gap-1.5">
        {clusters.map((c) => {
          const active = activeType === c.type;
          return (
            <li key={c.type}>
              <button
                type="button"
                onClick={() => onToggle(c.type)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
                {c.type}
                <span className="tabular-nums opacity-70">{c.count}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {activeType && (
        <button
          type="button"
          onClick={() => onToggle(activeType)}
          className="mt-2 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Show all categories
        </button>
      )}
    </Card>
  );
}

/* ─────────────────────────── Shared bits ─────────────────────────── */

function SectionHeading({
  id,
  eyebrow,
  title,
}: {
  id: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-5">
      <p className="overline text-primary">{eyebrow}</p>
      <h2
        id={id}
        className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl"
      >
        {title}
      </h2>
    </div>
  );
}

function GraphSkeleton() {
  return (
    <div
      className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]"
      role="status"
      aria-label="Loading your graph"
    >
      <div className="aspect-[720/520] w-full animate-pulse rounded-xl bg-muted" />
      <div className="space-y-4">
        <div className="h-28 animate-pulse rounded-xl bg-muted" />
        <div className="h-20 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}

function ErrorNote({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
      <p className="text-sm text-muted-foreground">
        We couldn&apos;t draw your graph just now.
      </p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </Card>
  );
}

function EmptyNote({ onRefresh }: { onRefresh: () => void }) {
  return (
    <Card className="border-dashed p-10 text-center">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Sparkles className="h-5 w-5" />
      </div>
      <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
        Finalize a writing sample and we&apos;ll show you your career as a shape.
      </p>
      <Button size="sm" variant="outline" className="mt-4" onClick={onRefresh}>
        Check again
      </Button>
    </Card>
  );
}

export { KnowledgeGraphReveal };
