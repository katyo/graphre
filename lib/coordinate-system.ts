import { has } from "./helpers";
import type { DaGraph, Rect, Vector } from "./types";

export var coordinateSystem = { adjust, undo };

function adjust(g: DaGraph) {
  var rankDir = g.graph().rankdir.toLowerCase();
  if (rankDir === "lr" || rankDir === "rl") {
    swapWidthHeight(g);
  }
}

function undo(g: DaGraph) {
  var rankDir = g.graph().rankdir.toLowerCase();
  if (rankDir === "bt" || rankDir === "rl") {
    reverseY(g);
  }

  if (rankDir === "lr" || rankDir === "rl") {
    swapXY(g);
    swapWidthHeight(g);
  }
}

function swapWidthHeight(g: DaGraph) {
  for (var v of g.nodes()) { swapWidthHeightOne(g.node(v)); }
  for (var e of g.edges()) { swapWidthHeightOne(g.edge(e)); }
}

function swapWidthHeightOne(attrs: Rect) {
  var w = attrs.width;
  attrs.width = attrs.height;
  attrs.height = w;
}

function reverseY(g: DaGraph) {
  for (var v of g.nodes()) { reverseYOne(g.node(v)); }

  for (var e of g.edges()) {
    var edge = g.edge(e);
    edge.points.forEach(reverseYOne);
    if (has(edge, "y")) {
      reverseYOne(edge);
    }
  }
}

function reverseYOne(attrs: Vector) {
  attrs.y = -attrs.y;
}

function swapXY(g: DaGraph) {
  for (var v of g.nodes()) { swapXYOne(g.node(v)); }

  for (var e of g.edges()) {
    var edge = g.edge(e);
    edge.points.forEach(swapXYOne);
    if (has(edge, "x")) {
      swapXYOne(edge);
    }
  }
}

function swapXYOne(attrs: Vector) {
  var x = attrs.x;
  attrs.x = attrs.y;
  attrs.y = x;
}
