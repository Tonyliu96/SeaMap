import { useMemo } from "react";
import { estimateTideExtrema } from "../utils/tideExtrema.js";

export default function TideChartRow({ label, values, currentTime }) {
    const height = 74;
    const cellWidth = 44;
    const totalWidth = values.length * cellWidth;
    const padding = 22;

    const validLevels = values
        .map((h) => h.seaLevel)
        .filter((v) => Number.isFinite(v));

    const minLevel = validLevels.length ? Math.min(...validLevels) : -1;
    const maxLevel = validLevels.length ? Math.max(...validLevels) : 1;
    const range = maxLevel - minLevel || 1;

    // Coordinate mapping
    const points = values.map((h, i) => {
        const x = i * cellWidth + cellWidth / 2;
        const level = Number.isFinite(h.seaLevel) ? h.seaLevel : 0;
        const normalizedY = (level - minLevel) / range;
        const y = height - padding - normalizedY * (height - 2 * padding);
        return { x, y, value: h.seaLevel, time: h.time };
    });

    // Y-coordinate of the 0 tick mark (MSL)
    const zeroY = height - padding - ((0 - minLevel) / range) * (height - 2 * padding);
    const currentX = useMemo(() => {
        if (!(currentTime instanceof Date) || !points.length) return null;
        const firstTime = points[0].time?.getTime();
        const lastTime = points.at(-1).time?.getTime();
        const timeRange = lastTime - firstTime;
        if (!(timeRange > 0)) return null;
        const ratio = (currentTime.getTime() - firstTime) / timeRange;
        return cellWidth / 2 + ratio * Math.max(0, totalWidth - cellWidth);
    }, [currentTime, points, cellWidth, totalWidth]);

    // Calculate the smooth curve path
    const pathD = useMemo(() => {
        if (points.length < 2) return "";
        return points.reduce((acc, pt, i, arr) => {
            if (i === 0) return `M ${pt.x},${pt.y}`;
            const prev = arr[i - 1];
            const cx = (prev.x + pt.x) / 2;
            return `${acc} C ${cx},${prev.y} ${cx},${pt.y} ${pt.x},${pt.y}`;
        }, "");
    }, [points]);

    // Closed paths are used for wave gradient fill
    const areaD = useMemo(() => {
        if (!pathD || points.length === 0) return "";
        const firstX = points[0].x;
        const lastX = points[points.length - 1].x;
        return `${pathD} L ${lastX},${height} L ${firstX},${height} Z`;
    }, [pathD, points, height]);

    const peakPoints = useMemo(() => {
        const extrema = estimateTideExtrema(points.map((point) => ({
            time: point.time,
            value: point.value
        })));
        const firstTime = points[0]?.time?.getTime();
        const lastTime = points.at(-1)?.time?.getTime();
        const timeRange = lastTime - firstTime;

        return extrema.map((event) => {
            const ratio = timeRange > 0 ? (event.time.getTime() - firstTime) / timeRange : 0;
            const x = cellWidth / 2 + ratio * Math.max(0, totalWidth - cellWidth);
            const normalizedY = (event.height - minLevel) / range;
            return {
                ...event,
                x,
                y: height - padding - normalizedY * (height - 2 * padding),
                value: event.height
            };
        });
    }, [points, cellWidth, totalWidth, minLevel, range, height, padding]);

    return (
        <>
            <div className="mhl-grid-label sticky left-0 z-20 flex flex-col justify-center font-mono font-bold uppercase">
                <span>{label}</span>
            </div>

            <div className="relative bg-[#0b0d0f]" style={{ gridColumn: `span ${values.length}`, height: `${height}px` }}>
                <svg width={totalWidth} height={height} className="absolute left-0 top-0 overflow-visible">
                    <defs>
                        <linearGradient id="tide-gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6ee7f5" stopOpacity="0.24" />
                            <stop offset="100%" stopColor="#3564f4" stopOpacity="0.02" />
                        </linearGradient>
                    </defs>

                    <line x1="0" y1={zeroY} x2={totalWidth} y2={zeroY} stroke="#59616b" strokeDasharray="3 3" strokeOpacity="0.65" strokeWidth="1"/>

                    {Number.isFinite(currentX) && (
                        <line x1={currentX} y1="0" x2={currentX} y2={height} stroke="#ffe100" strokeOpacity="0.9" strokeWidth="1"/>
                    )}

                    <path d={areaD} fill="url(#tide-gradient)" />

                    <path d={pathD} fill="none" stroke="#6ee7f5" strokeWidth="2"/>

                    {peakPoints.map((pt, idx) => {
                        const isHigh = pt.kind === "high";
                        const textY = isHigh ? pt.y - 12 : pt.y + 14;
                        const timeLabel = new Intl.DateTimeFormat("en-AU", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                            timeZone: "Australia/Sydney"
                        }).format(pt.time);
                        const labelText = `${timeLabel} ${pt.value.toFixed(1)}m`;

                        return (
                            <g key={idx}>
                                <circle cx={pt.x} cy={pt.y} r="3.5" fill="#6ee7f5" stroke="#0b0d0f" strokeWidth="1.5" />

                                <rect x={pt.x - 30} y={textY - 9} width="60" height="14" fill="#15191d" fillOpacity="0.98" stroke="#343a42" strokeWidth="0.8"/>

                                <text x={pt.x} y={textY} textAnchor="middle" dominantBaseline="central" className="fill-[#f7f3e8] font-mono text-[9px] font-bold">
                                    {labelText}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </>
    );
}
