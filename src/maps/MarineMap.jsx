import { useEffect, useMemo, useRef, useState } from "react";
import {GeoJSON, MapContainer, Pane, TileLayer, ZoomControl, useMap, useMapEvents} from "react-leaflet";
import L from "leaflet";
import AhoDepthLayer from "../layers/AhoDepthLayer.jsx";
import BathymetryDemLayer from "../layers/BathymetryDemLayer.jsx";
import IsobathLayer from "../layers/IsobathLayer.jsx";
import MarineProtectedAreasLayer from "../layers/MarineProtectedAreasLayer.jsx";
import MhlWaveBuoyLayer from "../layers/MhlWaveBuoyLayer.jsx";
import MarineForecastStationsLayer from "../layers/MarineForecastStationsLayer.jsx";
import { loadNswLidarCoverage } from "../services/nswLidar.js";
import { escapeHtml } from "../constants/localization.js";
import {formatMeters, formatSeconds, formatTideTime, formatWindDirection, formatWindSpeed, groupThreeDayTideEvents} from "../services/tides.js";

const baseLayers = {
  streets: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxNativeZoom: 19,
    subdomains: "abc",
    attribution:
      "&copy; OpenStreetMap contributors"
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    maxNativeZoom: 18,
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
  showAhoDepths,
  bathymetryOpacity,
  marineProtectedEnabled,
  marineProtectedOpacity,
  selectedRegion,
  selectedMhlBuoy,
  setSelectedMhlBuoy,
  selectedTideInfo,
  setSelectedTideInfo,
  onTidePointQuery,
  marineForecastEnabled,
  marineForecastLocations,
  selectedMarineLocation,
  onSelectMarineLocation,
  onMarineMapPoint,
  t
}) {
  const [cursor, setCursor] = useState({
    lat: -33.8688,
    lng: 151.2093,
    zoom: 12
  });
  const [lidarCoverage, setLidarCoverage] = useState(null);
  const [lidarStatus, setLidarStatus] = useState("idle");

  useEffect(() => {
    if (!lidarEnabled || selectedRegion !== "NSW" || lidarCoverage) return undefined;

    const controller = new AbortController();
    let mounted = true;
    setLidarStatus("loading");

    loadNswLidarCoverage({ signal: controller.signal })
      .then((data) => {
        if (!mounted) return;
        setLidarCoverage(data);
        setLidarStatus("ready");
      })
      .catch((error) => {
        if (!mounted) return;
        if (error?.name === "AbortError") return;
        setLidarStatus("error");
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [lidarEnabled, selectedRegion, lidarCoverage]);

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
      className="h-full w-full">
      <ZoomControl position="topright" />
      <CollapsibleAttribution />

      <TileLayer
        key={baseMap}
        className={baseMap === "streets" ? "soft-base-tile" : ""}
        url={activeBase.url}
        attribution={activeBase.attribution}
        maxNativeZoom={activeBase.maxNativeZoom}
        subdomains={activeBase.subdomains ?? "abc"}
        maxZoom={28}/>

      <BathymetryDemLayer
        enabled={bathymetryEnabled && showBathymetryDem}
        opacity={bathymetryOpacity}
        selectedState={selectedRegion}/>

      <IsobathLayer
        enabled={bathymetryEnabled && showIsobaths && selectedRegion === "NSW"}
        opacity={bathymetryOpacity}/>

      <AhoDepthLayer
        enabled={bathymetryEnabled && showAhoDepths}
        opacity={bathymetryOpacity}
        selectedState={selectedRegion}/>

      <MarineProtectedAreasLayer
        enabled={marineProtectedEnabled}
        selectedState={selectedRegion}
        opacity={marineProtectedOpacity}
        t={t}/>

      <MhlWaveBuoyLayer
        enabled={selectedRegion === "NSW"}
        selectedBuoy={selectedMhlBuoy}
        onSelectBuoy={setSelectedMhlBuoy}
        t={t}/>

      <MarineForecastStationsLayer
        enabled={marineForecastEnabled}
        locations={marineForecastLocations}
        selectedLocation={selectedMarineLocation}
        onSelectLocation={onSelectMarineLocation}
        onMapPoint={onMarineMapPoint}
        t={t}/>

      <Pane name="nsw-lidar-coverage" style={{ zIndex: 440 }}>
        {lidarEnabled && lidarCoverage && (
          <>
            <GeoJSON
              key="nsw-lidar-coverage"
              data={lidarCoverage}
              style={(feature) => lidarStyle(feature)}
              interactive={false}/>
          </>
        )}
      </Pane>

      <MapTelemetry onCursor={setCursor} />
      <MapTideQuery onTidePointQuery={onTidePointQuery} />
      <SelectedTidePopup
        selectedTideInfo={selectedTideInfo}
        setSelectedTideInfo={setSelectedTideInfo}
        t={t}/>

      <div className="absolute bottom-4 right-4 z-[650] rounded-xl border border-aqua-soft/70 bg-surface/90 px-3 py-2 text-[11px] text-ink-strong shadow-marine backdrop-blur-md dark:border-white/10 dark:bg-dark-surface/90 dark:text-dark-ink">
        <div className="grid grid-cols-[38px_1fr] gap-x-2 tabular-nums"><span className="text-steel">{t("telemetry.lat")}</span><span>{cursor.lat.toFixed(5)}</span></div>
        <div className="grid grid-cols-[38px_1fr] gap-x-2 tabular-nums"><span className="text-steel">{t("telemetry.lng")}</span><span>{cursor.lng.toFixed(5)}</span></div>
        <div className="grid grid-cols-[38px_1fr] gap-x-2 tabular-nums"><span className="text-steel">{t("telemetry.zoom")}</span><span>{cursor.zoom}</span></div>
        <div className="mt-1 max-w-[210px] truncate text-steel">{t("telemetry.lidar")}{" "}{!lidarEnabled
            ? t("telemetry.off")
            : lidarStatus === "ready"
              ? `${lidarCoverage?.features?.length ?? 0} ${t("telemetry.polygons")}`
              : t(`telemetry.${lidarStatus}`)}
        </div>
      </div>
    </MapContainer>
  );
}

function CollapsibleAttribution() {
  const map = useMap();

  useEffect(() => {
    const attribution = map.attributionControl?._container;
    if (!attribution) return undefined;

    const setExpanded = (expanded) => {
      attribution.classList.toggle("is-expanded", expanded);
      attribution.classList.toggle("is-collapsed", !expanded);
      attribution.setAttribute("aria-expanded", String(expanded));
    };

    attribution.classList.add("marine-attribution", "is-collapsed");
    attribution.setAttribute("role", "button");
    attribution.setAttribute("tabindex", "0");
    attribution.setAttribute("aria-label", "Map attribution");
    attribution.setAttribute("aria-expanded", "false");

    const onClick = (event) => {
      event.stopPropagation();
      setExpanded(!attribution.classList.contains("is-expanded"));
    };
    const onKeyDown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setExpanded(!attribution.classList.contains("is-expanded"));
      }
      if (event.key === "Escape") {
        setExpanded(false);
      }
    };

    attribution.addEventListener("click", onClick);
    attribution.addEventListener("keydown", onKeyDown);

    return () => {
      attribution.removeEventListener("click", onClick);
      attribution.removeEventListener("keydown", onKeyDown);
      attribution.classList.remove("marine-attribution", "is-collapsed", "is-expanded");
      attribution.removeAttribute("role");
      attribution.removeAttribute("tabindex");
      attribution.removeAttribute("aria-label");
      attribution.removeAttribute("aria-expanded");
    };
  }, [map]);

  return null;
}

