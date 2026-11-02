import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import type { MarketComparison } from "../types/atie";
import { formatLkr } from "../utils/format";

interface Props {
  markets: MarketComparison[];
}

export function RouteLedger({ markets }: Props) {
  // Deduplicate market comparisons by marketCode to ensure uniqueness and clean ledger view
  const uniqueMarkets = useMemo(() => {
    const seen = new Set<string>();
    return (markets || []).filter((m, idx) => {
      const code = m.marketCode || `market-idx-${idx}`;
      if (seen.has(code)) {
        return false;
      }
      seen.add(code);
      return true;
    });
  }, [markets]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionTag}>ROUTE LEDGER</Text>
          <Text style={styles.sectionTitle}>Every rupee accounted for.</Text>
        </View>
        <View style={styles.rankedPill}>
          <Text style={styles.rankedPillText}>RANKED BY NET PROFIT</Text>
        </View>
      </View>

      <View style={styles.marketsList}>
        {uniqueMarkets.map((m, index) => {
          const isRec = m.recommended;
          const isCrash = m.direction === "CRASH";
          const isSurge = m.direction === "SURGE";

          return (
            <View
              key={`route-ledger-market-${m.marketCode}-${index}`}
              style={[styles.marketCard, isRec && styles.marketCardRecommended]}
            >
              {/* Header row of market */}
              <View style={styles.marketHeader}>
                <View style={styles.marketNameGroup}>
                  <View
                    style={[
                      styles.iconCircle,
                      isRec ? styles.iconCircleRec : styles.iconCircleNorm,
                    ]}
                  >
                    <Ionicons
                      name="location-sharp"
                      size={16}
                      color={isRec ? colors.lime : colors.ink45}
                    />
                  </View>
                  <View>
                    <Text style={styles.marketName}>{m.marketName}</Text>
                    <Text style={styles.directionTag}>
                      {isRec
                        ? "RECOMMENDED CORRIDOR"
                        : `${m.direction} TREND`}
                    </Text>
                  </View>
                </View>

                {isRec ? (
                  <View style={styles.recBadge}>
                    <Ionicons name="star" size={11} color={colors.moss} />
                    <Text style={styles.recBadgeText}>TOP ROUTE</Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.trendBadge,
                      isCrash ? styles.trendCrash : isSurge ? styles.trendSurge : styles.trendStable,
                    ]}
                  >
                    <Text
                      style={[
                        styles.trendText,
                        isCrash ? styles.trendTextCrash : isSurge ? styles.trendTextSurge : styles.trendTextStable,
                      ]}
                    >
                      {m.direction}
                    </Text>
                  </View>
                )}
              </View>

              {/* Net profit highlight */}
              <View style={styles.profitBanner}>
                <View>
                  <Text style={styles.profitBannerLabel}>ESTIMATED NET PROFIT</Text>
                  <Text style={styles.profitBannerValue}>
                    LKR {formatLkr(m.netProfitLkr)}
                  </Text>
                </View>

                {m.profitDeltaLkr > 0 && (
                  <View style={styles.deltaPill}>
                    <Feather name="trending-up" size={12} color={colors.moss} />
                    <Text style={styles.deltaText}>
                      +{formatLkr(m.profitDeltaLkr)} LKR
                    </Text>
                  </View>
                )}
              </View>

              {/* Breakdown Grid */}
              <View style={styles.breakdownGrid}>
                {/* Distance & Fuel */}
                <View style={styles.breakdownCol}>
                  <View style={styles.metricRow}>
                    <MaterialCommunityIcons
                      name="map-marker-distance"
                      size={14}
                      color={colors.ink45}
                    />
                    <Text style={styles.metricText}>
                      {m.distanceKm} km ({m.distanceKm * 2} km RT)
                    </Text>
                  </View>
                  <View style={styles.metricRow}>
                    <MaterialCommunityIcons
                      name="gas-station"
                      size={14}
                      color={colors.ink45}
                    />
                    <Text style={styles.metricText}>
                      {m.fuelLitres.toFixed(1)} L fuel
                    </Text>
                  </View>
                </View>

                {/* Costs */}
                <View style={styles.breakdownCol}>
                  <View style={styles.metricRow}>
                    <FontAwesome5 name="truck" size={12} color={colors.ink45} />
                    <Text style={styles.metricText}>
                      LKR {formatLkr(m.transportCostLkr)} trans.
                    </Text>
                  </View>
                  <View style={styles.metricRow}>
                    <MaterialCommunityIcons
                      name="fruit-cherries-off"
                      size={14}
                      color={colors.ink45}
                    />
                    <Text style={styles.metricText}>
                      LKR {formatLkr(m.spoilageLossLkr)} spoil.
                    </Text>
                  </View>
                </View>

                {/* Price */}
                <View style={styles.breakdownCol}>
                  <View style={styles.metricRow}>
                    <Ionicons name="pricetag-outline" size={13} color={colors.leaf} />
                    <Text style={[styles.metricText, { fontWeight: "700" }]}>
                      {m.predictedPriceLkr.toFixed(1)} LKR/kg
                    </Text>
                  </View>
                  <Text style={styles.priceCurrentSub}>
                    cur: {m.currentPriceLkr.toFixed(1)}
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
    backgroundColor: colors.cream90,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.ink10,
    padding: 18,
    marginBottom: 20,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  headerRow: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  sectionTag: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.moss,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.4,
  },
  rankedPill: {
    backgroundColor: "#ebe5d8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rankedPillText: {
    fontSize: 8,
    fontWeight: "800",
    color: colors.ink60,
    letterSpacing: 0.6,
  },
  marketsList: {
    gap: 12,
  },
  marketCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.ink10,
    padding: 14,
  },
  marketCardRecommended: {
    backgroundColor: "rgba(212, 232, 163, 0.25)",
    borderColor: colors.leaf,
  },
  marketHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  marketNameGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleRec: {
    backgroundColor: colors.moss,
  },
  iconCircleNorm: {
    backgroundColor: colors.ink10,
  },
  marketName: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
  },
  directionTag: {
    fontSize: 8.5,
    fontWeight: "700",
    color: colors.ink45,
    letterSpacing: 0.4,
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
    fontSize: 9,
    fontWeight: "800",
    color: colors.moss,
    letterSpacing: 0.5,
  },
  trendBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  trendCrash: {
    backgroundColor: "rgba(199, 100, 59, 0.15)",
  },
  trendSurge: {
    backgroundColor: "rgba(49, 92, 69, 0.15)",
  },
  trendStable: {
    backgroundColor: colors.ink10,
  },
  trendText: {
    fontSize: 8.5,
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
    backgroundColor: colors.canvas,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  profitBannerLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: colors.ink45,
    letterSpacing: 0.6,
  },
  profitBannerValue: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.ink,
  },
  deltaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.lime,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deltaText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.moss,
  },
  breakdownGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.ink10,
    paddingTop: 8,
  },
  breakdownCol: {
    gap: 4,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metricText: {
    fontSize: 10.5,
    color: colors.ink75,
  },
  priceCurrentSub: {
    fontSize: 9,
    color: colors.ink45,
    marginLeft: 17,
  },
});

export { RouteLedger as MarketList };
export default RouteLedger;
