import type { GraphLike } from '../graph';

export function tarjan(g: GraphLike): string[][] {
  var index = 0;
  var stack: string[] = [];
  var visited: Record<string, { lowlink: number, index: number, onStack: boolean }> = {};
  var results: string[][] = [];

  function dfs(v: string) {
    var entry = visited[v] = {
      onStack: true,
      lowlink: index,
      index: index++
    };
    stack.push(v);

    g.successors(v).forEach(function(w) {
      if (!(w in visited)) {
        dfs(w);
        entry.lowlink = Math.min(entry.lowlink, visited[w].lowlink);
      } else if (visited[w].onStack) {
        entry.lowlink = Math.min(entry.lowlink, visited[w].index);
      }
    });

    if (entry.lowlink === entry.index) {
      var cmpt = [];
      var w;
      do {
        w = stack.pop();
        visited[w].onStack = false;
        cmpt.push(w);
      } while (v !== w);
      results.push(cmpt);
    }
  }

  g.nodes().forEach(function(v) {
    if (!(v in visited)) {
      dfs(v);
    }
  });

  return results;
}
