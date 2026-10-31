import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import type { AnalyzeResponse } from "../types/atie";
import { formatLkr } from "../utils/format";

interface Props {
  response: AnalyzeResponse;
}

export function PrimaryDirectiveCard({ response }: Props) {
  const directive = response.primaryDirective;
  const recommended = response.marketComparisons.find(
    (m) => m.marketCode === directive.recommendedMarketCode
  );
  const defaultMarket = response.marketComparisons.find(
    (m) => m.marketCode === directive.defaultMarketCode
  );

  const isReroute = directive.severity === "CRITICAL_REROUTE";
  const isHold = directive.severity === "HOLD_HARVEST";

  const cardBg = isHold ? "#4c2720" : isReroute ? colors.ink : colors.moss;

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      {/* Badges row */}
      <View style={styles.badgeRow}>
        <View
          style={[
            styles.severityPill,
            isHold
              ? styles.severityPillHold
              : isReroute
              ? styles.severityPillReroute
              : styles.severityPillProceed,
          ]}
        >
          {isReroute ? (
            <Feather name="arrow-up-right" size={13} color={colors.ink} />
          ) : (
            <Ionicons name="checkmark-circle" size={13} color={colors.cream} />
          )}
          <Text
            style={[
              styles.severityText,
              isReroute ? styles.severityTextDark : styles.severityTextLight,
            ]}
          >
            {directive.severity.replace(/_/g, " ")}
          </Text>
        </View>

        <View style={styles.subBadge}>
          <Text style={styles.subBadgeText}>
            {response.forecastSource.replace(/_/g, " ")}
          </Text>
        </View>

        <View style={styles.subBadge}>
          <Text style={styles.subBadgeText}>
            INPUTS {response.inputDataState}
          </Text>
        </View>
      </View>

      {/* Headline & Explanation */}
      <Text style={styles.headline}>{directive.headline}</Text>
      <Text style={styles.explanation}>{directive.explanation}</Text>

      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        {/* Metric 1: Default Forecast */}
        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>DEFAULT FORECAST</Text>
          <Text
            style={[
              styles.metricValue,
              defaultMarket?.direction === "CRASH" && styles.textDanger,
            ]}
          >
            {defaultMarket ? `${defaultMarket.predictedPriceLkr.toFixed(2)}` : "—"}
          </Text>
          <Text style={styles.metricSuffix}>LKR/kg</Text>
        </View>

        {/* Metric 2: Recommended Forecast */}
        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>RECOMMENDED</Text>
          <Text
            style={[
              styles.metricValue,
              recommended?.direction === "SURGE" ? styles.textLime : styles.textLight,
            ]}
          >
            {recommended ? `${recommended.predictedPriceLkr.toFixed(2)}` : "—"}
          </Text>
          <Text style={styles.metricSuffix}>LKR/kg</Text>
        </View>

        {/* Metric 3: Profit Uplift */}
        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>PROFIT UPLIFT</Text>
          <Text style={[styles.metricValue, styles.textLime]}>
            {directive.profitUpliftPct != null
              ? `+${directive.profitUpliftPct.toFixed(2)}%`
              : "n/a"}
          </Text>
          <Text style={styles.metricSuffix}>net gain</Text>
        </View>

        {/* Metric 4: Extra Take-Home */}
        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>EXTRA TAKE-HOME</Text>
          <Text style={[styles.metricValue, styles.textLime]}>
            {directive.profitDeltaLkr != null
              ? `+${formatLkr(directive.profitDeltaLkr)}`
              : "—"}
          </Text>
          <Text style={styles.metricSuffix}>LKR total</Text>
        </View>
      </View>

      {/* Crash Warning notice if default is crashing */}
      {defaultMarket?.direction === "CRASH" && (
        <View style={styles.crashAlert}>
          <MaterialCommunityIcons
            name="trending-down"
            size={18}
            color="#f6c6b2"
          />
          <Text style={styles.crashAlertText}>
            {defaultMarket.marketName} prices are forecast to crash. Committing
            here will erode farmer margin; rerouting ensures positive net-yield.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  severityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  severityPillReroute: {
    backgroundColor: colors.lime,
  },
  severityPillProceed: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  severityPillHold: {
    backgroundColor: "#e8a98d",
  },
  severityText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  severityTextDark: {
    color: colors.ink,
  },
  severityTextLight: {
    color: colors.cream,
  },
  subBadge: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  subBadgeText: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "rgba(255, 253, 247, 0.7)",
    letterSpacing: 0.6,
  },
  headline: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.cream,
    letterSpacing: -0.5,
    lineHeight: 32,
    marginBottom: 8,
  },
  explanation: {
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(255, 253, 247, 0.8)",
    marginBottom: 18,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    overflow: "hidden",
  },
  metricCell: {
    width: "50%",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    borderRightWidth: 1,
    borderRightColor: "rgba(255, 255, 255, 0.1)",
  },
  metricLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "rgba(255, 253, 247, 0.55)",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.cream,
  },
  metricSuffix: {
    fontSize: 9,
    fontWeight: "600",
    color: "rgba(255, 253, 247, 0.5)",
    marginTop: 2,
  },
  textLime: {
    color: colors.lime,
  },
  textDanger: {
    color: "#f3aa8e",
  },
  textLight: {
    color: colors.cream,
  },
  crashAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    backgroundColor: "rgba(199, 100, 59, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(243, 170, 142, 0.3)",
    borderRadius: 14,
    padding: 12,
  },
  crashAlertText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
    color: "#f6c6b2",
    fontWeight: "500",
  },
});
