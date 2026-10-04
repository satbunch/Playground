import L from "leaflet";
import "leaflet/dist/leaflet.css";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import type { LatLon } from "./geo";
import { AreaLoader, computeSegments, fetchRadius, type Area } from "./area";
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

// 結果専用のペイン。読み込み中は薄くして「古い表示」だと分かるようにする
const resultPane = map.createPane("result");
const renderer = L.canvas({ pane: "result" });
const resultLayer = L.layerGroup().addTo(map);
// 既定アイコンは CSS から画像パスを推測するため、バンドル後に壊れる。明示的に渡す
const icon = L.icon({ ...L.Icon.Default.prototype.options, iconUrl, iconRetinaUrl, shadowUrl });
const marker = L.marker([35.681236, 139.767125], { icon }).addTo(map);

/** 近い=緑 → 遠い=赤 */
const colorFor = (minute: number, max: number) =>
  `hsl(${120 - (120 * (minute - 1)) / Math.max(1, max - 1)}, 80%, 45%)`;

let origin: LatLon = [35.681236, 139.767125];
const loader = new AreaLoader(fetchWalkableWays);
/** 最後に始めた update だけ描画するための通し番号 */
let seq = 0;

function setLoading(message: string | undefined) {
  document.body.classList.toggle("loading", message !== undefined);
  resultPane.classList.toggle("stale", message !== undefined);
  if (message !== undefined) statusEl.textContent = message;
}

async function update() {
  const id = ++seq;
  const minutes = Number(minutesInput.value);
  const mpm = Number(mpmInput.value) || 80;
  const at = origin;
  marker.setLatLng(at);

  try {
    let area = loader.cached(at, fetchRadius(minutes, mpm));
    if (!area) {
      setLoading("道路データを取得中…");
      area = await loader.load(at, fetchRadius(minutes, mpm));
      if (id !== seq) return;
    }
    render(area, minutes, mpm);
    setLoading(undefined);
    // スライダーを最大まで動かしても再取得しないよう、裏で先読み
    loader.prefetch(at, fetchRadius(Number(minutesInput.max), mpm));
  } catch (e) {
    if (id !== seq || (e as Error).name === "AbortError") return;
    setLoading(undefined);
    statusEl.textContent = `エラー: ${(e as Error).message}`;
  }
}

function render(area: Area, minutes: number, mpm: number) {
  if (area.start === undefined) {
    resultLayer.clearLayers();
    statusEl.textContent = "近くに歩ける道が見つからなかったよ";
    return;
  }
  const segments = computeSegments(area, minutes, mpm);
  const byMinute = new Map<number, LatLon[][]>();
  for (const s of segments) {
    let lines = byMinute.get(s.minutes);
    if (!lines) byMinute.set(s.minutes, (lines = []));
    lines.push([s.from, s.to]);
  }

  resultLayer.clearLayers();
  for (let m = minutes; m >= 1; m--) {
    const lines = byMinute.get(m);
    if (!lines) continue;
    L.polyline(lines, {
      renderer,
      color: colorFor(m, minutes),
      weight: 4,
      opacity: 0.9,
    }).addTo(resultLayer);
  }
  renderLegend(minutes);
  statusEl.textContent = `徒歩${minutes}分（${mpm}m/分 = ${minutes * mpm}m）／ ${segments.length}区間`;
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
  void update();
});
mpmInput.addEventListener("change", () => void update());

$("search").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $<HTMLInputElement>("q").value.trim();
  if (!q) return;
  setLoading("検索中…");
  try {
    const hit = await geocode(q);
    if (!hit) {
      setLoading(undefined);
      statusEl.textContent = "見つからなかったよ";
      return;
    }
    origin = hit;
    map.setView(hit, 16);
    await update();
  } catch (err) {
    setLoading(undefined);
    statusEl.textContent = `エラー: ${(err as Error).message}`;
  }
});

void update();
