import { useEffect, useMemo, useState } from "react";
import { LocateFixed, Search, ShipWheel, X } from "lucide-react";
import { fetchMarineLocations } from "../services/marineForecast.js";

const forecastStates = ["ALL", "NSW", "QLD", "VIC", "SA", "WA", "TAS", "NT", "ACT"];

export default function MarineForecastSection({
  enabled,
  setEnabled,
  locations,
  setLocations,
  selectedLocation,
  onSelectLocation,
  nearbyMessage,
  t
}) {
  const [state, setState] = useState("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    setStatus("loading");
    setError("");
    fetchMarineLocations({ state, search: debouncedSearch, signal: controller.signal })
      .then((records) => {
        setLocations(records);
        setStatus("ready");
      })
      .catch((requestError) => {
        if (requestError.name === "AbortError") return;
        setError(requestError.message);
        setStatus("error");
      });
    return () => controller.abort();
  }, [enabled, state, debouncedSearch, setLocations]);

  const selectedId = selectedLocation?.id ?? "";
  const resultLabel = useMemo(() => {
    if (status === "loading") return t("marine.locationsLoading");
    return t("marine.locationCount", { count: locations.length });
  }, [locations.length, status, t]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        aria-pressed={enabled}
        className="flex w-full items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.045] px-3 py-3 text-left transition hover:border-teal-200/25 hover:bg-white/[0.09]"
        onClick={() => setEnabled(!enabled)}>
        <span className="min-w-0">
          <span className="block text-sm text-slate-100">{t("marine.show")}</span>
          <span className="block truncate text-xs text-slate-400">{t("marine.sourceShort")}</span>
        </span>
        <span className={`relative h-6 w-11 shrink-0 rounded-full shadow-inner transition-colors duration-200 ${enabled ? "bg-teal-500" : "bg-slate-700"}`}>
          <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? "translate-x-5" : ""}`}/>
        </span>
      </button>

      {enabled && (
        <div className="space-y-2 rounded-md border border-white/10 bg-white/[0.035] p-3">
          <div className="grid grid-cols-[112px_1fr] gap-2">
            <select
              aria-label={t("marine.stateFilter")}
              value={state}
              onChange={(event) => setState(event.target.value)}
              className="h-9 min-w-0 rounded-md border border-white/10 bg-slate-950/80 px-2 text-xs text-slate-100 outline-none focus:border-teal-300">
              {forecastStates.map((code) => (
                <option key={code} value={code}>{code === "ALL" ? t("marine.allAustralia") : code}</option>
              ))}
            </select>
            <label className="relative min-w-0">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-slate-400"/>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("marine.search")}
                className="h-9 w-full rounded-md border border-white/10 bg-slate-950/80 pl-8 pr-8 text-xs text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-teal-300 focus:bg-slate-950"/>
              {search && (
                <button
                  type="button"
                  aria-label={t("marine.clearSearch")}
                  className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-md text-slate-500 transition hover:bg-white/10 hover:text-white"
                  onClick={() => setSearch("")}>
                  <X size={13}/>
                </button>
              )}
            </label>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              {status === "loading" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-300"/>}
              {resultLabel}
            </span>
            <span className="flex items-center gap-1"><LocateFixed size={12}/>{t("marine.mapHint")}</span>
          </div>

          {error && <p className="rounded-md bg-rose-400/10 px-2 py-2 text-xs text-rose-200">{error}</p>}
          {nearbyMessage && <p className="rounded-md bg-teal-400/10 px-2 py-2 text-xs text-teal-100">{nearbyMessage}</p>}

          <div className="marine-scrollbar max-h-36 space-y-1 overflow-y-auto pr-1">
            {locations.map((location) => (
              <button
                key={location.id}
                type="button"
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition ${selectedId === location.id ? "bg-teal-400/20 text-white" : "text-slate-300 hover:bg-white/[0.07]"}`}
                onClick={() => onSelectLocation(location)}>
                <ShipWheel size={14} className="shrink-0 text-teal-300"/>
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{location.name}</span>
                <span className="text-[10px] text-slate-500">{location.state || "AU"}</span>
              </button>
            ))}
            {status === "ready" && locations.length === 0 && (
              <p className="py-3 text-center text-xs text-slate-500">{t("marine.noLocations")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
