import { Graph } from "./graph";
import type { DaGraph } from "./types";
import * as util from "./util";

export function debugOrdering(g: DaGraph) {
  var layerMatrix = util.buildLayerMatrix(g);

  var h = new Graph({ compound: true, multigraph: true }).setGraph({});

  for (var v of g.nodes()) {
    h.setNode(v, { label: v });
    h.setParent(v, "layer" + g.node(v).rank);
  }

  for (var e of g.edges()) {
    h.setEdge(e.v, e.w, {}, e.name);
  }

  var i = 0;
  for(var layer of layerMatrix) {
    var layerV = "layer" + i;
    i++;
    h.setNode(layerV, { rank: "same" });
    layer.reduce(function(u, v) {
      h.setEdge(u.toString(), v, { style: "invis" });
      return v;
    });
  }

  return h;
}
