import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Compass, Droplets, Gauge, Thermometer, Timer, Waves, Wind, X } from "lucide-react";
import { fetchMarineForecast } from "../services/marineForecast.js";
import { oppositeBearing } from "../utils/mapVectors.js";

function value(number, digits = 1) {
  return Number.isFinite(number) ? number.toFixed(digits) : "–";
}

function shortDate(date, locale) {
  const parsed = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(parsed);
}

function tideTime(event, locale) {
  const parsed = new Date(event.time);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(parsed);
  }
  return String(event.time || "–").slice(-5);
}

function closestHour(hours, date) {
  if (!hours?.length) return null;
  const today = new Date().toLocaleDateString("en-CA");
  if (date !== today) return hours[0];
  const currentHour = new Date().getHours();
  return hours.reduce((closest, hour) => {
    const candidate = Number.parseInt(hour.time, 10);
    const previous = Number.parseInt(closest.time, 10);
    return Math.abs(candidate - currentHour) < Math.abs(previous - currentHour) ? hour : closest;
  }, hours[0]);
}

function pressureTrend(hours, current) {
  if (!current || !Number.isFinite(current.pressureHpa)) return "unknown";
  const index = hours.findIndex((hour) => hour.time === current.time);
  const previous = hours[Math.max(0, index - 3)];
  if (!previous || previous === current || !Number.isFinite(previous.pressureHpa)) return "unknown";
  const change = current.pressureHpa - previous.pressureHpa;
  if (change >= 1) return "rising";
  if (change <= -1) return "falling";
  return "stable";
}

function pressureCondition(pressureHpa, trend) {
  if (!Number.isFinite(pressureHpa)) return "unknown";
  if (pressureHpa < 1010) return "poor";
  if (trend === "falling") return "poor";
  if (pressureHpa <= 1025 && trend === "rising") return "veryGood";
  return "good";
}

