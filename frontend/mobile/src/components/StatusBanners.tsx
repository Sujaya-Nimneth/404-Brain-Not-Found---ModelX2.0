import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import type { AnalyzeResponse } from "../types/atie";

export function shouldShowSourceNotice(
  response: AnalyzeResponse,
  cachedSnapshotTimestamp: string | null,
): boolean {
  return (
    cachedSnapshotTimestamp !== null ||
    response.forecastSource !== "MODEL" ||
    response.inputDataState !== "LIVE"
  );
}

export function SourceProvenanceNotice({
  response,
  cachedAt,
  onDismiss,
}: {
  response: AnalyzeResponse;
  cachedAt: string | null;
  onDismiss: () => void;
}) {
  const isDemo = response.forecastSource === "DEMO_FIXTURE";
  const isFallback = response.forecastSource === "FALLBACK";

  const title = cachedAt
    ? "Offline cached result active."
    : isDemo
      ? "Canonical demo fixture active (DEMO_FIXTURE)."
      : isFallback
        ? "Fallback forecast active (FALLBACK)."
        : response.inputDataState === "CACHED"
          ? "Cached inputs active."
          : "Seed inputs active.";

  const detail = cachedAt
    ? `Backend unreachable; retaining last verified live calculation (${cachedAt}) because the requested consignment matches identically.`
    : response.analysisState?.kind === "demo"
      ? response.analysisState.message
      : [
          isFallback
            ? "Trained model artifact was unavailable; deterministic fallback supplied these forecasts."
            : null,
          response.inputDataState === "CACHED"
            ? "Features include verified local cache observations."
            : null,
          response.inputDataState === "SEED"
            ? "Features include deterministic seed history."
            : null,
        ]
          .filter(Boolean)
          .join(" ");

  return (
    <View style={styles.noticeAmber} accessibilityRole="alert">
      <MaterialCommunityIcons
        name={cachedAt ? "cloud-clock" : "shield-alert-outline"}
        size={17}
        color="#6b4f16"
        style={styles.noticeIcon}
      />
      <Text style={styles.noticeAmberText}>
        <Text style={styles.bold}>{title} </Text>
        {detail}
      </Text>
      <TouchableOpacity
        onPress={onDismiss}
        style={styles.closeBtn}
        accessibilityLabel="Dismiss source notice"
      >
        <Ionicons name="close" size={15} color="#6b4f16" />
      </TouchableOpacity>
    </View>
  );
}

export function AnalysisErrorBanner({
  message,
  keptPreviousResult,
  onOpenSettings,
  onLoadDemo,
  onDismiss,
}: {
  message: string;
  keptPreviousResult: boolean;
  onOpenSettings: () => void;
  onLoadDemo: () => void;
  onDismiss: () => void;
}) {
  return (
    <View style={styles.errorBox} accessibilityRole="alert">
      <View style={styles.errorTopRow}>
        <Ionicons
          name="warning-outline"
          size={18}
          color="#6f2f1d"
          style={styles.noticeIcon}
        />
        <Text style={styles.errorText}>
          <Text style={styles.bold}>
            {keptPreviousResult
              ? "Live refresh failed; matching verified result retained below. "
              : "Live analysis unavailable. "}
          </Text>
          {message}
          {!keptPreviousResult
            ? " No demo fixture was substituted for this live request."
            : ""}
        </Text>
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.closeBtn}
          accessibilityLabel="Dismiss error"
        >
          <Ionicons name="close" size={15} color="#6f2f1d" />
        </TouchableOpacity>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={onOpenSettings}
          style={styles.actionBtnOutline}
          activeOpacity={0.8}
        >
          <Ionicons name="options-outline" size={13} color="#6f2f1d" />
          <Text style={styles.actionBtnOutlineText}>Server Endpoint</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onLoadDemo}
          style={styles.actionBtnSolid}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="sprout" size={13} color={colors.lime} />
          <Text style={styles.actionBtnSolidText}>
            Load Verified Demo Fixture
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  noticeAmber: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    backgroundColor: "#f4e6bd",
    borderWidth: 1,
    borderColor: "rgba(214, 161, 63, 0.4)",
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 14,
  },
  noticeIcon: {
    marginTop: 1,
  },
  noticeAmberText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 17,
    color: "#6b4f16",
  },
  bold: {
    fontWeight: "800",
  },
  closeBtn: {
    padding: 3,
  },
  errorBox: {
    backgroundColor: "#f3d8cc",
    borderWidth: 1,
    borderColor: colors.clay30,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginBottom: 14,
    gap: 10,
  },
  errorTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  errorText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 17,
    color: "#6f2f1d",
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingLeft: 26,
  },
  actionBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(111, 47, 29, 0.35)",
    backgroundColor: "rgba(255, 253, 247, 0.65)",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 12,
  },
  actionBtnOutlineText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6f2f1d",
  },
  actionBtnSolid: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.ink,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 12,
  },
  actionBtnSolidText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.cream,
  },
});
