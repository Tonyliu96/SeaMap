import { useEffect, useMemo, useRef, useState } from "react";
import {
  GeoJSON,
  MapContainer,
  Pane,
  TileLayer,
  ZoomControl,
  useMapEvents
} from "react-leaflet";
import L from "leaflet";
import MarineProtectedAreasLayer from "./MarineProtectedAreasLayer.jsx";
import SeedBathymetryLayer from "./SeedBathymetryLayer.jsx";
import { loadNswLidarCoverage } from "../data/nswLidar.js";
import {
  formatMeters,
  formatSeconds,
  formatTideTime,
  formatWindDirection,
  formatWindSpeed,
  groupThreeDayTideEvents
} from "../data/tides.js";

const baseLayers = {
  streets: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxNativeZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    maxNativeZoom: 19,
    attribution:
      "Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community"
  }
};

export default function MarineMap({
  baseMap,
  lidarEnabled,
  bathymetryEnabled,
  showBathymetryDem,
  showIsobaths,
  showSlope,
  bathymetryOpacity,
  marineProtectedEnabled,
  marineProtectedOpacity,
  selectedRegion,
  selectedTideInfo,
  setSelectedTideInfo,
  onTidePointQuery
}) {
  const [cursor, setCursor] = useState({
    lat: -33.8688,
    lng: 151.2093,
    zoom: 12
  });
  const [lidarCoverage, setLidarCoverage] = useState(null);
  const [lidarStatus, setLidarStatus] = useState("loading");

  useEffect(() => {
    let mounted = true;

    loadNswLidarCoverage()
      .then((data) => {
        if (!mounted) return;
        setLidarCoverage(data);
        setLidarStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setLidarStatus("error");
      });

    return () => {
      mounted = false;
    };
  }, []);

  const activeBase = baseLayers[baseMap] ?? baseLayers.streets;

  return (
    <MapContainer
      center={[-33.86, 151.25]}
      zoom={12}
      minZoom={7}
      maxZoom={28}
      scrollWheelZoom
      doubleClickZoom
      touchZoom
      zoomControl={false}
      className="h-full w-full"
    >
      <ZoomControl position="topright" />

      <TileLayer
        key={baseMap}
        url={activeBase.url}
        attribution={activeBase.attribution}
        maxNativeZoom={activeBase.maxNativeZoom}
        maxZoom={28}
      />

      <SeedBathymetryLayer
        enabled={bathymetryEnabled}
        showDem={showBathymetryDem}
        showIsobaths={showIsobaths}
        showSlope={showSlope}
        opacity={bathymetryOpacity}
        selectedState={selectedRegion}
        onMove={setCursor}
      />

      <MarineProtectedAreasLayer
        enabled={marineProtectedEnabled}
        selectedState={selectedRegion}
        opacity={marineProtectedOpacity}
        onMove={setCursor}
      />

      <Pane name="nsw-lidar-coverage" style={{ zIndex: 440 }}>
        {lidarEnabled && lidarCoverage && (
          <>
            <GeoJSON
              key="nsw-lidar-coverage"
              data={lidarCoverage}
              style={(feature) => lidarStyle(feature)}
              interactive={false}
            />
          </>
        )}
      </Pane>

      <MapTelemetry onCursor={setCursor} />
      <MapTideQuery onTidePointQuery={onTidePointQuery} />
      <SelectedTidePopup
        selectedTideInfo={selectedTideInfo}
        setSelectedTideInfo={setSelectedTideInfo}
      />

      <div className="absolute bottom-4 right-4 z-[650] rounded-lg border border-white/15 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 shadow-marine backdrop-blur-md">
        <div>Lat {cursor.lat.toFixed(5)}</div>
        <div>Lng {cursor.lng.toFixed(5)}</div>
        <div>Zoom {cursor.zoom}</div>
        <div>
          LiDAR{" "}
          {lidarStatus === "ready"
            ? `${lidarCoverage?.features?.length ?? 0} polygons`
            : lidarStatus}
        </div>
      </div>
    </MapContainer>
  );
}

function MapTideQuery({ onTidePointQuery }) {
  useMapEvents({
    contextmenu(event) {
      onTidePointQuery?.({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
        source: "Selected location"
      });
    }
  });

  return null;
}

