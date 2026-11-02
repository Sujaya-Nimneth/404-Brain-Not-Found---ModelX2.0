import React, { useMemo } from "react";
import { StyleSheet, Text, View, FlatList } from "react-native";
import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import type { MarketComparison } from "../types/atie";
import { formatLkr } from "../utils/format";

interface Props {
  markets: MarketComparison[];
  originCode?: string;
}

export function RouteResults({ markets, originCode = "ANURADHAPURA" }: Props) {
  // Ensure strict uniqueness across all markets
  const uniqueMarkets = useMemo(() => {
    const seen = new Set<string>();
    return (markets || []).filter((m, idx) => {
      const code = m.marketCode || `market-${idx}`;
      if (seen.has(code)) return false;
      seen.add(code);
      return true;
    });
  }, [markets]);

  const renderMarketItem = ({ item, index }: { item: MarketComparison; index: number }) => {
    const isRec = item.recommended;
    const isCrash = item.direction === "CRASH";
    const isSurge = item.direction === "SURGE";

    // Dynamic waypoints calculation for route path tracking
    const waypoints = [
      { name: originCode, label: "Origin Farm" },
      ...(item.distanceKm > 100 ? [{ name: "Dambulla Junction", label: "Central Hub Transit" }] : []),
      { name: item.marketName, label: "Destination Market" },
    ];

    return (
      <View
        key={`ml-route-result-${item.marketCode}-${index}`}
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
                name="navigate-circle"
                size={18}
                color={isRec ? colors.lime : colors.ink45}
              />
            </View>
            <View>
              <Text style={styles.marketName}>{item.marketName}</Text>
              <Text style={styles.directionTag}>
                {isRec ? "OPTIMAL ARBITRAGE ROUTE" : `${item.direction} TREND`}
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
                {item.direction}
              </Text>
            </View>
          )}
        </View>

        {/* Waypoints Path Tracker */}
        <View style={styles.waypointsContainer}>
          <Text style={styles.waypointsTitle}>ROUTE WAYPOINTS</Text>
          <View style={styles.waypointsRow}>
            {waypoints.map((wp, wpIndex) => (
              <View
                key={`waypoint-${item.marketCode}-${wp.name}-${index}-${wpIndex}`}
                style={styles.waypointItem}
              >
                <View style={styles.waypointDot} />
                <Text style={styles.waypointName}>{wp.name}</Text>
                {wpIndex < waypoints.length - 1 && (
                  <Ionicons name="arrow-forward" size={10} color={colors.ink45} style={styles.waypointArrow} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Net profit highlight */}
        <View style={styles.profitBanner}>
          <View>
            <Text style={styles.profitBannerLabel}>ESTIMATED NET PROFIT</Text>
            <Text style={styles.profitBannerValue}>
              LKR {formatLkr(item.netProfitLkr)}
            </Text>
          </View>

          {item.profitDeltaLkr > 0 && (
            <View style={styles.deltaPill}>
              <Feather name="trending-up" size={12} color={colors.moss} />
              <Text style={styles.deltaText}>
                +{formatLkr(item.profitDeltaLkr)} LKR
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
                {item.distanceKm} km ({item.distanceKm * 2} km RT)
              </Text>
            </View>
            <View style={styles.metricRow}>
              <MaterialCommunityIcons
                name="gas-station"
                size={14}
                color={colors.ink45}
              />
              <Text style={styles.metricText}>
                {item.fuelLitres.toFixed(1)} L fuel
              </Text>
            </View>
          </View>

          {/* Costs */}
          <View style={styles.breakdownCol}>
            <View style={styles.metricRow}>
              <FontAwesome5 name="truck" size={12} color={colors.ink45} />
              <Text style={styles.metricText}>
                LKR {formatLkr(item.transportCostLkr)} trans.
              </Text>
            </View>
            <View style={styles.metricRow}>
              <MaterialCommunityIcons
                name="fruit-cherries-off"
                size={14}
                color={colors.ink45}
              />
              <Text style={styles.metricText}>
                LKR {formatLkr(item.spoilageLossLkr)} spoil.
              </Text>
            </View>
          </View>

          {/* Price */}
          <View style={styles.breakdownCol}>
            <View style={styles.metricRow}>
              <Ionicons name="pricetag-outline" size={13} color={colors.leaf} />
              <Text style={[styles.metricText, { fontWeight: "700" }]}>
                {item.predictedPriceLkr.toFixed(1)} LKR/kg
              </Text>
            </View>
            <Text style={styles.priceCurrentSub}>
              cur: {item.currentPriceLkr.toFixed(1)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionTag}>ML CALCULATION RESULTS</Text>
          <Text style={styles.sectionTitle}>Optimized Route Predictions</Text>
        </View>
        <View style={styles.rankedPill}>
          <Text style={styles.rankedPillText}>RANKED BY NET PROFIT</Text>
        </View>
      </View>

      <FlatList
        data={uniqueMarkets}
        keyExtractor={(item, index) => `flatlist-route-${item.marketCode}-${index}`}
        renderItem={renderMarketItem}
        scrollEnabled={false}
        contentContainerStyle={styles.marketsList}
      />
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
  waypointsContainer: {
    backgroundColor: "rgba(23, 37, 31, 0.03)",
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
  },
  waypointsTitle: {
    fontSize: 7.5,
    fontWeight: "800",
    color: colors.ink45,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  waypointsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  waypointItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  waypointDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.moss,
  },
  waypointName: {
    fontSize: 9.5,
    fontWeight: "700",
    color: colors.ink75,
  },
  waypointArrow: {
    marginLeft: 2,
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

export default RouteResults;
