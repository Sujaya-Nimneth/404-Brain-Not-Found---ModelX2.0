import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { shortMarketName } from "../../../src/components/profitFormat";
import { localizePlaceName, UI_STRINGS } from "../i18n/translations";
import { colors } from "../theme/colors";
import type { LanguageCode, MarketComparison } from "../types/atie";
import { formatCurrency } from "../utils/format";

interface Props {
  markets: MarketComparison[];
  language: LanguageCode;
}

export function ProfitComparisonChart({ markets, language }: Props) {
  const t = UI_STRINGS[language];

  const maxTotal = useMemo(() => {
    let peak = 1;
    for (const m of markets) {
      const deductions = m.transportCostLkr + m.handlingCostLkr;
      const total = Math.max(0, m.netProfitLkr) + deductions + m.spoilageLossLkr;
      if (total > peak) peak = total;
    }
    return peak;
  }, [markets]);

  if (!markets || markets.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTag}>{t.profitChartTag}</Text>
      <Text style={styles.sectionTitle}>{t.profitChartTitle}</Text>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.moss }]} />
          <Text style={styles.legendText}>{t.netProfitLegend}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.clay }]} />
          <Text style={styles.legendText}>{t.fuelHandlingLegend}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.amber }]} />
          <Text style={styles.legendText}>{t.spoilageLegend}</Text>
        </View>
      </View>

      <View style={styles.rowsContainer}>
        {markets.map((m) => {
          const net = Math.max(0, m.netProfitLkr);
          const deductions = m.transportCostLkr + m.handlingCostLkr;
          const spoilage = Math.max(0, m.spoilageLossLkr);

          const netPct = (net / maxTotal) * 100;
          const deductPct = (deductions / maxTotal) * 100;
          const spoilPct = (spoilage / maxTotal) * 100;

          const label =
            language === "en"
              ? shortMarketName(m.marketName)
              : localizePlaceName(m.marketCode, m.marketName, language);

          return (
            <View key={m.marketCode} style={styles.barRow}>
              <View style={styles.barHeader}>
                <Text
                  style={[
                    styles.marketLabel,
                    m.recommended && styles.marketLabelRec,
                  ]}
                  numberOfLines={1}
                >
                  {label}
                  {m.recommended ? " ★" : ""}
                </Text>
                <Text style={styles.netAmount}>
                  {formatCurrency(m.netProfitLkr)}
                </Text>
              </View>

              <Svg width="100%" height={14} viewBox="0 0 100 14" preserveAspectRatio="none">
                <Rect
                  x={0}
                  y={0}
                  width={100}
                  height={14}
                  rx={4}
                  fill={colors.canvas}
                />
                <Rect
                  x={0}
                  y={0}
                  width={netPct}
                  height={14}
                  rx={3}
                  fill={m.recommended ? colors.moss : colors.leaf}
                />
                <Rect
                  x={netPct}
                  y={0}
                  width={deductPct}
                  height={14}
                  fill={colors.clay}
                />
                <Rect
                  x={netPct + deductPct}
                  y={0}
                  width={spoilPct}
                  height={14}
                  fill={colors.amber}
                />
              </Svg>
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
  sectionTag: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.moss,
    letterSpacing: 1.1,
    marginBottom: 3,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  swatch: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.ink60,
  },
  rowsContainer: {
    gap: 11,
  },
  barRow: {
    gap: 4,
  },
  barHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  marketLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink75,
  },
  marketLabelRec: {
    fontWeight: "900",
    color: colors.moss,
  },
  netAmount: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
});
