import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  ANDROID_EMULATOR_DIRECT_BACKEND_URL,
  ANDROID_EMULATOR_GATEWAY_URL,
  AUTO_DETECTED_BASE_URL,
  getActiveApiBaseUrl,
  getCustomApiBaseUrl,
  getCustomApiKey,
  getDetectedLanGatewayUrl,
  pingEndpointHealth,
} from "../api/atieClient";
import { UI_STRINGS } from "../i18n/translations";
import { colors } from "../theme/colors";
import type { LanguageCode } from "../types/atie";

interface Props {
  visible: boolean;
  language: LanguageCode;
  onClose: () => void;
  onSaveEndpoint: (customUrl: string | null, customApiKey: string | null) => void;
}

export function ServerSettingsModal({
  visible,
  language,
  onClose,
  onSaveEndpoint,
}: Props) {
  const t = UI_STRINGS[language];
  const [draftUrl, setDraftUrl] = useState("");
  const [draftApiKey, setDraftApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [probeStatus, setProbeStatus] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  useEffect(() => {
    if (visible) {
      setDraftUrl(getCustomApiBaseUrl() ?? "");
      setDraftApiKey(getCustomApiKey() ?? "");
      setProbeStatus(null);
    }
  }, [visible]);

  const lanUrl = getDetectedLanGatewayUrl();
  const presets: Array<{ label: string; sub: string; value: string }> = [
    {
      label: "Auto-Detect (Recommended)",
      sub: AUTO_DETECTED_BASE_URL,
      value: "",
    },
    ...(lanUrl
      ? [
          {
            label: "Physical Android Phone (Expo Wi-Fi LAN)",
            sub: lanUrl,
            value: lanUrl,
          },
        ]
      : []),
    {
      label: "Android Emulator · Docker Nginx Gateway",
      sub: ANDROID_EMULATOR_GATEWAY_URL,
      value: ANDROID_EMULATOR_GATEWAY_URL,
    },
    {
      label: "Android Emulator · Direct Spring Boot",
      sub: ANDROID_EMULATOR_DIRECT_BACKEND_URL,
      value: ANDROID_EMULATOR_DIRECT_BACKEND_URL,
    },
  ];

  const handleTest = async () => {
    const candidate =
      draftUrl.trim().length > 0 ? draftUrl.trim() : AUTO_DETECTED_BASE_URL;
    setTesting(true);
    setProbeStatus(null);
    const result = await pingEndpointHealth(
      candidate,
      draftApiKey.trim() || null,
    );
    setProbeStatus({ ok: result.ok, text: result.statusText });
    setTesting(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t.serverModalTitle}</Text>
              <Text style={styles.subtitle}>{t.serverModalSubtitle}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeIcon}
              accessibilityLabel={t.closeLabel}
            >
              <Ionicons name="close" size={20} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <Text style={styles.activeLabel}>
            Active: {getActiveApiBaseUrl()}
          </Text>

          <View style={styles.presetsList}>
            {presets.map((preset) => {
              const selected = draftUrl.trim() === preset.value;
              return (
                <TouchableOpacity
                  key={preset.label}
                  onPress={() => {
                    setDraftUrl(preset.value);
                    setProbeStatus(null);
                  }}
                  style={[
                    styles.presetRow,
                    selected && styles.presetRowActive,
                  ]}
                  activeOpacity={0.75}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.presetTitle,
                        selected && styles.presetTitleActive,
                      ]}
                    >
                      {preset.label}
                    </Text>
                    <Text
                      style={[
                        styles.presetSub,
                        selected && styles.presetSubActive,
                      ]}
                    >
                      {preset.sub}
                    </Text>
                  </View>
                  <Ionicons
                    name={
                      selected ? "checkmark-circle" : "ellipse-outline"
                    }
                    size={18}
                    color={selected ? colors.lime : colors.ink45}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.inputLabel}>{t.customUrlLabel}</Text>
          <TextInput
            value={draftUrl}
            onChangeText={(txt) => {
              setDraftUrl(txt);
              setProbeStatus(null);
            }}
            placeholder="http://192.168.1.42:15173/api/v1"
            placeholderTextColor={colors.ink45}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
          />

          <Text style={styles.inputLabel}>{t.apiKeyLabel}</Text>
          <TextInput
            value={draftApiKey}
            onChangeText={(txt) => {
              setDraftApiKey(txt);
              setProbeStatus(null);
            }}
            placeholder={t.apiKeyHint}
            placeholderTextColor={colors.ink45}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={styles.input}
          />

          {probeStatus && (
            <View
              style={[
                styles.probeBanner,
                probeStatus.ok ? styles.probeOk : styles.probeFail,
              ]}
            >
              <Ionicons
                name={
                  probeStatus.ok
                    ? "checkmark-circle-outline"
                    : "alert-circle-outline"
                }
                size={16}
                color={probeStatus.ok ? colors.moss : "#8b3e2b"}
              />
              <Text
                style={[
                  styles.probeText,
                  { color: probeStatus.ok ? colors.moss : "#8b3e2b" },
                ]}
              >
                {probeStatus.text}
              </Text>
            </View>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={() => void handleTest()}
              disabled={testing}
              style={styles.testBtn}
              activeOpacity={0.8}
            >
              {testing ? (
                <ActivityIndicator size="small" color={colors.ink} />
              ) : (
                <Text style={styles.testBtnText}>{t.testConnection}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                onSaveEndpoint(
                  draftUrl.trim() || null,
                  draftApiKey.trim() || null,
                );
                onClose();
              }}
              style={styles.saveBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>{t.saveAndReconnect}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(23, 37, 31, 0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.cream,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    fontSize: 19,
    fontWeight: "900",
    color: colors.ink,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.ink60,
    marginTop: 2,
  },
  closeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  activeLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.moss,
  },
  presetsList: {
    gap: 7,
  },
  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink15,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  presetRowActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  presetTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink,
  },
  presetTitleActive: {
    color: colors.cream,
  },
  presetSub: {
    fontSize: 10,
    color: colors.ink60,
    marginTop: 1,
  },
  presetSubActive: {
    color: colors.lime,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.ink60,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  input: {
    height: 44,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink15,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
  },
  probeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  probeOk: {
    backgroundColor: "#d8e8bd",
  },
  probeFail: {
    backgroundColor: "#f5d1c2",
  },
  probeText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  testBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.ink15,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  testBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: colors.ink,
  },
  saveBtn: {
    flex: 1.3,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.moss,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.cream,
  },
});
