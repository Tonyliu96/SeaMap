import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, Navigation, Timer, Waves, Wind, X } from "lucide-react";
import { fetchMhlBuoyForecast } from "../services/mhlWaves.js";
import {formatMeters, formatSeconds, formatWindDirection, formatWindSpeed} from "../services/tides.js";
import TideChartRow from "./TideChartRow.jsx";
import {formatDateKey, formatHour,formatNumber, formatObservedAt, groupHoursByDay} from "../utils/mhlFormatters.js";
import { oppositeBearing } from "../utils/mapVectors.js";
import { Badge, Card, IconButton, StatTile } from "./ui.jsx";
import ResizablePanelHandle, { useResizablePanel } from "./ResizablePanelHandle.jsx";


const VISIBLE_HOURS = 96;

export default function MhlBuoyForecastPanel({ buoy, onClose, t }) {
  const [status, setStatus] = useState("idle");
  const [forecast, setForecast] = useState(null);
  const [hourStep, setHourStep] = useState(1);
  const forecastScrollerRef = useRef(null);
  const panelSize = useResizablePanel("seamap-mhl-panel-height", 340, 210);

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

  useEffect(() => {
    if (status !== "ready" || !currentTime || !forecastScrollerRef.current) return;
    const currentIndex = hours.findIndex((hour) => hour.time.getTime() === currentTime.getTime());
    if (currentIndex < 0) return;

    const scroller = forecastScrollerRef.current;
    const target = 68 + currentIndex * 44 - scroller.clientWidth * 0.42;
    scroller.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [currentTime, hours, status]);

  const scrollForecast = (direction) => {
    forecastScrollerRef.current?.scrollBy({
      left: direction * Math.max(264, forecastScrollerRef.current.clientWidth * 0.72),
      behavior: "smooth"
    });
  };

  if (!buoy) return null;

  return (
    <Card as="section" className="absolute bottom-[76px] left-3 right-3 z-[700] flex min-h-[210px] flex-col overflow-hidden rounded-t-3xl rounded-b-2xl md:bottom-4 md:left-4 md:right-4" style={{ height: `${panelSize.height}px` }}>
      <ResizablePanelHandle onPointerDown={panelSize.onPointerDown} resizeBy={panelSize.resizeBy} label="Resize wave forecast panel" />
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-aqua-soft/70 px-4 pb-3 pt-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-aqua-soft/40 text-primary">
            <Waves size={17} />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-[15px] font-bold text-ink-strong dark:text-dark-ink">
              {buoy.name ?? buoy.sitecode}
              </h2>
              <Badge tone="steel" className="hidden text-[10px] sm:inline-flex">
                {buoy.sitecode}
              </Badge>
            </div>
            <p className="truncate text-xs text-steel">
              {t("mhl.panelTitle")} · {buoy.latitude.toFixed(4)}, {buoy.longitude.toFixed(4)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ObservationFreshness observedAt={forecast?.latest?.observedAt} status={status} t={t}/>
          <IconButton
            onClick={onClose}
            title={t("mhl.closePanel")}
            aria-label={t("mhl.closePanel")}>
            <X size={15} />
          </IconButton>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-2 [scrollbar-color:theme(colors.aqua)_transparent] [scrollbar-width:thin]">
        {status === "loading" && (
          <div className="grid h-full min-h-40 place-items-center">
            <div className="flex items-center gap-2 text-sm text-steel">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              {t("mhl.forecastLoading")}
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-xl border border-coral/40 bg-coral/10 px-3 py-4 text-sm text-coral-ink">
            {t("mhl.forecastError")}
          </div>
        )}

        {status === "ready" && (
          <>
            <div className="mb-2 flex items-center justify-between gap-2 px-1 text-xs">
              <span className="font-semibold text-primary">{t("mhl.observationSource")}</span>
              <span className="text-steel">{t("mhl.automaticObservation")}</span>
            </div>
            <CurrentObservation latest={forecast?.latest} t={t}/>
            <ForecastToolbar
              hourStep={hourStep}
              setHourStep={setHourStep}
              onScroll={scrollForecast}
              t={t}/>

            <div ref={forecastScrollerRef} className="overflow-x-auto rounded-xl border border-aqua-soft/70 [scrollbar-color:theme(colors.aqua)_transparent] [scrollbar-width:thin]">
              <div
                className="grid min-w-max text-xs text-ink-strong [&>*]:min-h-7 [&>*]:border-b [&>*]:border-r [&>*]:border-aqua-soft/60"
                style={{ gridTemplateColumns: `68px repeat(${hours.length}, 44px)` }}>
                <DayRow hours={hours} t={t} />
                <HeaderRow hours={hours} currentTime={currentTime} t={t} />
                <ArrowRow label={t("mhl.wind")} values={hours} field="windDirection" currentTime={currentTime} />
                <ValueRow label="km/h" values={hours} field="windSpeed" currentTime={currentTime} formatter={(value) => formatNumber(value, 0)} />
                <ValueRow label={t("mhl.temperature")} values={hours} field="temperature" currentTime={currentTime} formatter={(value) => formatNumber(value, 0)} />
                <ArrowRow label={t("mhl.swell")} values={hours} field="waveDirection" currentTime={currentTime} strong />
                <ValueRow icon={Waves} label={t("mhl.waveHeight") ?? "Wave"} values={hours} field="waveHeight"
                    currentTime={currentTime}
                    formatter={(value) => formatNumber(value, 1)}
                    colorClass="bg-aqua-soft/25 font-semibold text-ink-strong"/>

                <ValueRow label={t("mhl.wavePeriod") ?? "Wave period"} values={hours} field="wavePeriod"
                    currentTime={currentTime}
                    formatter={(value) => formatNumber(value, 0)}
                    colorClass="bg-bg text-ink"/>
                <TideChartRow label={t("mhl.tideMsl")} values={hours} currentTime={currentTime} />
              </div>
            </div>
            <p className="px-1 pt-2 text-[10px] leading-4 text-steel">
              {t("mhl.disclaimer")}
            </p>
          </>
        )}
      </div>
    </Card>
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
      <div className="sticky left-0 z-20 flex items-center justify-end bg-bg px-2 text-xs font-medium text-steel">{t("mhl.day")}</div>
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
            className="relative flex items-center border-b-2 border-primary/20 bg-sea px-2 font-semibold text-ink"
            style={{ gridColumn: `span ${group.count}` }}>
            <span className="truncate">{group.label}</span>
            {showNow && (
              <span className="absolute top-0 z-10 -translate-x-1/2 rounded-b-lg bg-primary px-1.5 py-0.5 text-[8px] font-bold text-white shadow-sm" style={{ left: nowLeft }}>
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric icon={Waves} title={t("mhl.latestWaveHeight")} value={formatMeters(latest?.waveHeight, t)} />
        <Metric icon={Timer} title={t("mhl.latestWavePeriod")} value={formatSeconds(latest?.wavePeriod, t)} />
        <Metric icon={Navigation} title={t("mhl.latestWaveDirection")} value={formatWindDirection(latest?.waveDirection, t)} />
        <Metric icon={Clock3} title={t("mhl.observedAt")} value={formatObservedAt(latest?.observedAt, t)} />
      </div>
  );
}

function ObservationFreshness({ observedAt, status, t }) {
  if (status !== "ready") return null;
  const observedTime = observedAt instanceof Date ? observedAt : new Date(observedAt);
  const ageMinutes = Number.isNaN(observedTime.getTime())
    ? null
    : Math.max(0, Math.round((Date.now() - observedTime.getTime()) / 60000));
  const stale = ageMinutes === null || ageMinutes > 180;

  return (
    <Badge tone={stale ? "amber" : "primary"} className="hidden items-center gap-1.5 sm:inline-flex">
      <span className={`h-1.5 w-1.5 rounded-full ${stale ? "bg-amber-ink" : "bg-primary"}`} />
      {stale
        ? t("mhl.staleData")
        : t("mhl.updatedMinutes", { minutes: ageMinutes })}
    </Badge>
  );
}

function Metric({ icon: Icon, title, value }) {
  return (
      <StatTile icon={Icon} label={title} value={value} />
  );
}

function ForecastToolbar({ hourStep, setHourStep, onScroll, t }) {
  return (
    <div className="flex h-10 items-center justify-between gap-2 px-1">
      <div className="flex items-center gap-2 text-xs font-medium text-steel">
        <span>{t("mhl.modelForecast")}</span>
        <span className="h-1 w-1 rounded-full bg-aqua" />
        <span className="text-primary">Open-Meteo</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex items-center rounded-lg bg-aqua-soft/30 p-0.5">
          {[1, 3].map((step) => (
            <button
              key={step}
              type="button"
              className={`h-7 min-w-9 rounded-md px-2 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                hourStep === step
                  ? "bg-primary text-white shadow-sm"
                  : "text-steel hover:bg-white hover:text-primary"
              }`}
              onClick={() => setHourStep(step)}>
              {step}h
            </button>
          ))}
        </div>
        <IconButton className="h-7 w-7" onClick={() => onScroll(-1)} title={t("mhl.scrollEarlier")} aria-label={t("mhl.scrollEarlier")}>
          <ChevronLeft size={14} />
        </IconButton>
        <IconButton className="h-7 w-7" onClick={() => onScroll(1)} title={t("mhl.scrollLater")} aria-label={t("mhl.scrollLater")}>
          <ChevronRight size={14} />
        </IconButton>
      </div>
    </div>
  );
}

function HeaderRow({hours, currentTime, t}) {
  return (
      <>
        <div className="sticky left-0 z-20 flex items-center bg-bg px-2 text-xs font-medium text-steel">{t("mhl.time")}</div>
        {hours.map((hour) => (
            <div key={`time-${hour.time.toISOString()}`} className={`flex items-center justify-center bg-surface font-semibold tabular-nums text-ink ${currentHourClass(hour.time, currentTime)}`}>
              <span>{formatHour(hour.time)}</span>
            </div>
        ))}
      </>
  );
}

function ArrowRow({label, values, field, currentTime, strong = false}) {
  return (
      <>
        <div className="sticky left-0 z-20 flex items-center gap-1 bg-bg px-2 text-xs font-medium text-steel">
          {field === "windDirection" ? <Wind size={13} className="text-ink"/> : null}
          <span>{label}</span>
        </div>
        {values.map((hour) => (
            <div key={`${field}-${hour.time.toISOString()}`}
                 className={`flex items-center justify-center ${strong ? "bg-sea/70" : "bg-bg"} ${currentHourClass(hour.time, currentTime)}`}>
              {Number.isFinite(hour[field]) ? (
                  <span className="text-ink" style={{transform: `rotate(${arrowBearing(hour[field], field)}deg)` }}>&#8593;</span>
          ) : (
            <span className="text-steel">-</span>
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
        <div className="sticky left-0 z-20 flex items-center gap-1.5 bg-bg px-2 text-xs font-medium text-steel">
          {Icon && <Icon size={13} className="shrink-0 text-primary" />}
          <span className="truncate">{label}</span>
        </div>

        {values.map((hour) => {
          const val = hour[field];

          let dynamicColor = colorClass ?? "bg-bg text-ink-strong";
          if (field === "windSpeed") dynamicColor = windSpeedClass(val);
          if (field === "temperature") dynamicColor = "bg-amber/15 text-ink-strong";
          if (field === "waveHeight") {
            const displayedWaveHeight = Number.isFinite(val)
              ? Number(val.toFixed(1))
              : null;
            dynamicColor = displayedWaveHeight >= 1.5
                ? "bg-coral/25 font-semibold text-ink-strong"
                : waveHeightClass(val);
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
  return currentTime && time.getTime() === currentTime.getTime()
    ? "border-x border-primary bg-primary/10"
    : "";
}

function waveHeightClass(value) {
  if (!Number.isFinite(value)) return "bg-bg text-steel";
  if (value >= 1.2) return "bg-steel/35 font-semibold text-ink-strong";
  if (value >= 0.8) return "bg-aqua/30 text-ink-strong";
  return "bg-aqua-soft/25 text-ink-strong";
}

function windSpeedClass(value) {
  if (!Number.isFinite(value)) return "bg-bg text-steel";
  if (value >= 50) return "bg-coral/35 font-semibold text-ink-strong";
  if (value >= 35) return "bg-ink/85 font-semibold text-white";
  if (value >= 25) return "bg-steel/35 text-ink-strong";
  if (value >= 15) return "bg-aqua/30 text-ink-strong";
  return "bg-aqua-soft/25 text-ink-strong";
}
