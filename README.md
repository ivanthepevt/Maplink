## Run

```bash
npm install
npm run dev
```

In Chrome, open `chrome://extensions`, enable Developer mode, choose Load unpacked, and select `build/chrome-mv3-dev`. Reload existing map tabs after loading or reloading the extension. Requires Chrome 111+.

## Usage

1. Open any of VMaps, OSM, Google Maps, Mapillary, NDA Maps and Waze Map Editor in separate tabs.
2. Open MapLink popup on each desired tab.
3. Press Activate.
4. Double-click a location on one linked map to copy `LAT, LON` and sync it without native double-click zoom.
5. Other linked maps should navigate to the same coordinate.

Disconnect an individual tab in its popup or click the small MapLink indicator. Edit `maps.ts` to add/remove sites, then restart dev or rebuild; matches and host permissions are generated from that config. A new provider also needs its small coordinate/navigation functions in `content.ts`.

The popup lists linked map tabs, including OSM View/Edit. A double-click toast confirms clipboard status and the number of attempted recipients; it disappears after two seconds. Inbound moves do not copy coordinates or show a click toast.

v0.2

- Fixed Google Maps double-click sync after SPA/map rerenders
- Improved Google Maps Satellite mode reliability

v0.3

- Added Mapillary
- Added NDA Maps
- Added Waze Map Editor
- Double-click now copies coordinates
- MapLink-linked maps no longer perform native double-click zoom

v0.6

- Preserve OpenStreetMap View/Edit mode during synchronization
- Avoid disruptive OSM editor navigation
- Added coordinate/broadcast toast
- Added linked-map visibility in popup
- Added OSM View/Edit status

## Current limitations

- VMaps requires sign-in. Its embedded HD editor exposes MapLibre as `_m`; the tiny MAIN-world bridge depends on that API remaining available. Receiving a location resets bearing/pitch and preserves zoom.
- OSM and Google extraction uses URL center/zoom and Web Mercator viewport pixels. It is approximate while the URL lags a pan/zoom, with OSM's rounded low-zoom hash, or when Google shifts its visual center for a side panel. Google supports flat, north-up maps with an `@lat,lon,zoomz` or flat Satellite `@lat,lon,metersm` URL, not tilted/3D/Street View modes.
- OSM's iD editor uses a tiny MAIN-world hook into its context/map API to disable its pointer-up double-click zoom while linked. It depends on iD retaining that API. Inbound OSM moves change only the hash, preserving the editor, query and other hash options.
- Mapillary and NDA Maps use approximate Web Mercator conversion from their current URL and map canvas; use flat, north-up maps and allow URL state to settle after panning. Mapillary's street-level image viewer is excluded; incoming locations close the old image.
- Waze requires its official editor SDK to initialize. VMaps/Waze coordinates use their map APIs; single-click editing remains the website's responsibility.
- Double-click map backgrounds; UI controls and Google place overlays are ignored.
- Google, Mapillary and NDA navigation reload the page. A tab that is loading may miss an incoming location; double-click again once it is ready.
- Links last only for the browser session and require activation on each tab. There is no continuous pan or zoom synchronization.
