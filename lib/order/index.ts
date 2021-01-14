import { initOrder } from "./init-order";
import { crossCount } from "./cross-count";
import { sortSubgraph } from "./sort-subgraph";
import { buildLayerGraph, LayerGraph } from "./build-layer-graph";
import { addSubgraphConstraints } from "./add-subgraph-constraints";
import { Graph } from "../graph";
import { buildLayerMatrix, maxRank } from "../util";
import type { ConstraintGraph, DaGraph, EdgeLabel, GraphLabel, GraphNode } from '../types';
import { range } from "../helpers";

export { addSubgraphConstraints } from "./add-subgraph-constraints";
export { barycenter } from './barycenter';
export { buildLayerGraph } from "./build-layer-graph";
export { crossCount } from "./cross-count";
export { initOrder } from "./init-order";
export { resolveConflicts } from './resolve-conflicts';
export { sortSubgraph } from "./sort-subgraph";
export { sort } from './sort';

/*
 * Applies heuristics to minimize edge crossings in the graph and sets the best
 * order solution as an order attribute on each node.
 *
 * Pre-conditions:
 *
 *    1. Graph must be DAG
 *    2. Graph nodes must be objects with a "rank" attribute
 *    3. Graph edges must have the "weight" attribute
 *
 * Post-conditions:
 *
 *    1. Graph nodes will have an "order" attribute based on the results of the
 *       algorithm.
 */
export function order(g: DaGraph) {
  var maximumRank = maxRank(g);
  var downLayerGraphs = buildLayerGraphs(g, range(1, maximumRank + 1), "inEdges");
  var upLayerGraphs = buildLayerGraphs(g, range(maximumRank - 1, -1), "outEdges");

  var layering = initOrder(g);
  assignOrder(g, layering);

  var bestCC = Number.POSITIVE_INFINITY;
  var best;

  for (var i = 0, lastBest = 0; lastBest < 4; ++i, ++lastBest) {
    sweepLayerGraphs(i % 2 ? downLayerGraphs : upLayerGraphs, i % 4 >= 2);

    layering = buildLayerMatrix(g);
    var cc = crossCount(g, layering);
    if (cc < bestCC) {
      lastBest = 0;
      best = layering.map(layer => layer.slice(0));
      bestCC = cc;
    }
  }

  assignOrder(g, best);
}

function buildLayerGraphs(g: DaGraph, ranks: number[], relationship: 'inEdges'|'outEdges'): Array<LayerGraph> {
  return ranks.map(rank => buildLayerGraph(g, rank, relationship));
}

function sweepLayerGraphs(layerGraphs: Array<LayerGraph>, biasRight: boolean) {
  var cg: ConstraintGraph = new Graph<GraphLabel, GraphNode, EdgeLabel>();
  for (var lg of layerGraphs) {
    var root = lg.graph().root;
    var sorted = sortSubgraph(lg, root, cg, biasRight);
    sorted.vs.map(function(v, i) {
      lg.node(v).order = i;
    });
    addSubgraphConstraints(lg, cg, sorted.vs);
  }
}

function assignOrder(g: DaGraph, layering: string[][]) {
  for (var layer of layering) {
    layer.map(function(v, i) {
      g.node(v).order = i;
    });
  }
}
