import type { GraphLike } from '../graph';

/*
 * A helper that preforms a pre- or post-order traversal on the input graph
 * and returns the nodes in the order they were visited. If the graph is
 * undirected then this algorithm will navigate using neighbors. If the graph
 * is directed then this algorithm will navigate using successors.
 *
 * Order must be one of "pre" or "post".
 */
export function dfs(g: GraphLike, vs: string|Array<string>, order: 'pre'|'post'): string[] {
  var nodes = (!Array.isArray(vs)) ? [vs] : vs;

  var navigation: ((v: string) => string[]) = (g.isDirected() ? g.successors : g.neighbors).bind(g);

  var acc: string[] = [];
  var visited: Record<string, boolean> = {};
  for(var v of nodes) {
    if (!g.hasNode(v)) {
      throw new Error("Graph does not have node: " + v);
    }

    doDfs(g, v, order === "post", visited, navigation, acc);
  };
  return acc;
}

function doDfs(g: GraphLike, v: string, postorder: boolean, visited: Record<string, boolean>, navigation: (v: string) => string[], acc: string[]) {
  if (!(v in visited)) {
    visited[v] = true;

    if (!postorder) { acc.push(v); }
    for(var w of navigation(v)) {
      doDfs(g, w, postorder, visited, navigation, acc);
    };
    if (postorder) { acc.push(v); }
  }
}
