import { Graph } from "./graph";
import { array, has, uniqueId } from "./helpers";
import type { DaGraph, EdgeLabel, GraphLabel, GraphNode, Rect, Vector } from "./types";

/*
 * Adds a dummy node to the graph and return v.
*/
export function addDummyNode(g: DaGraph, type: string, attrs: Partial<GraphNode>, name: string): string {
  var v: string;
  do {
    v = uniqueId(name);
  } while (g.hasNode(v));

  attrs.dummy = type;
  g.setNode(v, attrs);
  return v;
}

/*
 * Returns a new graph with only simple edges. Handles aggregation of data
 * associated with multi-edges.
*/
export function simplify(g: DaGraph) {
  var simplified = new Graph<GraphLabel, GraphNode, EdgeLabel>().setGraph(g.graph());
  for (var v of g.nodes()) { simplified.setNode(v, g.node(v)); }
  for (var e of g.edges()) {
    var simpleLabel = simplified.edge(e.v, e.w) || { weight: 0, minlen: 1 };
    var label = g.edge(e);
    simplified.setEdge(e.v, e.w, {
      weight: simpleLabel.weight + label.weight,
      minlen: Math.max(simpleLabel.minlen, label.minlen)
    });
  }
  return simplified;
}

export function asNonCompoundGraph(g: DaGraph) {
  var simplified = new Graph<GraphLabel, GraphNode, EdgeLabel>({ multigraph: g.isMultigraph() }).setGraph(g.graph());
  for (var v of g.nodes()) {
    if (!g.children(v).length) {
      simplified.setNode(v, g.node(v));
    }
  }
  for (var e of g.edges()) {
    simplified.setEdge(e, g.edge(e));
  }
  return simplified;
}

export function successorWeights(g: DaGraph): Record<string, Record<string, number>> {
  var result: Record<string, Record<string, number>> = {};
  for (var v of g.nodes()) {
    var sucs: Record<string, number> = {};
    for (var e of g.outEdges(v)) {
      sucs[e.w] = (sucs[e.w] || 0) + g.edge(e).weight;
    }
    result[v] = sucs;
  }
  return result;
}

export function predecessorWeights(g: DaGraph): Record<string, Record<string, number>> {
  var result: Record<string, Record<string, number>> = {};
  for (var v of g.nodes()) {
    var preds: Record<string, number> = {};
    for (var e of g.inEdges(v)) {
      preds[e.v] = (preds[e.v] || 0) + g.edge(e).weight;
    }
    result[v] = preds;
  }
  return result;
}

/*
 * Finds where a line starting at point ({x, y}) would intersect a rectangle
 * ({x, y, width, height}) if it were pointing at the rectangle's center.
*/
export function intersectRect(rect: Rect, point: Vector) {
  var x = rect.x;
  var y = rect.y;

  // Rectangle intersection algorithm from:
  // http://math.stackexchange.com/questions/108113/find-edge-between-two-boxes
  var dx = point.x - x;
  var dy = point.y - y;
  var w = rect.width / 2;
  var h = rect.height / 2;

  if (!dx && !dy) {
    throw new Error("Not possible to find intersection inside of the rectangle");
  }

  var sx, sy;
  if (Math.abs(dy) * w > Math.abs(dx) * h) {
    // Intersection is top or bottom of rect.
    if (dy < 0) {
      h = -h;
    }
    sx = h * dx / dy;
    sy = h;
  } else {
    // Intersection is left or right of rect.
    if (dx < 0) {
      w = -w;
    }
    sx = w;
    sy = w * dy / dx;
  }

  return { x: x + sx, y: y + sy };
}

/*
 * Given a DAG with each node assigned "rank" and "order" properties, this
 * function will produce a matrix with the ids of each node.
*/
export function buildLayerMatrix(g: DaGraph): string[][] {
  var layering: string[][] = array(maxRank(g) + 1, () => []);
  for (var v of g.nodes()) {
    var node = g.node(v);
    var rank = node.rank;
    if ((undefined !== rank)) {
      layering[rank][node.order] = v;
    }
  }
  return layering;
}

/*
 * Adjusts the ranks for all nodes in the graph such that all nodes v have
 * rank(v) >= 0 and at least one node w has rank(w) = 0.
*/
export function normalizeRanks(g: DaGraph) {
  var min = Math.min(...g.nodes().map(v => g.node(v).rank).filter(e => undefined !== e));
  for (var v of g.nodes()) {
    var node = g.node(v);
    if (has(node, "rank")) {
      node.rank -= min;
    }
  }
}

export function removeEmptyRanks(g: DaGraph) {
  // Ranks may not start at 0, so we need to offset them
  var offset = Math.min(...g.nodes().map(v => g.node(v).rank).filter(e => undefined !== e));

  var layers: string[][] = [];
  for (var v of g.nodes()) {
    var rank = g.node(v).rank - offset;
    if (!layers[rank]) {
      layers[rank] = [];
    }
    layers[rank].push(v);
  }

  var delta = 0;
  var nodeRankFactor = g.graph().nodeRankFactor;
  for(var i = 0; i<layers.length; i++) {
    var vs = layers[i];
    if ((undefined === vs) && i % nodeRankFactor !== 0) {
      --delta;
    } else if (delta && (vs != undefined)) {
      for (var v of vs) { g.node(v).rank += delta; }
    }
  }
}

export function addBorderNode(g: DaGraph, prefix: string, rank?: number, order?: number) {
  var node: { width: number, height: number, rank?: number, order?: number } = {
    width: 0,
    height: 0
  };
  if (arguments.length >= 4) {
    node.rank = rank;
    node.order = order;
  }
  return addDummyNode(g, "border", node, prefix);
}

export function maxRank(g: DaGraph): number {
  var ranks = g.nodes().map(v => g.node(v).rank ).filter(e => undefined !== e);
  return Math.max(...ranks);
}

/*
 * Partition a collection into two groups: `lhs` and `rhs`. If the supplied
 * function returns true for an entry it goes into `lhs`. Otherwise it goes
 * into `rhs.
*/
export function partition<T>(collection: T[], fn: (e: T) => boolean): { lhs: T[], rhs: T[] } {
  var lhs: T[] = [];
  var rhs: T[] = [];
  for (var value of collection) {
    if (fn(value)) {
      lhs.push(value);
    } else {
      rhs.push(value);
    }
  }
  return { lhs, rhs };
}

/*
 * Returns a new function that wraps `fn` with a timer. The wrapper logs the
 * time it takes to execute the function.
*/
export function time(name: string, fn: Function): Function {
  var start = Date.now();
  try {
    return fn();
  } finally {
    console.log(name + " time: " + (Date.now() - start) + "ms");
  }
}

export function notime(name: string, fn: Function) {
  return fn();
}
