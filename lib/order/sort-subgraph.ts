import { Barycenter, barycenter } from "./barycenter";
import { resolveConflicts, XEntry } from "./resolve-conflicts";
import { sort, SortResult } from "./sort";
import type { LayerGraph } from './build-layer-graph';
import type { ConstraintGraph } from '../types';
import { flattenDeep, has } from "../helpers";

export function sortSubgraph(g: LayerGraph, v: string, cg: ConstraintGraph, biasRight: boolean) {
  var movable = g.children(v);
  var node = g.node(v);
  var bl = node ? node.borderLeft : undefined;
  var br = node ? node.borderRight: undefined;
  var subgraphs: Record<string, SortResult> = {};

  if (bl) {
    movable = movable.filter((w) => w !== bl && w !== br);
  }

  var barycenters = barycenter(g, movable);
  for (var entry of barycenters) {
    if (g.children(entry.v).length) {
      var subgraphResult = sortSubgraph(g, entry.v, cg, biasRight);
      subgraphs[entry.v] = subgraphResult;
      if (has(subgraphResult, "barycenter")) {
        mergeBarycenters(entry, subgraphResult);
      }
    }
  }

  var entries = resolveConflicts(barycenters, cg);
  expandSubgraphs(entries, subgraphs);

  var result = sort(entries, biasRight);

  if (bl) {
    result.vs = ([bl, ...result.vs, br]);
    if (g.predecessors(bl).length) {
      var blPred = g.node(g.predecessors(bl)[0]);
      var brPred = g.node(g.predecessors(br)[0]);
      if (!has(result, "barycenter")) {
        result.barycenter = 0;
        result.weight = 0;
      }
      result.barycenter = (result.barycenter * result.weight +
                           blPred.order + brPred.order) / (result.weight + 2);
      result.weight += 2;
    }
  }

  return result;
}

function expandSubgraphs(entries: XEntry[], subgraphs: Record<string, SortResult>) {
  for (var entry of entries) {
    entry.vs = flattenDeep(entry.vs.map(function(v) {
      if (subgraphs[v]) {
        return subgraphs[v].vs;
      }
      return [v];
    }));
  }
}

function mergeBarycenters(target: Barycenter, other: SortResult) {
  if ((undefined !== target.barycenter)) {
    target.barycenter = (target.barycenter * target.weight +
                         other.barycenter * other.weight) /
                        (target.weight + other.weight);
    target.weight += other.weight;
  } else {
    target.barycenter = other.barycenter;
    target.weight = other.weight;
  }
}
