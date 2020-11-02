import _ from "./lodash";
import { greedyFAS } from "./greedy-fas";
import { DagreGraph } from "./types";
import { Edge } from "graphlib";

export var acyclic = { run, undo };

function run(g: DagreGraph) {
  var fas = (g.graph().acyclicer === "greedy"
    ? greedyFAS(g, weightFn(g))
    : dfsFAS(g));
  for (var e of fas) {
    var label = g.edge(e);
    g.removeEdge(e);
    label.forwardName = e.name;
    label.reversed = true;
    g.setEdge(e.w, e.v, label, _.uniqueId("rev"));
  }

  function weightFn(g: DagreGraph) {
    return function(e: Edge) {
      return g.edge(e).weight;
    };
  }
}

function dfsFAS(g: DagreGraph) {
  var fas: Edge[] = [];
  var stack: Record<string, boolean> = {};
  var visited: Record<string, boolean> = {};

  function dfs(v: string) {
    if (_.has(visited, v)) {
      return;
    }
    visited[v] = true;
    stack[v] = true;
    for (var e of g.outEdges(v)) {
      if (_.has(stack, e.w)) {
        fas.push(e);
      } else {
        dfs(e.w);
      }
    }
    delete stack[v];
  }

  g.nodes().forEach(dfs);
  return fas;
}

function undo(g: DagreGraph) {
  for (var e of g.edges()) {
    var label = g.edge(e);
    if (label.reversed) {
      g.removeEdge(e);

      var forwardName = label.forwardName;
      delete label.reversed;
      delete label.forwardName;
      g.setEdge(e.w, e.v, label, forwardName);
    }
  }
}
