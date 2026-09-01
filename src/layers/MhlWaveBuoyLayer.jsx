import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { Marker, Pane, Popup } from "react-leaflet";
import {fetchMhlBuoySnapshots} from "../services/mhlWaves.js";
import {formatMeters, formatSeconds, formatWindDirection, formatWindSpeed} from "../services/tides.js";
import WindParticleLayer from "./WindParticleLayer.jsx";
import { averageDirectionalReadings } from "../utils/mapVectors.js";

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
            <Popup maxWidth={280}>
              <div className="space-y-2 text-slate-900">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">
                    {t("mhl.popupTitle")}
                  </p>
                  <p className="text-sm font-semibold">{buoy.name ?? buoy.sitecode}</p>
                  <p className="text-xs text-slate-500">{buoy.sitecode}</p>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-700">
                  <span>{t("tide.waveHeight")}</span>
                  <strong>{formatMeters(buoy.waveHeight, t)}</strong>
                  <span>{t("tide.wavePeriod")}</span>
                  <strong>{formatSeconds(buoy.wavePeriod, t)}</strong>
                  <span>{t("mhl.waveDirection")}</span>
                  <strong>{formatWindDirection(buoy.waveDirection, t)}</strong>
                  <span>{t("tide.windSpeed")}</span>
                  <strong>{formatWindSpeed(buoy.windSpeed, t)}</strong>
                  <span>{t("tide.windDirection")}</span>
                  <strong>{formatWindDirection(buoy.windDirection, t)}</strong>
                  <span>{t("mhl.windSource")}</span>
                  <strong>{t("mhl.windModel")}</strong>
                </div>
                <p className="text-[11px] leading-4 text-slate-500">
                  {t("mhl.clickHint")}
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
        <div className="pointer-events-none absolute right-4 top-24 z-[650] rounded-lg border border-rose-300/30 bg-slate-900/85 px-3 py-2 text-xs text-rose-100 shadow-marine backdrop-blur-md">
          {t("mhl.loadError")}
        </div>
      )}
    </>
  );
}

function buoyIcon(buoy, selected) {
  const rotation = Number.isFinite(buoy.waveDirection) ? buoy.waveDirection : 0;
  const height = Number.isFinite(buoy.waveHeight) ? buoy.waveHeight.toFixed(1) : "--";
  return L.divIcon({
    className: "mhl-buoy-icon",
    html: `
      <button type="button" class="mhl-buoy-button ${selected ? "is-selected" : ""}" aria-label="${buoy.name ?? buoy.sitecode}">
        <span class="mhl-buoy-arrow" style="transform: rotate(${rotation}deg)">&#8593;</span>
        <span class="mhl-buoy-code">${buoy.sitecode.replace("OW", "")}</span>
        <span class="mhl-buoy-height">${height}m</span>
      </button>
    `,
    iconSize: [72, 72],
    iconAnchor: [36, 36],
    popupAnchor: [0, -44]
  });
}

function resolveParticleWind(buoys, selectedBuoy) {
  const selected = buoys.find((buoy) => buoy.sitecode === selectedBuoy?.sitecode);

  if (selected && Number.isFinite(selected.windDirection)) {
    return {
      direction: selected.windDirection,
      speed: Number.isFinite(selected.windSpeed) ? selected.windSpeed : null
    };
  }

  return averageDirectionalReadings(
    buoys.map((buoy) => ({
      direction: buoy.windDirection,
      speed: buoy.windSpeed
    }))
  );
}
