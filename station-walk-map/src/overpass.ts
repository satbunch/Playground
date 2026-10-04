import type { LatLon } from "./geo";
import type { OsmWay } from "./graph";

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

/** 混雑・タイムアウト系で、別サーバーや再試行で解決しうるステータス */
const RETRYABLE = new Set([429, 502, 503, 504]);

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });

/**
 * 各エンドポイントを順に試し、混雑系エラーなら次のサーバーへ。
 * 全部失敗したら少し待って rounds 回まで繰り返す。
 */
export async function fetchWithFallback(
  endpoints: string[],
  init: RequestInit,
  { rounds = 2, delayMs = 1500 }: { rounds?: number; delayMs?: number } = {},
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  let lastError: Error = new Error("Overpass API error: no endpoint");
  for (let round = 0; round < rounds; round++) {
    if (round > 0) await sleep(delayMs, init.signal ?? undefined);
    for (const url of endpoints) {
      try {
        const res = await fetchFn(url, init);
        if (res.ok) return res;
        lastError = new Error(`Overpass API error: ${res.status}`);
        if (!RETRYABLE.has(res.status)) throw lastError;
      } catch (e) {
        if (init.signal?.aborted || e === lastError) throw e;
        // ネットワーク断・CORS 失敗なども次のサーバーで再試行
        lastError = e instanceof Error ? e : new Error(String(e));
      }
    }
  }
  throw lastError;
}

/** 徒歩で通れない道を除いた、center から radius(m) 以内の道路を取得する */
export async function fetchWalkableWays(
  center: LatLon,
  radius: number,
  signal?: AbortSignal,
): Promise<OsmWay[]> {
  const [lat, lon] = center;
  const query = `
    [out:json][timeout:30];
    way["highway"]
      ["highway"!~"^(motorway|motorway_link|trunk|trunk_link|proposed|construction|raceway|bus_guideway|bridleway)$"]
      ["foot"!~"^(no|private)$"]
      ["access"!~"^(no|private)$"]
      (around:${Math.ceil(radius)},${lat},${lon});
    out geom;`;

  const res = await fetchWithFallback(ENDPOINTS, {
    method: "POST",
    body: new URLSearchParams({ data: query }),
    ...(signal ? { signal } : {}),
  });

  const json = (await res.json()) as {
    elements: { type: string; nodes?: number[]; geometry?: OsmWay["geometry"] }[];
  };
  return json.elements.flatMap((e) =>
    e.type === "way" && e.nodes && e.geometry
      ? [{ nodes: e.nodes, geometry: e.geometry }]
      : [],
  );
}

export async function geocode(q: string): Promise<LatLon | undefined> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "ja" } });
  if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);
  const [hit] = (await res.json()) as { lat: string; lon: string }[];
  return hit ? [Number(hit.lat), Number(hit.lon)] : undefined;
}
