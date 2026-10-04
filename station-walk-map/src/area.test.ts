import { describe, expect, it, vi } from "vitest";
import { AreaLoader, computeSegments, fetchRadius, type FetchWays } from "./area";
import { haversine, type LatLon } from "./geo";
import type { OsmWay } from "./graph";

// 東京駅付近に 40m 間隔の格子状の道（約 2km 四方）
const lat0 = 35.681;
const lon0 = 139.767;
const mLat = 1 / 111_200;
const mLon = mLat / Math.cos((lat0 * Math.PI) / 180);
const N = 25;
const B = 40;
const node = (i: number, j: number) => (i + N) * 1000 + (j + N);
const pt = (i: number, j: number) => ({ lat: lat0 + j * B * mLat, lon: lon0 + i * B * mLon });
const city: OsmWay[] = [];
for (let k = -N; k <= N; k++) {
  const idx = Array.from({ length: 2 * N + 1 }, (_, t) => t - N);
  city.push({ nodes: idx.map((i) => node(i, k)), geometry: idx.map((i) => pt(i, k)) });
  city.push({ nodes: idx.map((j) => node(k, j)), geometry: idx.map((j) => pt(k, j)) });
}

/** Overpass の around と同じく、範囲内にノードを1つでも持つ way を丸ごと返す */
const fakeOverpass: FetchWays = async (center, radius) =>
  city.filter((w) => w.geometry.some((g) => haversine(center, [g.lat, g.lon]) <= radius));

const origin: LatLon = [lat0, lon0];
const other: LatLon = [lat0 + 0.001, lon0];

/** 外から resolve できる fetch（取得中の状態を作る） */
function deferredFetch() {
  const calls: { radius: number; signal: AbortSignal; resolve: () => void }[] = [];
  const fetchWays: FetchWays = (center, radius, signal) =>
    new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      calls.push({ radius, signal, resolve: () => void fakeOverpass(center, radius, signal).then(resolve) });
    });
  return { calls, fetchWays };
}

describe("AreaLoader のキャッシュ", () => {
  it("取得済みの半径に収まる要求はネットワークに行かない", async () => {
    const f = vi.fn(fakeOverpass);
    const loader = new AreaLoader(f);
    await loader.load(origin, fetchRadius(20, 80));
    for (const m of [1, 5, 10, 19, 20]) await loader.load(origin, fetchRadius(m, 80));
    expect(f).toHaveBeenCalledTimes(1);
    expect(loader.cached(origin, fetchRadius(20, 80))).toBeDefined();
  });

  it("半径が足りなければ取り直す", async () => {
    const f = vi.fn(fakeOverpass);
    const loader = new AreaLoader(f);
    await loader.load(origin, fetchRadius(10, 80));
    expect(loader.cached(origin, fetchRadius(11, 80))).toBeUndefined();
    await loader.load(origin, fetchRadius(11, 80));
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("起点が変わったら取り直す", async () => {
    const f = vi.fn(fakeOverpass);
    const loader = new AreaLoader(f);
    await loader.load(origin, 500);
    await loader.load(other, 500);
    expect(f).toHaveBeenCalledTimes(2);
    expect(loader.cached(origin, 500)).toBeUndefined();
  });

  it("取得中の要求で足りるなら相乗りする", async () => {
    const { calls, fetchWays } = deferredFetch();
    const loader = new AreaLoader(fetchWays);
    const big = loader.load(origin, 1650);
    const small = loader.load(origin, 500);
    expect(calls).toHaveLength(1);
    calls[0]!.resolve();
    expect(await small).toBe(await big);
  });

  it("起点が変わったら取得中の古い要求を中断する", async () => {
    const { calls, fetchWays } = deferredFetch();
    const loader = new AreaLoader(fetchWays);
    const old = loader.load(origin, 500);
    const next = loader.load(other, 500);
    expect(calls[0]!.signal.aborted).toBe(true);
    await expect(old).rejects.toMatchObject({ name: "AbortError" });
    calls[1]!.resolve();
    expect((await next).origin).toBe(other);
  });

  it("先読みが後から終わっても、大きいエリアを小さいもので上書きしない", async () => {
    const { calls, fetchWays } = deferredFetch();
    const loader = new AreaLoader(fetchWays);
    const big = loader.load(origin, 1650);
    calls[0]!.resolve();
    await big;
    // 大きいエリアがあるので、小さい要求はキャッシュから返る
    await loader.load(origin, 500);
    expect(calls).toHaveLength(1);
    expect(loader.cached(origin, 1650)).toBeDefined();
  });

  it("prefetch の失敗は握りつぶし、キャッシュも汚さない", async () => {
    const loader = new AreaLoader(() => Promise.reject(new Error("504")));
    loader.prefetch(origin, 1650);
    await new Promise((r) => setTimeout(r, 0));
    expect(loader.cached(origin, 1650)).toBeUndefined();
  });
});

describe("computeSegments", () => {
  // キャッシュの前提: 大きく取ったエリアで計算しても、ちょうどの半径で取った場合と結果が同じ
  it.each([1, 3, 7, 10])("徒歩%i分: 最大範囲のキャッシュと、ちょうどの範囲で同じ結果", async (m) => {
    const exact = await new AreaLoader(fakeOverpass).load(origin, fetchRadius(m, 80));
    const big = await new AreaLoader(fakeOverpass).load(origin, fetchRadius(20, 80));
    const key = (s: { from: LatLon; to: LatLon; minutes: number }) =>
      `${s.from.map((v) => v.toFixed(7))}|${s.to.map((v) => v.toFixed(7))}|${s.minutes}`;
    const a = computeSegments(exact, m, 80).map(key).sort();
    const b = computeSegments(big, m, 80).map(key).sort();
    expect(a.length).toBeGreaterThan(0);
    expect(b).toEqual(a);
  });

  it("歩ける道が無ければ空", async () => {
    const area = await new AreaLoader(async () => []).load(origin, 500);
    expect(area.start).toBeUndefined();
    expect(computeSegments(area, 10, 80)).toEqual([]);
  });
});