export default function MarineForecastPanel({ location, onClose, language, t }) {
  const [forecast, setForecast] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [interval, setInterval] = useState(3);

  useEffect(() => {
    if (!location) return undefined;
    const controller = new AbortController();
    setStatus("loading");
    setError("");
    setForecast(null);
    fetchMarineForecast(location.id, { signal: controller.signal })
      .then((data) => {
        setForecast(data);
        setSelectedDate(data.days[0]?.date || "");
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
  const hours = useMemo(
    () => (day?.hourly ?? []).filter((_, index) => interval === 1 || index % interval === 0),
    [day, interval]
  );
  const current = useMemo(() => closestHour(day?.hourly, day?.date), [day]);
  const currentColumnTime = useMemo(() => {
    const today = new Date().toLocaleDateString("en-CA");
    return day?.date === today ? closestHour(hours, day.date)?.time : null;
  }, [day, hours]);
  const locale = language === "zh" ? "zh-CN" : "en-AU";

  if (!location) return null;

  return (
    <section className="absolute inset-x-0 bottom-0 z-[705] overflow-hidden rounded-t-lg border-x border-t border-white/10 bg-[#16181c]/95 font-sans shadow-[0_28px_90px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl md:bottom-4 md:left-4 md:right-4 md:rounded-lg md:border">
      <div className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-white/15 md:hidden" aria-hidden="true"/>
      <header className="flex items-center gap-3 border-b border-white/[0.07] px-4 pb-3 pt-4 md:py-3">
        <Waves size={22} className="shrink-0 text-sky-300"/>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-base font-semibold text-white">{location.name}</p>
            <span className="shrink-0 rounded bg-white/[0.07] px-1.5 py-0.5 text-[9px] font-semibold text-white/50">{location.state}</span>
          </div>
          <p className="truncate text-[10px] font-medium text-sky-300/75">{t("marine.outlook")} · {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</p>
        </div>
        <IntervalControl interval={interval} setInterval={setInterval} className="hidden sm:flex"/>
        <button type="button" aria-label={t("marine.close")} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.07] text-white/55 transition hover:bg-white/[0.14] hover:text-white active:scale-95" onClick={onClose}><X size={16}/></button>
      </header>

      <div className="marine-scrollbar max-h-[min(72dvh,660px)] overflow-y-auto px-3 pb-3 pt-2 max-sm:max-h-[min(74dvh,620px)]">
        {status === "loading" && <div className="grid h-52 place-items-center text-sm text-white/55">{t("marine.forecastLoading")}</div>}
        {status === "error" && <div className="grid h-52 place-items-center text-sm text-rose-200">{error || t("marine.forecastError")}</div>}
        {status === "ready" && forecast && (
          <>
            <div className="mb-2 flex items-center gap-1 overflow-x-auto pb-1">
              {forecast.days.map((item, index) => (
                <button key={item.date}
                  className={`shrink-0 rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${selectedDate === item.date ? "bg-white text-slate-950" : "text-white/55 hover:bg-white/10 hover:text-white"}`}
                  onClick={() => setSelectedDate(item.date)}>
                  {index === 0 ? t("marine.today") : index === 1 ? t("marine.tomorrow") : shortDate(item.date, locale)}
                </button>
              ))}
              <IntervalControl interval={interval} setInterval={setInterval} className="ml-auto flex sm:hidden"/>
            </div>

            {current && <CurrentConditions hour={current} hours={day?.hourly ?? []} t={t}/>} 

            <div className="my-2 grid gap-2 md:grid-cols-[1.4fr_0.8fr]">
              <WaveTrend hours={day?.hourly ?? []} t={t}/>
              <TideEvents tides={day?.tides ?? []} locale={locale} t={t}/>
            </div>

            <div className="mb-1 mt-3 flex items-center justify-between px-1">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">{t("marine.hourlyDetails")}</h3>
              <span className="text-[9px] text-white/30">{interval}h</span>
            </div>
            <div className="max-h-[min(36dvh,260px)] overflow-x-auto rounded-lg border border-white/[0.06] bg-black/10 [scrollbar-color:rgba(94,234,212,0.55)_rgba(255,255,255,0.05)] [scrollbar-width:thin]">
              <table className="min-w-max border-separate border-spacing-0 text-center text-[10px] text-white/70">
                <thead><tr className="bg-white/[0.055] text-white/45">
                  <th className="sticky left-0 z-10 w-28 bg-[#202124] px-3 py-2 text-left font-medium">{t("marine.metric")}</th>
                  {hours.map((hour) => <th key={hour.time} className={`relative w-[62px] px-2 py-2 font-semibold text-white/75 ${hour.time === currentColumnTime ? "bg-amber-300/[0.08] text-amber-200 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-amber-300" : ""}`}>{hour.time === currentColumnTime && <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 text-[7px] uppercase tracking-wide text-amber-300">▲ {t("marine.now")}</span>}{hour.time}</th>)}
                </tr></thead>
                <tbody>
                  <ForecastRow icon={Wind} label={t("marine.windKmh")} hours={hours} currentTime={currentColumnTime} render={(hour) => value(hour.windSpeedKmh, 0)}/>
                  <ForecastRow icon={Compass} label={t("marine.windDirection")} hours={hours} currentTime={currentColumnTime} render={(hour) => <Direction degrees={hour.windDirectionDegrees} label={hour.windDirection}/>}/>
                  <ForecastRow icon={Waves} label={t("marine.significantWave")} hours={hours} currentTime={currentColumnTime} render={(hour) => value(hour.significantWaveHeightM)}/>
                  <ForecastRow icon={Droplets} label={t("marine.swellHeight")} hours={hours} currentTime={currentColumnTime} render={(hour) => value(hour.swellHeightM)}/>
                  <ForecastRow icon={ArrowDown} label={t("marine.swellDirection")} hours={hours} currentTime={currentColumnTime} render={(hour) => <Direction degrees={hour.swellDirectionDegrees} label={hour.swellDirection}/>}/>
                  <ForecastRow icon={Timer} label={t("marine.swellPeriod")} hours={hours} currentTime={currentColumnTime} render={(hour) => value(hour.swellPeriodSeconds)}/>
                  <ForecastRow icon={Thermometer} label={t("marine.waterTemperature")} hours={hours} currentTime={currentColumnTime} render={(hour) => value(hour.waterTemperatureC, 0)}/>
                  <ForecastRow icon={Gauge} label={t("marine.pressure")} hours={hours} currentTime={currentColumnTime} render={(hour) => value(hour.pressureHpa, 0)}/>
                </tbody>
              </table>
            </div>
            <footer className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 text-[10px] text-white/35">
              <span>{t("marine.forecastGuidance")}</span>
              <span>{forecast.cacheStatus === "hit" ? t("marine.cached") : t("marine.updated")}</span>
            </footer>
          </>
        )}
      </div>
    </section>
  );
}

function IntervalControl({ interval, setInterval, className = "" }) {
  return (
    <div className={`${className} shrink-0 rounded-md bg-white/[0.08] p-0.5`}>
      {[1, 3].map((step) => (
        <button key={step} type="button" className={`min-w-9 rounded px-2 py-1 text-[11px] font-semibold transition ${interval === step ? "bg-white/[0.16] text-white shadow-sm" : "text-white/45 hover:text-white/80"}`} onClick={() => setInterval(step)}>{step}h</button>
      ))}
    </div>
  );
}

function CurrentConditions({ hour, hours, t }) {
  const trend = pressureTrend(hours, hour);
  const pressureStatus = {
    veryGood: { label: t("marine.pressureVeryGood"), className: "bg-sky-400/15 text-sky-300" },
    good: { label: t("marine.pressureGood"), className: "bg-emerald-400/15 text-emerald-300" },
    poor: { label: t("marine.pressurePoor"), className: "bg-rose-400/15 text-rose-300" },
    unknown: { label: "–", className: "bg-white/[0.06] text-white/40" }
  }[pressureCondition(hour.pressureHpa, trend)];
  const metrics = [
    { icon: Wind, label: t("marine.windKmh"), value: value(hour.windSpeedKmh, 0), unit: "km/h", direction: hour.windDirectionDegrees, detail: hour.windDirection },
    { icon: Timer, label: t("marine.swellPeriod"), value: value(hour.swellPeriodSeconds), unit: "s" },
    { icon: Thermometer, label: t("marine.waterTemperature"), value: value(hour.waterTemperatureC, 0), unit: "°C" },
    { icon: Gauge, label: t("marine.pressure"), value: value(hour.pressureHpa, 0), unit: "hPa", badge: pressureStatus }
  ];
  return (
    <section className="pt-2">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">{t("marine.currentConditions")}</h3>
        <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">{hour.time}</span>
      </div>
      <div className="grid gap-2 md:grid-cols-[1.2fr_2fr]">
        <article className="flex min-h-[104px] items-center gap-4 rounded-lg border border-sky-300/[0.14] bg-[linear-gradient(125deg,rgba(14,165,233,0.13),rgba(56,189,248,0.025))] px-4 py-3">
          <div className="relative grid h-[68px] w-[68px] shrink-0 place-items-center rounded-full border border-sky-300/[0.18] bg-slate-950/25 shadow-[inset_0_0_0_6px_rgba(56,189,248,0.035)]" aria-hidden="true">
            <span className="absolute top-1 text-[8px] font-bold text-white/30">N</span>
            <Waves size={21} className="text-sky-300"/>
            {Number.isFinite(hour.swellDirectionDegrees) && <span className="absolute grid h-[54px] w-[54px] place-items-start justify-center pt-[3px] text-amber-400 [&_svg]:h-[17px] [&_svg]:w-[17px]"><DirectionArrow degrees={hour.swellDirectionDegrees}/></span>}
          </div>
          <div>
            <p className="text-[10px] font-medium text-white/45">{t("marine.swellHeight")}</p>
            <p className="mt-0.5 tabular-nums text-[32px] font-semibold leading-none text-white">{value(hour.swellHeightM)}<span className="ml-1 text-xs font-medium text-white/40">m</span></p>
            <p className="mt-2 text-[10px] font-semibold text-sky-300">{t("marine.significantWave")} {value(hour.significantWaveHeightM)} m · {hour.swellDirection || "–"}</p>
          </div>
        </article>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-white/[0.055] sm:grid-cols-4">
        {metrics.map(({ icon: Icon, label, value: metricValue, unit, direction, detail, badge }) => (
          <article key={label} className="min-h-[104px] min-w-0 bg-white/[0.025] p-3">
            <div className="flex items-center justify-between text-sky-300"><Icon size={16}/>{Number.isFinite(direction) && <DirectionArrow degrees={direction}/>}</div>
            <p className="mt-3 truncate text-[10px] font-medium text-white/45">{label}</p>
            <p className="mt-0.5 tabular-nums text-xl font-semibold text-white">{metricValue}<span className="ml-1 text-[10px] font-medium text-white/45">{unit}</span></p>
            {detail && <p className="mt-1 text-[10px] font-semibold text-sky-300">{detail}</p>}
            {badge && <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${badge.className}`} title={t("marine.pressureCondition")}>{badge.label}</p>}
          </article>
        ))}
        </div>
      </div>
    </section>
  );
}

function WaveTrend({ hours, t }) {
  const points = hours.filter((hour) => Number.isFinite(hour.significantWaveHeightM));
  if (points.length < 2) return null;
  const values = points.map((hour) => hour.significantWaveHeightM);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.25);
  const coordinates = points.map((hour, index) => `${(index / (points.length - 1)) * 100},${31 - ((hour.significantWaveHeightM - min) / range) * 23}`).join(" ");
  return (
    <section className="min-h-[120px] min-w-0 rounded-lg border border-white/[0.065] bg-white/[0.025] px-3 py-[11px]">
      <div className="flex items-center justify-between"><h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60">{t("marine.waveTrend")}</h3><span className="text-[10px] tabular-nums text-white/40">{value(min)}–{value(max)} m</span></div>
      <svg className="mt-2 h-[74px] w-full overflow-visible" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="marine-wave-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#38bdf8" stopOpacity="0.5"/><stop offset="1" stopColor="#38bdf8" stopOpacity="0.03"/></linearGradient></defs>
        <line x1="0" y1="35" x2="100" y2="35" stroke="rgba(255,255,255,.08)" vectorEffect="non-scaling-stroke"/>
        <polygon points={`0,36 ${coordinates} 100,36`} fill="url(#marine-wave-area)"/>
        <polyline points={coordinates} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
      </svg>
      <div className="flex justify-between text-[9px] font-medium text-white/35"><span>{points[0].time}</span><span>{points[Math.floor(points.length / 2)].time}</span><span>{points.at(-1).time}</span></div>
    </section>
  );
}

function TideEvents({ tides, locale, t }) {
  return (
    <section className="min-h-[120px] min-w-0 rounded-lg border border-white/[0.065] bg-white/[0.025] px-3 py-[11px]">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60">{t("marine.nextTides")}</h3>
      <div className="mt-2 grid gap-1.5">
        {tides.length ? tides.slice(0, 4).map((event, index) => {
          const high = event.type.includes("high");
          return <div key={`${event.time}-${index}`} className="flex items-center gap-2 rounded-md bg-white/[0.045] px-2.5 py-1.5">
            <span className={`grid h-6 w-6 place-items-center rounded-full ${high ? "bg-sky-400/15 text-sky-300" : "bg-teal-400/15 text-teal-300"}`}>{high ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}</span>
            <span className="min-w-0 flex-1 text-[10px] font-medium text-white/55">{high ? t("marine.highTide") : t("marine.lowTide")}</span>
            <strong className="text-[11px] tabular-nums text-white/85">{tideTime(event, locale)}</strong>
            <span className="w-11 text-right text-[10px] tabular-nums text-white/45">{value(event.heightM)} m</span>
          </div>;
        }) : <p className="py-6 text-center text-[10px] text-white/35">{t("marine.noTides")}</p>}
      </div>
    </section>
  );
}

function ForecastRow({ icon: Icon, label, hours, currentTime, render }) {
  return <tr className="border-t border-white/[0.06]">
    <th className="sticky left-0 z-10 bg-[#202124] px-3 py-2 text-left font-medium text-white/60"><span className="flex items-center gap-2"><Icon size={13} className="text-sky-300"/>{label}</span></th>
    {hours.map((hour) => <td key={hour.time} className={`relative border-l border-white/[0.055] px-2 py-2 tabular-nums text-white/80 ${hour.time === currentTime ? "bg-amber-300/[0.055] before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-amber-300" : ""}`}>{render(hour)}</td>)}
  </tr>;
}

function DirectionArrow({ degrees }) {
  return <ArrowUp size={16} style={{ transform: `rotate(${oppositeBearing(degrees)}deg)` }}/>;
}

function Direction({ degrees, label }) {
  if (!Number.isFinite(degrees)) return "–";
  return <span className="inline-flex items-center gap-1" title={`${label || degrees.toFixed(0)}° from`}><DirectionArrow degrees={degrees}/><span>{label || `${degrees.toFixed(0)}°`}</span></span>;
}
