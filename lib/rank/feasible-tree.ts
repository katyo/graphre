import { Edge, Graph } from "../graph";
import { slack } from "./util";
import type { DaGraph } from '../types';
import { minBy } from "../helpers";

/*
 * Constructs a spanning tree with tight edges and adjusted the input node's
 * ranks to achieve this. A tight edge is one that is has a length that matches
 * its "minlen" attribute.
 *
 * The basic structure for this function is derived from Gansner, et al., "A
 * Technique for Drawing Directed Graphs."
 *
 * Pre-conditions:
 *
 *    1. Graph must be a DAG.
 *    2. Graph must be connected.
 *    3. Graph must have at least one node.
 *    5. Graph nodes must have been previously assigned a "rank" property that
 *       respects the "minlen" property of incident edges.
 *    6. Graph edges must have a "minlen" property.
 *
 * Post-conditions:
 *
 *    - Graph nodes will have their rank adjusted to ensure that all edges are
 *      tight.
 *
 * Returns a tree (undirected graph) that is constructed using only "tight"
 * edges.
*/
export function feasibleTree<TGraph, TNode, TEdge>(g: DaGraph): Graph<TGraph, Partial<TNode>, Partial<TEdge>> {
  var t = new Graph<TGraph, Partial<TNode>, Partial<TEdge>>({ directed: false });

  // Choose arbitrary node from which to start our tree
  var start = g.nodes()[0];
  var size = g.nodeCount();
  t.setNode(start, {});

  var edge, delta;
  while (tightTree(g) < size) {
    edge = findMinSlackEdge(g);
    delta = t.hasNode(edge.v) ? slack(g, edge) : -slack(g, edge);
    shiftRanks(g, delta);
  }

  return t;

  /*
   * Finds a maximal tree of tight edges and returns the number of nodes in the
   * tree.
  */
  function tightTree(g: DaGraph): number {
    function dfs(v: string) {
      for (var e of g.nodeEdges(v)) {
        var edgeV = e.v;
        var w = (v === edgeV) ? e.w : edgeV;
        if (!t.hasNode(w) && !slack(g, e)) {
          t.setNode(w, {});
          t.setEdge(v, w, {});
          dfs(w);
        }
      }
    }
  
    t.nodes().forEach(dfs);
    return t.nodeCount();
  }
  
  /*
   * Finds the edge with the smallest slack that is incident on tree and returns
   * it.
  */
  function findMinSlackEdge(g: DaGraph): Edge {
    return minBy(g.edges(), function(e: Edge) {
      if (t.hasNode(e.v) !== t.hasNode(e.w)) {
        return slack(g, e);
      }
      return undefined;
    });
  }
  
  function shiftRanks(g: DaGraph, delta: number) {
    for (var v of t.nodes()) {
      g.node(v).rank += delta;
    }
  }
}
