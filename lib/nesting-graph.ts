import _ from "./lodash";
import * as util from "./util";
import { Graph } from 'graphlib';

export var nestingGraph = { run, cleanup };

/*
 * A nesting graph creates dummy nodes for the tops and bottoms of subgraphs,
 * adds appropriate edges to ensure that all cluster nodes are placed between
 * these boundries, and ensures that the graph is connected.
 *
 * In addition we ensure, through the use of the minlen property, that nodes
 * and subgraph border nodes to not end up on the same rank.
 *
 * Preconditions:
 *
 *    1. Input graph is a DAG
 *    2. Nodes in the input graph has a minlen attribute
 *
 * Postconditions:
 *
 *    1. Input graph is connected.
 *    2. Dummy nodes are added for the tops and bottoms of subgraphs.
 *    3. The minlen attribute for nodes is adjusted to ensure nodes do not
 *       get placed on the same rank as subgraph border nodes.
 *
 * The nesting graph idea comes from Sander, "Layout of Compound Directed
 * Graphs."
*/
function run(g: Graph<GraphNode, EdgeLabel>) {
  var root = util.addDummyNode(g, "root", {}, "_root");
  var depths = treeDepths(g);
  var height = _.max(_.values(depths)) - 1; // Note: depths is an Object not an array
  var nodeSep = 2 * height + 1;

  g.graph().nestingRoot = root;

  // Multiply minlen by nodeSep to align nodes on non-border ranks.
  for (var e of g.edges()) {
    g.edge(e).minlen *= nodeSep;
  }

  // Calculate a weight that is sufficient to keep subgraphs vertically compact
  var weight = sumWeights(g) + 1;

  // Create border nodes and link them up
  for (var child of g.children()) {
    dfs(g, root, nodeSep, weight, height, depths, child);
  }

  // Save the multiplier for node layers for later removal of empty border
  // layers.
  g.graph().nodeRankFactor = nodeSep;
}

function dfs(g: Graph<GraphNode, EdgeLabel>, root, nodeSep, weight, height, depths, v) {
  var children = g.children(v);
  if (!children.length) {
    if (v !== root) {
      g.setEdge(root, v, { weight: 0, minlen: nodeSep });
    }
    return;
  }

  var top = util.addBorderNode(g, "_bt");
  var bottom = util.addBorderNode(g, "_bb");
  var label = g.node(v);

  g.setParent(top, v);
  label.borderTop = top;
  g.setParent(bottom, v);
  label.borderBottom = bottom;

  for (var child of children) {
    dfs(g, root, nodeSep, weight, height, depths, child);

    var childNode = g.node(child);
    var childTop = childNode.borderTop ? childNode.borderTop : child;
    var childBottom = childNode.borderBottom ? childNode.borderBottom : child;
    var thisWeight = childNode.borderTop ? weight : 2 * weight;
    var minlen = childTop !== childBottom ? 1 : height - depths[v] + 1;

    g.setEdge(top, childTop, {
      weight: thisWeight,
      minlen: minlen,
      nestingEdge: true
    });

    g.setEdge(childBottom, bottom, {
      weight: thisWeight,
      minlen: minlen,
      nestingEdge: true
    });
  }

  if (!g.parent(v)) {
    g.setEdge(root, top, { weight: 0, minlen: height + depths[v] });
  }
}

function treeDepths(g: Graph<GraphNode, EdgeLabel>): Record<string, number> {
  var depths: Record<string, number> = {};
  function dfs(v: string, depth: number) {
    var children = g.children(v);
    if (children && children.length) {
      for (var child of children) {
        dfs(child, depth + 1);
      }
    }
    depths[v] = depth;
  }
  for (var child of g.children()) {
    dfs(child, 1);
  }
  return depths;
}

function sumWeights(g: Graph<GraphNode, EdgeLabel>) {
  return g.edges().reduce(function(acc, e) {
    return acc + g.edge(e).weight;
  }, 0);
}

function cleanup(g: Graph<GraphNode, EdgeLabel>) {
  var graphLabel = g.graph();
  g.removeNode(graphLabel.nestingRoot);
  delete graphLabel.nestingRoot;
  for (var e of g.edges()) {
    var edge = g.edge(e);
    if (edge.nestingEdge) {
      g.removeEdge(e);
    }
  }
}
