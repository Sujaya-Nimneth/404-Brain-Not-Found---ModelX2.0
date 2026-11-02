import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { localizePlaceName, UI_STRINGS } from "../i18n/translations";
import { colors } from "../theme/colors";
import type { LanguageCode, WeatherAlert } from "../types/atie";

interface Props {
  alerts: WeatherAlert[];
  language: LanguageCode;
}

export function WeatherDisruptions({ alerts, language }: Props) {
  const t = UI_STRINGS[language];

  if (!alerts || alerts.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Feather name="cloud-rain" size={16} color={colors.moss} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTag}>{t.weatherTag}</Text>
          <Text style={styles.sectionTitle}>{t.weatherTitle}</Text>
        </View>
      </View>

      <View style={styles.alertList}>
        {alerts.map((a, index) => {
          const isHigh = a.riskLevel === "HIGH";
          const isMedium = a.riskLevel === "MEDIUM";

          return (
            <View
              key={`${a.marketCode}-${index}`}
              style={[
                styles.alertItem,
                isHigh && styles.alertItemHigh,
                isMedium && styles.alertItemMedium,
              ]}
            >
              <View style={styles.alertTop}>
                <Text style={styles.marketCode}>
                  {localizePlaceName(a.marketCode, a.marketCode, language)}
                </Text>
                <View style={styles.pillsGroup}>
                  {a.extremeWeather && (
                    <View style={styles.extremePill}>
                      <Text style={styles.extremeText}>EXTREME</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.riskPill,
                      isHigh
                        ? styles.riskPillHigh
                        : isMedium
                          ? styles.riskPillMedium
                          : styles.riskPillLow,
                    ]}
                  >
                    <Text
                      style={[
                        styles.riskText,
                        isHigh
                          ? styles.riskTextHigh
                          : isMedium
                            ? styles.riskTextMedium
                            : styles.riskTextLow,
                      ]}
                    >
                      {a.riskLevel} · {a.precipitationMm.toFixed(1)} mm
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.alertMessage}>{a.message}</Text>

              <View style={styles.alertBottom}>
                <Ionicons name="time-outline" size={11} color={colors.ink45} />
                <Text style={styles.sourceText}>
                  {a.source} · {a.observationDate}
                </Text>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTag: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.moss,
    letterSpacing: 1.1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.3,
  },
  alertList: {
    gap: 10,
  },
  alertItem: {
    backgroundColor: colors.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.ink10,
    padding: 13,
  },
  alertItemHigh: {
    backgroundColor: "rgba(199, 100, 59, 0.07)",
    borderColor: "rgba(199, 100, 59, 0.28)",
  },
  alertItemMedium: {
    backgroundColor: "rgba(214, 161, 63, 0.10)",
    borderColor: "rgba(214, 161, 63, 0.35)",
  },
  alertTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  marketCode: {
    fontSize: 12.5,
    fontWeight: "800",
    color: colors.ink,
    flex: 1,
  },
  pillsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  extremePill: {
    backgroundColor: colors.ink,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  extremeText: {
    fontSize: 8,
    fontWeight: "900",
    color: colors.amber,
  },
  riskPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9,
  },
  riskPillHigh: {
    backgroundColor: colors.clay,
  },
  riskPillMedium: {
    backgroundColor: "#f3e3b8",
  },
  riskPillLow: {
    backgroundColor: colors.moss,
  },
  riskText: {
    fontSize: 9,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  riskTextHigh: {
    color: colors.cream,
  },
  riskTextMedium: {
    color: "#765719",
  },
  riskTextLow: {
    color: colors.lime,
  },
  alertMessage: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.ink75,
    marginBottom: 8,
  },
  alertBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sourceText: {
    fontSize: 9.5,
    color: colors.ink45,
    fontVariant: ["tabular-nums"],
  },
});
