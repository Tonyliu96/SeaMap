import { useEffect, useRef } from "react";
import { dynamicMapLayer } from "esri-leaflet";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { escapeHtml } from "../constants/localization.js";
import nswAquaticReserves from "../../public/data/Nsw_aquatic_reserves.json";

const CAPAD_SERVICE =
  "https://gis.environment.gov.au/gispubmap/rest/services/ogc_services/CAPAD/MapServer";

const CAPAD_MARINE_LAYER_ID = 1;
const CAPAD_MARINE_QUERY_URL = `${CAPAD_SERVICE}/${CAPAD_MARINE_LAYER_ID}/query`;
const MARINE_PARK_RULES_URL =
  "https://www.dpird.nsw.gov.au/fishing/marine-protected-areas/marine-parks/solitary-islands-marine-park/park-management/zones,-regulations-and-permits";

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
      dynamicLayers: protectedAreaDynamicLayers(where),
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
  const fishing = protectionFishingInfo(attributes, t);
  const zone = attributes.COMMENTS ?? attributes.ZONE_TYPE ?? t("notAvailable");

  return `
    <div class="min-w-56 space-y-2 text-slate-900">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">${escapeHtml(t("mpa.title"))}</p>
        <p class="text-sm font-semibold">${escapeHtml(attributes.NAME ?? "Unnamed protected area")}</p>
      </div>
      <div class="space-y-1 text-xs text-slate-600">
        <p><strong>${escapeHtml(t("mpa.zone"))}:</strong> ${escapeHtml(zone)}</p>
        <p><strong>${escapeHtml(t("mpa.authority"))}:</strong> ${escapeHtml(attributes.AUTHORITY ?? t("notAvailable"))}</p>
      </div>
      <div class="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-950">
        <p class="font-semibold">${escapeHtml(t("mpa.fishing"))}</p>
        ${fishing.html}
      </div>
    </div>
  `;
}

function protectionFishingInfo(attributes, t) {
  if (isMarinePark(attributes)) {
    return {
      html: `
        <p>${escapeHtml(t("fishing.marineParkLink"))}</p>
        ${officialLinkHtml(MARINE_PARK_RULES_URL, t)}
      `
    };
  }

  if (isAquaticReserve(attributes)) {
    const reserve = findAquaticReserve(attributes);
    const whatCanIDo = simplifyWhatCanIDo(reserve);

    return {
      html: `
        <p>${escapeHtml(whatCanIDo || t("fishing.aquaticMissing"))}</p>
        ${reserve?.sourceUrl ? officialLinkHtml(reserve.sourceUrl, t) : ""}
      `
    };
  }

  return {
    html: `<p>${escapeHtml(t(fishingRestrictionKey(attributes)))}</p>`
  };
}

function isMarinePark(attributes) {
  return `${attributes.TYPE ?? ""} ${attributes.NRS_MPA ?? ""}`
    .toLowerCase()
    .includes("marine park");
}

function protectedAreaDynamicLayers(where) {
  return [
    {
      id: CAPAD_MARINE_LAYER_ID,
      source: {
        type: "mapLayer",
        mapLayerId: CAPAD_MARINE_LAYER_ID
      },
      definitionExpression: where,
      drawingInfo: {
        renderer: {
          type: "uniqueValue",
          field1: "TYPE",
          defaultSymbol: fillSymbol([52, 211, 153, 82], [5, 150, 105, 210]),
          uniqueValueInfos: [
            {
              value: "Marine Park",
              label: "Marine Park",
              symbol: fillSymbol([255, 253, 156, 150], [217, 180, 24, 230])
            },
            {
              value: "Aquatic Reserve",
              label: "Aquatic Reserve",
              symbol: fillSymbol([103, 232, 249, 120], [8, 145, 178, 230])
            }
          ]
        }
      }
    }
  ];
}

function fillSymbol(fillColor, outlineColor) {
  return {
    type: "esriSFS",
    style: "esriSFSSolid",
    color: fillColor,
    outline: {
      type: "esriSLS",
      style: "esriSLSSolid",
      color: outlineColor,
      width: 1.5
    }
  };
}

function isAquaticReserve(attributes) {
  return `${attributes.TYPE ?? ""} ${attributes.ZONE_TYPE ?? ""} ${attributes.COMMENTS ?? ""}`
    .toLowerCase()
    .includes("aquatic reserve");
}

function findAquaticReserve(attributes) {
  const targets = [
    attributes.NAME,
    attributes.COMMENTS,
    attributes.ZONE_TYPE
  ]
    .map(normalizeName)
    .filter(Boolean);
  const reserves = getAquaticReserves();
  if (!targets.length || !reserves.length) return null;

  return reserves.find((reserve) => {
    const names = [
      reserve.name,
      reserve.capadNameHint,
      reserve.title,
      reserve.reserveName,
      reserve.aquaticReserve,
      reserve.NAME,
      reserve.Title
    ]
      .filter(Boolean)
      .map(normalizeName);

    return names.some((name) =>
      targets.some((target) =>
        name && target && (name.includes(target) || target.includes(name))
      )
    );
  });
}

function getAquaticReserves() {
  if (Array.isArray(nswAquaticReserves)) return nswAquaticReserves;
  if (Array.isArray(nswAquaticReserves?.aquaticReserves)) {
    return nswAquaticReserves.aquaticReserves;
  }
  return [];
}

function officialLinkHtml(url, t) {
  return `
    <a class="mt-2 inline-flex text-sky-700 underline decoration-sky-300 underline-offset-2" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(t("mpa.officialRules"))}</a>
  `;
}

function simplifyWhatCanIDo(reserve) {
  if (!reserve) return "";

  const value =
    reserve.whatCanIDo ??
    reserve.what_can_i_do ??
    reserve.whatCanYouDo ??
    reserve.WHAT_CAN_I_DO ??
    reserve.WhatCanIDo;

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : item?.text ?? item?.label))
      .filter(Boolean)
      .slice(0, 4)
      .join(" ");
  }

  if (typeof value === "object" && value !== null) {
    return Object.values(value)
      .flat()
      .map((item) => (typeof item === "string" ? item : item?.text ?? item?.label))
      .filter(Boolean)
      .slice(0, 4)
      .join(" ");
  }

  return typeof value === "string" ? value.trim() : "";
}

function normalizeName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\baquatic reserve\b/g, "")
    .replace(/\bmarine park\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
