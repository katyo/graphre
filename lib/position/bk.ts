import { Graph } from "../graph";
import { buildLayerMatrix } from "../util";
import type { Alignment, DaGraph } from '../types';
import { has, last, mapValues, minBy, range, sortBy, values } from "../helpers";

type Xs = Record<string, number>;
type Xss = Record<Alignment, Xs>;
type Conflicts = Record<string, Record<string, boolean>>;
type Layer = string[];

/*
 * This module provides coordinate assignment based on Brandes and Köpf, "Fast
 * and Simple Horizontal Coordinate Assignment."
 */

/*
 * Marks all edges in the graph with a type-1 conflict with the "type1Conflict"
 * property. A type-1 conflict is one where a non-inner segment crosses an
 * inner segment. An inner segment is an edge with both incident nodes marked
 * with the "dummy" property.
 *
 * This algorithm scans layer by layer, starting with the second, for type-1
 * conflicts between the current layer and the previous layer. For each layer
 * it scans the nodes from left to right until it reaches one that is incident
 * on an inner segment. It then scans predecessors to determine if they have
 * edges that cross that inner segment. At the end a final scan is done for all
 * nodes on the current rank to see if they cross the last visited inner
 * segment.
 *
 * This algorithm (safely) assumes that a dummy node will only be incident on a
 * single node in the layers being scanned.
*/
export function findType1Conflicts(g: DaGraph, layering: Layer[]): Conflicts {
  var conflicts = {};

  function visitLayer(prevLayer: Layer, layer: Layer) {
    // last visited node in the previous layer that is incident on an inner
    // segment.
    var k0 = 0;
    // Tracks the last node in this layer scanned for crossings with a type-1
    // segment.
    var scanPos: number = 0;
    var prevLayerLength = prevLayer.length;
    var lastNode = last(layer);

    for (var i = 0; i < layer.length; i++) {
      var v = layer[i];
      var w = findOtherInnerSegmentNode(g, v);
      var k1 = w ? g.node(w).order : prevLayerLength;

      if (w || v === lastNode) {
        for (var scanNode of layer.slice(scanPos, i +1)) {
          for (var u of g.predecessors(scanNode)) {
            var uLabel = g.node(u);
            var uPos = uLabel.order;
            if ((uPos < k0 || k1 < uPos) && !(uLabel.dummy && g.node(scanNode).dummy)) {
              addConflict(conflicts, u, scanNode);
            }
          }
        }
        scanPos = i + 1;
        k0 = k1;
      }
    }

    return layer;
  }

  layering.reduce(visitLayer);
  return conflicts;
}

export function findType2Conflicts(g: DaGraph, layering: Layer[]) {
  var conflicts = {};

  function scan(south: string[], southPos: number, southEnd: number, prevNorthBorder: number, nextNorthBorder: number) {
    var v: string;
    for (var i of range(southPos, southEnd)) {
      v = south[i];
      if (g.node(v).dummy) {
        for (var u of g.predecessors(v)) {
          var uNode = g.node(u);
          if (uNode.dummy &&
              (uNode.order < prevNorthBorder || uNode.order > nextNorthBorder)) {
            addConflict(conflicts, u, v);
          }
        }
      }
    }
  }


  function visitLayer(north: Layer, south: Layer) {
    var prevNorthPos = -1;
    var nextNorthPos: number;
    var southPos: number = 0;

    for (var i=0; i<south.length; i++) {
      var southLookahead = i;
      var v = south[i];
      if (v === undefined) continue;
      if (g.node(v).dummy === "border") {
        var predecessors = g.predecessors(v);
        if (predecessors.length) {
          nextNorthPos = g.node(predecessors[0]).order;
          scan(south, southPos, southLookahead, prevNorthPos, nextNorthPos);
          southPos = southLookahead;
          prevNorthPos = nextNorthPos;
        }
      }
      scan(south, southPos, south.length, nextNorthPos, north.length);
    }

    return south;
  }

  layering.reduce(visitLayer);
  return conflicts;
}

export function findOtherInnerSegmentNode(g: DaGraph, v: string): string {
  if (g.node(v).dummy) {
    for (var u of g.predecessors(v)) {
      if (g.node(u).dummy) {
        return u;
      }
    }
  }
  return undefined;
}

export function addConflict(conflicts: Conflicts, v: string, w: string) {
  if (v > w) {
    var tmp = v;
    v = w;
    w = tmp;
  }

  var conflictsV = conflicts[v];
  if (!conflictsV) {
    conflicts[v] = conflictsV = {};
  }
  conflictsV[w] = true;
}

