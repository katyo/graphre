import { longestPath } from "./util";
import { feasibleTree } from "./feasible-tree";
import { networkSimplex } from "./network-simplex";
import type { DaGraph } from "../types";

export { networkSimplex } from './network-simplex';
export { feasibleTree } from './feasible-tree';
export { longestPath } from './util';

/*
 * Assigns a rank to each node in the input graph that respects the "minlen"
 * constraint specified on edges between nodes.
 *
 * This basic structure is derived from Gansner, et al., "A Technique for
 * Drawing Directed Graphs."
 *
 * Pre-conditions:
 *
 *    1. Graph must be a connected DAG
 *    2. Graph nodes must be objects
 *    3. Graph edges must have "weight" and "minlen" attributes
 *
 * Post-conditions:
 *
 *    1. Graph nodes will have a "rank" attribute based on the results of the
 *       algorithm. Ranks can start at any index (including negative), we'll
 *       fix them up later.
*/
export function rank(g: DaGraph) {
  switch(g.graph().ranker) {
  case "network-simplex": networkSimplexRanker(g); break;
  case "tight-tree": tightTreeRanker(g); break;
  case "longest-path": longestPathRanker(g); break;
  default: networkSimplexRanker(g);
  }
}

// A fast and simple ranker, but results are far from optimal.
var longestPathRanker = longestPath;

export function tightTreeRanker(g: DaGraph) {
  longestPath(g);
  feasibleTree(g);
}

export function networkSimplexRanker(g: DaGraph) {
  networkSimplex(g);
}
