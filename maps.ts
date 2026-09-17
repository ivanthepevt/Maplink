// Edit here, then restart npm run dev / run npm run build to refresh matches.
export const MAPS = [
  { id: "vmaps", name: "VMaps", hosts: ["nonprod-mapops.vmaps.vn"], path: "/editor-map/hdmap", frames: ["/hdmap.html"] },
  { id: "osm", name: "OpenStreetMap", hosts: ["www.openstreetmap.org"], path: "/" },
  { id: "google", name: "Google Maps", hosts: ["www.google.com"], path: "/maps/" },
  { id: "mapillary", name: "Mapillary", hosts: ["mapillary.com", "www.mapillary.com"], path: "/app/" },
  { id: "ndamaps", name: "NDA Maps", hosts: ["ndamaps.vn", "www.ndamaps.vn"], path: "/" },
  { id: "waze", name: "Waze Map Editor", hosts: ["waze.com", "www.waze.com"], path: "/*editor" }
] as const

export function detectProvider(url: string) {
  try {
    const u = new URL(url)
    return MAPS.find(m => u.protocol === "https:" && (m.hosts as readonly string[]).includes(u.hostname) && (m.id === "waze" ? /^\/(?:[^/]+\/)*editor(?:\/|$)/.test(u.pathname) : u.pathname.startsWith(m.path)))
  } catch { return undefined }
}

export type LocationMessage = { type: "LOCATION"; lat: number; lon: number; zoom?: number }
export function mapLabel(url: string) {
  const map = detectProvider(url)
  return map?.id === "osm" ? `${map.name} · ${new URL(url).pathname.startsWith("/edit") || new URL(url).pathname === "/id" ? "Edit" : "View"}` : map?.name
}
export function validLocation(m: LocationMessage): boolean {
  return m?.type === "LOCATION" && Number.isFinite(m.lat) && Math.abs(m.lat) <= 90 && Number.isFinite(m.lon) && Math.abs(m.lon) <= 180 && (m.zoom === undefined || (Number.isFinite(m.zoom) && m.zoom >= 0 && m.zoom <= 24))
}
