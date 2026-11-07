import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { formatUpliftLabel } from "../../../src/components/profitFormat";
import {
  localizeDirection,
  localizePlaceName,
  UI_STRINGS,
} from "../i18n/translations";
import { colors } from "../theme/colors";
import type { LanguageCode, MarketComparison } from "../types/atie";
import {
  formatCurrency,
  formatLkr,
  formatSignedCurrency,
} from "../utils/format";

interface Props {
  markets: MarketComparison[];
  language: LanguageCode;
}

export function RouteLedger({ markets, language }: Props) {
  const t = UI_STRINGS[language];

  const uniqueMarkets = useMemo(() => {
    const seen = new Set<string>();
    return (markets ?? []).filter((m) => {
      if (!m.marketCode || seen.has(m.marketCode)) return false;
      seen.add(m.marketCode);
      return true;
    });
  }, [markets]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTag}>{t.routeLedgerTag}</Text>
          <Text style={styles.sectionTitle}>{t.routeLedgerTitle}</Text>
        </View>
        <View style={styles.rankedPill}>
          <Text style={styles.rankedPillText}>{t.rankedByNetProfit}</Text>
        </View>
      </View>

      <View style={styles.marketsList}>
        {uniqueMarkets.map((m, rankIdx) => {
          const isRec = m.recommended;
          const isCrash = m.direction === "CRASH";
          const isSurge = m.direction === "SURGE";
          const upliftLabel = formatUpliftLabel(m);

          return (
            <View
              key={m.marketCode}
              style={[
                styles.marketCard,
                isRec && styles.marketCardRecommended,
              ]}
            >
              <View style={styles.marketHeader}>
                <View style={styles.marketNameGroup}>
                  <View
                    style={[
                      styles.rankCircle,
                      isRec ? styles.rankCircleRec : styles.rankCircleNorm,
                    ]}
                  >
                    <Text
                      style={[
                        styles.rankNumber,
                        isRec && styles.rankNumberRec,
                      ]}
                    >
                      #{rankIdx + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.marketName} numberOfLines={1}>
                      {localizePlaceName(m.marketCode, m.marketName, language)}
                    </Text>
                    <Text style={styles.directionTag}>
                      {m.distanceKm} km one-way ({m.distanceKm * 2} km RT) ·{" "}
                      {m.trips} {m.trips === 1 ? "trip" : "trips"}
                    </Text>
                  </View>
                </View>

                {isRec ? (
                  <View style={styles.recBadge}>
                    <Ionicons name="star" size={11} color={colors.moss} />
                    <Text style={styles.recBadgeText}>{t.recommendedBadgeLabel}</Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.trendBadge,
                      isCrash
                        ? styles.trendCrash
                        : isSurge
                          ? styles.trendSurge
                          : styles.trendStable,
                    ]}
                  >
                    <Text
                      style={[
                        styles.trendText,
                        isCrash
                          ? styles.trendTextCrash
                          : isSurge
                            ? styles.trendTextSurge
                            : styles.trendTextStable,
                      ]}
                    >
                      {localizeDirection(m.direction, language)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Net Profit Banner */}
              <View style={styles.profitBanner}>
                <View>
                  <Text style={styles.profitBannerLabel}>
                    {t.estimatedNetProfit}
                  </Text>
                  <Text style={styles.profitBannerValue}>
                    {formatCurrency(m.netProfitLkr, 2)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.deltaPill,
                    m.profitDeltaLkr < 0 && styles.deltaPillNegative,
                    m.profitDeltaLkr === 0 && styles.deltaPillBaseline,
                  ]}
                >
                  {m.profitDeltaLkr !== 0 && (
                    <Feather
                      name={
                        m.profitDeltaLkr > 0 ? "trending-up" : "trending-down"
                      }
                      size={12}
                      color={m.profitDeltaLkr > 0 ? colors.moss : colors.clay}
                    />
                  )}
                  <Text
                    style={[
                      styles.deltaText,
                      m.profitDeltaLkr < 0 && styles.deltaTextNegative,
                      m.profitDeltaLkr === 0 && styles.deltaTextBaseline,
                    ]}
                  >
                    {m.profitDeltaLkr === 0
                      ? t.defaultBaselineLabel
                      : `${formatSignedCurrency(m.profitDeltaLkr)} (${upliftLabel})`}
                  </Text>
                </View>
              </View>

              {/* Detailed Accounting Ledger */}
              <View style={styles.breakdownGrid}>
                <View style={styles.breakdownCol}>
                  <View style={styles.metricRow}>
                    <Ionicons
                      name="pricetag-outline"
                      size={13}
                      color={colors.leaf}
                    />
                    <Text style={[styles.metricText, styles.boldNum]}>
                      {m.predictedPriceLkr.toFixed(2)} LKR/kg
                    </Text>
                  </View>
                  <Text style={styles.subDetail}>
                    {t.currentPriceLabel}: {m.currentPriceLkr.toFixed(2)} LKR/kg
                  </Text>
                </View>

                <View style={styles.breakdownCol}>
                  <View style={styles.metricRow}>
                    <FontAwesome5
                      name="truck"
                      size={11}
                      color={colors.ink45}
                    />
                    <Text style={styles.metricText}>
                      {t.fuelCostLabel} LKR {formatLkr(m.transportCostLkr)} (
                      {m.fuelLitres.toFixed(1)} L)
                    </Text>
                  </View>
                  <Text style={styles.subDetail}>
                    {t.handlingCostLabel}: LKR {formatLkr(m.handlingCostLkr)}
                  </Text>
                </View>
              </View>

              <View style={styles.footerLedgerRow}>
                <Text style={styles.footerLedgerItem}>
                  {t.grossRevLabel}: LKR {formatLkr(m.grossRevenueLkr)}
                </Text>
                <View style={styles.metricRow}>
                  <MaterialCommunityIcons
                    name="fruit-cherries-off"
                    size={12}
                    color={colors.amber}
                  />
                  <Text style={styles.footerLedgerItem}>
                    {t.spoilageCostLabel}: LKR {formatLkr(m.spoilageLossLkr)}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
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
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
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
  rankedPill: {
    backgroundColor: "#ebe5d8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  rankedPillText: {
    fontSize: 8,
    fontWeight: "800",
    color: colors.ink60,
    letterSpacing: 0.5,
  },
  marketsList: {
    gap: 12,
  },
  marketCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.ink10,
    padding: 13,
  },
  marketCardRecommended: {
    backgroundColor: "rgba(212, 232, 163, 0.24)",
    borderColor: colors.leaf,
  },
  marketHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8,
  },
  marketNameGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flex: 1,
  },
  rankCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  rankCircleRec: {
    backgroundColor: colors.moss,
  },
  rankCircleNorm: {
    backgroundColor: colors.canvas,
  },
  rankNumber: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.ink75,
    fontVariant: ["tabular-nums"],
  },
  rankNumberRec: {
    color: colors.lime,
  },
  marketName: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
  },
  directionTag: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.ink60,
    fontVariant: ["tabular-nums"],
  },
  recBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.lime,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  recBadgeText: {
    fontSize: 8.5,
    fontWeight: "900",
    color: colors.moss,
    letterSpacing: 0.4,
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
  },
  trendCrash: {
    backgroundColor: "rgba(199, 100, 59, 0.16)",
  },
  trendSurge: {
    backgroundColor: "rgba(49, 92, 69, 0.16)",
  },
  trendStable: {
    backgroundColor: colors.ink10,
  },
  trendText: {
    fontSize: 9,
    fontWeight: "800",
  },
  trendTextCrash: {
    color: colors.clay,
  },
  trendTextSurge: {
    color: colors.moss,
  },
  trendTextStable: {
    color: colors.ink60,
  },
  profitBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: colors.canvas,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginBottom: 10,
  },
  profitBannerLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: colors.ink45,
    letterSpacing: 0.6,
  },
  profitBannerValue: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  deltaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.lime,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  deltaPillNegative: {
    backgroundColor: "rgba(199, 100, 59, 0.15)",
  },
  deltaPillBaseline: {
    backgroundColor: colors.ink10,
  },
  deltaText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.moss,
    fontVariant: ["tabular-nums"],
  },
  deltaTextNegative: {
    color: colors.clay,
  },
  deltaTextBaseline: {
    color: colors.ink60,
  },
  breakdownGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.ink10,
    paddingTop: 8,
    gap: 8,
  },
  breakdownCol: {
    flex: 1,
    gap: 3,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metricText: {
    fontSize: 11,
    color: colors.ink75,
    fontVariant: ["tabular-nums"],
  },
  boldNum: {
    fontWeight: "800",
    color: colors.ink,
  },
  subDetail: {
    fontSize: 10,
    color: colors.ink45,
    marginLeft: 18,
    fontVariant: ["tabular-nums"],
  },
  footerLedgerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: colors.ink10,
  },
  footerLedgerItem: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.ink60,
    fontVariant: ["tabular-nums"],
  },
});
