import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { UI_STRINGS } from "../i18n/translations";
import { colors } from "../theme/colors";
import type { DataStatus, LanguageCode } from "../types/atie";
import { formatLkr } from "../utils/format";

interface Props {
  status: DataStatus | null;
  unavailable: boolean;
  language: LanguageCode;
}

export function DataProvenanceCard({ status, unavailable, language }: Props) {
  const t = UI_STRINGS[language];

  const liveSeries =
    status?.priceCoverage.filter((item) => item.state === "CURRENT").length ??
    0;
  const seedSeries =
    status?.priceCoverage.filter((item) => item.state === "SEED").length ?? 0;

  const overall = unavailable
    ? "UNAVAILABLE"
    : (status?.overallStatus ?? "LOADING");

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTag}>{t.provenanceTag}</Text>
          <Text style={styles.sectionTitle}>{t.provenanceTitle}</Text>
          <Text style={styles.subtitle}>{t.provenanceSubtitle}</Text>
        </View>
        <View
          style={[
            styles.overallBadge,
            overall === "LIVE"
              ? styles.badgeLive
              : overall === "PARTIAL"
                ? styles.badgePartial
                : styles.badgeWarn,
          ]}
        >
          <Text
            style={[
              styles.overallBadgeText,
              overall === "LIVE"
                ? styles.badgeTextLive
                : overall === "PARTIAL"
                  ? styles.badgeTextPartial
                  : styles.badgeTextWarn,
            ]}
          >
            {unavailable ? "STATUS OFFLINE" : overall}
          </Text>
        </View>
      </View>

      {unavailable ? (
        <View style={styles.offlineNotice}>
          <Ionicons name="cloud-offline-outline" size={16} color="#6f2f1d" />
          <Text style={styles.offlineNoticeText}>
            Live provenance endpoint (/api/v1/metadata/data-status) is
            unreachable. Forecast cards continue to distinguish MODEL, FALLBACK,
            and DEMO_FIXTURE sources explicitly.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.sourceList}>
            {(status?.sources ?? []).map((src) => {
              const isLiveCurrent =
                src.dataState === "LIVE" && src.freshness === "CURRENT";
              const isUnavail = src.dataState === "UNAVAILABLE";

              return (
                <View key={src.sourceCode} style={styles.sourceItem}>
                  <View style={styles.sourceTop}>
                    <View style={styles.sourceTitleRow}>
                      <MaterialCommunityIcons
                        name={
                          src.dataState === "LIVE"
                            ? "access-point"
                            : "database-outline"
                        }
                        size={15}
                        color={colors.moss}
                      />
                      <Text style={styles.sourceLabel}>{src.label}</Text>
                    </View>
                    <View
                      style={[
                        styles.stateBadge,
                        isLiveCurrent
                          ? styles.badgeLive
                          : isUnavail
                            ? styles.badgeWarn
                            : styles.badgePartial,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stateBadgeText,
                          isLiveCurrent
                            ? styles.badgeTextLive
                            : isUnavail
                              ? styles.badgeTextWarn
                              : styles.badgeTextPartial,
                        ]}
                      >
                        {src.dataState} / {src.freshness}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.sourceDetail}>
                    {src.latestObservationDate
                      ? `Latest observation ${src.latestObservationDate} · ${formatLkr(src.recordsWritten)} rows`
                      : (src.message ?? "No observation ingested.")}
                  </Text>
                </View>
              );
            })}
          </View>

          {status && (
            <View style={styles.coverageFooter}>
              <Text style={styles.coverageText}>
                {liveSeries}/{status.priceCoverage.length} current market/crop
                series · {seedSeries} seed-backed series
              </Text>
            </View>
          )}
        </>
      )}
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
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  sectionTag: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.moss,
    letterSpacing: 1.1,
    marginBottom: 3,
  },
  sectionTitle: {
    fontSize: 18,
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
  overallBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  overallBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  badgeLive: {
    backgroundColor: "#d8e8bd",
  },
  badgePartial: {
    backgroundColor: "#f3e3b8",
  },
  badgeWarn: {
    backgroundColor: "#f5d1c2",
  },
  badgeTextLive: {
    color: colors.moss,
  },
  badgeTextPartial: {
    color: "#765719",
  },
  badgeTextWarn: {
    color: "#8b3e2b",
  },
  offlineNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#f5ded4",
    borderRadius: 14,
    padding: 12,
  },
  offlineNoticeText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 17,
    color: "#6f2f1d",
  },
  sourceList: {
    gap: 9,
  },
  sourceItem: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.ink10,
    padding: 12,
    gap: 5,
  },
  sourceTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sourceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  sourceLabel: {
    fontSize: 12.5,
    fontWeight: "800",
    color: colors.ink,
  },
  stateBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stateBadgeText: {
    fontSize: 8.5,
    fontWeight: "800",
  },
  sourceDetail: {
    fontSize: 11,
    color: colors.ink60,
    fontVariant: ["tabular-nums"],
  },
  coverageFooter: {
    marginTop: 11,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: colors.ink10,
  },
  coverageText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink45,
    fontVariant: ["tabular-nums"],
  },
});
