export type LatLon = [lat: number, lon: number];

const EARTH_RADIUS_M = 6_371_000;

export function haversine([lat1, lon1]: LatLon, [lat2, lon2]: LatLon): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export function lerp(a: LatLon, b: LatLon, t: number): LatLon {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
