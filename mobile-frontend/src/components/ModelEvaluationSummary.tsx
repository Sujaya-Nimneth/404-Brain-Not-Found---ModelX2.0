import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import type { ModelEvaluationSummary } from "../types/atie";

interface Props {
  summary: ModelEvaluationSummary;
}

export function ModelEvaluationCard({ summary }: Props) {
  if (!summary || !summary.available) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons
            name="chart-timeline-variant-shimmer"
            size={18}
            color={colors.ink}
          />
        </View>
        <View>
          <Text style={styles.sectionTag}>BENCHMARK ACCURACY</Text>
          <Text style={styles.sectionTitle}>Model vs Baseline Benchmarks</Text>
        </View>
      </View>

      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableRowHeader}>
          <Text style={[styles.headerCell, { flex: 1.4 }]}>PREDICTOR</Text>
          <Text style={[styles.headerCell, { flex: 1, textAlign: "center" }]}>
            DIR. SYM
          </Text>
          <Text style={[styles.headerCell, { flex: 1, textAlign: "center" }]}>
            MAE
          </Text>
          <Text style={[styles.headerCell, { flex: 1.1, textAlign: "right" }]}>
            SAFE FPR
          </Text>
        </View>

        {/* Row 1: ATIE Production Model */}
        <View style={[styles.tableRow, styles.tableRowHighlight]}>
          <View style={[{ flex: 1.4 }, styles.predictorNameCell]}>
            <Text style={styles.modelNameHighlight}>ATIE ModelX2.0</Text>
            <Text style={styles.subTag}>Production</Text>
          </View>
          <Text
            style={[
              styles.cellText,
              { flex: 1, textAlign: "center", color: colors.moss, fontWeight: "800" },
            ]}
          >
            {summary.modelDirectionalSymmetryPct?.toFixed(1)}%
          </Text>
          <Text
            style={[
              styles.cellText,
              { flex: 1, textAlign: "center", color: colors.moss, fontWeight: "800" },
            ]}
          >
            {summary.modelMaeLkr?.toFixed(2)} LKR
          </Text>
          <Text
            style={[
              styles.cellText,
              { flex: 1.1, textAlign: "right", color: colors.moss, fontWeight: "800" },
            ]}
          >
            {summary.modelSafeMarginFpr?.safeMarginFprPct?.toFixed(2)}%
          </Text>
        </View>

        {/* Row 2: Naive Baseline */}
        <View style={styles.tableRow}>
          <View style={[{ flex: 1.4 }, styles.predictorNameCell]}>
            <Text style={styles.modelNameNorm}>Naive t-1</Text>
            <Text style={styles.subTag}>Zero-order</Text>
          </View>
          <Text style={[styles.cellText, { flex: 1, textAlign: "center" }]}>
            {summary.naiveDirectionalSymmetryPct?.toFixed(1)}%
          </Text>
          <Text style={[styles.cellText, { flex: 1, textAlign: "center" }]}>
            {summary.naiveMaeLkr?.toFixed(2)} LKR
          </Text>
          <Text style={[styles.cellText, { flex: 1.1, textAlign: "right" }]}>
            {summary.naiveSafeMarginFpr?.safeMarginFprPct?.toFixed(2)}%
          </Text>
        </View>

        {/* Row 3: 7-Day MA Baseline */}
        <View style={styles.tableRow}>
          <View style={[{ flex: 1.4 }, styles.predictorNameCell]}>
            <Text style={styles.modelNameNorm}>7-Day MA</Text>
            <Text style={styles.subTag}>Moving Avg</Text>
          </View>
          <Text style={[styles.cellText, { flex: 1, textAlign: "center" }]}>
            {summary.ma7DirectionalSymmetryPct?.toFixed(1)}%
          </Text>
          <Text style={[styles.cellText, { flex: 1, textAlign: "center" }]}>
            {summary.ma7MaeLkr?.toFixed(2)} LKR
          </Text>
          <Text style={[styles.cellText, { flex: 1.1, textAlign: "right" }]}>
            {summary.ma7SafeMarginFpr?.safeMarginFprPct?.toFixed(2)}%
          </Text>
        </View>
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
  table: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.ink10,
    overflow: "hidden",
  },
  tableRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.canvas,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink10,
  },
  headerCell: {
    fontSize: 8.5,
    fontWeight: "800",
    color: colors.ink60,
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink10,
  },
  tableRowHighlight: {
    backgroundColor: "rgba(212, 232, 163, 0.2)",
  },
  predictorNameCell: {
    gap: 1,
  },
  modelNameHighlight: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink,
  },
  modelNameNorm: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink75,
  },
  subTag: {
    fontSize: 8,
    color: colors.ink45,
    textTransform: "uppercase",
  },
  cellText: {
    fontSize: 11,
    color: colors.ink75,
  },
});
