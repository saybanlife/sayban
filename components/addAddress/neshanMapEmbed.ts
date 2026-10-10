export const NESHAN_MAP_EMBED_CODE = `<link rel="stylesheet" href="https://static.neshan.org/sdk/leaflet/v1.9.4/neshan-sdk/v1.0.8/index.css"/>
<script src="https://static.neshan.org/sdk/leaflet/v1.9.4/neshan-sdk/v1.0.8/index.js"></script>
<style>
  html, body { height: 100%; margin: 0; }
  #map { width: 100%; height: 100%; background: #eee; }

  .map-btn {
    width: 34px; height: 34px; background: white; border: none;
    border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    cursor: pointer; display: flex; align-items: center;
    justify-content: center; font-size: 18px; color: #555;
  }
</style>

<div id="map"></div>

<script>
(function() {
  function initMap() {
    const mapContainer = document.getElementById("map");
    if (!mapContainer || typeof L === 'undefined') {
        setTimeout(initMap, 100);
        return;
    }

    const apiKey = 'web.ec9b9fb4e25047269e526203a883d463';

    window.locationIcon = L.divIcon({
      className: '',
      html: \`<svg width="32" height="32" viewBox="0 0 24 24" fill="#e53935"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>\`,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    window.map = new L.Map('map', {
      key: apiKey,
      maptype: 'dreamy',
      poi: true,
      traffic: false,
      zoomControl: false
    }).setView([35.6892, 51.389], 13);

    window.marker = null;

    window.map.on('click', e => {
      const { lat, lng } = e.latlng;
      window.selLat = lat;
      window.selLng = lng;

      if (!window.marker) {
        window.marker = L.marker(e.latlng, { icon: window.locationIcon }).addTo(window.map);
      } else {
        window.marker.setLatLng(e.latlng);
      }

      const clickEl = document.getElementById("click_location");
      if (clickEl) clickEl.click();
    });

    const LocationControl = L.Control.extend({
      options: { position: 'bottomright' },
      onAdd() {
        const btn = L.DomUtil.create('button', 'map-btn');
        btn.innerHTML = \`<svg viewBox="0 0 24 24" width="20" fill="#545454"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>\`;
        L.DomEvent.on(btn, 'click', e => {
          L.DomEvent.stop(e);
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
              const latlng = [pos.coords.latitude, pos.coords.longitude];
              window.map.setView(latlng, 15);
              window.selLat = latlng[0];
              window.selLng = latlng[1];
              if (!window.marker) {
                window.marker = L.marker(latlng, { icon: window.locationIcon }).addTo(window.map);
              } else {
                window.marker.setLatLng(latlng);
              }
              if (document.getElementById("click_location")) {
                document.getElementById("click_location").click();
              }
            });
          }
        });
        return btn;
      }
    });

    const ZoomControl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd(map) {
        const container = L.DomUtil.create('div');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '8px';
        const zIn = L.DomUtil.create('button', 'map-btn', container);
        zIn.innerHTML = '+';
        L.DomEvent.on(zIn, 'click', e => { L.DomEvent.stop(e); map.zoomIn(); });
        const zOut = L.DomUtil.create('button', 'map-btn', container);
        zOut.innerHTML = '−';
        L.DomEvent.on(zOut, 'click', e => { L.DomEvent.stop(e); map.zoomOut(); });
        return container;
      }
    });

    window.map.addControl(new LocationControl());
    window.map.addControl(new ZoomControl());

    setTimeout(() => { window.map.invalidateSize(); }, 500);
  }

  if (document.readyState === 'complete') initMap();
  else window.addEventListener('load', initMap);

  window.goToLocation = function(lat, lng, zoom = 15) {
    if (!window.map || isNaN(lat) || isNaN(lng)) return;
    const latlng = [parseFloat(lat), parseFloat(lng)];
    window.map.flyTo(latlng, zoom);
    window.selLat = latlng[0];
    window.selLng = latlng[1];
    if (!window.marker) {
      window.marker = L.marker(latlng, { icon: window.locationIcon }).addTo(window.map);
    } else {
      window.marker.setLatLng(latlng);
    }
  };
})();
</script>`;

export function getNeshanPreviewSrc(lat?: string, lon?: string) {
  if (!lat || !lon) return undefined;
  // Prefer official maps.neshan.org @lat,lng embed (same order as Leaflet).
  return `https://maps.neshan.org/@${lat},${lon},16.0z,0.0p`;
}
