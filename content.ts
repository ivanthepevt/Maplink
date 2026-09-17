import type { PlasmoCSConfig } from "plasmo"
import { detectProvider, validLocation, type LocationMessage } from "./maps"

export const config: PlasmoCSConfig = { matches: ["https://nonprod-mapops.vmaps.vn/editor-map/hdmap*","https://nonprod-mapops.vmaps.vn/hdmap.html*","https://www.openstreetmap.org/*","https://www.google.com/maps/*","https://mapillary.com/app/*","https://www.mapillary.com/app/*","https://ndamaps.vn/*","https://www.ndamaps.vn/*","https://waze.com/*editor*","https://www.waze.com/*editor*"], all_frames: true, run_at: "document_start" }
const vmapsFrame = location.hostname === "nonprod-mapops.vmaps.vn" && location.pathname === "/hdmap.html"
const provider = detectProvider(location.href)
const bridged = vmapsFrame || provider?.id === "waze"
let linked = false
let indicator: HTMLButtonElement | undefined
function showStatus(value: boolean) {
  linked = value
  if (bridged) window.postMessage({ type: "MAPLINK_LINKED", linked }, location.origin)
  if (indicator) {
    indicator.textContent = `MapLink ${linked ? "●" : "○"}`
    indicator.title = linked ? "Linked — click to disconnect" : "Not linked — click to activate"
    indicator.style.color = linked ? "#16733c" : "#555"
  }
}
async function send(message: object) {
  try {
    const result = await chrome.runtime.sendMessage(message)
    if (result?.error) throw new Error(result.error)
    return result
  } catch (error) {
    if (provider?.id === "google") console.warn("[MapLink][Google] message failed", error)
    if (indicator) indicator.title = `MapLink: ${String(error)}. Reload this tab if the extension was reloaded.`
    return undefined
  }
}
function view() {
  if (provider?.id === "mapillary") {
    const q = new URL(location.href).searchParams
    if (!q.has("lat") || !q.has("lng") || !q.has("z")) return
    return { lat: Number(q.get("lat")), lon: Number(q.get("lng")), zoom: Number(q.get("z")) }
  }
  const parts = location.hash.match(/(?:map=)?([\d.]+)\/(-?[\d.]+)\/(-?[\d.]+)/)
  if (provider?.id === "google") {
    const google = location.href.match(/@(-?[\d.]+),(-?[\d.]+),([\d.]+)(z|m)(?:\/|\?|$)/)
    if (!google) return
    const lat = +google[1], lon = +google[2]
    // Flat Satellite URLs express vertical ground span in meters, not zoom.
    const height = document.querySelector('[role="application"]')?.getBoundingClientRect().height
    const zoom = google[4] === "z" ? +google[3] : height && +google[3] > 0
      ? Math.log2(40075016.686 * Math.cos(lat * Math.PI / 180) * height / (256 * +google[3])) : NaN
    return Number.isFinite(zoom) ? { lat, lon, zoom } : undefined
  }
  return parts ? { zoom: +parts[1], lat: +parts[2], lon: +parts[3] } : undefined
}
function getClickedCoordinate(event: MouseEvent): LocationMessage | undefined {
  const center = view()
  const target = event.target
  if (!center) {
    if (provider?.id === "google") console.debug("[MapLink][Google] center/zoom unavailable", location.href)
    return
  }
  if (!(target instanceof Element)) return
  if (target.closest('button, a, input, [role="button"], .leaflet-control')) return
  const surface = provider?.id === "osm" ? target.closest("#map")
    : provider?.id === "mapillary" || provider?.id === "ndamaps" ? target.closest("canvas.maplibregl-canvas")
    : target.closest('[role="application"]')
  // Google replaces canvases and puts non-canvas interaction layers above them.
  if (!surface || (provider?.id === "google" && !surface.querySelector("canvas"))) {
    if (provider?.id === "google") console.debug("[MapLink][Google] not a map surface", target.tagName)
    return
  }
  const r = surface.getBoundingClientRect()
  if (!r.width || !r.height) return
  // Web Mercator in CSS pixels. Capture before the site's double-click zoom.
  const size = (provider?.id === "mapillary" || provider?.id === "ndamaps" ? 512 : 256) * 2 ** center.zoom
  const sin = Math.sin(center.lat * Math.PI / 180)
  const x = (center.lon + 180) / 360 * size + event.clientX - r.left - r.width / 2
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size + event.clientY - r.top - r.height / 2
  return { type: "LOCATION", lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * y / size))) * 180 / Math.PI, lon: ((x / size * 360) % 360 + 360) % 360 - 180, zoom: center.zoom }
}
function navigateVMaps(p: LocationMessage) {
  // The editor does not consume later hash changes: move its exposed live map.
  window.postMessage({ ...p, type: "MAPLINK_NAVIGATE" }, location.origin)
  try { window.parent.location.hash = `${Number(window.parent.location.hash.slice(1).split("/")[0]) || 18}/${p.lat}/${p.lon}/0.0/0` } catch {}
}
function navigateOSM(p: LocationMessage) { location.href = `https://www.openstreetmap.org/#map=${view()?.zoom ?? 18}/${p.lat.toFixed(7)}/${p.lon.toFixed(7)}` }
function navigateGoogle(p: LocationMessage) { location.href = `https://www.google.com/maps/@${p.lat},${p.lon},${view()?.zoom ?? 18}z` }
function navigateMapillary(p: LocationMessage) {
  const u = new URL(location.href)
  for (const key of ["pKey", "x", "y", "zoom"]) u.searchParams.delete(key)
  u.searchParams.set("lat", String(p.lat)); u.searchParams.set("lng", String(p.lon))
  u.searchParams.set("z", String(view()?.zoom ?? 18))
  location.href = u.href
}
function navigateNDA(p: LocationMessage) { location.href = `${location.origin}/#map=${view()?.zoom ?? 18}/${p.lat}/${p.lon}` }
function copyCoordinate(p: LocationMessage) {
  void navigator.clipboard.writeText(`${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`).then(
    () => console.debug("[MapLink] copied"), error => console.warn("[MapLink] clipboard failed", error))
}
function sendLocation(p: LocationMessage) {
  void send(p).then(result => { if (result) console.debug(`[MapLink][${provider?.name ?? "VMaps"}] LOCATION sent`) })
}
if (provider || vmapsFrame) {
  void send({ type: "STATUS" }).then(result => { if (result) showStatus(result.linked) })
  chrome.runtime.onMessage.addListener(message => {
    if (message.type === "LINKED") showStatus(message.linked)
    if (!linked || !validLocation(message)) return
    if (provider?.id === "waze") window.postMessage({ ...message, type: "MAPLINK_NAVIGATE" }, location.origin)
    else if (vmapsFrame) navigateVMaps(message)
    else if (provider?.id === "osm") navigateOSM(message)
    else if (provider?.id === "google") navigateGoogle(message)
    else if (provider?.id === "mapillary") navigateMapillary(message)
    else if (provider?.id === "ndamaps") navigateNDA(message)
  })
  window.addEventListener("message", event => {
    if (!bridged || event.source !== window || event.origin !== location.origin) return
    if (event.data?.type === "MAPLINK_READY") { showStatus(linked); return }
    if (!linked || event.data?.type !== "MAPLINK_CLICK") return
    const p: LocationMessage = { type: "LOCATION", lat: event.data.lat, lon: event.data.lon, zoom: event.data.zoom }
    if (validLocation(p)) sendLocation(p) // The page bridge already copied during the gesture.
  })
  // Installed once, before site handlers; look up state and surfaces on each click.
  window.addEventListener("dblclick", event => {
    if (!linked || !event.isTrusted || provider?.id === "vmaps" || bridged) return
    const p = getClickedCoordinate(event)
    if (!p || !validLocation(p)) return
    event.preventDefault(); event.stopImmediatePropagation()
    copyCoordinate(p)
    sendLocation(p)
  }, true)
  if (window === window.top) {
    const mount = () => {
      indicator = document.createElement("button")
      indicator.style.cssText = "position:fixed;top:8px;right:8px;z-index:2147483647;background:white;border:1px solid #bbb;border-radius:4px;padding:5px 8px;font:12px system-ui;cursor:pointer"
      indicator.onclick = async () => {
        const result = await send({ type: "SET_LINKED", linked: !linked })
        if (result) showStatus(result.linked)
      }
      document.body.appendChild(indicator)
      showStatus(linked)
    }
    if (document.body) mount()
    else document.addEventListener("DOMContentLoaded", mount, { once: true })
  }
}
