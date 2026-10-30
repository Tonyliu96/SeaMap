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
        className="flex w-full items-center justify-between gap-3 border border-[#343a42] bg-[#15191d] px-3 py-3 text-left transition hover:border-[#ffe100] hover:bg-[#1b2025]"
        onClick={() => setEnabled(!enabled)}>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[#f7f3e8]">{t("marine.show")}</span>
          <span className="block truncate font-mono text-[9px] uppercase text-[#747d87]">{t("marine.sourceShort")}</span>
        </span>
        <span className={`relative h-6 w-11 shrink-0 border transition-colors duration-200 ${enabled ? "border-[#19b56b] bg-[#123622]" : "border-[#414750] bg-[#20242a]"}`}>
          <span className={`absolute left-1 top-1 h-4 w-4 bg-[#f7f3e8] shadow-[2px_2px_0_rgba(0,0,0,.35)] transition-transform duration-200 ${enabled ? "translate-x-5" : ""}`}/>
        </span>
      </button>

      {enabled && (
        <div className="space-y-2 border border-[#30343a] bg-[#0d1012] p-2.5">
          <div className="grid grid-cols-[112px_1fr] gap-2">
            <select
              aria-label={t("marine.stateFilter")}
              value={state}
              onChange={(event) => setState(event.target.value)}
              className="h-9 min-w-0 border border-[#343a42] bg-[#15191d] px-2 font-mono text-[10px] text-[#f7f3e8] outline-none focus:border-[#ffe100]">
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
                className="h-9 w-full border border-[#343a42] bg-[#15191d] pl-8 pr-8 font-mono text-[10px] text-[#f7f3e8] outline-none transition placeholder:text-[#626a74] focus:border-[#ffe100] focus:bg-[#0b0d0f]"/>
              {search && (
                <button
                  type="button"
                  aria-label={t("marine.clearSearch")}
                  className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center text-[#626a74] transition hover:bg-[#ff3b4f] hover:text-white"
                  onClick={() => setSearch("")}>
                  <X size={13}/>
                </button>
              )}
            </label>
          </div>

          <div className="flex items-center justify-between gap-2 font-mono text-[9px] uppercase text-[#747d87]">
            <span className="inline-flex items-center gap-1.5">
              {status === "loading" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-300"/>}
              {resultLabel}
            </span>
            <span className="flex items-center gap-1"><LocateFixed size={12}/>{t("marine.mapHint")}</span>
          </div>

          {error && <p className="border border-[#7b3540] bg-[#2b1418] px-2 py-2 font-mono text-[10px] text-[#ff9ba7]">{error}</p>}
          {nearbyMessage && <p className="border border-[#285a61] bg-[#10272b] px-2 py-2 font-mono text-[10px] text-[#9aedf5]">{nearbyMessage}</p>}

          <div className="marine-scrollbar max-h-36 space-y-1 overflow-y-auto pr-1">
            {locations.map((location) => (
              <button
                key={location.id}
                type="button"
                className={`flex w-full items-center gap-2 border px-2.5 py-2 text-left transition ${selectedId === location.id ? "border-[#3564f4] bg-[#172346] text-white" : "border-transparent text-[#aeb5be] hover:border-[#343a42] hover:bg-[#171a1e]"}`}
                onClick={() => onSelectLocation(location)}>
                <ShipWheel size={14} className="shrink-0 text-[#6ee7f5]"/>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold">{location.name}</span>
                <span className="font-mono text-[9px] text-[#626a74]">{location.state || "AU"}</span>
              </button>
            ))}
            {status === "ready" && locations.length === 0 && (
              <p className="py-3 text-center font-mono text-[10px] uppercase text-[#626a74]">{t("marine.noLocations")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
