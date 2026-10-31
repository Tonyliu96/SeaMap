import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { oppositeBearing } from "../utils/mapVectors.js";
import { Badge } from "./ui.jsx";

function numeric(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : "–";
}

function hourNumber(time) {
  const parsed = Number.parseInt(time, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function SwellTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const hour = payload[0].payload;
  return (
    <div className="min-w-44 rounded-xl border border-aqua-soft bg-surface/95 p-3 shadow-marine backdrop-blur dark:border-white/10 dark:bg-dark-surface/95">
      <p className="mb-2 text-xs font-bold tabular-nums text-ink-strong dark:text-dark-ink">{hour.time}</p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-xs">
        <dt className="text-steel">Wave height</dt><dd className="font-semibold tabular-nums text-ink">{numeric(hour.significantWaveHeightM)} m</dd>
        <dt className="text-steel">Period</dt><dd className="font-semibold tabular-nums text-coral-ink">{numeric(hour.swellPeriodSeconds)} s</dd>
        <dt className="text-steel">Swell from</dt><dd className="font-semibold text-ink">{hour.swellDirection || "–"}</dd>
        <dt className="text-steel">Wind</dt><dd className="font-semibold tabular-nums text-ink">{numeric(hour.windSpeedKmh, 0)} km/h</dd>
        <dt className="text-steel">Wind from</dt><dd className="font-semibold text-ink">{hour.windDirection || "–"}</dd>
      </dl>
    </div>
  );
}

function DirectionArrow({ degrees }) {
  if (!Number.isFinite(degrees)) return <span aria-hidden="true">–</span>;
  return <ArrowUp className="h-4 w-4 text-ink" style={{ transform: `rotate(${oppositeBearing(degrees)}deg)` }}/>
}

export default function MarineSwellChart({ hours, currentTime, t }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const data = useMemo(
    () => hours.filter((hour) => Number.isFinite(hour.significantWaveHeightM)),
    [hours]
  );
  const bandStep = width >= 920 ? 2 : width >= 620 ? 3 : width >= 420 ? 4 : 6;
  const bandData = useMemo(
    () => data.filter((hour) => hourNumber(hour.time) % bandStep === 0),
    [bandStep, data]
  );

  if (data.length < 2) return null;
  const waveValues = data.map((hour) => hour.significantWaveHeightM);
  const minimum = Math.min(...waveValues);
  const maximum = Math.max(...waveValues);
  const yMaximum = Math.max(2, Math.ceil(maximum));
  const summary = `Wave heights range from ${numeric(minimum)} to ${numeric(maximum)} metres across ${data.length} hourly observations.`;

  return (
    <section ref={containerRef} className="h-full min-w-0 rounded-2xl border border-aqua-soft/70 bg-surface p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]" aria-label="Swell forecast chart">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink-strong dark:text-dark-ink">{t("marine.waveTrend")}</h3>
        <Badge tone="steel">{numeric(minimum)}–{numeric(maximum)} m</Badge>
      </div>
      <p className="sr-only">{summary}</p>

      <div className="mt-2 h-[132px] min-h-[112px] sm:h-[154px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
            <defs>
              <linearGradient id="marine-swell-area" x1="0" y1="0" x2="0" y2="1">
                <stop className="text-aqua" offset="0%" stopColor="currentColor" stopOpacity={0.42}/>
                <stop className="text-aqua-soft" offset="100%" stopColor="currentColor" stopOpacity={0.18}/>
              </linearGradient>
            </defs>
            <CartesianGrid className="text-aqua-soft" stroke="currentColor" strokeOpacity={0.5} vertical={false}/>
            <XAxis dataKey="time" interval="preserveStartEnd" minTickGap={32} tick={{ fill: "currentColor", fontSize: 10 }} className="text-steel" tickLine={false} axisLine={false}/>
            <YAxis domain={[0, yMaximum]} tickCount={3} tick={{ fill: "currentColor", fontSize: 10 }} className="text-steel" tickLine={false} axisLine={false} unit="m"/>
            <Tooltip content={<SwellTooltip/>} cursor={{ stroke: "currentColor", strokeOpacity: 0.35 }} wrapperClassName="z-30 outline-none"/>
            {currentTime && <ReferenceLine x={currentTime} className="text-primary" stroke="currentColor" strokeWidth={1.5} strokeDasharray="4 4"/>}
            <Area type="monotone" dataKey="significantWaveHeightM" className="text-ink" stroke="currentColor" strokeWidth={2.25} fill="url(#marine-swell-area)" activeDot={{ r: 4, strokeWidth: 2 }} isAnimationActive={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-1 flex border-t border-aqua-soft/60 pt-2" aria-label={`Swell details every ${bandStep} hours`}>
        {bandData.map((hour, index) => (
          <div key={hour.time} className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 text-center ${index ? "border-l border-aqua-soft/50" : ""}`}>
            <span className="text-[10px] font-medium tabular-nums text-steel">{hour.time}</span>
            <span className="text-[10px] font-semibold text-ink">{hour.swellDirection || "–"}</span>
            <DirectionArrow degrees={hour.swellDirectionDegrees}/>
            <strong className="text-xs tabular-nums text-ink-strong dark:text-dark-ink">{numeric(hour.significantWaveHeightM)} m</strong>
            <span className="text-[10px] font-semibold tabular-nums text-coral-ink">{numeric(hour.swellPeriodSeconds)} s</span>
          </div>
        ))}
      </div>
    </section>
  );
}