export function hasConflict(conflicts: Conflicts, v: string, w: string) {
  if (v > w) {
    var tmp = v;
    v = w;
    w = tmp;
  }
  return has(conflicts[v], w);
}

/*
 * Try to align nodes into vertical "blocks" where possible. This algorithm
 * attempts to align a node with one of its median neighbors. If the edge
 * connecting a neighbor is a type-1 conflict then we ignore that possibility.
 * If a previous node has already formed a block with a node after the node
 * we're trying to form a block with, we also ignore that possibility - our
 * blocks would be split in that scenario.
*/
export function verticalAlignment(g: DaGraph, layering: Layer[], conflicts: Conflicts, neighborFn: (e: string) => string[]) {
  var root: Record<string, string> = {};
  var align: Record<string, string> = {};
  var pos: Record<string, number> = {};

  // We cache the position here based on the layering because the graph and
  // layering may be out of sync. The layering matrix is manipulated to
  // generate different extreme alignments.
  for (var layer of layering) {
    for (var order=0; order<layer.length; order++) {
      var v = layer[order];
      root[v] = v;
      align[v] = v;
      pos[v] = order;
    }
  }

  for (var layer of layering) {
    var prevIdx = -1;
    for (var v of layer) {
      var ws = neighborFn(v);
      if (ws.length) {
        ws = sortBy(ws, w => pos[w]);
        var mp = (ws.length - 1) / 2;
        for (var i = Math.floor(mp), il = Math.ceil(mp); i <= il; ++i) {
          var w = ws[i];
          if (align[v] === v &&
              prevIdx < pos[w] &&
              !hasConflict(conflicts, v, w)) {
            align[w] = v;
            align[v] = root[v] = root[w];
            prevIdx = pos[w];
          }
        }
      }
    }
  }

  return { root: root, align: align };
}

export function horizontalCompaction(g: DaGraph, layering: Layer[], root: Record<string, string>, align: Record<string, string>, reverseSep: boolean) {
  // This portion of the algorithm differs from BK due to a number of problems.
  // Instead of their algorithm we construct a new block graph and do two
  // sweeps. The first sweep places blocks with the smallest possible
  // coordinates. The second sweep removes unused space by moving blocks to the
  // greatest coordinates without violating separation.
  var xs: Xs = {};
  var blockG = buildBlockGraph(g, layering, root, reverseSep);
  var borderType = reverseSep ? "borderLeft" : "borderRight";

  function iterate(setXsFunc: (e: string) => void, nextNodesFunc: (s: string) => string[]) {
    var stack = blockG.nodes();
    var elem = stack.pop();
    var visited: Record<string, boolean> = {};
    while (elem) {
      if (visited[elem]) {
        setXsFunc(elem);
      } else {
        visited[elem] = true;
        stack.push(elem);
        stack = stack.concat(nextNodesFunc(elem));
      }

      elem = stack.pop();
    }
  }

  // First pass, assign smallest coordinates
  function pass1(elem: string) {
    xs[elem] = blockG.inEdges(elem).reduce(function(acc, e) {
      return Math.max(acc, xs[e.v] + blockG.edge(e));
    }, 0);
  }

  // Second pass, assign greatest coordinates
  function pass2(elem: string) {
    var min = blockG.outEdges(elem).reduce(function(acc, e) {
      return Math.min(acc, xs[e.w] - blockG.edge(e));
    }, Number.POSITIVE_INFINITY);

    var node = g.node(elem);
    if (min !== Number.POSITIVE_INFINITY && node.borderType !== borderType) {
      xs[elem] = Math.max(xs[elem], min);
    }
  }

  iterate(pass1, (s: string) => blockG.predecessors(s));
  iterate(pass2, (s: string) => blockG.successors(s));

  // Assign x coordinates to all nodes
  for (var key of Object.keys(align)) {
    var v = align[key];
    xs[v] = xs[root[v]];
  }

  return xs;
}

function buildBlockGraph(g: DaGraph, layering: Layer[], root: Record<string, string>, reverseSep: boolean) {
  var blockGraph = new Graph<unknown, unknown, number>();
  var graphLabel = g.graph();
  var sepFn = sep(graphLabel.nodesep, graphLabel.edgesep, reverseSep);

  for (var layer of layering) {
    var u: string = null;
    for (var v of layer) {
      var vRoot = root[v];
      blockGraph.setNode(vRoot);
      if (u) {
        var uRoot = root[u];
        var prevMax: number = blockGraph.edge(uRoot, vRoot);
        blockGraph.setEdge(uRoot, vRoot, Math.max(sepFn(g, v, u), prevMax || 0));
      }
      u = v;
    }
  }

  return blockGraph;
}

