import type { GraphLike } from '../graph';

export function components(g: GraphLike): string[][] {
  var visited: Record<string, boolean> = {};
  var cmpts: string[][] = [];
  var cmpt: string[];

  function dfs(v: string) {
    if (v in visited) return;
    visited[v] = true;
    cmpt.push(v);
    for(var a of g.successors(v)) dfs(a);
    for(var b of g.predecessors(v)) dfs(b);
  }

  for(var v of g.nodes()) {
    cmpt = [];
    dfs(v);
    if (cmpt.length) {
      cmpts.push(cmpt);
    }
  }

  return cmpts;
}
