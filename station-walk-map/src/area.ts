import type { LatLon } from "./geo";
import {
  buildGraph,
  nearestNode,
  reachableSegments,
  shortestDistances,
  type Graph,
  type OsmWay,
  type Segment,
} from "./graph";

/** 起点の周り radius(m) 以内の道路グラフ。radius 以下の徒歩圏ならこれだけで計算できる */
export interface Area {
  origin: LatLon;
  radius: number;
  graph: Graph;
  /** 起点に最も近いノード。歩ける道が無ければ undefined */
  start: number | undefined;
}

export type FetchWays = (center: LatLon, radius: number, signal: AbortSignal) => Promise<OsmWay[]>;

const sameOrigin = (a: LatLon, b: LatLon) => a[0] === b[0] && a[1] === b[1];

/**
 * 道路データの取得とキャッシュ。
 * - 同じ起点で、取得済みの半径に収まる要求はネットワークに行かない
 * - 取得中の要求で足りるなら、それを待つ（重複リクエストしない）
 * - 起点が変わったら、取得中の古い要求は中断する
 */
export class AreaLoader {
  private area: Area | undefined;
  private pending:
    | { origin: LatLon; radius: number; promise: Promise<Area>; controller: AbortController }
    | undefined;

  constructor(private readonly fetchWays: FetchWays) {}

  /** ネットワークに行かずに使えるエリア */
  cached(origin: LatLon, radius: number): Area | undefined {
    const a = this.area;
    return a && sameOrigin(a.origin, origin) && a.radius >= radius ? a : undefined;
  }

  load(origin: LatLon, radius: number): Promise<Area> {
    const hit = this.cached(origin, radius);
    if (hit) return Promise.resolve(hit);

    const p = this.pending;
    if (p && sameOrigin(p.origin, origin) && p.radius >= radius) return p.promise;
    // 古い起点の取得は不要。同じ起点でも半径が足りないなら取り直す
    p?.controller.abort();

    const controller = new AbortController();
    const promise = this.fetchWays(origin, radius, controller.signal).then((ways) => {
      const graph = buildGraph(ways);
      const area: Area = { origin, radius, graph, start: nearestNode(graph, origin) };
      // 先に大きいエリアが取れていたら、小さいもので上書きしない
      if (!this.cached(origin, radius)) this.area = area;
      return area;
    });
    const entry = { origin, radius, promise, controller };
    this.pending = entry;
    const clear = () => {
      if (this.pending === entry) this.pending = undefined;
    };
    promise.then(clear, clear);
    return promise;
  }

  /** 後で使いそうな範囲を裏で取得しておく。失敗しても無視 */
  prefetch(origin: LatLon, radius: number): void {
    this.load(origin, radius).catch(() => {});
  }
}

/** エリア内で、徒歩 minutes 分以内に行ける線分を求める */
export function computeSegments(area: Area, minutes: number, metersPerMinute: number): Segment[] {
  if (area.start === undefined) return [];
  const maxDist = minutes * metersPerMinute;
  const dist = shortestDistances(area.graph, area.start, maxDist);
  return reachableSegments(area.graph, dist, maxDist, metersPerMinute);
}

/** 直線距離 ≦ 道のり距離なので、徒歩距離 + 余白の半径を取れば取りこぼさない */
export const fetchRadius = (minutes: number, metersPerMinute: number) =>
  minutes * metersPerMinute + 50;