function SelectedTidePopup({ selectedTideInfo, setSelectedTideInfo }) {
  const map = useMapEvents({});
  const popupRef = useRef(null);

  useEffect(() => {
    if (!selectedTideInfo?.coordinate) return;

    const latlng = L.latLng(
      selectedTideInfo.coordinate.lat,
      selectedTideInfo.coordinate.lng
    );

    const popup = L.popup({ maxWidth: 340 })
      .setLatLng(latlng)
      .setContent(renderTidePopup(selectedTideInfo))
      .openOn(map);

    popup.on("remove", () => {
      setSelectedTideInfo?.(null);
    });
    popupRef.current = popup;

    return () => {
      popup.off("remove");
      if (popupRef.current === popup) popupRef.current = null;
    };
  }, [map, selectedTideInfo, setSelectedTideInfo]);

  return null;
}

function renderTidePopup(selectedTideInfo) {
  const coordinate = selectedTideInfo.coordinate;

  if (selectedTideInfo.status === "loading") {
    return `
      <div class="min-w-60 text-slate-900">
        <p class="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">Tide / Marine</p>
        <p class="mt-2 text-sm">Loading tide and marine conditions for this location...</p>
        <p class="mt-1 text-xs text-slate-500">${coordinate.lat.toFixed(5)}, ${coordinate.lng.toFixed(5)}</p>
      </div>
    `;
  }

  if (selectedTideInfo.status === "error" || !selectedTideInfo.info) {
    return `
      <div class="min-w-60 text-slate-900">
        <p class="text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">Tide / Marine</p>
        <p class="mt-2 text-sm">Unable to load tide and marine conditions for this location.</p>
        <p class="mt-1 text-xs text-slate-500">${coordinate.lat.toFixed(5)}, ${coordinate.lng.toFixed(5)}</p>
      </div>
    `;
  }

  const info = selectedTideInfo.info;
  const groups = groupThreeDayTideEvents(info);
  const rows = groups
    .map(
      (group) => `
        <div class="mt-2">
          <p class="text-[11px] font-semibold text-sky-700">${group.label}</p>
          ${group.events
            .map(
              (event) => `
                <div class="grid grid-cols-[48px_1fr_auto] gap-2 text-xs text-slate-700">
                  <span>${event.kind === "high" ? "High" : "Low"}</span>
                  <span>${formatTideTime(event.time)}</span>
                  <strong>${formatMeters(event.height)}</strong>
                </div>
              `
            )
            .join("")}
        </div>
      `
    )
    .join("");

  return `
    <div class="min-w-64 max-h-[500px] space-y-2 overflow-y-auto pr-1 text-slate-900 [scrollbar-color:rgba(2,132,199,0.6)_rgba(226,232,240,0.8)] [scrollbar-width:thin]">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">Tide / Marine</p>
        <p class="text-sm font-semibold">Selected Location Tide</p>
        <p class="text-xs text-slate-500">${coordinate.lat.toFixed(5)}, ${coordinate.lng.toFixed(5)}</p>
      </div>
      <div class="rounded-md border border-sky-100 bg-sky-50 px-3 py-2">
        <p class="text-xs font-semibold text-slate-700">Next Three Days</p>
        <div class="mt-1 max-h-[120px] overflow-y-auto pr-1 [scrollbar-color:rgba(2,132,199,0.55)_rgba(226,232,240,0.75)] [scrollbar-width:thin]">
          ${rows || '<p class="text-xs text-slate-500">N/A</p>'}
        </div>
      </div>
      <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-700">
        <span>Sea level</span><strong>${formatMeters(info.currentSeaLevel)}</strong>
        <span>Wave height</span><strong>${formatMeters(info.waveHeight)}</strong>
        <span>Wave period</span><strong>${formatSeconds(info.wavePeriod)}</strong>
        <span>Wind speed</span><strong>${formatWindSpeed(info.windSpeed)}</strong>
        <span>Wind direction</span><strong>${formatWindDirection(info.windDirection)}</strong>
      </div>
      <p class="text-[11px] leading-4 text-slate-500">Tide values are modelled and may be inaccurate nearshore or inside harbours. Do not use for navigation or safety decisions.</p>
    </div>
  `;
}

function lidarStyle(feature) {
  const zone = Number(feature?.properties?.ZONE ?? 0);
  const evenZone = zone % 2 === 0;

  return {
    color: evenZone ? "#22d3ee" : "#38bdf8",
    weight: 1.4,
    opacity: 0.82,
    fillColor: evenZone ? "#0891b2" : "#0284c7",
    fillOpacity: 0.08
  };
}

function MapTelemetry({ onCursor }) {
  const map = useMapEvents({
    mousemove(event) {
      onCursor({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
        zoom: map.getZoom()
      });
    },
    zoomend() {
      const center = map.getCenter();
      onCursor({
        lat: center.lat,
        lng: center.lng,
        zoom: map.getZoom()
      });
    }
  });

  return null;
}
