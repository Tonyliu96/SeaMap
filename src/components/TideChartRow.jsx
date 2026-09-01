import { useMemo } from "react";

export default function TideChartRow({ label, values }) {
    const height = 90; // 稍微增加高度给标签留出空间
    const cellWidth = 48;
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

    // Calculate extreme points (high tide / low tide)
    const peakPoints = useMemo(() => {
        return points.filter((pt, i, arr) => {
            if (i === 0 || i === arr.length - 1 || !Number.isFinite(pt.value)) return false;
            const prev = arr[i - 1].value;
            const next = arr[i + 1].value;
            const isHigh = pt.value > prev && pt.value >= next;
            const isLow = pt.value < prev && pt.value <= next;
            return isHigh || isLow;
        });
    }, [points]);

    return (
        <>
            {/* Fixed heading on the left */}
            <div className="mhl-grid-label sticky left-0 z-20 flex flex-col justify-center bg-slate-900/95 font-medium text-slate-300">
                <span>{label}</span>
            </div>

            {/* Right-side wave pattern */}
            <div className="relative bg-slate-950/60" style={{ gridColumn: `span ${values.length}`, height: `${height}px` }}>
                <svg width={totalWidth} height={height} className="absolute left-0 top-0 overflow-visible">
                    <defs>
                        {/* Wave-like color gradient */}
                        <linearGradient id="tide-gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                        </linearGradient>
                    </defs>

                    {/* MSL (dashed line) */}
                    <line x1="0" y1={zeroY} x2={totalWidth} y2={zeroY} stroke="#64748b" strokeDasharray="3 3" strokeOpacity="0.5" strokeWidth="1"/>

                    {/* Wave gradient fill */ }
                    <path d={areaD} fill="url(#tide-gradient)" />

                    {/* Main wave line */}
                    <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round"/>

                    {/* Highlighting extreme points and bubble text */}
                    {peakPoints.map((pt, idx) => {
                        const isHigh = pt.value >= 0;
                        const textY = isHigh ? pt.y - 12 : pt.y + 14;
                        const hours = String(pt.time.getHours()).padStart(2, "0");
                        const mins = String(pt.time.getMinutes()).padStart(2, "0");
                        const labelText = `${hours}:${mins} ${pt.value.toFixed(1)}m`;

                        return (
                            <g key={idx}>
                                {/* Tidal point ring */}
                                <circle cx={pt.x} cy={pt.y} r="3.5" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />

                                {/* Capsule background frame */}
                                <rect x={pt.x - 30} y={textY - 9} width="60" height="14" rx="4" fill="#0f172a" fillOpacity="0.75" stroke="#38bdf8" strokeOpacity="0.3" strokeWidth="0.8"/>

                                {/* Text Labels */}
                                <text x={pt.x} y={textY} textAnchor="middle" dominantBaseline="central" className="fill-sky-100 text-[9px] font-semibold tracking-tight">
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