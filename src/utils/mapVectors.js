export function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

export function normaliseDegrees(value) {
  return ((value % 360) + 360) % 360;
}

export function vectorFromBearing(degrees) {
  const radians = degreesToRadians(degrees);
  return {
    x: Math.sin(radians),
    y: Math.cos(radians)
  };
}

export function averageDirectionalReadings(readings) {
  const vectors = readings
    .filter((reading) => Number.isFinite(reading.direction))
    .map((reading) => {
      const vector = vectorFromBearing(reading.direction);
      return {
        ...vector,
        speed: Number.isFinite(reading.speed) ? reading.speed : null
      };
    });

  if (!vectors.length) return { direction: null, speed: null };

  const sum = vectors.reduce(
    (total, vector) => ({
      x: total.x + vector.x,
      y: total.y + vector.y,
      speed: total.speed + (vector.speed ?? 0),
      speedCount: total.speedCount + (vector.speed === null ? 0 : 1)
    }),
    { x: 0, y: 0, speed: 0, speedCount: 0 }
  );

  return {
    direction: normaliseDegrees((Math.atan2(sum.x, sum.y) * 180) / Math.PI),
    speed: sum.speedCount ? sum.speed / sum.speedCount : null
  };
}

export function screenVectorFromBearing(direction) {
  const radians = degreesToRadians(normaliseDegrees(direction));
  return {
    x: Math.sin(radians),
    y: -Math.cos(radians)
  };
}
