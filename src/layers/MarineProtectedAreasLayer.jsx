import { useEffect, useRef } from "react";
import { dynamicMapLayer } from "esri-leaflet";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { escapeHtml } from "../constants/localization.js";

const CAPAD_SERVICE =
  "https://gis.environment.gov.au/gispubmap/rest/services/ogc_services/CAPAD/MapServer";

const CAPAD_MARINE_LAYER_ID = 1;
const CAPAD_MARINE_QUERY_URL = `${CAPAD_SERVICE}/${CAPAD_MARINE_LAYER_ID}/query`;

export default function MarineProtectedAreasLayer({
  enabled,
  selectedState,
  opacity,
  t
}) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!enabled || !selectedState) return undefined;

    const where = `STATE = '${selectedState.replaceAll("'", "''")}'`;
    const layer = dynamicMapLayer({
      url: CAPAD_SERVICE,
      layers: [CAPAD_MARINE_LAYER_ID],
      layerDefs: {
        [CAPAD_MARINE_LAYER_ID]: where
      },
      format: "png32",
      transparent: true,
      opacity
    });

    layer.addTo(map);
    layerRef.current = layer;
    layer.setOpacity(opacity);
    layer.bringToFront();

    return () => {
      map.removeLayer(layer);
      if (layerRef.current === layer) layerRef.current = null;
    };
  }, [enabled, map, selectedState]);

  useEffect(() => {
    layerRef.current?.setOpacity(opacity);
  }, [opacity]);

  useEffect(() => {
    if (!enabled || !selectedState) return undefined;

    async function handleClick(event) {
      const where = `STATE = '${selectedState.replaceAll("'", "''")}'`;
      const params = new URLSearchParams({
        f: "json",
        where,
        geometry: JSON.stringify({
          x: event.latlng.lng,
          y: event.latlng.lat,
          spatialReference: { wkid: 4326 }
        }),
        geometryType: "esriGeometryPoint",
        inSR: "4326",
        spatialRel: "esriSpatialRelIntersects",
        returnGeometry: "false",
        outFields:
          "NAME,TYPE,IUCN,NRS_MPA,ZONE_TYPE,MGT_PLAN,AUTHORITY,COMMENTS,EPBC"
      });

      try {
        const response = await fetch(`${CAPAD_MARINE_QUERY_URL}?${params}`);
        const data = await response.json();
        const attributes = data.features?.[0]?.attributes;

        if (!attributes) return;

        L.popup({ maxWidth: 320 })
          .setLatLng(event.latlng)
          .setContent(renderProtectionPopup(attributes, t))
          .openOn(map);
      } catch {
        L.popup({ maxWidth: 280 })
          .setLatLng(event.latlng)
          .setContent(
            `<div class="text-sm text-slate-900">${escapeHtml(t("mpa.queryError"))}</div>`
          )
          .openOn(map);
      }
    }

    map.on("click", handleClick);

    return () => {
      map.off("click", handleClick);
    };
  }, [enabled, map, selectedState, t]);

  return null;
}

function renderProtectionPopup(attributes, t) {
  const fishingKey = fishingRestrictionKey(attributes);

  return `
    <div class="min-w-56 space-y-2 text-slate-900">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">${escapeHtml(t("mpa.title"))}</p>
        <p class="text-sm font-semibold">${escapeHtml(attributes.NAME ?? "Unnamed protected area")}</p>
      </div>
      <div class="space-y-1 text-xs text-slate-600">
        <p><strong>${escapeHtml(t("mpa.type"))}:</strong> ${escapeHtml(attributes.TYPE ?? t("notAvailable"))}</p>
        <p><strong>${escapeHtml(t("mpa.zone"))}:</strong> ${escapeHtml(attributes.COMMENTS ?? attributes.ZONE_TYPE ?? t("notAvailable"))}</p>
        <p><strong>IUCN:</strong> ${escapeHtml(attributes.IUCN ?? t("notAvailable"))} · <strong>${escapeHtml(t("mpa.authority"))}:</strong> ${escapeHtml(attributes.AUTHORITY ?? t("notAvailable"))}</p>
      </div>
      <div class="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-950">
        <p class="font-semibold">${escapeHtml(t("mpa.fishing"))}</p>
        <p>${escapeHtml(t(fishingKey))}</p>
      </div>
    </div>
  `;
}

function fishingRestrictionKey(attributes) {
  const text = `${attributes.TYPE ?? ""} ${attributes.ZONE_TYPE ?? ""} ${attributes.COMMENTS ?? ""} ${attributes.IUCN ?? ""}`.toLowerCase();

  if (text.includes("sanctuary") || attributes.IUCN === "Ia" || attributes.IUCN === "II") {
    return "fishing.sanctuary";
  }

  if (text.includes("habitat protection")) {
    return "fishing.habitat";
  }

  if (text.includes("special purpose")) {
    return "fishing.special";
  }

  if (text.includes("aquatic reserve")) {
    return "fishing.aquatic";
  }

  if (text.includes("general use") || attributes.IUCN === "VI") {
    return "fishing.general";
  }

  return "fishing.unknown";
}