function MapTideQuery({ onTidePointQuery }) {
  useMapEvents({
    contextmenu(event) {
      onTidePointQuery?.({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
        sourceKey: "map.selectedLocation"
      });
    }
  });

  return null;
}

function SelectedTidePopup({ selectedTideInfo, setSelectedTideInfo, t }) {
  const map = useMapEvents({});
  const popupRef = useRef(null);

  useEffect(() => {
    if (!selectedTideInfo?.coordinate) return;

    const latlng = L.latLng(
      selectedTideInfo.coordinate.lat,
      selectedTideInfo.coordinate.lng
    );

    const popup = L.popup({ className: "selected-tide-popup", maxWidth: 330 })
      .setLatLng(latlng)
      .setContent(renderTidePopup(selectedTideInfo, t))
      .openOn(map);

    popup.on("remove", () => {
      setSelectedTideInfo?.(null);
    });
    popupRef.current = popup;

    return () => {
      popup.off("remove");
      if (popupRef.current === popup) popupRef.current = null;
    };
  }, [map, selectedTideInfo, setSelectedTideInfo, t]);

  return null;
}

function renderTidePopup(selectedTideInfo, t) {
  const coordinate = selectedTideInfo.coordinate;

  if (selectedTideInfo.status === "loading") {
    return `
      <div class="tide-map-popup is-loading">
        <p class="tide-map-popup__eyebrow">${escapeHtml(t("section.tide"))}</p>
        <p class="tide-map-popup__title">${escapeHtml(t("tide.loadingLocation"))}</p>
        <p class="tide-map-popup__coordinate">${coordinate.lat.toFixed(5)}, ${coordinate.lng.toFixed(5)}</p>
      </div>
    `;
  }

  if (selectedTideInfo.status === "error" || !selectedTideInfo.info) {
    return `
      <div class="tide-map-popup is-error">
        <p class="tide-map-popup__eyebrow">${escapeHtml(t("section.tide"))}</p>
        <p class="tide-map-popup__title">${escapeHtml(t("tide.errorLocation"))}</p>
        <p class="tide-map-popup__coordinate">${coordinate.lat.toFixed(5)}, ${coordinate.lng.toFixed(5)}</p>
      </div>`;}

  const info = selectedTideInfo.info;
  const groups = groupThreeDayTideEvents(info);
  const rows = groups
    .map(
      (group) => `
        <div class="tide-map-popup__day">
          <p>${group.label}</p>
          ${group.events
            .map(
              (event) => `
                <div class="tide-map-popup__event">
                  <span class="${event.kind === "high" ? "is-high" : "is-low"}">${escapeHtml(event.kind === "high" ? t("tide.high") : t("tide.low"))}</span>
                  <span>${formatTideTime(event.time)}</span>
                  <strong>${formatMeters(event.height, t)}</strong>
                </div>`
            ).join("")}
        </div>`).join("");

  return `
    <div class="tide-map-popup">
      <div class="tide-map-popup__header">
        <div>
          <p class="tide-map-popup__eyebrow">${escapeHtml(t("section.tide"))}</p>
          <p class="tide-map-popup__title">${escapeHtml(t("tide.selectedTitle"))}</p>
        </div>
        <span class="tide-map-popup__location-dot"></span>
      </div>
      <p class="tide-map-popup__coordinate">${coordinate.lat.toFixed(5)}, ${coordinate.lng.toFixed(5)}</p>
      <div class="tide-map-popup__primary">
        <span>${escapeHtml(t("tide.seaLevel"))}</span>
        <strong>${formatMeters(info.currentSeaLevel, t)}</strong>
      </div>
      <div class="tide-map-popup__metrics">
        <div><span>${escapeHtml(t("tide.waveHeight"))}</span><strong>${formatMeters(info.waveHeight, t)}</strong></div>
        <div><span>${escapeHtml(t("tide.wavePeriod"))}</span><strong>${formatSeconds(info.wavePeriod, t)}</strong></div>
        <div><span>${escapeHtml(t("tide.windSpeed"))}</span><strong>${formatWindSpeed(info.windSpeed, t)}</strong></div>
        <div><span>${escapeHtml(t("tide.windDirection"))}</span><strong>${formatWindDirection(info.windDirection, t)}</strong></div>
      </div>
      <div class="tide-map-popup__forecast">
        <p class="tide-map-popup__section-title">${escapeHtml(t("tide.nextThreeDays"))}</p>
        <div class="tide-map-popup__days">
          ${rows || `<p class="text-xs text-slate-500">${escapeHtml(t("notAvailable"))}</p>`}
        </div>
      </div>
      ${info.wavePoint ? `
        <p class="tide-map-popup__source">
          ${escapeHtml(t("tide.nearshorePoint", {
            name: info.wavePoint.name ?? info.wavePoint.sitecode,
            id: info.wavePoint.sitecode ?? info.wavePoint.id,
            distance: info.wavePointDistanceKm?.toFixed(1) ?? t("notAvailable")
          }))}
        </p>` : ""}
      <p class="tide-map-popup__note">${escapeHtml(t("tide.popupNote"))}</p>
    </div>`;
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
