import type { GraphLike } from '../graph';

export class CycleException extends Error {}
// @ts-ignore
//CycleException.prototype = new Error(); // must be an instance of Error to pass testing

export function topsort(g: GraphLike): string[] {
  var visited: Record<string, boolean> = {};
  var stack: Record<string, boolean> = {};
  var results: string[] = [];

  function visit(node: string) {
    if (node in stack) {
      throw new CycleException();
    }

    if (!(node in visited)) {
      stack[node] = true;
      visited[node] = true;
      for(var item of g.predecessors(node)) {
        visit(item)
      };
      delete stack[node];
      results.push(node);
    }
  }

  for(var item of g.sinks()) {
    visit(item);
  }

  if (Object.keys(visited).length !== g.nodeCount()) {
    throw new CycleException();
  }

  return results;
}

