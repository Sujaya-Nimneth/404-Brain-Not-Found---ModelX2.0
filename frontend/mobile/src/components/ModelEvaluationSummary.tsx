import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { UI_STRINGS } from "../i18n/translations";
import { colors } from "../theme/colors";
import type {
  LanguageCode,
  ModelEvaluationSummary,
  SafeMarginFpr,
} from "../types/atie";
import {
  formatInteger,
  formatMetricLkr,
  formatMetricPct,
} from "../utils/format";

interface Props {
  summary: ModelEvaluationSummary;
  language: LanguageCode;
}

export function ModelEvaluationCard({ summary, language }: Props) {
  const t = UI_STRINGS[language];

  if (!summary || !summary.available) {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTag}>{t.benchmarksTag}</Text>
        <Text style={styles.sectionTitle}>{t.benchmarksTitle}</Text>
        <Text style={styles.unavailText}>
          {summary?.message ??
            "Holdout evaluation report is currently unavailable."}
        </Text>
      </View>
    );
  }

  const rows: Array<{
    name: string;
    role: string;
    highlight: boolean;
    ds: number | null;
    mae: number | null;
    fpr: SafeMarginFpr | null;
  }> = [
    {
      name: "ATIE Model",
      role: "Production",
      highlight: true,
      ds: summary.modelDirectionalSymmetryPct,
      mae: summary.modelMaeLkr,
      fpr: summary.modelSafeMarginFpr,
    },
    {
      name: "Naive (y_t)",
      role: "Baseline 1",
      highlight: false,
      ds: summary.naiveDirectionalSymmetryPct,
      mae: summary.naiveMaeLkr,
      fpr: summary.naiveSafeMarginFpr,
    },
    {
      name: "7-Day MA",
      role: "Baseline 2",
      highlight: false,
      ds: summary.ma7DirectionalSymmetryPct,
      mae: summary.ma7MaeLkr,
      fpr: summary.ma7SafeMarginFpr,
    },
  ];

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
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTag}>{t.benchmarksTag}</Text>
          <Text style={styles.sectionTitle}>{t.benchmarksTitle}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableRowHeader}>
          <Text style={[styles.headerCell, { flex: 1.35 }]}>PREDICTOR</Text>
          <Text style={[styles.headerCell, { flex: 0.9, textAlign: "right" }]}>
            DS %
          </Text>
          <Text style={[styles.headerCell, { flex: 1, textAlign: "right" }]}>
            MAE
          </Text>
          <Text style={[styles.headerCell, { flex: 1.2, textAlign: "right" }]}>
            SM-FPR
          </Text>
        </View>

        {rows.map((row) => (
          <View
            key={row.name}
            style={[
              styles.tableRow,
              row.highlight && styles.tableRowHighlight,
            ]}
          >
            <View style={{ flex: 1.35 }}>
              <Text
                style={
                  row.highlight ? styles.modelNameHighlight : styles.modelNameNorm
                }
              >
                {row.name}
              </Text>
              <Text style={styles.subTag}>{row.role}</Text>
            </View>

            <Text
              style={[
                styles.cellText,
                { flex: 0.9, textAlign: "right" },
                row.highlight && styles.cellHighlight,
              ]}
            >
              {formatMetricPct(row.ds, 2)}
            </Text>

            <Text
              style={[
                styles.cellText,
                { flex: 1, textAlign: "right" },
                row.highlight && styles.cellHighlight,
              ]}
            >
              {formatMetricLkr(row.mae, 2)}
            </Text>

            <View style={{ flex: 1.2, alignItems: "flex-end" }}>
              <Text
                style={[
                  styles.cellText,
                  row.highlight && styles.cellHighlight,
                ]}
              >
                {formatMetricPct(row.fpr?.safeMarginFprPct, 2)}
              </Text>
              {row.fpr && (
                <Text style={styles.fprCounts}>
                  {formatInteger(row.fpr.falseRerouteCount)}/
                  {formatInteger(row.fpr.rerouteCount)}
                </Text>
              )}
            </View>
          </View>
        ))}
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
  unavailText: {
    fontSize: 12,
    color: colors.ink60,
    marginTop: 6,
  },
  table: {
    backgroundColor: colors.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.ink10,
    overflow: "hidden",
  },
  tableRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.canvas,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink10,
  },
  headerCell: {
    fontSize: 8.5,
    fontWeight: "800",
    color: colors.ink60,
    letterSpacing: 0.7,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink10,
  },
  tableRowHighlight: {
    backgroundColor: "rgba(212, 232, 163, 0.22)",
  },
  modelNameHighlight: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.ink,
  },
  modelNameNorm: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink75,
  },
  subTag: {
    fontSize: 8,
    fontWeight: "700",
    color: colors.ink45,
    textTransform: "uppercase",
  },
  cellText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink75,
    fontVariant: ["tabular-nums"],
  },
  cellHighlight: {
    color: colors.moss,
    fontWeight: "900",
  },
  fprCounts: {
    fontSize: 8.5,
    color: colors.ink45,
    fontVariant: ["tabular-nums"],
  },
});
