import type { GraphLike } from "../graph";
import { dfs } from "./dfs";
 
export function preorder(g: GraphLike, vs: string|Array<string>) {
  return dfs(g, vs, "pre");
}
