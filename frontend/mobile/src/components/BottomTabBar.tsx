import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UI_STRINGS } from "../i18n/translations";
import { colors } from "../theme/colors";
import type { LanguageCode, MobileTab } from "../types/atie";

interface Props {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  language: LanguageCode;
  marketCount: number;
  hasHighRiskWeather: boolean;
}

export function BottomTabBar({
  activeTab,
  onSelectTab,
  language,
  marketCount,
  hasHighRiskWeather,
}: Props) {
  const insets = useSafeAreaInsets();
  const t = UI_STRINGS[language];

  const tabs: Array<{
    key: MobileTab;
    label: string;
    renderIcon: (active: boolean) => React.ReactNode;
    badge?: string | null;
    alertDot?: boolean;
  }> = [
    {
      key: "directive",
      label: t.tabDirective,
      renderIcon: (active) => (
        <MaterialCommunityIcons
          name={active ? "compass" : "compass-outline"}
          size={21}
          color={active ? colors.ink : colors.ink60}
        />
      ),
    },
    {
      key: "markets",
      label: t.tabMarkets,
      badge: marketCount > 0 ? String(marketCount) : null,
      renderIcon: (active) => (
        <Ionicons
          name={active ? "stats-chart" : "stats-chart-outline"}
          size={19}
          color={active ? colors.ink : colors.ink60}
        />
      ),
    },
    {
      key: "forecast",
      label: t.tabForecast,
      renderIcon: (active) => (
        <MaterialCommunityIcons
          name="chart-line"
          size={21}
          color={active ? colors.ink : colors.ink60}
        />
      ),
    },
    {
      key: "trust",
      label: t.tabTrust,
      alertDot: hasHighRiskWeather,
      renderIcon: (active) => (
        <Ionicons
          name={active ? "shield-checkmark" : "shield-checkmark-outline"}
          size={20}
          color={active ? colors.ink : colors.ink60}
        />
      ),
    },
  ];

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      {tabs.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onSelectTab(tab.key)}
            style={styles.tabItem}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.iconPill,
                active && styles.iconPillActive,
              ]}
            >
              {tab.renderIcon(active)}
              {tab.badge && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{tab.badge}</Text>
                </View>
              )}
              {tab.alertDot && <View style={styles.alertDot} />}
            </View>
            <Text
              style={[styles.tabLabel, active && styles.tabLabelActive]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: colors.cream,
    borderTopWidth: 1,
    borderTopColor: colors.ink15,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    gap: 3,
  },
  iconPill: {
    position: "relative",
    minWidth: 52,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPillActive: {
    backgroundColor: colors.lime,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.ink60,
  },
  tabLabelActive: {
    fontWeight: "900",
    color: colors.ink,
  },
  countBadge: {
    position: "absolute",
    top: -2,
    right: 4,
    backgroundColor: colors.moss,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  countBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: colors.cream,
    fontVariant: ["tabular-nums"],
  },
  alertDot: {
    position: "absolute",
    top: 2,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.clay,
  },
});
