import { Graph } from "../graph";
import { has, uniqueId } from "../helpers";
import type { DaGraph, EdgeLabel, GraphLabel, GraphNode } from '../types';

export type LayerGraph = Graph<GraphLabel, LayeredNode, EdgeLabel>;

type LayeredNode = Omit<GraphNode, 'borderLeft'|'borderRight'> & {
  borderLeft?: string;
  borderRight?: string;
}

/*
 * Constructs a graph that can be used to sort a layer of nodes. The graph will
 * contain all base and subgraph nodes from the request layer in their original
 * hierarchy and any edges that are incident on these nodes and are of the type
 * requested by the "relationship" parameter.
 *
 * Nodes from the requested rank that do not have parents are assigned a root
 * node in the output graph, which is set in the root graph attribute. This
 * makes it easy to walk the hierarchy of movable nodes during ordering.
 *
 * Pre-conditions:
 *
 *    1. Input graph is a DAG
 *    2. Base nodes in the input graph have a rank attribute
 *    3. Subgraph nodes in the input graph has minRank and maxRank attributes
 *    4. Edges have an assigned weight
 *
 * Post-conditions:
 *
 *    1. Output graph has all nodes in the movable rank with preserved
 *       hierarchy.
 *    2. Root nodes in the movable layer are made children of the node
 *       indicated by the root attribute of the graph.
 *    3. Non-movable nodes incident on movable nodes, selected by the
 *       relationship parameter, are included in the graph (without hierarchy).
 *    4. Edges incident on movable nodes, selected by the relationship
 *       parameter, are added to the output graph.
 *    5. The weights for copied edges are aggregated as need, since the output
 *       graph is not a multi-graph.
 */
export function buildLayerGraph(g: DaGraph, rank: number, relationship: 'inEdges'|'outEdges'): LayerGraph {
  var root = createRootNode(g);
  var result = new Graph<unknown, LayeredNode, EdgeLabel>({ compound: true }).setGraph({ root: root })
      .setDefaultNodeLabel(v => g.node(v) as unknown as LayeredNode); // TODO solve type incompatibility

  for (var v of g.nodes()) {
    var node = g.node(v);
    var parent = g.parent(v);

    if (node.rank === rank || node.minRank <= rank && rank <= node.maxRank) {
      result.setNode(v);
      result.setParent(v, parent || root);

      // This assumes we have only short edges!
      for (var e of g[relationship](v)) {
        var u = e.v === v ? e.w : e.v;
        var edge = result.edge(u, v);
        var weight = (undefined !== edge) ? edge.weight : 0;
        result.setEdge(u, v, { weight: g.edge(e).weight + weight });
      }

      if (has(node, "minRank")) {
        result.setNode(v, {
          borderLeft: node.borderLeft[rank],
          borderRight: node.borderRight[rank]
        });
      }
    }
  }

  return result;
}

function createRootNode(g: DaGraph): string {
  var v;
  while (g.hasNode((v = uniqueId("_root"))));
  return v;
}
