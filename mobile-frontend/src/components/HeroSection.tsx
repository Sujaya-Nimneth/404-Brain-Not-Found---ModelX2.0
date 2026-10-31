import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

export function HeroSection() {
  return (
    <View style={styles.container}>
      <Text style={styles.regionTag}>SRI LANKA · WHOLESALE INTELLIGENCE</Text>

      <Text style={styles.headline}>
        Send the harvest{"\n"}where it{" "}
        <Text style={styles.highlightText}>actually pays.</Text>
      </Text>

      <Text style={styles.description}>
        Predictions become decisions here: 48–72 hour prices, route costs,
        spoilage, and a safe net-profit margin before you send a single crate.
      </Text>

      <View style={styles.corridorBadge}>
        <Ionicons name="map-outline" size={14} color={colors.ink45} />
        <Text style={styles.corridorText}>
          DAMBULLA → PETTAH · CANONICAL CORRIDOR
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  regionTag: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.clay,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  headline: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.ink,
    lineHeight: 38,
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  highlightText: {
    color: colors.moss,
    textDecorationLine: "underline",
    textDecorationColor: colors.lime,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.ink60,
    marginBottom: 12,
  },
  corridorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: colors.ink10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  corridorText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.ink45,
    letterSpacing: 0.6,
  },
});
