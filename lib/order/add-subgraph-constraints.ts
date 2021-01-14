import type { ConstraintGraph } from '../types';
import type { LayerGraph } from './build-layer-graph';

export function addSubgraphConstraints(g: LayerGraph, cg: ConstraintGraph, vs: string[]) {
  var prev: Record<string, string> = {};
  var rootPrev: string;

  for(var v of vs) {
    (function () {
      var child = g.parent(v);
      var prevChild: string;
      while (child) {
        var parent = g.parent(child);
        if (parent) {
          prevChild = prev[parent];
          prev[parent] = child;
        } else {
          prevChild = rootPrev;
          rootPrev = child;
        }
        if (prevChild && prevChild !== child) {
          cg.setEdge(prevChild, child);
          return;
        }
        child = parent;
      }
    })();
  }
}
