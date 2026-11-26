import type { MarketHistoryPoint, MarketHistoryResponse } from "../types/atie";

export type TrajectoryChartPoint = {
  key: string;
  label: string;
  actual: number | null;
  model: number | null;
  naive: number | null;
  ma7: number | null;
};

export function formatTrajectoryDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-LK", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function trailingSevenDayAverage(
  points: MarketHistoryPoint[],
): number | null {
  if (points.length === 0) return null;
  const window = points.slice(-7);
  const sum = window.reduce((acc, item) => acc + item.priceLkrPerKg, 0);
  return Math.round((sum / window.length) * 100) / 100;
}

export function buildTrajectoryChartData(
  history: MarketHistoryResponse | null,
): TrajectoryChartPoint[] {
  if (!history || history.history.length === 0) return [];
  const points: TrajectoryChartPoint[] = history.history.map((point, index) => ({
    key: point.date || `obs-${index}`,
    label: formatTrajectoryDate(point.date),
    actual: Number.isFinite(point.priceLkrPerKg) ? point.priceLkrPerKg : null,
    model: null,
    naive: null,
    ma7: null,
  }));
  const last = points.at(-1);
  if (!last) return [];
  history.forecastTrajectory.forEach((forecast) => {
    points.push({
      key: `forecast-${forecast.horizonHours}h`,
      label: `+${forecast.horizonHours}h`,
      actual: null,
      model: Number.isFinite(forecast.predictedPriceLkr)
        ? forecast.predictedPriceLkr
        : null,
      naive: Number.isFinite(forecast.baselineNaiveLkr)
        ? forecast.baselineNaiveLkr
        : null,
      ma7: Number.isFinite(forecast.baselineMa7Lkr)
        ? forecast.baselineMa7Lkr
        : null,
    });
  });
  const bridge = history.forecastTrajectory[0];
  if (bridge) {
    last.model = last.actual;
    last.naive =
      history.forecastSource === "DEMO_FIXTURE"
        ? bridge.baselineNaiveLkr
        : last.actual;
    last.ma7 =
      history.forecastSource === "DEMO_FIXTURE"
        ? bridge.baselineMa7Lkr
        : (trailingSevenDayAverage(history.history) ?? bridge.baselineMa7Lkr);
  }
  return points;
}
