import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import type { WeatherAlert } from "../types/atie";

interface Props {
  alerts: WeatherAlert[];
}

export function WeatherDisruptions({ alerts }: Props) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Feather name="cloud-rain" size={16} color={colors.moss} />
        </View>
        <View>
          <Text style={styles.sectionTag}>CORRIDOR WEATHER</Text>
          <Text style={styles.sectionTitle}>Microclimate Disruption Radar</Text>
        </View>
      </View>

      <View style={styles.alertList}>
        {alerts.map((a, index) => {
          const isHigh = a.riskLevel === "HIGH";

          return (
            <View
              key={`${a.marketCode}-${index}`}
              style={[styles.alertItem, isHigh && styles.alertItemHigh]}
            >
              <View style={styles.alertTop}>
                <Text style={styles.marketCode}>{a.marketCode} CORRIDOR</Text>
                <View
                  style={[
                    styles.riskPill,
                    isHigh ? styles.riskPillHigh : styles.riskPillLow,
                  ]}
                >
                  <Text
                    style={[
                      styles.riskText,
                      isHigh ? styles.riskTextHigh : styles.riskTextLow,
                    ]}
                  >
                    {a.riskLevel} RISK · {a.precipitationMm} mm
                  </Text>
                </View>
              </View>

              <Text style={styles.alertMessage}>{a.message}</Text>

              <View style={styles.alertBottom}>
                <Ionicons name="time-outline" size={11} color={colors.ink45} />
                <Text style={styles.sourceText}>
                  Source: {a.source} · {a.observationDate}
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
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
    letterSpacing: 1.2,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.ink10,
    padding: 14,
  },
  alertItemHigh: {
    backgroundColor: "rgba(199, 100, 59, 0.06)",
    borderColor: "rgba(199, 100, 59, 0.25)",
  },
  alertTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  marketCode: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: 0.5,
  },
  riskPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  riskPillHigh: {
    backgroundColor: colors.clay,
  },
  riskPillLow: {
    backgroundColor: colors.moss,
  },
  riskText: {
    fontSize: 9,
    fontWeight: "800",
  },
  riskTextHigh: {
    color: colors.cream,
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
  },
});
