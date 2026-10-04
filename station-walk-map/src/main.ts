import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLon } from "./geo";
import { buildGraph, nearestNode, reachableSegments, shortestDistances } from "./graph";
import { fetchWalkableWays, geocode } from "./overpass";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const minutesInput = $<HTMLInputElement>("minutes");
const minutesOut = $<HTMLOutputElement>("minutes-out");
const mpmInput = $<HTMLInputElement>("mpm");
const statusEl = $("status");
const legendEl = $("legend");

const map = L.map("map").setView([35.681236, 139.767125], 15); // 東京駅
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

const renderer = L.canvas();
const resultLayer = L.layerGroup().addTo(map);
const marker = L.marker([35.681236, 139.767125]).addTo(map);

/** 近い=緑 → 遠い=赤 */
const colorFor = (minute: number, max: number) =>
  `hsl(${120 - (120 * (minute - 1)) / Math.max(1, max - 1)}, 80%, 45%)`;

let origin: LatLon = [35.681236, 139.767125];
let controller: AbortController | undefined;

async function update() {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  const minutes = Number(minutesInput.value);
  const mpm = Number(mpmInput.value) || 80;
  const maxDist = minutes * mpm;
  marker.setLatLng(origin);
  statusEl.textContent = "道路データを取得中…";

  try {
    // 直線距離 ≦ 道のり距離なので、半径 maxDist の範囲取得で取りこぼさない
    const ways = await fetchWalkableWays(origin, maxDist + 50, signal);
    const graph = buildGraph(ways);
    const start = nearestNode(graph, origin);
    if (start === undefined) {
      statusEl.textContent = "近くに歩ける道が見つからなかったよ";
      return;
    }
    const dist = shortestDistances(graph, start, maxDist);
    const segments = reachableSegments(graph, dist, maxDist, mpm);

    resultLayer.clearLayers();
    for (let m = minutes; m >= 1; m--) {
      const lines = segments.filter((s) => s.minutes === m).map((s): LatLon[] => [s.from, s.to]);
      if (lines.length === 0) continue;
      L.polyline(lines, {
        renderer,
        color: colorFor(m, minutes),
        weight: 4,
        opacity: 0.9,
      }).addTo(resultLayer);
    }
    renderLegend(minutes);
    statusEl.textContent = `徒歩${minutes}分（${mpm}m/分 = ${maxDist}m）／ ${segments.length}区間`;
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    statusEl.textContent = `エラー: ${(e as Error).message}`;
  }
}

function renderLegend(max: number) {
  legendEl.innerHTML = Array.from({ length: max }, (_, i) => i + 1)
    .map(
      (m) =>
        `<span style="display:inline-block;margin:2px 6px 2px 0"><i style="display:inline-block;width:12px;height:12px;background:${colorFor(m, max)};vertical-align:middle"></i> ${m}分</span>`,
    )
    .join("");
}

map.on("click", (e: L.LeafletMouseEvent) => {
  origin = [e.latlng.lat, e.latlng.lng];
  void update();
});

minutesInput.addEventListener("input", () => {
  minutesOut.textContent = minutesInput.value;
});
minutesInput.addEventListener("change", () => void update());
mpmInput.addEventListener("change", () => void update());

$("search").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $<HTMLInputElement>("q").value.trim();
  if (!q) return;
  statusEl.textContent = "検索中…";
  try {
    const hit = await geocode(q);
    if (!hit) {
      statusEl.textContent = "見つからなかったよ";
      return;
    }
    origin = hit;
    map.setView(hit, 16);
    await update();
  } catch (err) {
    statusEl.textContent = `エラー: ${(err as Error).message}`;
  }
});

void update();
