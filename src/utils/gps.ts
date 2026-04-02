// Haversine formula + anti-cheat (>20 km/h = skip point)

const EARTH_R = 6371; // km

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversine(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type GPSPoint = { lat: number; lon: number; ts: number }

const MAX_SPEED_MS = 5.556; // 20 km/h in m/s

/**
 * Returns { distKm, cheating } given previous and current point.
 * If speed exceeds MAX_SPEED_MS, marks as cheating and returns 0 distance.
 */
export function processGPSPoint(
  prev: GPSPoint,
  curr: GPSPoint
): { distKm: number; cheating: boolean } {
  const distKm = haversine(prev.lat, prev.lon, curr.lat, curr.lon);
  const dtSec  = (curr.ts - prev.ts) / 1000;

  if (dtSec <= 0) {return { distKm: 0, cheating: false };}

  const speedMs = (distKm * 1000) / dtSec;
  if (speedMs > MAX_SPEED_MS) {
    return { distKm: 0, cheating: true };
  }
  return { distKm, cheating: false };
}
