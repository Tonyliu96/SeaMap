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
    <div className="space-y-2.5 font-sans">
      <button
        type="button"
        aria-pressed={enabled}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-aqua-soft bg-surface px-3 py-3 text-left transition duration-200 hover:border-primary hover:bg-aqua-soft/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/10 dark:bg-dark-surface"
        onClick={() => setEnabled(!enabled)}>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink-strong dark:text-dark-ink">{t("marine.show")}</span>
          <span className="block truncate text-[10px] text-steel">{t("marine.sourceShort")}</span>
        </span>
        <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${enabled ? "bg-primary" : "bg-steel/25"}`}>
          <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? "translate-x-5" : ""}`}/>
        </span>
      </button>

      {enabled && (
        <div className="space-y-2 rounded-xl border border-aqua-soft/70 bg-aqua-soft/10 p-2.5 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="grid grid-cols-[112px_1fr] gap-2">
            <select
              aria-label={t("marine.stateFilter")}
              value={state}
              onChange={(event) => setState(event.target.value)}
              className="h-10 min-w-0 rounded-lg border border-aqua-soft bg-surface px-2 text-xs text-ink-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-dark-bg dark:text-dark-ink">
              {forecastStates.map((code) => (
                <option key={code} value={code}>{code === "ALL" ? t("marine.allAustralia") : code}</option>
              ))}
            </select>
            <label className="relative min-w-0">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-3 text-steel"/>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("marine.search")}
                className="h-10 w-full rounded-lg border border-aqua-soft bg-surface pl-8 pr-8 text-xs text-ink-strong outline-none transition placeholder:text-steel focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-dark-bg dark:text-dark-ink"/>
              {search && (
                <button
                  type="button"
                  aria-label={t("marine.clearSearch")}
                  className="absolute right-1.5 top-2 grid h-6 w-6 place-items-center rounded-full text-steel transition hover:bg-coral/15 hover:text-coral-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => setSearch("")}>
                  <X size={13}/>
                </button>
              )}
            </label>
          </div>

          <div className="flex items-center justify-between gap-2 text-[10px] text-steel">
            <span className="inline-flex items-center gap-1.5">
              {status === "loading" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"/>}
              {resultLabel}
            </span>
            <span className="flex items-center gap-1"><LocateFixed size={12}/>{t("marine.mapHint")}</span>
          </div>

          {error && <p className="rounded-lg border border-coral/40 bg-coral/10 px-2 py-2 text-[10px] text-coral-ink">{error}</p>}
          {nearbyMessage && <p className="rounded-lg border border-aqua-soft bg-aqua-soft/25 px-2 py-2 text-[10px] text-ink">{nearbyMessage}</p>}

          <div className="max-h-36 space-y-1 overflow-y-auto pr-1 [scrollbar-color:theme(colors.aqua)_transparent] [scrollbar-width:thin]">
            {locations.map((location) => (
              <button
                key={location.id}
                type="button"
                className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selectedId === location.id ? "border-primary bg-primary text-white" : "border-transparent text-ink hover:border-aqua-soft hover:bg-aqua-soft/25"}`}
                onClick={() => onSelectLocation(location)}>
                <ShipWheel size={14} className={`shrink-0 ${selectedId === location.id ? "text-white" : "text-primary"}`}/>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold">{location.name}</span>
                <span className={`text-[10px] ${selectedId === location.id ? "text-white/75" : "text-steel"}`}>{location.state || "AU"}</span>
              </button>
            ))}
            {status === "ready" && locations.length === 0 && (
              <p className="py-3 text-center text-[10px] text-steel">{t("marine.noLocations")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
