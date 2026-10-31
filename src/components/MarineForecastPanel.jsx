import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Compass, Droplets, Thermometer, Timer, Waves, Wind, X } from "lucide-react";
import { fetchMarineForecast } from "../services/marineForecast.js";
import { oppositeBearing } from "../utils/mapVectors.js";
import MarineSwellChart from "./MarineSwellChart.jsx";
import MarineTideChart from "./MarineTideChart.jsx";
import MarineCurrentConditions from "./MarineCurrentConditions.jsx";
import ResizablePanelHandle, { useResizablePanel } from "./ResizablePanelHandle.jsx";
import { Badge, IconButton } from "./ui.jsx";

// Forecast wind cells above this speed receive a soft strong-wind warning.
const STRONG_WIND_THRESHOLD_KMH = 30;

function value(number, digits = 1) {
  return Number.isFinite(number) ? number.toFixed(digits) : "–";
}

function shortDate(date, locale) {
  const parsed = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(parsed);
}

const STATE_TIME_ZONES = {
  ACT: "Australia/Sydney",
  NSW: "Australia/Sydney",
  VIC: "Australia/Melbourne",
  TAS: "Australia/Hobart",
  QLD: "Australia/Brisbane",
  SA: "Australia/Adelaide",
  NT: "Australia/Darwin",
  WA: "Australia/Perth"
};

function stationTimeZone(location) {
  return STATE_TIME_ZONES[location?.state] ?? "Australia/Sydney";
}

function stationClock(timeZone, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number.parseInt(values.hour, 10)
  };
}

function closestHour(hours, currentHour) {
  if (!hours?.length) return null;
  return hours.reduce((closest, hour) => {
    const candidate = Number.parseInt(hour.time, 10);
    const previous = Number.parseInt(closest.time, 10);
    return Math.abs(candidate - currentHour) < Math.abs(previous - currentHour) ? hour : closest;
  }, hours[0]);
}

