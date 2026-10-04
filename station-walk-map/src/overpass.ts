import type { LatLon } from "./geo";
import type { OsmWay } from "./graph";

const ENDPOINT = "https://overpass-api.de/api/interpreter";

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

  const res = await fetch(ENDPOINT, {
    method: "POST",
    body: new URLSearchParams({ data: query }),
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);

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
