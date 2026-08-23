import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ExternalLink,
  Layers,
  Map,
  RefreshCw,
  Satellite,
  ShieldCheck,
  SlidersHorizontal,
  SquareStack,
  Waves
} from "lucide-react";
import { australiaStates } from "../data/australiaStates.js";
import { loadNswLidarCatalog } from "../data/nswLidar.js";
import {
  formatMeters,
  formatSeconds,
  formatTideTime,
  formatWindDirection,
  formatWindSpeed,
  getTodayTideEvents,
  groupThreeDayTideEvents
} from "../data/tides.js";

const baseMaps = [
  { id: "streets", label: "Streets / Terrain", icon: Map },
  { id: "satellite", label: "High-Resolution Satellite", icon: Satellite }
];

export default function Sidebar({
  baseMap,
  setBaseMap,
  isOpen,
  setIsOpen,
  lidarEnabled,
  setLidarEnabled,
  bathymetryEnabled,
  setBathymetryEnabled,
  showBathymetryDem,
  setShowBathymetryDem,
  showIsobaths,
  setShowIsobaths,
  showSlope,
  setShowSlope,
  bathymetryOpacity,
  setBathymetryOpacity,
  marineProtectedEnabled,
  setMarineProtectedEnabled,
  marineProtectedOpacity,
  setMarineProtectedOpacity,
  selectedRegion,
  setSelectedRegion,
  tideInfo,
  tideStatus,
  tideError,
  tideCoordinate,
  onRefreshTide
}) {
  const [lidarCatalog, setLidarCatalog] = useState([]);
  const [catalogStatus, setCatalogStatus] = useState("loading");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const isNswBathymetry = selectedRegion === "NSW";

  useEffect(() => {
    let mounted = true;

    loadNswLidarCatalog()
      .then((records) => {
        if (!mounted) return;
        setLidarCatalog(records);
        setCatalogStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setCatalogStatus("error");
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label={isOpen ? "Collapse control panel" : "Expand control panel"}
        className="absolute left-6 top-10 z-[720] hidden h-11 w-11 place-items-center rounded-lg border border-white/15 bg-slate-900/80 text-slate-100 shadow-marine backdrop-blur-md transition hover:bg-sky-900/70 md:grid"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex h-5 w-5 flex-col justify-between items-center">
          <span className="h-[2px] w-full rounded-full bg-current" />
          <span className={`w-3.5 rounded-[2px] bg-current transition-all duration-200 ${isOpen ? "h-2" : "h-1.5 opacity-60"}`} />
          <span className="h-[2px] w-full rounded-full bg-current" />
        </div>
      </button>

      <aside
        className={`absolute z-[710] overflow-hidden border border-white/15 bg-slate-900/80 shadow-marine backdrop-blur-md transition-all duration-300 ease-out md:bottom-4 md:left-6 md:top-24 md:w-[340px] md:rounded-lg ${isOpen
            ? "bottom-4 left-4 right-4 max-h-[calc(100dvh-7rem)] rounded-lg md:max-h-none md:translate-x-0"
            : "bottom-0 left-0 right-0 max-h-[76px] rounded-t-lg md:max-h-none md:-translate-x-[370px]"
          }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-cyan-400/15 text-cyan-300">
              <Layers size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">Layer Controls</h2>
              <p className="truncate text-xs text-slate-300">
                Base maps and NSW LiDAR coverage
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={isOpen ? "Collapse control panel" : "Expand control panel"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-200 transition hover:bg-white/10 md:hidden"
            onClick={() => setIsOpen(!isOpen)}
          >
            <ChevronDown
              size={20}
              className={`transition ${isOpen ? "rotate-0" : "rotate-180"}`}
            />
          </button>
        </div>

        <div
          className={`max-h-[calc(100dvh-11rem)] space-y-5 overflow-y-auto overscroll-contain px-4 py-4 md:max-h-[calc(100dvh-11rem)] ${isOpen ? "block" : "hidden md:block"
            }`}
        >
          <Section title="Base Maps" icon={Map}>
            <div className="grid grid-cols-2 gap-2">
              {baseMaps.map((item) => {
                const Icon = item.icon;
                const active = baseMap === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`flex min-h-16 flex-col items-start justify-between rounded-md border p-3 text-left text-sm transition ${active
                        ? "border-cyan-300/70 bg-sky-500/20 text-white"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    onClick={() => setBaseMap(item.id)}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="State / Territory" icon={Map}>
            <label className="block rounded-md border border-white/10 bg-white/5 p-3">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                Current Region
              </span>
              <select
                value={selectedRegion}
                onChange={(event) => setSelectedRegion(event.target.value)}
                className="h-10 w-full rounded-md border border-white/10 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300"
              >
                {australiaStates.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.code} - {state.label}
                  </option>
                ))}
              </select>
            </label>
          </Section>

          <Section title="SEED Bathymetry Layers" icon={Layers}>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-3">
              <span className="min-w-0">
                <span className="block text-sm text-slate-100">Show bathymetry data</span>
                <span className="block truncate text-xs text-slate-400">
                  {isNswBathymetry
                    ? "NSW SEED Marine LiDAR Bathymetry 2018"
                    : "AusSeabed AusBathyTopo Australia 250m 2026"}
                </span>
              </span>
              <input
                type="checkbox"
                className="peer sr-only"
                checked={bathymetryEnabled}
                onChange={(event) => setBathymetryEnabled(event.target.checked)}
              />
              <span className="relative h-6 w-11 shrink-0 rounded-full bg-slate-700 transition peer-checked:bg-sky-500">
                <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
              </span>
            </label>

            <div className={bathymetryEnabled ? "mt-3 space-y-2" : "mt-3 space-y-2 opacity-45"}>
              <LayerCheck
                label="Bathymetry DEM - metres"
                checked={showBathymetryDem}
                disabled={!bathymetryEnabled}
                onChange={setShowBathymetryDem}
              />
              <LayerCheck
                label="Isobaths at 5m depth intervals (NSW only)"
                checked={showIsobaths}
                disabled={!bathymetryEnabled || !isNswBathymetry}
                onChange={setShowIsobaths}
              />
              <LayerCheck
                label="Slope - degrees (NSW only)"
                checked={showSlope}
                disabled={!bathymetryEnabled || !isNswBathymetry}
                onChange={setShowSlope}
              />
              {!isNswBathymetry && (
                <p className="rounded-md border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs leading-5 text-cyan-100">
                  This region uses the AusSeabed national bathymetry raster. The 5m isobath and slope layers are available only from the NSW SEED service.
                </p>
              )}

              <div className="rounded-md border border-white/10 bg-white/5 p-3">
                <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-slate-100">
                    <SlidersHorizontal size={16} />
                    Opacity
                  </span>
                  <span className="font-medium text-emerald-200">
                    {bathymetryOpacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={bathymetryOpacity}
                  disabled={!bathymetryEnabled}
                  onInput={(event) =>
                    setBathymetryOpacity(Number(event.currentTarget.value))
                  }
                  onChange={(event) =>
                    setBathymetryOpacity(Number(event.target.value))
                  }
                  className="w-full accent-emerald-400"
                />
              </div>
            </div>
          </Section>

          <Section title="Marine Protected Areas" icon={ShieldCheck}>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-3">
              <span className="min-w-0">
                <span className="block text-sm text-slate-100">
                  Show marine protected areas
                </span>
                <span className="block truncate text-xs text-slate-400">
                  CAPAD 2024 Marine Protected Areas
                </span>
              </span>
              <input
                type="checkbox"
                className="peer sr-only"
                checked={marineProtectedEnabled}
                onChange={(event) =>
                  setMarineProtectedEnabled(event.target.checked)
                }
              />
              <span className="relative h-6 w-11 shrink-0 rounded-full bg-slate-700 transition peer-checked:bg-emerald-500">
                <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
              </span>
            </label>

            <div
              className={
                marineProtectedEnabled ? "mt-3 space-y-3" : "mt-3 space-y-3 opacity-45"
              }
            >
              <div className="rounded-md border border-white/10 bg-white/5 p-3">
                <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-slate-100">
                    <SlidersHorizontal size={16} />
                    Opacity
                  </span>
                  <span className="font-medium text-sky-200">
                    {marineProtectedOpacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={marineProtectedOpacity}
                  disabled={!marineProtectedEnabled}
                  onInput={(event) =>
                    setMarineProtectedOpacity(Number(event.currentTarget.value))
                  }
                  onChange={(event) =>
                    setMarineProtectedOpacity(Number(event.target.value))
                  }
                  className="w-full accent-sky-400"
                />
              </div>
            </div>
          </Section>

          <Section title="Tide / Marine" icon={Waves}>
            <TidePanel
              tideInfo={tideInfo}
              tideStatus={tideStatus}
              tideError={tideError}
              tideCoordinate={tideCoordinate}
              onRefreshTide={onRefreshTide}
            />
          </Section>

          <Section title="NSW LiDAR Coverage" icon={SquareStack}>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-3">
              <span className="min-w-0">
                <span className="block text-sm text-slate-100">Show coverage polygons</span>
                <span className="block truncate text-xs text-slate-400">
                  Marine_NSWCoastalLidarCoverage_20190827
                </span>
              </span>
              <input
                type="checkbox"
                className="peer sr-only"
                checked={lidarEnabled}
                onChange={(event) => setLidarEnabled(event.target.checked)}
              />
              <span className="relative h-6 w-11 shrink-0 rounded-full bg-slate-700 transition peer-checked:bg-cyan-500">
                <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
              </span>
            </label>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Loads 48 converted NSW Coastal LiDAR coverage polygons.
            </p>

            <div className="mt-3 overflow-hidden rounded-md border border-white/10 bg-slate-950/30">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-semibold text-slate-200 transition hover:bg-white/5"
                onClick={() => setCatalogOpen((value) => !value)}
              >
                <span>
                  Source Data Links{" "}
                  {catalogStatus === "ready"
                    ? `(${lidarCatalog.length})`
                    : catalogStatus}
                </span>
                <ChevronsUpDown
                  size={14}
                  className={`shrink-0 text-cyan-300 transition ${catalogOpen ? "rotate-180" : ""
                    }`}
                />
              </button>

              {catalogOpen && (
                <div className="max-h-28 divide-y divide-white/10 overflow-y-scroll overscroll-contain border-t border-white/10 [scrollbar-color:rgba(103,232,249,0.65)_rgba(15,23,42,0.55)] [scrollbar-width:thin]">
                  {lidarCatalog.map((record) => (
                    <a
                      key={`${record.id}-${record.tile}`}
                      href={record.metadataUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group block px-3 py-2 transition hover:bg-sky-500/10"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-100">
                            {record.location}
                          </p>
                          <p className="truncate text-[11px] text-slate-400">
                            {record.project} · {record.captured ?? "Unknown date"}
                          </p>
                        </div>
                        <ExternalLink
                          size={13}
                          className="mt-0.5 shrink-0 text-cyan-300 opacity-70 transition group-hover:opacity-100"
                        />
                      </div>
                    </a>
                  ))}
                  {catalogStatus === "error" && (
                    <p className="px-3 py-2 text-xs text-rose-200">
                      Unable to load the LiDAR data catalog.
                    </p>
                  )}
                </div>
              )}
            </div>
          </Section>

        </div>
      </aside>
    </>
  );
}

function TidePanel({
  tideInfo,
  tideStatus,
  tideError,
  tideCoordinate,
  onRefreshTide
}) {
  const [futureOpen, setFutureOpen] = useState(false);
  const todayEvents = getTodayTideEvents(tideInfo);
  const groups = groupThreeDayTideEvents(tideInfo);

  return (
    <div className="max-h-[180px] space-y-3 overflow-y-auto overscroll-contain rounded-md border border-white/10 bg-white/5 p-3 [scrollbar-color:rgba(103,232,249,0.55)_rgba(15,23,42,0.45)] [scrollbar-width:thin]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100">Current Location Tide</p>
          <p className="truncate text-[11px] text-slate-400">
            {tideCoordinate?.source ?? "Map center"}{" "}
            {Number.isFinite(tideCoordinate?.lat)
              ? `${tideCoordinate.lat.toFixed(4)}, ${tideCoordinate.lng.toFixed(4)}`
              : ""}
          </p>
        </div>
        <button
          type="button"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/10 bg-white/5 text-cyan-200 transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-50"
          disabled={tideStatus === "loading"}
          onClick={() => onRefreshTide?.()}
          title="Refresh tide"
        >
          <RefreshCw
            size={15}
            className={tideStatus === "loading" ? "animate-spin" : ""}
          />
        </button>
      </div>

      {tideError && (
        <p className="rounded-md border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          {tideError}
        </p>
      )}

      {tideStatus === "loading" && !tideInfo ? (
        <p className="text-xs text-slate-400">Loading tide and marine conditions...</p>
      ) : tideInfo ? (
        <>
          <div className="space-y-2">
            <CompactTideMetrics
              items={[
                ["Sea level", formatMeters(tideInfo.currentSeaLevel)],
                ["Wave height", formatMeters(tideInfo.waveHeight)],
                ["Wave period", formatSeconds(tideInfo.wavePeriod)],
                ["Wind speed", formatWindSpeed(tideInfo.windSpeed)],
                ["Wind direction", formatWindDirection(tideInfo.windDirection)]
              ]}
            />
            <div className="rounded-md border border-sky-300/15 bg-sky-400/10 p-2">
              <p className="mb-2 text-xs font-semibold text-sky-100">Today's Tide</p>
              <TideEventRows events={todayEvents} />
            </div>

            <div className="overflow-hidden rounded-md border border-white/10 bg-slate-950/30">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-semibold text-slate-200 transition hover:bg-white/5"
                onClick={() => setFutureOpen((value) => !value)}
              >
                <span>
                  Next Three Days{" "}
                  {groups.length ? `(${groups.reduce((sum, group) => sum + group.events.length, 0)})` : ""}
                </span>
                <ChevronsUpDown
                  size={14}
                  className={`shrink-0 text-cyan-300 transition ${futureOpen ? "rotate-180" : ""
                    }`}
                />
              </button>
              {futureOpen && (
                <div className="max-h-36 divide-y divide-white/10 overflow-y-auto overscroll-contain border-t border-white/10">
                  {groups.map((group) => (
                    <div key={group.key} className="px-3 py-2">
                      <p className="mb-1 text-[11px] font-semibold text-cyan-200">
                        {group.label}
                      </p>
                      <TideEventRows events={group.events} />
                    </div>
                  ))}
                  {!groups.length && (
                    <p className="px-3 py-2 text-xs text-slate-500">N/A</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <p className="text-[11px] leading-4 text-slate-500">
            Tide values are modelled and may be inaccurate nearshore or inside harbours. Do not use for navigation or safety decisions. Right-click or long-press the map to query a selected location.
          </p>
        </>
      ) : (
        <p className="text-xs text-slate-400">Click refresh to load tide, wave and wind data.</p>
      )}
    </div>
  );
}

function TideEventRows({ events }) {
  if (!events?.length) {
    return <p className="text-xs text-slate-500">N/A</p>;
  }

  return (
    <div className="space-y-1">
      {events.map((event) => (
        <div
          key={`${event.kind}-${event.time.toISOString()}`}
          className="grid grid-cols-[44px_1fr_auto] gap-2 text-xs text-slate-300"
        >
          <span>{event.kind === "high" ? "High" : "Low"}</span>
          <span className="font-mono tabular-nums">{formatTideTime(event.time)}</span>
          <span className="font-semibold text-slate-100">
            {formatMeters(event.height)}
          </span>
        </div>
      ))}
    </div>
  );
}

function CompactTideMetrics({ items }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-md border border-white/10 bg-slate-950/25 p-2 text-[11px]">
      {items.map(([title, value]) => (
        <div key={title} className="flex min-w-0 items-center justify-between gap-1">
          <span className="truncate text-slate-400">{title}</span>
          <span className="shrink-0 font-semibold text-slate-100">{value}</span>
        </div>
      ))}
    </div>
  );
}

function TideMetricRow({ title, value }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <span className="truncate text-slate-400">{title}</span>
      <span className="shrink-0 font-semibold text-slate-100">{value}</span>
    </div>
  );
}

function LayerCheck({ label, checked, disabled, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-500 accent-cyan-400"
      />
      <span className="min-w-0 truncate">{label}</span>
    </label>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
        <Icon size={14} />
        {title}
      </h3>
      {children}
    </section>
  );
}
