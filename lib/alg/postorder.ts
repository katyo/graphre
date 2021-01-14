import type { GraphLike } from "../graph";
import { dfs } from "./dfs";

export function postorder(g: GraphLike, vs: string|Array<string>): string[] {
  return dfs(g, vs, "post");
}