/*
 * Returns the alignment that has the smallest width of the given alignments.
*/
export function findSmallestWidthAlignment(g: DaGraph, xss: Xss) {
  return minBy(values(xss), function (xs) {
    var max = Number.NEGATIVE_INFINITY;
    var min = Number.POSITIVE_INFINITY;

    for(var v in xs) {
      var x = xs[v];
      var halfWidth = width(g, v) / 2;

      max = Math.max(x + halfWidth, max);
      min = Math.min(x - halfWidth, min);
    }

    return max - min;
  });
}

/*
 * Align the coordinates of each of the layout alignments such that
 * left-biased alignments have their minimum coordinate at the same point as
 * the minimum coordinate of the smallest width alignment and right-biased
 * alignments have their maximum coordinate at the same point as the maximum
 * coordinate of the smallest width alignment.
*/
export function alignCoordinates(xss: Xss, alignTo: Record<string, number>) {
  var alignToVals = values(alignTo);
  var alignToMin = Math.min(...alignToVals);
  var alignToMax = Math.max(...alignToVals);
  for (var alignment of ['ul', 'ur', 'dl', 'dr']) {
    var horiz = alignment[1];
    var xs = xss[alignment as Alignment];
    if (xs === alignTo) continue;

    var xsVals = values(xs);
    var delta = horiz === "l" ? alignToMin - Math.min(...xsVals) : alignToMax - Math.max(...xsVals);

    if (delta) {
      xss[alignment as Alignment] = mapValues(xs, x => x + delta);
    }
  }
}

export function balance(xss: Xss, align: Alignment) {
  return mapValues(xss.ul, function(ignore, v) {
    if (align) {
      return xss[align.toLowerCase() as Alignment][v];
    } else {
      var xs = sortBy([xss.ul[v], xss.ur[v], xss.dl[v], xss.dr[v]], e => e);
      return (xs[1] + xs[2]) / 2;
    }
  });
}

export function positionX(g: DaGraph) {
  var layering = buildLayerMatrix(g);
  var conflicts = {
    ...findType1Conflicts(g, layering),
    ...findType2Conflicts(g, layering)
  };

  var xss: Xss = { ul: {}, ur: {}, dl: {}, dr: {} };
  var adjustedLayering: Layer[];
  for (var vert of ["u", "d"] as ('u'|'d')[]) {
    adjustedLayering = vert === "u" ? layering : layering.map(e => e).reverse();
    for (var horiz of ["l", "r"] as ('l'|'r')[]) {
      if (horiz === "r") {
        adjustedLayering = adjustedLayering.map((inner) => inner.map(e => e).reverse());
      }

      var neighborFn = (vert === "u" ? g.predecessors : g.successors).bind(g);
      var align = verticalAlignment(g, adjustedLayering, conflicts, neighborFn);
      var xs = horizontalCompaction(g, adjustedLayering,
        align.root, align.align, horiz === "r");
      if (horiz === "r") {
        xs = mapValues(xs, (x) => -x);
      }
      xss[(vert + horiz) as Alignment] = xs;
    }
  }

  var smallestWidth = findSmallestWidthAlignment(g, xss);
  alignCoordinates(xss, smallestWidth);
  return balance(xss, g.graph().align);
}

export function sep(nodeSep: number, edgeSep: number, reverseSep: boolean) {
  return function(g: DaGraph, v: string, w: string) {
    var vLabel = g.node(v);
    var wLabel = g.node(w);
    var sum = 0;
    var delta;

    sum += vLabel.width / 2;
    if (has(vLabel, "labelpos")) {
      switch (vLabel.labelpos.toLowerCase()) {
      case "l": delta = -vLabel.width / 2; break;
      case "r": delta = vLabel.width / 2; break;
      }
    }
    if (delta) {
      sum += reverseSep ? delta : -delta;
    }
    delta = 0;

    sum += (vLabel.dummy ? edgeSep : nodeSep) / 2;
    sum += (wLabel.dummy ? edgeSep : nodeSep) / 2;

    sum += wLabel.width / 2;
    if (has(wLabel, "labelpos")) {
      switch (wLabel.labelpos.toLowerCase()) {
      case "l": delta = wLabel.width / 2; break;
      case "r": delta = -wLabel.width / 2; break;
      }
    }
    if (delta) {
      sum += reverseSep ? delta : -delta;
    }
    delta = 0;

    return sum;
  };
}

export function width(g: DaGraph, v: string) {
  return g.node(v).width;
}
