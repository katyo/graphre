import type { Edge, Graph } from "../graph";

export interface Barycenter {
  v: string,
  barycenter?: number,
  weight?: number
}

export function barycenter(g: Graph<unknown, { order?: number }, { weight?: number }>, movable: string[]): Barycenter[] {
  if (!movable) return [];
  return movable.map(function(v: string) {
    var inV = g.inEdges(v);
    if (!inV['length']) {
      return { v: v };
    } else {
      var result = inV.reduce(function(acc: { sum: number, weight: number }, e: Edge) {
        var edge = g.edge(e);
        var nodeU = g.node(e.v);
        return {
          sum: acc.sum + (edge.weight * nodeU.order),
          weight: acc.weight + edge.weight
        };
      }, { sum: 0, weight: 0 });

      return {
        v: v,
        barycenter: result.sum / result.weight,
        weight: result.weight
      };
    }
  });
}

