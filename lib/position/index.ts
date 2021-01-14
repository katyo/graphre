import * as util from "../util";
import { positionX } from "./bk";
import type { DaGraph } from '../types';

export * as bk from './bk';

export function position(g: DaGraph) {
  g = util.asNonCompoundGraph(g);

  positionY(g);
  var posx = positionX(g);
  for (var v in posx) {
    g.node(v).x = posx[v];
  }
}

function positionY(g: DaGraph) {
  var layering = util.buildLayerMatrix(g);
  var rankSep = g.graph().ranksep;
  var prevY = 0;
  for (var layer of layering) {
    var maxHeight = Math.max(...layer.map(v => g.node(v).height));
    for (var v of layer) {
      g.node(v).y = prevY + maxHeight / 2;
    }
    prevY += maxHeight + rankSep;
  }
}

