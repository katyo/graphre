import { array, has, sortBy } from '../helpers';
import type { DaGraph } from '../types';

/*
 * Assigns an initial order value for each node by performing a DFS search
 * starting from nodes in the first rank. Nodes are assigned an order in their
 * rank as they are first visited.
 *
 * This approach comes from Gansner, et al., "A Technique for Drawing Directed
 * Graphs."
 *
 * Returns a layering matrix with an array per layer and each layer sorted by
 * the order of its nodes.
*/
export function initOrder(g: DaGraph): string[][] {
  var visited: Record<string, boolean> = {};
  var simpleNodes = g.nodes().filter(v => !g.children(v).length);
  var maxRank = Math.max(...simpleNodes.map(v => g.node(v).rank));
  var layers: string[][] = array(maxRank + 1, () => []);

  function dfs(v: string) {
    if (has(visited, v)) return;
    visited[v] = true;
    var node = g.node(v);
    layers[node.rank].push(v);
    g.successors(v).forEach(dfs);
  }

  var orderedVs = sortBy(simpleNodes, (v: string) => g.node(v).rank);
  orderedVs.forEach(dfs);

  return layers;
}
