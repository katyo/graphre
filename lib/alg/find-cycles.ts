import { tarjan } from "./tarjan";
import type { GraphLike } from "../graph";

export function findCycles(g: GraphLike) {
  return tarjan(g).filter(function(cmpt) {
    return cmpt.length > 1 || (cmpt.length === 1 && g.hasEdge(cmpt[0], cmpt[0]));
  });
}
