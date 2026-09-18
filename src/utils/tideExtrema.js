const MAX_VERTEX_OFFSET = 0.5;
const DUPLICATE_WINDOW_MS = 90 * 60 * 1000;

export function estimateTideExtrema(samples) {
  const candidates = [];

  for (let index = 1; index < samples.length - 1; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const next = samples[index + 1];
    if (!isValidSample(previous) || !isValidSample(current) || !isValidSample(next)) continue;

    const isHigh = current.value >= previous.value && current.value >= next.value;
    const isLow = current.value <= previous.value && current.value <= next.value;
    if (!isHigh && !isLow) continue;

    const curvature = previous.value - 2 * current.value + next.value;
    const rawOffset = curvature === 0
      ? 0
      : (previous.value - next.value) / (2 * curvature);
    const offset = Math.max(-MAX_VERTEX_OFFSET, Math.min(MAX_VERTEX_OFFSET, rawOffset));
    const intervalMs = (next.time.getTime() - previous.time.getTime()) / 2;
    const time = new Date(current.time.getTime() + offset * intervalMs);
    const value = curvature === 0
      ? current.value
      : current.value - ((next.value - previous.value) ** 2) / (8 * curvature);

    candidates.push({
      kind: isHigh && !isLow ? "high" : isLow && !isHigh ? "low" : curvature < 0 ? "high" : "low",
      time,
      height: value
    });
  }

  return mergeDuplicateExtrema(candidates);
}

function mergeDuplicateExtrema(events) {
  return events.reduce((merged, event) => {
    const previous = merged.at(-1);
    if (
      previous &&
      previous.kind === event.kind &&
      event.time - previous.time <= DUPLICATE_WINDOW_MS
    ) {
      const eventIsMoreExtreme = event.kind === "high"
        ? event.height > previous.height
        : event.height < previous.height;
      if (eventIsMoreExtreme) merged[merged.length - 1] = event;
      return merged;
    }

    merged.push(event);
    return merged;
  }, []);
}

function isValidSample(sample) {
  return sample?.time instanceof Date && Number.isFinite(sample.value);
}
