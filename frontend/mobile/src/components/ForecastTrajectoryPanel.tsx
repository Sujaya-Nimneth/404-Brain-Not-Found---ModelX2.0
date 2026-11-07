import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import {
  buildTrajectoryChartData,
  type TrajectoryChartPoint,
} from "../../../src/components/trajectoryData";
import { fetchMarketHistory } from "../api/atieClient";
import {
  localizeDirection,
  localizePlaceName,
  UI_STRINGS,
} from "../i18n/translations";
import { colors } from "../theme/colors";
import type {
  ForecastSource,
  LanguageCode,
  MarketComparison,
  MarketHistoryResponse,
} from "../types/atie";

interface Props {
  defaultMarketCode: string;
  recommendedMarketCode: string | null;
  markets: MarketComparison[];
  cropCode: string;
  forecastSource: ForecastSource;
  language: LanguageCode;
}

const CHART_W = 340;
const CHART_H = 190;
const PAD_LEFT = 44;
const PAD_RIGHT = 14;
const PAD_TOP = 14;
const PAD_BOTTOM = 26;

export function ForecastTrajectoryPanel({
  defaultMarketCode,
  recommendedMarketCode,
  markets,
  cropCode,
  forecastSource,
  language,
}: Props) {
  const t = UI_STRINGS[language];
  const [selectedMarket, setSelectedMarket] = useState(defaultMarketCode);
  const [history, setHistory] = useState<MarketHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedMarket(defaultMarketCode);
  }, [defaultMarketCode]);

  const demoMode = forecastSource === "DEMO_FIXTURE" && cropCode === "TOMATO";

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchMarketHistory(
      selectedMarket,
      cropCode,
      14,
      demoMode,
      controller.signal,
    )
      .then((res) => {
        if (active) setHistory(res);
      })
      .catch((err: unknown) => {
        if (!active || controller.signal.aborted) return;
        setHistory(null);
        setError(
          err instanceof Error
            ? err.message
            : "Market forecast trajectory unavailable.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedMarket, cropCode, demoMode]);

  const points = useMemo<TrajectoryChartPoint[]>(
    () => buildTrajectoryChartData(history),
    [history],
  );

  const marketChoices = useMemo(() => {
    if (markets.length > 0) {
      return markets.map((m) => ({
        code: m.marketCode,
        name: m.marketName,
      }));
    }
    return [{ code: defaultMarketCode, name: defaultMarketCode }];
  }, [markets, defaultMarketCode]);

  const geometry = useMemo(() => computeSvgGeometry(points), [points]);
  const activeSource = history?.forecastSource ?? forecastSource;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTag}>{t.forecastTag}</Text>
          <Text style={styles.sectionTitle}>{t.forecastTitle}</Text>
          <Text style={styles.subtitle}>{t.forecastSubtitle}</Text>
        </View>
        <View style={styles.sourcePill}>
          <Text style={styles.sourcePillText}>
            {activeSource.replace(/_/g, " ")}
          </Text>
        </View>
      </View>

      {/* Market Selector Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.marketChips}
      >
        {marketChoices.map((item) => {
          const active = item.code === selectedMarket;
          const isRec = item.code === recommendedMarketCode;
          return (
            <TouchableOpacity
              key={item.code}
              onPress={() => setSelectedMarket(item.code)}
              style={[styles.chip, active && styles.chipActive]}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {localizePlaceName(item.code, item.name, language)}
                {isRec ? " ★" : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* SVG Line Chart */}
      <View style={styles.chartBox}>
        {loading && (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.moss} size="small" />
            <Text style={styles.stateText}>Loading 14-day trace…</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.centerState}>
            <Ionicons name="alert-circle-outline" size={22} color={colors.clay} />
            <Text style={styles.errorTitle}>Trajectory unavailable</Text>
            <Text style={styles.errorDetail}>{error}</Text>
          </View>
        )}

        {!loading && !error && geometry && (
          <>
            <Svg
              width="100%"
              height={CHART_H}
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            >
              {/* Horizontal Grid Lines & Y Ticks */}
              {geometry.yTicks.map((tick, idx) => (
                <React.Fragment key={idx}>
                  <Line
                    x1={PAD_LEFT}
                    y1={tick.y}
                    x2={CHART_W - PAD_RIGHT}
                    y2={tick.y}
                    stroke={colors.moss}
                    strokeOpacity={0.14}
                    strokeDasharray="3,4"
                    strokeWidth={1}
                  />
                  <SvgText
                    x={PAD_LEFT - 6}
                    y={tick.y + 3.5}
                    fontSize={9}
                    fontWeight="700"
                    fill={colors.ink60}
                    textAnchor="end"
                  >
                    {Math.round(tick.value)}
                  </SvgText>
                </React.Fragment>
              ))}

              {/* Reference Today Divider */}
              {geometry.refX !== null && (
                <Line
                  x1={geometry.refX}
                  y1={PAD_TOP}
                  x2={geometry.refX}
                  y2={CHART_H - PAD_BOTTOM}
                  stroke={colors.moss}
                  strokeOpacity={0.35}
                  strokeDasharray="4,4"
                  strokeWidth={1.2}
                />
              )}

              {/* Series Paths */}
              {geometry.actualPath ? (
                <Path
                  d={geometry.actualPath}
                  stroke={colors.ink}
                  strokeWidth={2.3}
                  fill="none"
                />
              ) : null}

              {geometry.ma7Path ? (
                <Path
                  d={geometry.ma7Path}
                  stroke="#9b7a2f"
                  strokeWidth={1.7}
                  strokeDasharray="2,4"
                  fill="none"
                />
              ) : null}

              {geometry.naivePath ? (
                <Path
                  d={geometry.naivePath}
                  stroke={colors.clay}
                  strokeWidth={1.7}
                  strokeDasharray="4,4"
                  fill="none"
                />
              ) : null}

              {geometry.modelPath ? (
                <Path
                  d={geometry.modelPath}
                  stroke={colors.moss}
                  strokeWidth={2.7}
                  strokeDasharray="6,3"
                  fill="none"
                />
              ) : null}

              {/* Model Dots */}
              {geometry.modelDots.map((dot, idx) => (
                <Circle
                  key={idx}
                  cx={dot.x}
                  cy={dot.y}
                  r={3.6}
                  fill={colors.moss}
                />
              ))}

              {/* X Axis Labels */}
              {geometry.xLabels.map((lbl, idx) => (
                <SvgText
                  key={idx}
                  x={lbl.x}
                  y={CHART_H - 7}
                  fontSize={9}
                  fontWeight="700"
                  fill={colors.ink75}
                  textAnchor={lbl.anchor}
                >
                  {lbl.label}
                </SvgText>
              ))}
            </Svg>

            <View style={styles.legendRow}>
              <LegendDot color={colors.ink} label="Observed (14d)" />
              <LegendDot color={colors.moss} label="ATIE Model" />
              <LegendDot color={colors.clay} label="Naive" />
              <LegendDot color="#9b7a2f" label="7-Day MA" />
            </View>
          </>
        )}
      </View>

      {/* Horizon Summary Tiles */}
      {history && history.forecastTrajectory.length > 0 && (
        <View style={styles.horizonRow}>
          {history.forecastTrajectory.map((pt) => {
            const isCrash = pt.direction === "CRASH";
            const isSurge = pt.direction === "SURGE";
            return (
              <View key={pt.horizonHours} style={styles.horizonCard}>
                <View style={styles.horizonTop}>
                  <Text style={styles.horizonTag}>+{pt.horizonHours}H</Text>
                  <Text
                    style={[
                      styles.horizonDir,
                      isCrash
                        ? { color: colors.clay }
                        : isSurge
                          ? { color: colors.moss }
                          : { color: colors.ink60 },
                    ]}
                  >
                    {localizeDirection(pt.direction, language)}
                  </Text>
                </View>
                <Text style={styles.horizonPrice}>
                  LKR {pt.predictedPriceLkr.toFixed(2)}/kg
                </Text>
                <Text style={styles.horizonBaselines}>
                  Naive {pt.baselineNaiveLkr.toFixed(2)} · MA7{" "}
                  {pt.baselineMa7Lkr.toFixed(2)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function computeSvgGeometry(points: TrajectoryChartPoint[]) {
  if (points.length < 2) return null;

  const allValues: number[] = [];
  for (const pt of points) {
    if (pt.actual !== null) allValues.push(pt.actual);
    if (pt.model !== null) allValues.push(pt.model);
    if (pt.naive !== null) allValues.push(pt.naive);
    if (pt.ma7 !== null) allValues.push(pt.ma7);
  }
  if (allValues.length === 0) return null;

  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const spread = Math.max(8, rawMax - rawMin);
  const yMin = Math.max(0, rawMin - spread * 0.12);
  const yMax = rawMax + spread * 0.12;

  const plotW = CHART_W - PAD_LEFT - PAD_RIGHT;
  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;

  const xAt = (index: number) =>
    PAD_LEFT + (index / Math.max(1, points.length - 1)) * plotW;
  const yAt = (val: number) =>
    PAD_TOP + (1 - (val - yMin) / Math.max(1, yMax - yMin)) * plotH;

  const buildPath = (
    pick: (pt: TrajectoryChartPoint) => number | null,
  ): { path: string; dots: Array<{ x: number; y: number }> } => {
    let d = "";
    let penDown = false;
    const dots: Array<{ x: number; y: number }> = [];
    points.forEach((pt, idx) => {
      const val = pick(pt);
      if (val === null) {
        penDown = false;
        return;
      }
      const x = Number(xAt(idx).toFixed(1));
      const y = Number(yAt(val).toFixed(1));
      dots.push({ x, y });
      d += penDown ? ` L ${x} ${y}` : `M ${x} ${y}`;
      penDown = true;
    });
    return { path: d, dots };
  };

  const actual = buildPath((p) => p.actual);
  const model = buildPath((p) => p.model);
  const naive = buildPath((p) => p.naive);
  const ma7 = buildPath((p) => p.ma7);

  let lastActualIdx: number | null = null;
  points.forEach((p, idx) => {
    if (p.actual !== null) lastActualIdx = idx;
  });

  const yTicks = [0, 0.5, 1].map((frac) => {
    const value = yMax - frac * (yMax - yMin);
    return { value, y: Number((PAD_TOP + frac * plotH).toFixed(1)) };
  });

  const xLabels: Array<{
    x: number;
    label: string;
    anchor: "start" | "middle" | "end";
  }> = [
    { x: xAt(0), label: points[0].label, anchor: "start" },
    ...(lastActualIdx !== null
      ? [
          {
            x: xAt(lastActualIdx),
            label: points[lastActualIdx].label,
            anchor: "middle" as const,
          },
        ]
      : []),
    {
      x: xAt(points.length - 1),
      label: points[points.length - 1].label,
      anchor: "end",
    },
  ];

  return {
    actualPath: actual.path,
    modelPath: model.path,
    modelDots: model.dots,
    naivePath: naive.path,
    ma7Path: ma7.path,
    refX: lastActualIdx !== null ? Number(xAt(lastActualIdx).toFixed(1)) : null,
    yTicks,
    xLabels,
  };
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cream,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.ink10,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  sectionTag: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.moss,
    letterSpacing: 1.1,
    marginBottom: 3,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.ink60,
    marginTop: 4,
  },
  sourcePill: {
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.ink10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  sourcePillText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: colors.ink60,
    letterSpacing: 0.5,
  },
  marketChips: {
    gap: 8,
    paddingBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 13,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink15,
  },
  chipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.ink,
  },
  chipTextActive: {
    color: colors.lime,
    fontWeight: "800",
  },
  chartBox: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.ink10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    minHeight: 220,
    justifyContent: "center",
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 6,
  },
  stateText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink60,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink,
  },
  errorDetail: {
    fontSize: 11,
    color: colors.ink60,
    textAlign: "center",
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    paddingTop: 6,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendSwatch: {
    width: 9,
    height: 3,
    borderRadius: 1.5,
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink75,
  },
  horizonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  horizonCard: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderRadius: 14,
    padding: 11,
    gap: 3,
  },
  horizonTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  horizonTag: {
    fontSize: 9.5,
    fontWeight: "900",
    color: colors.ink60,
  },
  horizonDir: {
    fontSize: 9.5,
    fontWeight: "900",
  },
  horizonPrice: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  horizonBaselines: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.ink60,
    fontVariant: ["tabular-nums"],
  },
});
