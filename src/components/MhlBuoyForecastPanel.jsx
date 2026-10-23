import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, Navigation, Timer, Waves, Wind, X } from "lucide-react";
import { fetchMhlBuoyForecast } from "../services/mhlWaves.js";
import {formatMeters, formatSeconds, formatWindDirection, formatWindSpeed} from "../services/tides.js";
import TideChartRow from "./TideChartRow.jsx";
import {formatDateKey, formatHour,formatNumber, formatObservedAt, groupHoursByDay} from "../utils/mhlFormatters.js";
import { oppositeBearing } from "../utils/mapVectors.js";


const VISIBLE_HOURS = 96;

export default function MhlBuoyForecastPanel({ buoy, onClose, t }) {
  const [status, setStatus] = useState("idle");
  const [forecast, setForecast] = useState(null);
  const [hourStep, setHourStep] = useState(1);
  const forecastScrollerRef = useRef(null);

  useEffect(() => {
    if (!buoy) return undefined;

    const controller = new AbortController();
    let mounted = true;
    setStatus("loading");
    setForecast(null);

    fetchMhlBuoyForecast(buoy, { signal: controller.signal })
      .then((data) => {
        if (!mounted) return;
        setForecast(data);
        setStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("error");
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [buoy]);

  const hours = useMemo(() => {
    const sourceHours = (forecast?.hours ?? [])
      .filter((hour) => hour.time instanceof Date)
      .slice(0, VISIBLE_HOURS);

    if (hourStep === 3) {
      return sourceHours.filter((hour) => Number(formatHour(hour.time)) % 3 === 0);
    }
    return sourceHours;
  }, [forecast, hourStep]);

  const currentTime = useMemo(() => {
    const index = findNearestHourIndex(hours, new Date(), formatDateKey(new Date()));
    return index >= 0 ? hours[index].time : null;
  }, [hours]);

  const scrollForecast = (direction) => {
    forecastScrollerRef.current?.scrollBy({
      left: direction * Math.max(264, forecastScrollerRef.current.clientWidth * 0.72),
      behavior: "smooth"
    });
  };

  if (!buoy) return null;

  return (
    <section className="mhl-panel absolute bottom-[76px] left-3 right-3 z-[700] h-[min(360px,42dvh)] min-h-[250px] overflow-hidden rounded-lg text-white md:bottom-4 md:left-4 md:right-4 md:h-[min(340px,32dvh)]">
      <header className="mhl-panel-header flex items-center justify-between gap-3 px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="mhl-station-symbol grid h-9 w-9 shrink-0 place-items-center rounded-lg">
            <Waves size={17} />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-[15px] font-semibold text-white">
              {buoy.name ?? buoy.sitecode}
              </h2>
              <span className="mhl-station-code hidden rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase sm:inline">
                {buoy.sitecode}
              </span>
            </div>
            <p className="truncate text-[10px] text-white/45">
              {t("mhl.panelTitle")} · {buoy.latitude.toFixed(4)}, {buoy.longitude.toFixed(4)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="mhl-live-status hidden items-center gap-1.5 text-[10px] font-medium sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#30d158]" /> MHL observed
          </span>
          <button
            type="button"
            className="mhl-icon-button"
            onClick={onClose}
            title={t("mhl.closePanel")}
            aria-label={t("mhl.closePanel")}>
            <X size={15} />
          </button>
        </div>
      </header>

      <div className="marine-scrollbar h-[calc(100%-53px)] overflow-y-auto px-2 pb-2 pt-1.5">
        {status === "loading" && (
          <div className="grid h-full min-h-40 place-items-center">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#0a84ff]" />
              {t("mhl.forecastLoading")}
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-md border border-rose-300/25 bg-rose-500/10 px-3 py-4 text-sm text-rose-100">
            {t("mhl.forecastError")}
          </div>
        )}

        {status === "ready" && (
          <>
            <CurrentObservation latest={forecast?.latest} t={t}/>
            <ForecastToolbar
              hourStep={hourStep}
              setHourStep={setHourStep}
              onScroll={scrollForecast}
              t={t}/>

            <div ref={forecastScrollerRef} className="mhl-forecast-scroll marine-scrollbar overflow-x-auto rounded-lg">
              <div
                className="mhl-forecast-grid min-w-max"
                style={{ gridTemplateColumns: `68px repeat(${hours.length}, 44px)` }}>
                <DayRow hours={hours} t={t} />
                <HeaderRow hours={hours} currentTime={currentTime} t={t} />
                <ArrowRow label={t("mhl.wind")} values={hours} field="windDirection" currentTime={currentTime} />
                <ValueRow label="km/h" values={hours} field="windSpeed" currentTime={currentTime} formatter={(value) => formatNumber(value, 0)} colorClass="mhl-wind-cell" />
                <ValueRow label={t("mhl.temperature")} values={hours} field="temperature" currentTime={currentTime} formatter={(value) => formatNumber(value, 0)} colorClass="mhl-temp-cell" />
                <ArrowRow label={t("mhl.swell")} values={hours} field="waveDirection" currentTime={currentTime} strong />
                <ValueRow icon={Waves} label={t("mhl.waveHeight") ?? "Wave"} values={hours} field="waveHeight"
                    currentTime={currentTime}
                    formatter={(value) => formatNumber(value, 1)}
                    colorClass="mhl-grid-cell font-semibold text-cyan-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] bg-sky-950/50"/>

                <ValueRow label={t("mhl.wavePeriod") ?? "Wave period"} values={hours} field="wavePeriod"
                    currentTime={currentTime}
                    formatter={(value) => formatNumber(value, 0)}
                    colorClass="mhl-grid-cell text-slate-300 bg-slate-900/40"/>
                <TideChartRow label={t("mhl.tideMsl")} values={hours} currentTime={currentTime} />
              </div>
            </div>
            <p className="px-1 pt-1 text-[9px] leading-3 text-white/30">
              {t("mhl.disclaimer")}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function DayRow({ hours, t }) {
  const dayGroups = groupHoursByDay(hours, t);
  const now = new Date();
  const todayKey = formatDateKey(now);
  const nowIndex = findNearestHourIndex(hours, now, todayKey);
  let groupStart = 0;

  return (
    <>
      <div className="mhl-grid-label mhl-day-cell sticky left-0 z-20 justify-end">{t("mhl.day")}</div>
      {dayGroups.map((group) => {
        const start = groupStart;
        groupStart += group.count;
        const showNow = group.key === todayKey && nowIndex >= start && nowIndex < start + group.count;
        const nowLeft = showNow
          ? `${((nowIndex - start + 0.5) / group.count) * 100}%`
          : "50%";

        return (
          <div
            key={group.key}
            className="mhl-day-cell mhl-day-group relative"
            style={{ gridColumn: `span ${group.count}` }}>
            <span className="truncate">{group.label}</span>
            {showNow && (
              <span className="mhl-now-marker" style={{ left: nowLeft }}>
                {t("mhl.now")}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}

function findNearestHourIndex(hours, now, todayKey) {
  let nearestIndex = -1;
  let nearestDistance = Infinity;

  hours.forEach((hour, index) => {
    if (!(hour.time instanceof Date) || formatDateKey(hour.time) !== todayKey) return;
    const distance = Math.abs(hour.time.getTime() - now.getTime());

    if (distance < nearestDistance) {
      nearestIndex = index;
      nearestDistance = distance;
    }
  });

  return nearestIndex;
}


function CurrentObservation({ latest, t }) {
  return (
      <div className="mhl-observation-strip grid grid-cols-2 overflow-hidden rounded-lg sm:grid-cols-4">
        <Metric icon={Waves} title={t("mhl.latestWaveHeight")} value={formatMeters(latest?.waveHeight, t)} />
        <Metric icon={Timer} title={t("mhl.latestWavePeriod")} value={formatSeconds(latest?.wavePeriod, t)} />
        <Metric icon={Navigation} title={t("mhl.latestWaveDirection")} value={formatWindDirection(latest?.waveDirection, t)} />
        <Metric icon={Clock3} title={t("mhl.observedAt")} value={formatObservedAt(latest?.observedAt, t)} />
      </div>
  );
}

function Metric({ icon: Icon, title, value }) {
  return (
      <div className="mhl-observation-metric flex min-w-0 items-center gap-2 px-2.5 py-1.5">
        <Icon size={14} className="mhl-metric-icon shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-[8px] font-medium uppercase text-white/35">{title}</p>
          <p className="truncate text-[12px] font-semibold tabular-nums text-white/95">{value}</p>
        </div>
      </div>
  );
}

function ForecastToolbar({ hourStep, setHourStep, onScroll, t }) {
  return (
    <div className="flex h-8 items-center justify-between gap-2 px-1">
      <div className="flex items-center gap-2 text-[9px] font-semibold uppercase text-white/40">
        <span>{t("mhl.modelForecast")}</span>
        <span className="h-1 w-1 rounded-full bg-white/20" />
        <span className="normal-case text-white/30">Open-Meteo</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="mhl-segmented-control flex items-center rounded-md p-0.5">
          {[1, 3].map((step) => (
            <button
              key={step}
              type="button"
              className={`h-5 min-w-8 rounded px-1.5 text-[9px] font-bold transition ${
                hourStep === step
                  ? "is-selected"
                  : "text-white/45 hover:text-white/80"
              }`}
              onClick={() => setHourStep(step)}>
              {step}h
            </button>
          ))}
        </div>
        <button type="button" className="mhl-icon-button h-6 w-6" onClick={() => onScroll(-1)} title={t("mhl.scrollEarlier")} aria-label={t("mhl.scrollEarlier")}>
          <ChevronLeft size={14} />
        </button>
        <button type="button" className="mhl-icon-button h-6 w-6" onClick={() => onScroll(1)} title={t("mhl.scrollLater")} aria-label={t("mhl.scrollLater")}>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function HeaderRow({hours, currentTime, t}) {
  return (
      <>
        <div className="mhl-grid-label sticky left-0 z-20">{t("mhl.time")}</div>
        {hours.map((hour) => (
            <div key={`time-${hour.time.toISOString()}`} className={`mhl-time-cell ${currentHourClass(hour.time, currentTime)}`}>
              <span>{formatHour(hour.time)}</span>
            </div>
        ))}
      </>
  );
}

function ArrowRow({label, values, field, currentTime, strong = false}) {
  return (
      <>
        <div className="mhl-grid-label sticky left-0 z-20 flex items-center gap-1 px-2">
          {field === "windDirection" ? <Wind size={13} className="text-[#64d2ff]"/> : null}
          <span>{label}</span>
        </div>
        {values.map((hour) => (
            <div key={`${field}-${hour.time.toISOString()}`}
                 className={`${strong ? "mhl-arrow-cell is-wave" : "mhl-arrow-cell"} ${currentHourClass(hour.time, currentTime)}`}>
              {Number.isFinite(hour[field]) ? (
                  <span style={{transform: `rotate(${arrowBearing(hour[field], field)}deg)` }}>&#8593;</span>
          ) : (
            <span className="text-slate-500">-</span>
          )}
        </div>
      ))}
    </>
  );
}

function arrowBearing(direction, field) {
  return field === "waveDirection" || field === "windDirection"
    ? oppositeBearing(direction)
    : direction;
}

function ValueRow({ icon: Icon, label, values, field, currentTime, formatter, colorClass }) {
  return (
      <>
        <div className="mhl-grid-label sticky left-0 z-20 flex items-center gap-1.5 px-2 text-xs">
          {Icon && <Icon size={13} className="shrink-0 text-[#64d2ff]" />}
          <span className="truncate">{label}</span>
        </div>

        {values.map((hour) => {
          const val = hour[field];

          let dynamicColor = colorClass ?? "mhl-grid-cell";
          if (field === "waveHeight") {
            const displayedWaveHeight = Number.isFinite(val)
              ? Number(val.toFixed(1))
              : null;
            dynamicColor = displayedWaveHeight >= 1.5
                ? "mhl-wave-height-cell is-alert"
                : "mhl-wave-height-cell";
          }

          return (
              <div key={`${field}-${hour.time.toISOString()}`} className={`flex items-center justify-center text-xs ${dynamicColor} ${currentHourClass(hour.time, currentTime)}`}>
                {formatter ? formatter(val) : val}
              </div>
          );
        })}
      </>
  );
}

function currentHourClass(time, currentTime) {
  return currentTime && time.getTime() === currentTime.getTime() ? "is-current-hour" : "";
}
