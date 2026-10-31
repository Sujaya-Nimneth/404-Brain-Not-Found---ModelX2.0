import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

interface Props {
  onRefresh: () => void;
  loading: boolean;
  modelSummary?: {
    maeLkr: number | null;
    symmetryPct: number | null;
  };
}

export function Header({ onRefresh, loading, modelSummary }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.leftRow}>
        <View style={styles.logoBadge}>
          <MaterialCommunityIcons name="leaf" size={22} color={colors.lime} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>ATIE</Text>
          <Text style={styles.subtitle}>
            AGRICULTURAL TRADE & INTELLIGENCE ENGINE
          </Text>
        </View>
      </View>

      <View style={styles.rightRow}>
        {modelSummary && modelSummary.maeLkr != null && (
          <View style={styles.evalBadge}>
            <View style={styles.evalDot} />
            <Text style={styles.evalText}>
              MAE {modelSummary.maeLkr.toFixed(2)} LKR
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={onRefresh}
          disabled={loading}
          style={[styles.refreshBtn, loading && styles.refreshBtnDisabled]}
          accessibilityLabel="Refresh analysis"
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <Ionicons
            name="refresh"
            size={18}
            color={loading ? colors.ink45 : colors.ink}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.cream90,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.ink10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
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
    flexShrink: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 8,
    fontWeight: "700",
    color: colors.ink45,
    letterSpacing: 0.8,
  },
  rightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  evalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.canvas,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    fontWeight: "700",
    color: colors.moss,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink15,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshBtnDisabled: {
    opacity: 0.5,
  },
});
