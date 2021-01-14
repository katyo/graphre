import { dijkstra, DjikstraEntry } from "./dijkstra";
import type { Edge, GraphLike } from "../graph";

export function dijkstraAll(g: GraphLike, weightFunc: (e: Edge) => number, edgeFunc: (v: string) => Edge[]): Record<string, Record<string, { distance: number, predecessor?: string }>> {
  var acc: Record<string, Record<string, DjikstraEntry>> = {}
  for(var item of g.nodes()) {
    acc[item] = dijkstra(g, item, weightFunc, edgeFunc);
  }
  return acc;
}
