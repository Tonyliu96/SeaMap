import { useMemo } from "react";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "./ui.jsx";

function numeric(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : "–";
}

function eventMinute(event) {
  const match = String(event.time || "").match(/(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function timeLabel(minutes) {
  const safeMinutes = Math.max(0, Math.min(24 * 60, Math.round(minutes)));
  const hours = Math.floor(safeMinutes / 60) % 24;
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function isHighTide(event) {
  return String(event.type || "").toLowerCase().includes("high");
}

function buildEstimatedCurve(events) {
  const source = events
    .map((event) => ({ ...event, minute: eventMinute(event) }))
    .filter((event) => Number.isFinite(event.minute) && Number.isFinite(event.heightM))
    .sort((a, b) => a.minute - b.minute);
  if (source.length < 2) return [];

  const samples = [];
  source.slice(0, -1).forEach((start, index) => {
    const end = source[index + 1];
    const duration = end.minute - start.minute;
    const steps = Math.max(1, Math.ceil(duration / 15));
    for (let step = 0; step < steps; step += 1) {
      const progress = step / steps;
      const eased = (1 - Math.cos(Math.PI * progress)) / 2;
      const minute = start.minute + duration * progress;
      samples.push({
        minute,
        hour: minute / 60,
        time: timeLabel(minute),
        heightM: start.heightM + (end.heightM - start.heightM) * eased,
        estimated: step !== 0,
        eventType: step === 0 ? start.type : null
      });
    }
  });
  const finalEvent = source.at(-1);
  samples.push({ minute: finalEvent.minute, hour: finalEvent.minute / 60, time: timeLabel(finalEvent.minute), heightM: finalEvent.heightM, estimated: false, eventType: finalEvent.type });
  return samples;
}

function TideTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-xl border border-aqua-soft bg-surface/95 px-3 py-2 shadow-marine backdrop-blur dark:border-white/10 dark:bg-dark-surface/95">
      <p className="text-[10px] font-medium tabular-nums text-steel">{point.time}</p>
      <p className="mt-0.5 text-xs font-semibold tabular-nums text-ink-strong dark:text-dark-ink">Estimated tide {numeric(point.heightM)} m</p>
    </div>
  );
}

function TideEventDot({ cx, cy, payload }) {
  if (payload.estimated || !payload.eventType) return null;
  const high = isHighTide({ type: payload.eventType });
  const anchor = payload.hour < 5 ? "start" : payload.hour > 19 ? "end" : "middle";
  const labelX = payload.hour < 5 ? 8 : payload.hour > 19 ? -8 : 0;
  // Keep every label above its marker so low-tide text stays clear of the X axis.
  const labelY = -14;
  return (
    <g transform={`translate(${cx} ${cy})`} className={high ? "text-primary" : "text-coral"}>
      <circle r="4.5" fill="currentColor" stroke="white" strokeWidth="2"/>
      <path d={high ? "M -3 -7 L 0 -11 L 3 -7 Z" : "M -3 7 L 0 11 L 3 7 Z"} fill="currentColor"/>
      <text x={labelX} y={labelY} textAnchor={anchor} className="fill-ink-strong stroke-surface text-[8px] font-semibold tabular-nums [paint-order:stroke] [stroke-linejoin:round] [stroke-width:3px] dark:fill-dark-ink dark:stroke-dark-surface sm:text-[9px]">
        {high ? "▲" : "▼"} {payload.time} · {numeric(payload.heightM)}m
      </text>
    </g>
  );
}

export default function MarineTideChart({ tides, currentTime, locale, t }) {
  const events = useMemo(
    () => tides
      .map((event) => ({ ...event, minute: eventMinute(event) }))
      .filter((event) => Number.isFinite(event.minute) && Number.isFinite(event.heightM))
      .sort((a, b) => a.minute - b.minute),
    [tides]
  );
  const data = useMemo(() => buildEstimatedCurve(tides), [tides]);
  if (events.length < 2) {
    return <section className="grid min-h-[220px] place-items-center rounded-2xl border border-aqua-soft/70 bg-surface text-xs text-steel shadow-sm dark:border-white/10 dark:bg-white/[0.04]">{t("marine.noTides")}</section>;
  }

  const heights = events.map((event) => event.heightM);
  const rawMin = Math.min(...heights);
  const rawMax = Math.max(...heights);
  const padding = Math.max((rawMax - rawMin) * 0.22, 0.18);
  const yMin = Math.floor((rawMin - padding) * 10) / 10;
  const yMax = Math.ceil((rawMax + padding) * 10) / 10;
  const currentHour = currentTime ? eventMinute({ time: currentTime }) / 60 : null;
  const summary = events.map((event) => `${isHighTide(event) ? "High" : "Low"} tide at ${timeLabel(event.minute)}, ${numeric(event.heightM)} metres`).join("; ");

  return (
    <section className="flex h-full min-w-0 flex-col rounded-2xl border border-aqua-soft/70 bg-surface p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]" aria-label="Estimated tide chart">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink-strong dark:text-dark-ink">{t("marine.nextTides")}</h3>
        <Badge tone="steel">{numeric(rawMin)}–{numeric(rawMax)} m</Badge>
      </div>
      <p className="sr-only">Estimated tide curve. {summary}</p>

      <div className="relative mt-2 h-[156px] min-h-[136px] sm:h-[184px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 28, right: 10, bottom: 8, left: -22 }}>
            <XAxis type="number" dataKey="hour" domain={[0, 24]} ticks={[0, 6, 12, 18, 24]} tickFormatter={(hour) => `${String(hour % 24).padStart(2, "0")}:00`} tick={{ fill: "currentColor", fontSize: 10 }} className="text-steel" tickLine={false} axisLine={false}/>
            <YAxis domain={[yMin, yMax]} tickCount={3} tick={{ fill: "currentColor", fontSize: 10 }} className="text-steel" tickLine={false} axisLine={false} unit="m"/>
            <Tooltip content={<TideTooltip/>} cursor={{ stroke: "currentColor", strokeOpacity: 0.35 }} wrapperClassName="z-30 outline-none"/>
            {Number.isFinite(currentHour) && <ReferenceLine x={currentHour} className="text-primary" stroke="currentColor" strokeWidth={1.5} strokeDasharray="4 4"/>}
            <Line type="monotone" dataKey="heightM" className="text-ink" stroke="currentColor" strokeWidth={2.25} dot={<TideEventDot/>} activeDot={{ r: 4, strokeWidth: 2 }} isAnimationActive={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-auto grid min-h-12 grid-cols-1 items-center gap-x-3 gap-y-1 border-t border-aqua-soft/60 pt-2 sm:grid-cols-2">
        {events.map((event) => {
          const high = isHighTide(event);
          return (
            <span key={`${event.time}-${event.type}-summary`} className="inline-flex min-w-0 items-center justify-center gap-1 whitespace-nowrap text-[10px] font-medium text-steel">
              <span className={high ? "text-primary" : "text-coral"}>{high ? "▲" : "▼"}</span>
              <span>{high ? t("marine.highTide") : t("marine.lowTide")}</span>
              <strong className="tabular-nums text-ink-strong dark:text-dark-ink">{new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(event.time))}</strong>
              <span className="tabular-nums text-ink">{numeric(event.heightM)} m</span>
            </span>
          );
        })}
      </div>
    </section>
  );
}
