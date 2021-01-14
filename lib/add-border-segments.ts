import * as util from "./util";
import type { DaGraph, GraphNode } from "./types";
import { has } from "./helpers";

export function addBorderSegments(g: DaGraph) {
  function dfs(v: string) {
    var children = g.children(v);
    var node = g.node(v);
    if (children.length) {
      children.forEach(dfs);
    }

    if (has(node, "minRank")) {
      node.borderLeft = [];
      node.borderRight = [];
      for (var rank = node.minRank, maxRank = node.maxRank + 1;
        rank < maxRank;
        ++rank) {
        addBorderNode(g, "borderLeft", "_bl", v, node, rank);
        addBorderNode(g, "borderRight", "_br", v, node, rank);
      }
    }
  }

  g.children().forEach(dfs);
}

function addBorderNode(g: DaGraph, prop: "borderLeft"|"borderRight", prefix: '_bl'|'_br', sg: string, sgNode: GraphNode, rank: number) {
  var label = { width: 0, height: 0, rank: rank, borderType: prop };
  var prev = sgNode[prop][rank - 1];
  var curr = util.addDummyNode(g, "border", label, prefix);
  sgNode[prop][rank] = curr;
  g.setParent(curr, sg);
  if (prev) {
    g.setEdge(prev, curr, { weight: 1 });
  }
}
