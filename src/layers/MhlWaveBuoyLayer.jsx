import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { Marker, Pane, Popup } from "react-leaflet";
import {fetchMhlBuoySnapshots} from "../services/mhlWaves.js";
import {formatMeters, formatSeconds, formatWindDirection, formatWindSpeed} from "../services/tides.js";
import WindParticleLayer from "./WindParticleLayer.jsx";
import { averageDirectionalReadings, oppositeBearing } from "../utils/mapVectors.js";

export default function MhlWaveBuoyLayer({ enabled, selectedBuoy, onSelectBuoy, t }) {
  const [buoys, setBuoys] = useState([]);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (!enabled) {
      setBuoys([]);
      setStatus("idle");
      return undefined;
    }

    let mounted = true;
    setStatus("loading");

    fetchMhlBuoySnapshots()
      .then((records) => {
        if (!mounted) return;
        setBuoys(records);
        setStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("error");
      });

    return () => {
      mounted = false;
    };
  }, [enabled]);

  const wind = useMemo(
    () => resolveParticleWind(buoys, selectedBuoy),
    [buoys, selectedBuoy]
  );

  if (!enabled) return null;

  return (
    <>
      <Pane name="mhl-wave-buoys" style={{ zIndex: 560 }}>
        {buoys.map((buoy) => (
          <Marker
            key={buoy.sitecode}
            position={[buoy.latitude, buoy.longitude]}
            icon={buoyIcon(buoy, selectedBuoy?.sitecode === buoy.sitecode)}
            eventHandlers={{
              click: () => onSelectBuoy?.(buoy)
            }}>
            <Popup className="mhl-buoy-popup" maxWidth={260}>
              <div className="min-w-[220px] font-sans text-ink-strong">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-primary">
                      {t("mhl.popupTitle")}
                    </p>
                    <p className="truncate text-base font-bold text-ink-strong">{buoy.name ?? buoy.sitecode}</p>
                  </div>
                  <span className="rounded-full bg-steel/10 px-2 py-1 text-[10px] font-medium text-ink">{buoy.sitecode}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <PopupMetric label={t("tide.waveHeight")} value={formatMeters(buoy.waveHeight, t)}/>
                  <PopupMetric label={t("tide.wavePeriod")} value={formatSeconds(buoy.wavePeriod, t)}/>
                  <PopupMetric label={t("mhl.waveDirection")} value={formatWindDirection(buoy.waveDirection, t)}/>
                </div>
                <p className="mt-3 text-[10px] text-steel">
                  {t("mhl.observationSource")}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </Pane>
      <WindParticleLayer
        enabled={enabled && status === "ready"}
        direction={wind.direction}
        speed={wind.speed}/>
      {status === "error" && (
        <div className="pointer-events-none absolute right-4 top-24 z-[650] rounded-lg border border-coral/40 bg-surface px-3 py-2 text-xs text-[#8B4538] shadow-marine">
          {t("mhl.loadError")}
        </div>
      )}
    </>
  );
}

function PopupMetric({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg bg-aqua-soft/40 px-2 py-2 text-center">
      <p className="truncate text-[10px] font-medium text-steel">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-ink">{value}</p>
    </div>
  );
}

function buoyIcon(buoy, selected) {
  const rotation = Number.isFinite(buoy.waveDirection)
    ? oppositeBearing(buoy.waveDirection)
    : 0;
  const height = Number.isFinite(buoy.waveHeight) ? buoy.waveHeight.toFixed(1) : "--";
  const risk = waveRiskClass(buoy.waveHeight);
  return L.divIcon({
    className: "mhl-buoy-icon",
    html: `
      <button type="button" class="mhl-buoy-button ${risk} ${selected ? "is-selected" : ""}" aria-label="${buoy.name ?? buoy.sitecode}">
        <span class="mhl-buoy-status" aria-hidden="true"></span>
        <span class="mhl-buoy-copy">
          <span class="mhl-buoy-code">${buoy.sitecode.replace("OW", "")}</span>
          <span class="mhl-buoy-height">${height}m</span>
        </span>
        <span class="mhl-buoy-arrow" style="transform: rotate(${rotation}deg)">&#8593;</span>
      </button>
    `,
    iconSize: [76, 38],
    iconAnchor: [38, 19],
    popupAnchor: [0, -26]
  });
}

function waveRiskClass(height) {
  if (!Number.isFinite(height)) return "is-unknown";
  if (height >= 2.5) return "is-danger";
  if (height >= 1.5) return "is-warning";
  if (height >= 1) return "is-caution";
  return "is-calm";
}

function resolveParticleWind(buoys, selectedBuoy) {
  const selected = buoys.find((buoy) => buoy.sitecode === selectedBuoy?.sitecode);

  if (selected && Number.isFinite(selected.windDirection)) {
    return {
      direction: oppositeBearing(selected.windDirection),
      speed: Number.isFinite(selected.windSpeed) ? selected.windSpeed : null
    };
  }

  const average = averageDirectionalReadings(
    buoys.map((buoy) => ({
      direction: buoy.windDirection,
      speed: buoy.windSpeed
    }))
  );
  return {
    ...average,
    direction: Number.isFinite(average.direction)
      ? oppositeBearing(average.direction)
      : null
  };
}
