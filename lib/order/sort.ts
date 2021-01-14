import { flattenDeep, has, last, sortBy } from "../helpers";
import * as util from "../util";
import type { XEntry } from './resolve-conflicts';

export interface SortResult {
  vs: string[]
  barycenter?: number
  weight?: number
}

export function sort(entries: XEntry[], biasRight: boolean): SortResult {
  var parts = util.partition(entries, function(entry) {
    return has(entry, "barycenter");
  });
  var sortable = parts.lhs;
  var unsortable = sortBy(parts.rhs, (entry: XEntry) => -entry.i);
  var vss: string[][] = [];
  var sum = 0;
  var weight = 0;
  var vsIndex = 0;

  sortable.sort(compareWithBias(!!biasRight));

  vsIndex = consumeUnsortable(vss, unsortable, vsIndex);

  for (var entry of sortable) {
    vsIndex += entry.vs.length;
    vss.push(entry.vs);
    sum += entry.barycenter * entry.weight;
    weight += entry.weight;
    vsIndex = consumeUnsortable(vss, unsortable, vsIndex);
  }

  var result: SortResult = { vs: flattenDeep(vss) };
  if (weight) {
    result.barycenter = sum / weight;
    result.weight = weight;
  }
  return result;
}

interface Unsortable<T> { i: number, vs: T }
function consumeUnsortable<T>(vs: T[], unsortable: Array<Unsortable<T>>, index: number): number {
  var lastItem: Unsortable<T>;
  while (unsortable.length && (lastItem = last(unsortable)).i <= index) {
    unsortable.pop();
    vs.push(lastItem.vs);
    index++;
  }
  return index;
}

function compareWithBias(bias: boolean) {
  return function(entryV: XEntry, entryW: XEntry) {
    if (entryV.barycenter < entryW.barycenter) {
      return -1;
    } else if (entryV.barycenter > entryW.barycenter) {
      return 1;
    }

    return !bias ? entryV.i - entryW.i : entryW.i - entryV.i;
  };
}
