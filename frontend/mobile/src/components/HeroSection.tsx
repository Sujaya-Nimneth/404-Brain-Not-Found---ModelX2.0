import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI_STRINGS } from "../i18n/translations";
import { colors } from "../theme/colors";
import type { LanguageCode } from "../types/atie";

interface Props {
  language: LanguageCode;
}

export function HeroSection({ language }: Props) {
  const t = UI_STRINGS[language];

  return (
    <View style={styles.container}>
      <Text style={styles.regionTag}>{t.regionTag}</Text>

      <Text style={styles.headline}>
        {t.heroTitlePrefix}
        <Text style={styles.highlightText}>{t.heroTitleAccent}</Text>
      </Text>

      <Text style={styles.description}>{t.heroDescription}</Text>

      <View style={styles.corridorBadge}>
        <Ionicons name="map-outline" size={13} color={colors.moss} />
        <Text style={styles.corridorText}>{t.canonicalCorridor}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  regionTag: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.clay,
    letterSpacing: 1.3,
    marginBottom: 5,
  },
  headline: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.ink,
    lineHeight: 34,
    letterSpacing: -0.7,
    marginBottom: 7,
  },
  highlightText: {
    color: colors.moss,
    backgroundColor: colors.lime80,
  },
  description: {
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.ink60,
    marginBottom: 10,
  },
  corridorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.ink10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  corridorText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.ink60,
    letterSpacing: 0.5,
  },
});
