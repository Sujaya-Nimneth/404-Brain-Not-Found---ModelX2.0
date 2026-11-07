import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { UI_STRINGS } from "../i18n/translations";
import { colors } from "../theme/colors";
import type { LanguageCode } from "../types/atie";
import { formatMetricLkr, formatMetricPct } from "../utils/format";

interface Props {
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onOpenServerSettings: () => void;
  onRefresh: () => void;
  loading: boolean;
  backendReachable: boolean | null;
  modelSummary?: {
    maeLkr: number | null;
    symmetryPct: number | null;
  };
}

const LANG_OPTIONS: Array<{ code: LanguageCode; label: string }> = [
  { code: "en", label: "EN" },
  { code: "si", label: "සිං" },
  { code: "ta", label: "தமிழ்" },
];

export function Header({
  language,
  onLanguageChange,
  onOpenServerSettings,
  onRefresh,
  loading,
  backendReachable,
  modelSummary,
}: Props) {
  const t = UI_STRINGS[language];

  return (
    <View style={styles.wrapper}>
      <View style={styles.topRow}>
        <View style={styles.leftRow}>
          <View style={styles.logoBadge}>
            <MaterialCommunityIcons name="leaf" size={21} color={colors.lime} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>ATIE</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {t.appSubtitle}
            </Text>
          </View>
        </View>

        <View style={styles.rightRow}>
          <TouchableOpacity
            onPress={onOpenServerSettings}
            style={styles.iconBtn}
            accessibilityLabel="Configure backend endpoint"
            accessibilityRole="button"
            activeOpacity={0.75}
          >
            <Ionicons name="options-outline" size={18} color={colors.ink} />
            <View
              style={[
                styles.statusDot,
                backendReachable === true
                  ? styles.statusDotOnline
                  : backendReachable === false
                    ? styles.statusDotOffline
                    : styles.statusDotPending,
              ]}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onRefresh}
            disabled={loading}
            style={[styles.iconBtn, loading && styles.btnDisabled]}
            accessibilityLabel="Refresh analysis"
            accessibilityRole="button"
            activeOpacity={0.75}
          >
            <Ionicons
              name="refresh"
              size={18}
              color={loading ? colors.ink45 : colors.ink}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <View style={styles.langSwitch}>
          {LANG_OPTIONS.map((item) => {
            const active = language === item.code;
            return (
              <TouchableOpacity
                key={item.code}
                onPress={() => onLanguageChange(item.code)}
                style={[styles.langPill, active && styles.langPillActive]}
                accessibilityRole="button"
                accessibilityLabel={`Switch language to ${item.label}`}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.langText, active && styles.langTextActive]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {modelSummary && modelSummary.maeLkr !== null && (
          <View style={styles.evalBadge}>
            <View style={styles.evalDot} />
            <Text style={styles.evalText}>
              {modelSummary.symmetryPct !== null
                ? `DS ${formatMetricPct(modelSummary.symmetryPct, 2)} · `
                : ""}
              MAE {formatMetricLkr(modelSummary.maeLkr, 2)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.cream,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.ink10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 8.5,
    fontWeight: "700",
    color: colors.ink45,
    letterSpacing: 0.6,
  },
  rightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink15,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.45,
  },
  statusDot: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1,
    borderColor: colors.white,
  },
  statusDotOnline: {
    backgroundColor: colors.leaf,
  },
  statusDotOffline: {
    backgroundColor: colors.clay,
  },
  statusDotPending: {
    backgroundColor: colors.amber,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.ink10,
    paddingTop: 9,
    gap: 8,
  },
  langSwitch: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.canvas,
    borderRadius: 14,
    padding: 3,
    gap: 3,
  },
  langPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 11,
  },
  langPillActive: {
    backgroundColor: colors.ink,
  },
  langText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: colors.ink60,
  },
  langTextActive: {
    color: colors.lime,
  },
  evalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.canvas,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.ink10,
  },
  evalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.leaf,
  },
  evalText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.moss,
    fontVariant: ["tabular-nums"],
  },
});
