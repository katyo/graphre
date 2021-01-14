import type { Edge, GraphLike } from "../graph";
import { PriorityQueue } from '../data/priority-queue';

var DEFAULT_WEIGHT_FUNC = ()=>1;

export interface DjikstraEntry { distance: number, predecessor?: string }

export function dijkstra(g: GraphLike, source: string, weightFn: (e: Edge) => number, edgeFn: (v: string) => Edge[]): Record<string, DjikstraEntry> {
  return runDijkstra(g, String(source),
    weightFn || DEFAULT_WEIGHT_FUNC,
    edgeFn || function(v: string) { return g.outEdges(v); });
}

function runDijkstra(g: GraphLike, source: string, weightFn: (e: Edge) => number, edgeFn: (v: string) => Edge[]): Record<string, { distance: number }> {
  var results: Record<string, DjikstraEntry> = {};
  var pq = new PriorityQueue();
  var v: string;
  var vEntry: DjikstraEntry;

  var updateNeighbors = function(edge: Edge) {
    var w = edge.v !== v ? edge.v : edge.w;
    var wEntry = results[w];
    var weight = weightFn(edge);
    var distance = vEntry.distance + weight;

    if (weight < 0) {
      throw new Error("dijkstra does not allow negative edge weights. " +
                      "Bad edge: " + edge + " Weight: " + weight);
    }

    if (distance < wEntry.distance) {
      wEntry.distance = distance;
      wEntry.predecessor = v;
      pq.decrease(w, distance);
    }
  };

  g.nodes().forEach(function(v) {
    var distance = v === source ? 0 : Number.POSITIVE_INFINITY;
    results[v] = { distance: distance };
    pq.add(v, distance);
  });

  while (pq.size() > 0) {
    v = pq.removeMin();
    vEntry = results[v];
    if (vEntry.distance === Number.POSITIVE_INFINITY) {
      break;
    }

    edgeFn(v).forEach(updateNeighbors);
  }

  return results;
}