function updatedTimeLabel(updatedAt, locale, timeZone) {
  if (!updatedAt) return null;
  const timestamp = new Date(updatedAt);
  if (Number.isNaN(timestamp.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(timestamp);
}

export default function MarineForecastPanel({ location, onClose, language, t }) {
  const [forecast, setForecast] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [intervalOverride, setIntervalOverride] = useState(null);
  const [showMoreMetrics, setShowMoreMetrics] = useState(false);
  const [forecastTableWidth, setForecastTableWidth] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const forecastTableRef = useRef(null);
  const panelSize = useResizablePanel("seamap-marine-panel-height", 620, 220);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const element = forecastTableRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setForecastTableWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [status]);

  useEffect(() => {
    if (!location) return undefined;
    const controller = new AbortController();
    setStatus("loading");
    setError("");
    setForecast(null);
    setSelectedDate("");
    setIntervalOverride(null);
    setShowMoreMetrics(false);
    fetchMarineForecast(location.id, { signal: controller.signal })
      .then((data) => {
        const localToday = stationClock(stationTimeZone(data.location ?? location)).date;
        const initialDay = data.days.find((item) => item.date === localToday) ?? data.days[0];
        setForecast(data);
        setSelectedDate(initialDay?.date || "");
        setStatus("ready");
      })
      .catch((requestError) => {
        if (requestError.name === "AbortError") return;
        setError(requestError.message);
        setStatus("error");
      });
    return () => controller.abort();
  }, [location]);

  const day = useMemo(
    () => forecast?.days.find((item) => item.date === selectedDate) ?? forecast?.days[0],
    [forecast, selectedDate]
  );
  const automaticInterval = forecastTableWidth >= 112 + 24 * 64
    ? 1
    : forecastTableWidth >= 112 + 8 * 64
      ? 3
      : 6;
  const interval = intervalOverride ?? automaticInterval;
  const hours = useMemo(
    () => (day?.hourly ?? []).filter((_, index) => index % interval === 0),
    [day, interval]
  );
  const requiredTableWidth = 112 + hours.length * 64;
  const manualIntervalNeedsScroll = intervalOverride !== null && forecastTableWidth > 0 && forecastTableWidth < requiredTableWidth;
  const localClock = useMemo(
    () => stationClock(stationTimeZone(forecast?.location ?? location), now),
    [forecast?.location, location, now]
  );
  const today = useMemo(
    () => forecast?.days.find((item) => item.date === localClock.date) ?? forecast?.days[0],
    [forecast, localClock.date]
  );
  const current = useMemo(
    () => forecast?.current ?? closestHour(today?.hourly, localClock.hour),
    [forecast, today, localClock.hour]
  );
  const currentColumnTime = useMemo(() => {
    return day?.date === localClock.date ? closestHour(hours, localClock.hour)?.time : null;
  }, [day?.date, hours, localClock.date, localClock.hour]);
  const locale = language === "zh" ? "zh-CN" : "en-AU";
  const updatedTime = updatedTimeLabel(
    forecast?.updatedAt,
    locale,
    stationTimeZone(forecast?.location ?? location)
  );

  if (!location) return null;

  return (
    <section className="absolute inset-x-0 bottom-0 z-[705] flex min-h-[220px] flex-col overflow-hidden rounded-t-3xl border border-aqua-soft/70 bg-surface/95 font-sans shadow-marine-lg backdrop-blur-xl dark:border-white/10 dark:bg-dark-surface/95 md:bottom-4 md:left-[calc(var(--nav-rail-left)+var(--nav-rail-width)+var(--nav-panel-gap))] md:right-4 md:rounded-3xl" style={{ height: `${panelSize.height}px` }}>
      <ResizablePanelHandle onPointerDown={panelSize.onPointerDown} resizeBy={panelSize.resizeBy} label="Resize marine forecast panel" />
      <header className="mt-4 flex min-h-[62px] shrink-0 items-center gap-3 border-b border-aqua-soft/70 px-3 py-2.5 sm:px-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-aqua-soft/40 text-primary"><Waves size={19}/></div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-bold text-ink-strong dark:text-dark-ink sm:text-base">{location.name}</p>
            <Badge tone="steel" className="shrink-0 text-[10px]">{location.state}</Badge>
          </div>
          <p className="truncate text-xs text-steel">{t("marine.outlook")} · {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</p>
        </div>
        <IntervalControl interval={interval} setInterval={setIntervalOverride} className="hidden sm:flex"/>
        <IconButton aria-label={t("marine.close")} onClick={onClose}><X size={15}/></IconButton>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 pb-3 pt-2.5 [scrollbar-color:theme(colors.aqua)_transparent] [scrollbar-width:thin] sm:px-3">
        {status === "loading" && <div className="grid h-52 place-items-center rounded-2xl border border-aqua-soft/70 bg-aqua-soft/15 text-sm text-steel">{t("marine.forecastLoading")}</div>}
        {status === "error" && <div className="grid h-52 place-items-center rounded-2xl border border-coral/40 bg-coral/10 px-6 text-center text-sm text-coral-ink">{error || t("marine.forecastError")}</div>}
        {status === "ready" && forecast && (
          <>
            <div className="mb-3 flex items-stretch gap-1 overflow-x-auto rounded-xl bg-aqua-soft/20 p-1">
              {forecast.days.map((item, index) => (
                <button key={item.date}
                  className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selectedDate === item.date ? "bg-primary text-white shadow-sm" : "text-steel hover:bg-surface hover:text-primary dark:hover:bg-white/10"}`}
                  onClick={() => setSelectedDate(item.date)}>
                  {index === 0 ? t("marine.today") : index === 1 ? t("marine.tomorrow") : shortDate(item.date, locale)}
                </button>
              ))}
              <IntervalControl interval={interval} setInterval={setIntervalOverride} className="sticky right-0 ml-auto flex sm:hidden"/>
            </div>

            {current && <MarineCurrentConditions hour={current} t={t} />}

            <div className="my-2 grid gap-2 md:grid-cols-[1.4fr_0.8fr]">
              <MarineSwellChart hours={day?.hourly ?? []} currentTime={day?.date === localClock.date ? closestHour(day?.hourly, localClock.hour)?.time : null} t={t}/>
              <MarineTideChart tides={day?.tides ?? []} currentTime={day?.date === localClock.date ? `${String(localClock.hour).padStart(2, "0")}:00` : null} locale={locale} t={t}/>
            </div>

            <div className="mb-1.5 mt-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-strong dark:text-dark-ink">{t("marine.hourlyDetails")}</h3>
              <Badge>{interval}h</Badge>
            </div>
            <div ref={forecastTableRef} className={`rounded-2xl border border-aqua-soft/70 bg-surface dark:border-white/10 dark:bg-dark-surface ${manualIntervalNeedsScroll ? "overflow-x-auto" : "overflow-hidden"}`}>
              <table className={`w-full table-fixed border-separate border-spacing-0 text-center text-xs text-ink-strong dark:text-dark-ink ${manualIntervalNeedsScroll ? interval === 1 ? "min-w-[1648px]" : "min-w-[624px]" : "min-w-0 max-w-full"}`}>
                <thead><tr className="bg-sea/70 text-steel">
                  <th className={`w-28 border-r border-aqua-soft/70 bg-sea px-2 py-2 text-left font-semibold ${manualIntervalNeedsScroll ? "sticky left-0 z-20" : ""}`}>{t("marine.metric")}</th>
                  {hours.map((hour) => {
                    const isCurrent = hour.time === currentColumnTime;
                    return (
                      <th key={hour.time} className={`relative min-w-16 border-l border-aqua-soft/50 px-1 pb-2 pt-6 font-semibold tabular-nums ${isCurrent ? "border-x border-primary bg-primary/10 text-primary" : ""}`}>
                        {isCurrent && <span className="absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-[7px] leading-none text-white">▲ {t("marine.now")}</span>}
                        <span className="block">{hour.time}</span>
                      </th>
                    );
                  })}
                </tr></thead>
                <tbody>
                  <ForecastRow icon={Wind} label={t("marine.windKmh")} hours={hours} currentTime={currentColumnTime} sticky={manualIntervalNeedsScroll} valueAccessor={(hour) => hour.windSpeedKmh} warningThreshold={STRONG_WIND_THRESHOLD_KMH} render={(hour) => value(hour.windSpeedKmh, 0)}/>
                  <ForecastRow icon={Compass} label={t("marine.windDirection")} hours={hours} currentTime={currentColumnTime} sticky={manualIntervalNeedsScroll} render={(hour) => <Direction degrees={hour.windDirectionDegrees} label={hour.windDirection}/>}/>
                  <ForecastRow groupStart icon={Waves} label={t("marine.significantWave")} hours={hours} currentTime={currentColumnTime} sticky={manualIntervalNeedsScroll} valueAccessor={(hour) => hour.significantWaveHeightM} render={(hour) => value(hour.significantWaveHeightM)}/>
                  <ForecastRow groupStart className={showMoreMetrics ? "table-row" : "hidden md:table-row"} icon={Droplets} label={t("marine.swellHeight")} hours={hours} currentTime={currentColumnTime} sticky={manualIntervalNeedsScroll} render={(hour) => value(hour.swellHeightM)}/>
                  <ForecastRow icon={Timer} label={t("marine.swellPeriod")} hours={hours} currentTime={currentColumnTime} sticky={manualIntervalNeedsScroll} render={(hour) => value(hour.swellPeriodSeconds)}/>
                  <ForecastRow className={showMoreMetrics ? "table-row" : "hidden md:table-row"} icon={ArrowDown} label={t("marine.swellDirection")} hours={hours} currentTime={currentColumnTime} sticky={manualIntervalNeedsScroll} render={(hour) => <Direction degrees={hour.swellDirectionDegrees} label={hour.swellDirection}/>}/>
                  <ForecastRow groupStart className={showMoreMetrics ? "table-row" : "hidden md:table-row"} icon={Thermometer} label={t("marine.waterTemperature")} hours={hours} currentTime={currentColumnTime} sticky={manualIntervalNeedsScroll} render={(hour) => value(hour.waterTemperatureC, 0)}/>
                </tbody>
              </table>
            </div>
            <button type="button" className="mt-2 w-full rounded-lg border border-aqua-soft bg-aqua-soft/20 px-3 py-2 text-xs font-semibold text-primary transition hover:border-primary hover:bg-aqua-soft/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden" onClick={() => setShowMoreMetrics((value) => !value)}>
              {showMoreMetrics ? t("marine.lessMetrics") : t("marine.moreMetrics")}
            </button>
            <footer className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-aqua-soft/60 pb-1 pr-10 pt-2 text-[10px] text-steel">
              <span>{t("marine.forecastGuidance")}</span>
              {updatedTime && <span className="tabular-nums"><span className="capitalize">{t("marine.updated")}</span> {updatedTime}</span>}
            </footer>
          </>
        )}
      </div>
    </section>
  );
}

function IntervalControl({ interval, setInterval, className = "" }) {
  return (
    <div className={`${className} shrink-0 rounded-lg bg-aqua-soft/30 p-0.5`}>
      {[1, 3].map((step) => (
        <button key={step} type="button" className={`min-w-9 rounded-md px-2 py-1 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${interval === step ? "bg-primary text-white shadow-sm" : "text-steel hover:bg-surface hover:text-primary"}`} onClick={() => setInterval(step)}>{step}h</button>
      ))}
    </div>
  );
}

function relativeCellTone(number, minimum, maximum, warningThreshold) {
  if (!Number.isFinite(number)) return "";
  if (Number.isFinite(warningThreshold) && number > warningThreshold) return "bg-coral/15";
  const ratio = maximum === minimum ? 0.5 : (number - minimum) / (maximum - minimum);
  if (ratio < 0.25) return "bg-aqua-soft/10";
  if (ratio < 0.5) return "bg-aqua-soft/20";
  if (ratio < 0.75) return "bg-aqua-soft/30";
  return "bg-aqua-soft/40";
}

function ForecastRow({ icon: Icon, label, hours, currentTime, sticky, className = "", groupStart = false, valueAccessor, warningThreshold, render }) {
  const rowValues = valueAccessor ? hours.map(valueAccessor).filter(Number.isFinite) : [];
  const minimum = rowValues.length ? Math.min(...rowValues) : 0;
  const maximum = rowValues.length ? Math.max(...rowValues) : 0;
  const topBorder = groupStart ? "border-t border-t-aqua-soft" : "border-t border-t-aqua-soft/60";
  return <tr className={className}>
    <th className={`w-28 border-r border-r-aqua-soft/60 bg-bg px-2 py-2 text-left font-semibold text-steel dark:bg-dark-surface ${topBorder} ${sticky ? "sticky left-0 z-10" : ""}`}><span className="flex items-center gap-1.5 whitespace-normal"><Icon size={12} className="shrink-0 text-primary"/><span>{label}</span></span></th>
    {hours.map((hour, index) => {
      const rowValue = valueAccessor?.(hour);
      const tone = valueAccessor ? relativeCellTone(rowValue, minimum, maximum, warningThreshold) : index % 2 ? "bg-bg/60" : "";
      const isCurrent = hour.time === currentTime;
      return <td key={hour.time} className={`relative min-w-16 whitespace-nowrap border-l border-l-aqua-soft/50 px-1 py-2 text-xs tabular-nums text-ink-strong ${topBorder} ${tone} ${isCurrent ? "border-x border-x-primary font-bold" : ""}`}>{render(hour)}</td>;
    })}
  </tr>;
}

function DirectionArrow({ degrees }) {
  return <ArrowUp className="h-3 w-3 shrink-0 lg:h-4 lg:w-4" style={{ transform: `rotate(${oppositeBearing(degrees)}deg)` }}/>;
}

function Direction({ degrees, label }) {
  if (!Number.isFinite(degrees)) return "–";
  return <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap" title={`${label || degrees.toFixed(0)}° from`}><DirectionArrow degrees={degrees}/><span>{label || `${degrees.toFixed(0)}°`}</span></span>;
}
