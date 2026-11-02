import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  localizePlaceName,
  localizeSeverity,
  UI_STRINGS,
} from "../i18n/translations";
import { colors } from "../theme/colors";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  LanguageCode,
} from "../types/atie";
import {
  buildDispatchMessage,
  shareViaSms,
  shareViaSystemSheet,
  shareViaWhatsApp,
} from "../utils/dispatchShare";
import { formatSignedLkr, formatSignedPct } from "../utils/format";

interface Props {
  request: AnalyzeRequest;
  response: AnalyzeResponse;
  language: LanguageCode;
}

export function PrimaryDirectiveCard({ request, response, language }: Props) {
  const t = UI_STRINGS[language];
  const directive = response.primaryDirective;
  const recommended = directive.recommendedMarketCode
    ? response.marketComparisons.find(
        (m) => m.marketCode === directive.recommendedMarketCode,
      )
    : undefined;
  const defaultMarket = response.marketComparisons.find(
    (m) => m.marketCode === directive.defaultMarketCode,
  );

  const isReroute = directive.severity === "CRITICAL_REROUTE";
  const isHold = directive.severity === "HOLD_HARVEST";
  const cardBg = isHold ? "#4c2720" : isReroute ? colors.ink : colors.moss;

  const dispatchText = buildDispatchMessage(request, response, language);

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      {/* Provenance & Severity Badges */}
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
          ) : isHold ? (
            <Ionicons name="hand-left" size={12} color={colors.ink} />
          ) : (
            <Ionicons name="checkmark-circle" size={13} color={colors.cream} />
          )}
          <Text
            style={[
              styles.severityText,
              isReroute || isHold
                ? styles.severityTextDark
                : styles.severityTextLight,
            ]}
          >
            {localizeSeverity(directive.severity, language)}
          </Text>
        </View>

        <View
          style={[
            styles.subBadge,
            response.forecastSource !== "MODEL" && styles.subBadgeWarn,
          ]}
        >
          <Text
            style={[
              styles.subBadgeText,
              response.forecastSource !== "MODEL" && styles.subBadgeTextWarn,
            ]}
          >
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

      {/* 2x2 Key Economics Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>{t.defaultForecast}</Text>
          <Text
            style={[
              styles.metricValue,
              defaultMarket?.direction === "CRASH" && styles.textDanger,
            ]}
          >
            {defaultMarket
              ? defaultMarket.predictedPriceLkr.toFixed(2)
              : "—"}
          </Text>
          <Text style={styles.metricSuffix}>
            {defaultMarket
              ? `${localizePlaceName(defaultMarket.marketCode, defaultMarket.marketName, language)} · LKR/kg`
              : "LKR/kg"}
          </Text>
        </View>

        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>{t.recommendedForecast}</Text>
          <Text
            style={[
              styles.metricValue,
              recommended?.direction === "SURGE"
                ? styles.textLime
                : styles.textLight,
            ]}
          >
            {recommended
              ? recommended.predictedPriceLkr.toFixed(2)
              : defaultMarket
                ? defaultMarket.predictedPriceLkr.toFixed(2)
                : "—"}
          </Text>
          <Text style={styles.metricSuffix}>
            {recommended
              ? `${localizePlaceName(recommended.marketCode, recommended.marketName, language)} · LKR/kg`
              : "Baseline · LKR/kg"}
          </Text>
        </View>

        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>{t.profitUplift}</Text>
          <Text
            style={[
              styles.metricValue,
              (directive.profitUpliftPct ?? 0) > 0
                ? styles.textLime
                : styles.textLight,
            ]}
          >
            {formatSignedPct(directive.profitUpliftPct)}
          </Text>
          <Text style={styles.metricSuffix}>vs default market</Text>
        </View>

        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>{t.extraTakeHome}</Text>
          <Text
            style={[
              styles.metricValue,
              (directive.profitDeltaLkr ?? 0) > 0
                ? styles.textLime
                : styles.textLight,
            ]}
          >
            {formatSignedLkr(directive.profitDeltaLkr)}
          </Text>
          <Text style={styles.metricSuffix}>LKR net delta</Text>
        </View>
      </View>

      {/* Default Market Crash Warning */}
      {defaultMarket?.direction === "CRASH" && (
        <View style={styles.crashAlert}>
          <MaterialCommunityIcons
            name="trending-down"
            size={18}
            color="#f6c6b2"
          />
          <Text style={styles.crashAlertText}>
            {localizePlaceName(
              defaultMarket.marketCode,
              defaultMarket.marketName,
              language,
            )}{" "}
            is forecast to drop from {defaultMarket.currentPriceLkr.toFixed(2)}{" "}
            to {defaultMarket.predictedPriceLkr.toFixed(2)} LKR/kg.
          </Text>
        </View>
      )}

      {/* One-Tap Field Dispatch Share Bar (WhatsApp / SMS / Android Share) */}
      <View style={styles.dispatchSection}>
        <Text style={styles.dispatchLabel}>{t.dispatchHeading}</Text>
        <View style={styles.dispatchRow}>
          <TouchableOpacity
            onPress={() => void shareViaWhatsApp(dispatchText)}
            style={[styles.dispatchBtn, styles.dispatchBtnWhatsApp]}
            accessibilityRole="button"
            accessibilityLabel="Send directive via WhatsApp"
            activeOpacity={0.8}
          >
            <Ionicons name="logo-whatsapp" size={16} color={colors.ink} />
            <Text style={styles.dispatchBtnDarkText}>{t.shareWhatsApp}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => void shareViaSms(dispatchText)}
            style={styles.dispatchBtn}
            accessibilityRole="button"
            accessibilityLabel="Send directive via SMS"
            activeOpacity={0.8}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={15}
              color={colors.cream}
            />
            <Text style={styles.dispatchBtnLightText}>{t.shareSms}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => void shareViaSystemSheet(dispatchText)}
            style={styles.dispatchBtn}
            accessibilityRole="button"
            accessibilityLabel="Share directive"
            activeOpacity={0.8}
          >
            <Ionicons
              name="share-social-outline"
              size={15}
              color={colors.cream}
            />
            <Text style={styles.dispatchBtnLightText}>{t.shareMore}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  severityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  severityPillReroute: {
    backgroundColor: colors.lime,
  },
  severityPillProceed: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  severityPillHold: {
    backgroundColor: colors.amber,
  },
  severityText: {
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  severityTextDark: {
    color: colors.ink,
  },
  severityTextLight: {
    color: colors.cream,
  },
  subBadge: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  subBadgeWarn: {
    backgroundColor: "rgba(214, 161, 63, 0.25)",
    borderColor: "rgba(214, 161, 63, 0.6)",
  },
  subBadgeText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "rgba(255, 253, 247, 0.78)",
    letterSpacing: 0.5,
  },
  subBadgeTextWarn: {
    color: "#fde8b3",
  },
  headline: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.cream,
    letterSpacing: -0.4,
    lineHeight: 30,
    marginBottom: 7,
  },
  explanation: {
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(255, 253, 247, 0.85)",
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "rgba(255, 255, 255, 0.09)",
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
    color: "rgba(255, 253, 247, 0.6)",
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.cream,
    fontVariant: ["tabular-nums"],
  },
  metricSuffix: {
    fontSize: 9.5,
    fontWeight: "600",
    color: "rgba(255, 253, 247, 0.58)",
    marginTop: 2,
  },
  textLime: {
    color: colors.lime,
  },
  textDanger: {
    color: "#f5b097",
  },
  textLight: {
    color: colors.cream,
  },
  crashAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    backgroundColor: "rgba(199, 100, 59, 0.34)",
    borderWidth: 1,
    borderColor: "rgba(243, 170, 142, 0.35)",
    borderRadius: 14,
    padding: 11,
  },
  crashAlertText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
    color: "#f6c6b2",
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  dispatchSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.14)",
    gap: 8,
  },
  dispatchLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "rgba(255, 253, 247, 0.62)",
    letterSpacing: 0.9,
  },
  dispatchRow: {
    flexDirection: "row",
    gap: 8,
  },
  dispatchBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 42,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    paddingHorizontal: 8,
  },
  dispatchBtnWhatsApp: {
    flex: 1.35,
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  dispatchBtnDarkText: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.ink,
  },
  dispatchBtnLightText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: colors.cream,
  },
});
