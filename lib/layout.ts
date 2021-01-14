import { acyclic } from "./acyclic";
import { normalize } from "./normalize";
import { rank } from "./rank";
import { normalizeRanks } from "./util";
import { parentDummyChains } from "./parent-dummy-chains";
import { removeEmptyRanks } from "./util";
import { nestingGraph } from "./nesting-graph";
import { addBorderSegments } from "./add-border-segments";
import { coordinateSystem } from "./coordinate-system";
import { order } from "./order";
import { position } from "./position";
import * as util from "./util";
import { Edge, Graph } from "./graph";
import type { DaGraph, EdgeLabel, GraphLabel, GraphNode, LayoutEdge, LayoutGraph, LayoutGraphConfig, LayoutNode, Vector } from "./types";
import { has, last } from "./helpers";

interface NodeEdgeProxy extends GraphNode {
  dummy: 'edge-proxy';
  e: Edge;
  rank: number;
}

function isEdgeProxy(node: GraphNode): node is NodeEdgeProxy {
  return node.dummy == 'edge-proxy';
}

interface NodeSelfEdge extends GraphNode {
  width: number;
  height: number;
  rank: number;
  order: number;
  e: Edge;
  label: {
    points: { x: number, y: number }[];
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

function isSelfEdge(node: GraphNode): node is NodeSelfEdge {
  return node.dummy == 'selfedge';
}

export function layout(g: DaGraph, opts?: { debugTiming?: boolean }) {
  var time = opts && opts.debugTiming ? util.time : util.notime;
  time("layout", function() {
    var layoutGraph = 
      time("  buildLayoutGraph", function() { return buildLayoutGraph(g); });
    time("  runLayout",        function() { runLayout(layoutGraph, time); });
    time("  updateInputGraph", function() { updateInputGraph(g, layoutGraph); });
  });
}

function runLayout(g: DaGraph, time: (name: string, fn: Function) => void) {
  time("    makeSpaceForEdgeLabels", function() { makeSpaceForEdgeLabels(g); });
  time("    removeSelfEdges",        function() { removeSelfEdges(g); });
  time("    acyclic",                function() { acyclic.run(g); });
  time("    nestingGraph.run",       function() { nestingGraph.run(g); });
  time("    rank",                   function() { rank(util.asNonCompoundGraph(g)); });
  time("    injectEdgeLabelProxies", function() { injectEdgeLabelProxies(g); });
  time("    removeEmptyRanks",       function() { removeEmptyRanks(g); });
  time("    nestingGraph.cleanup",   function() { nestingGraph.cleanup(g); });
  time("    normalizeRanks",         function() { normalizeRanks(g); });
  time("    assignRankMinMax",       function() { assignRankMinMax(g); });
  time("    removeEdgeLabelProxies", function() { removeEdgeLabelProxies(g); });
  time("    normalize.run",          function() { normalize.run(g); });
  time("    parentDummyChains",      function() { parentDummyChains(g); });
  time("    addBorderSegments",      function() { addBorderSegments(g); });
  time("    order",                  function() { order(g); });
  time("    insertSelfEdges",        function() { insertSelfEdges(g); });
  time("    adjustCoordinateSystem", function() { coordinateSystem.adjust(g); });
  time("    position",               function() { position(g); });
  time("    positionSelfEdges",      function() { positionSelfEdges(g); });
  time("    removeBorderNodes",      function() { removeBorderNodes(g); });
  time("    normalize.undo",         function() { normalize.undo(g); });
  time("    fixupEdgeLabelCoords",   function() { fixupEdgeLabelCoords(g); });
  time("    undoCoordinateSystem",   function() { coordinateSystem.undo(g); });
  time("    translateGraph",         function() { translateGraph(g); });
  time("    assignNodeIntersects",   function() { assignNodeIntersects(g); });
  time("    reversePoints",          function() { reversePointsForReversedEdges(g); });
  time("    acyclic.undo",           function() { acyclic.undo(g); });
}

/*
 * Copies final layout information from the layout graph back to the input
 * graph. This process only copies whitelisted attributes from the layout graph
 * to the input graph, so it serves as a good place to determine what
 * attributes can influence layout.
*/
export function updateInputGraph(inputGraph: DaGraph, layoutGraph: LayoutGraph) {
  for (var v of inputGraph.nodes()) {
    var inputLabel = inputGraph.node(v);
    var layoutLabel = layoutGraph.node(v);

    if (inputLabel) {
      inputLabel.x = layoutLabel.x;
      inputLabel.y = layoutLabel.y;

      if (layoutGraph.children(v).length) {
        inputLabel.width = layoutLabel.width;
        inputLabel.height = layoutLabel.height;
      }
    }
  }

  for (var e of inputGraph.edges()) {
    var inputEdgeLabel = inputGraph.edge(e);
    var layoutEdgeLabel = layoutGraph.edge(e);

    inputEdgeLabel.points = layoutEdgeLabel.points;
    if (has(layoutEdgeLabel, "x")) {
      inputEdgeLabel.x = layoutEdgeLabel.x;
      inputEdgeLabel.y = layoutEdgeLabel.y;
    }
  }

  inputGraph.graph().width = layoutGraph.graph().width;
  inputGraph.graph().height = layoutGraph.graph().height;
}
var tb: 'tb' = 'tb';
var graphDefaults = { ranksep: 50, edgesep: 20, nodesep: 50, rankdir: tb };
var edgeDefaults = {
  minlen: 1, weight: 1, width: 0, height: 0,
  labeloffset: 10, labelpos: "r"
};

/*
 * Constructs a new graph from the input graph, which can be used for layout.
 * This process copies only whitelisted attributes from the input graph to the
 * layout graph. Thus this function serves as a good place to determine what
 * attributes can influence layout.
*/
export function buildLayoutGraph(inputGraph: DaGraph) {
  var g = new Graph<LayoutGraphConfig, LayoutNode, LayoutEdge>({ multigraph: true, compound: true });
  var graph = canonicalize<GraphLabel>(inputGraph.graph());

  var layoutGraphConfig: LayoutGraphConfig = {
    nodesep: (graph.nodesep ?? graphDefaults.nodesep),
    edgesep: (graph.edgesep ?? graphDefaults.edgesep),
    ranksep: (graph.ranksep ?? graphDefaults.ranksep),
    marginx: +(graph.marginx ?? 0),
    marginy: +(graph.marginy ?? 0),
    acyclicer: graph.acyclicer,
    ranker: graph.ranker ?? 'network-simplex',
    rankdir: graph.rankdir ?? graphDefaults.rankdir,
    align: graph.align,
  };
  g.setGraph(layoutGraphConfig);

  for (var v of inputGraph.nodes()) {
    var node = canonicalize<GraphNode>(inputGraph.node(v));
    var layoutNode: LayoutNode = {
      width: +((node && node.width) ?? 0),
      height: +((node && node.height) ?? 0)
    };
    g.setNode(v, layoutNode);
    g.setParent(v, inputGraph.parent(v));
  }

  for (var e of inputGraph.edges()) {
    var edge = canonicalize<EdgeLabel>(inputGraph.edge(e));
    var layoutEdge = {
      minlen: (edge.minlen ?? edgeDefaults.minlen),
      weight: (edge.weight ?? edgeDefaults.weight),
      width: (edge.width ?? edgeDefaults.width),
      height: (edge.height ?? edgeDefaults.height),
      labeloffset: (edge.labeloffset ?? edgeDefaults.labeloffset),
      labelpos: edge.labelpos ?? edgeDefaults.labelpos
    }
    g.setEdge(e, layoutEdge);
  }

  return g;
}

/*
 * This idea comes from the Gansner paper: to account for edge labels in our
 * layout we split each rank in half by doubling minlen and halving ranksep.
 * Then we can place labels at these mid-points between nodes.
 *
 * We also add some minimal padding to the width to push the label for the edge
 * away from the edge itself a bit.
*/
export function makeSpaceForEdgeLabels(g: DaGraph) {
  var graph = g.graph();
  graph.ranksep /= 2;
  for (var e of g.edges()) {
    var edge = g.edge(e);
    edge.minlen *= 2;
    if (edge.labelpos.toLowerCase() !== "c") {
      if (graph.rankdir === "TB" || graph.rankdir === "BT") {
        edge.width += edge.labeloffset;
      } else {
        edge.height += edge.labeloffset;
      }
    }
  }
}

/*
 * Creates temporary dummy nodes that capture the rank in which each edge's
 * label is going to, if it has one of non-zero width and height. We do this
 * so that we can safely remove empty ranks while preserving balance for the
 * label's position.
*/
function injectEdgeLabelProxies(g: DaGraph) {
  for (var e of g.edges()) {
    var edge = g.edge(e);
    if (edge.width && edge.height) {
      var v = g.node(e.v);
      var w = g.node(e.w);
      var label = { rank: (w.rank - v.rank) / 2 + v.rank, e: e };
      util.addDummyNode(g, "edge-proxy", label, "_ep");
    }
  }
}

function assignRankMinMax(g: DaGraph) {
  var maxRank = 0;
  for (var v of g.nodes()) {
    var node = g.node(v);
    if (node.borderTop) {
      node.minRank = g.node(node.borderTop).rank;
      node.maxRank = g.node(node.borderBottom).rank;
      maxRank = Math.max(maxRank, node.maxRank);
    }
  }
  g.graph().maxRank = maxRank;
}

function removeEdgeLabelProxies(g: DaGraph) {
  for (var v of g.nodes()) {
    var node = g.node(v);
    if (isEdgeProxy(node)) {
      g.edge(node.e).labelRank = node.rank;
      g.removeNode(v);
    }
  }
}

function translateGraph(g: DaGraph) {
  var minX = Number.POSITIVE_INFINITY;
  var maxX = 0;
  var minY = Number.POSITIVE_INFINITY;
  var maxY = 0;
  var graphLabel = g.graph();
  var marginX: number = graphLabel.marginx ?? 0;
  var marginY: number = graphLabel.marginy ?? 0;

  function getExtremes(attrs: { x?:number, y?:number, width?:number, height?:number }) {
    var x = attrs.x;
    var y = attrs.y;
    var w = attrs.width;
    var h = attrs.height;
    minX = Math.min(minX, x - w / 2);
    maxX = Math.max(maxX, x + w / 2);
    minY = Math.min(minY, y - h / 2);
    maxY = Math.max(maxY, y + h / 2);
  }

  for (var v of g.nodes()) { getExtremes(g.node(v)); }
  for (var e of g.edges()) {
    var edge = g.edge(e);
    if (has(edge, "x")) {
      getExtremes(edge);
    }
  }

  minX -= marginX;
  minY -= marginY;

  for (var v of g.nodes()) {
    var node = g.node(v);
    node.x -= minX;
    node.y -= minY;
  }

  for (var e of g.edges()) {
    var edge = g.edge(e);
    for (var p of edge.points ?? []) {
      p.x -= minX;
      p.y -= minY;
    }
    if (edge.hasOwnProperty("x")) { edge.x -= minX; }
    if (edge.hasOwnProperty("y")) { edge.y -= minY; }
  }

  graphLabel.width = maxX - minX + marginX;
  graphLabel.height = maxY - minY + marginY;
}

function assignNodeIntersects(g: DaGraph) {
  for (var e of g.edges()) {
    var edge = g.edge(e);
    var nodeV = g.node(e.v);
    var nodeW = g.node(e.w);
    var p1: Vector;
    var p2: Vector;
    if (!edge.points) {
      edge.points = [];
      p1 = nodeW;
      p2 = nodeV;
    } else {
      p1 = edge.points[0];
      p2 = edge.points[edge.points.length - 1];
    }
    edge.points.unshift(util.intersectRect(nodeV, p1));
    edge.points.push(util.intersectRect(nodeW, p2));
  }
}

function fixupEdgeLabelCoords(g: DaGraph) {
  for (var e of g.edges()) {
    var edge = g.edge(e);
    if (has(edge, "x")) {
      if (edge.labelpos === "l" || edge.labelpos === "r") {
        edge.width -= edge.labeloffset;
      }
      switch (edge.labelpos) {
      case "l": edge.x -= edge.width / 2 + edge.labeloffset; break;
      case "r": edge.x += edge.width / 2 + edge.labeloffset; break;
      }
    }
  }
}

function reversePointsForReversedEdges(g: DaGraph) {
  for (var e of g.edges()) {
    var edge = g.edge(e);
    if (edge.reversed) {
      edge.points.reverse();
    }
  }
}

function removeBorderNodes(g: DaGraph) {
  for (var v of g.nodes()) {
    if (g.children(v).length) {
      var node = g.node(v);
      var t = g.node(node.borderTop);
      var b = g.node(node.borderBottom);
      var l = g.node(last(node.borderLeft));
      var r = g.node(last(node.borderRight));

      node.width = Math.abs(r.x - l.x);
      node.height = Math.abs(b.y - t.y);
      node.x = l.x + node.width / 2;
      node.y = t.y + node.height / 2;
    }
  }

  for (var v of g.nodes()) {
    if (g.node(v).dummy === "border") {
      g.removeNode(v);
    }
  }
}

function removeSelfEdges(g: DaGraph) {
  for (var e of g.edges()) {
    if (e.v === e.w) {
      var node = g.node(e.v);
      if (!node.selfEdges) {
        node.selfEdges = [];
      }
      node.selfEdges.push({ e: e, label: g.edge(e) });
      g.removeEdge(e);
    }
  }
}

function insertSelfEdges(g: DaGraph) {
  var layers = util.buildLayerMatrix(g);
  for (var layer of layers) {
    var orderShift = 0;
    for (var i = 0; i < layer.length; i++) {
      var v = layer[i];
      var node = g.node(v);
      node.order = i + orderShift;
      for (var selfEdge of node.selfEdges ?? []) {
        util.addDummyNode(g, "selfedge", {
          width: selfEdge.label.width,
          height: selfEdge.label.height,
          rank: node.rank,
          order: i + (++orderShift),
          e: selfEdge.e,
          label: selfEdge.label
        }, "_se");
      }
      delete node.selfEdges;
    }
  }
}

function positionSelfEdges(g: DaGraph) {
  for (var v of g.nodes()) {
    var node = g.node(v);
    if (isSelfEdge(node)) {
      var selfNode = g.node(node.e.v);
      var x = selfNode.x + selfNode.width / 2;
      var y = selfNode.y;
      var dx = node.x - x;
      var dy = selfNode.height / 2;
      g.setEdge(node.e, node.label);
      g.removeNode(v);
      node.label.points = [
        { x: x + 2 * dx / 3, y: y - dy },
        { x: x + 5 * dx / 6, y: y - dy },
        { x: x +     dx    , y: y },
        { x: x + 5 * dx / 6, y: y + dy },
        { x: x + 2 * dx / 3, y: y + dy }
      ];
      node.label.x = node.x;
      node.label.y = node.y;
    }
  }
}

function canonicalize<T>(attrs: any = {}): T {
  var newAttrs: any = {};
  for (var key of Object.keys(attrs)) {
    newAttrs[key.toLowerCase()] = attrs[key];
  }
  return newAttrs as T;
}
