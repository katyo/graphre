import type { Edge, Graph } from "./graph";

export type DaGraph = Graph<GraphLabel, GraphNode, EdgeLabel>;

export type Alignment = 'ul'|'ur'|'dl'|'dr';
export type Ranker = 'network-simplex' | 'tight-tree' | 'longest-path';
export type RankDir = 'TB'|'LR'|'tb'|'lr'|'BT'|'RL'|'bt'|'rl';
export type Acyclicer = 'greedy'|undefined;

export type Vector = { x?: number, y?: number };
export type Rect = { x?: number, y?: number, width?: number, height?: number };

export interface GraphLabel {
  width?: number;
  height?: number;
  compound?: boolean;
  rankdir?: RankDir;
  align?: Alignment;
  nodesep?: number;
  edgesep?: number;
  ranksep?: number;
  marginx?: number;
  marginy?: number;
  acyclicer?: Acyclicer;
  ranker?: Ranker;
  maxRank?: number;
  nodeRankFactor?: number;
  nestingRoot?: string;
  dummyChains?: Array<string>;
  root?: string;
}

export interface GraphNode {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  order?: number;
  rank?: number;
  minRank?: number;
  maxRank?: number;
  edgeObj?: Edge;
  edgeLabel?: EdgeLabel;
  labelpos?: 'r'|'l';
  borderTop?: string;
  borderBottom?: string;
  borderLeft?: string[];
  borderRight?: string[];
  dummy?: unknown;
  borderType?: string;
  selfEdges?: { e: Edge, label: EdgeLabel }[]
  label?: unknown;
  parent?: string;
  e?: unknown;
}

export interface EdgeLabel {
  x?: number;
  y?: number;
  weight?: number;
  minlen?: number;
  forwardName?: string;
  reversed?: boolean;
  width?: number;
  height?: number;
  labelpos?: 'r'|'l';
  labeloffset?: number
  labelRank?: number;
  nestingEdge?: boolean;
  points?: {x:number, y:number}[]
}

export interface LayoutGraphConfig {
  nodesep: number;
  edgesep: number;
  ranksep: number;
  marginx: number;
  marginy: number;
  acyclicer: Acyclicer;
  ranker: Ranker;
  rankdir: RankDir;
  align: Alignment;
  width?: number;
  height?: number;
}

export interface LayoutNode {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

export interface LayoutEdge {
  minlen: number;
  weight: number;
  width: number;
  height: number;
  labeloffset: number;
  x?: number;
  y?: number;
  points?: {x:number,y:number}[]
}

export type LayoutGraph = Graph<LayoutGraphConfig, LayoutNode, LayoutEdge>;

export type ConstraintGraph = Graph<GraphLabel, GraphNode, EdgeLabel>;
