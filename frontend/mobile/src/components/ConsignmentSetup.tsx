import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import {
  CANONICAL_QUANTITY_PRESETS_KG,
  filterReachableMarkets,
  resolveValidOriginSelection,
} from "../data/metadata";
import {
  localizeCropName,
  localizePlaceName,
  localizeVehicleName,
  UI_STRINGS,
} from "../i18n/translations";
import { colors } from "../theme/colors";
import type {
  AnalyzeRequest,
  LanguageCode,
  MetadataConfig,
} from "../types/atie";
import { computeTripsAndLoad, formatInteger, formatLkr } from "../utils/format";

interface Props {
  value: AnalyzeRequest;
  metadata: MetadataConfig;
  metadataLive: boolean;
  language: LanguageCode;
  onChange: (request: AnalyzeRequest) => void;
  onAnalyze: () => void;
  onDemo: () => void;
  loading: boolean;
}

export function ConsignmentSetup({
  value,
  metadata,
  metadataLive,
  language,
  onChange,
  onAnalyze,
  onDemo,
  loading,
}: Props) {
  const t = UI_STRINGS[language];
  const [expanded, setExpanded] = useState(true);
  const [quantityDraft, setQuantityDraft] = useState(() =>
    String(value.quantityKg),
  );

  useEffect(() => {
    setQuantityDraft(String(value.quantityKg));
  }, [value.quantityKg]);

  const reachableMarkets = useMemo(
    () => filterReachableMarkets(metadata, value.originCode),
    [metadata, value.originCode],
  );

  const selectedVehicle = useMemo(
    () =>
      metadata.vehicleTypes.find((v) => v.code === value.vehicleType) ??
      metadata.vehicleTypes[0],
    [metadata.vehicleTypes, value.vehicleType],
  );

  const tripStats = useMemo(
    () =>
      computeTripsAndLoad(
        value.quantityKg,
        selectedVehicle?.capacityKg ?? 1500,
      ),
    [value.quantityKg, selectedVehicle],
  );

  const currentRoute = useMemo(
    () =>
      metadata.routes.find(
        (r) =>
          r.originCode === value.originCode &&
          r.marketCode === value.defaultMarketCode,
      ),
    [metadata.routes, value.originCode, value.defaultMarketCode],
  );

  const update = <K extends keyof AnalyzeRequest>(
    key: K,
    val: AnalyzeRequest[K],
  ) => {
    onChange({ ...value, [key]: val });
  };

  const handleOriginChange = (originCode: string) => {
    onChange(resolveValidOriginSelection(metadata, value, originCode));
  };

  const handleQuantityChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setQuantityDraft(cleaned);
    if (cleaned.length > 0) {
      const parsed = Number.parseInt(cleaned, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        update("quantityKg", Math.min(100_000, parsed));
      }
    }
  };

  const handleQuantityBlur = () => {
    const parsed = Number.parseInt(quantityDraft, 10);
    if (
      quantityDraft.trim() === "" ||
      !Number.isFinite(parsed) ||
      parsed <= 0
    ) {
      setQuantityDraft(String(value.quantityKg));
      return;
    }
    const clamped = Math.min(100_000, Math.max(1, parsed));
    setQuantityDraft(String(clamped));
    if (clamped !== value.quantityKg) {
      update("quantityKg", clamped);
    }
  };

  const setQuantityPreset = (kg: number) => {
    setQuantityDraft(String(kg));
    update("quantityKg", kg);
  };

  const summaryCrop = localizeCropName(value.cropCode, value.cropCode, language);
  const summaryOrigin = localizePlaceName(
    value.originCode,
    value.originCode,
    language,
  );
  const summaryMarket = localizePlaceName(
    value.defaultMarketCode,
    value.defaultMarketCode,
    language,
  );

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.sectionTag}>{t.consignmentTag}</Text>
            <Text style={styles.sectionTitle}>{t.consignmentTitle}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setExpanded((prev) => !prev)}
            style={styles.collapseBtn}
            accessibilityRole="button"
            accessibilityLabel={
              expanded ? "Collapse consignment form" : "Expand consignment form"
            }
          >
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={17}
              color={colors.ink}
            />
          </TouchableOpacity>
        </View>

        {!expanded && (
          <TouchableOpacity
            onPress={() => setExpanded(true)}
            style={styles.collapsedSummary}
            activeOpacity={0.8}
          >
            <Text style={styles.collapsedSummaryText}>
              {formatInteger(value.quantityKg)} kg {summaryCrop} · {summaryOrigin} →{" "}
              {summaryMarket} · {value.horizonHours}h
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={onDemo}
          style={styles.demoBtn}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="sprout" size={16} color={colors.lime} />
          <Text style={styles.demoBtnText}>{t.loadDemoBtn}</Text>
        </TouchableOpacity>
      </View>

      {expanded && (
        <>
          {/* Crop Selection */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <MaterialCommunityIcons
                name="seed-outline"
                size={14}
                color={colors.leaf}
              />
              <Text style={styles.fieldLabel}>{t.cropLabel}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {metadata.crops.map((crop) => {
                const isSelected = value.cropCode === crop.code;
                return (
                  <TouchableOpacity
                    key={crop.code}
                    onPress={() => update("cropCode", crop.code)}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextActive,
                      ]}
                    >
                      {localizeCropName(crop.code, crop.name, language)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Origin Selection */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Ionicons name="location-outline" size={14} color={colors.leaf} />
              <Text style={styles.fieldLabel}>{t.originLabel}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {metadata.origins.map((origin) => {
                const isSelected = value.originCode === origin.code;
                return (
                  <TouchableOpacity
                    key={origin.code}
                    onPress={() => handleOriginChange(origin.code)}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextActive,
                      ]}
                    >
                      {localizePlaceName(origin.code, origin.name, language)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Route-Filtered Default Target Market */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Ionicons name="navigate-outline" size={14} color={colors.leaf} />
              <Text style={styles.fieldLabel}>{t.defaultMarketLabel}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {reachableMarkets.map((market) => {
                const isSelected = value.defaultMarketCode === market.code;
                return (
                  <TouchableOpacity
                    key={market.code}
                    onPress={() => update("defaultMarketCode", market.code)}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextActive,
                      ]}
                    >
                      {localizePlaceName(market.code, market.name, language)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Harvest Quantity & Canonical Presets */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRowBetween}>
              <View style={styles.fieldLabelInline}>
                <FontAwesome5
                  name="weight-hanging"
                  size={12}
                  color={colors.leaf}
                />
                <Text style={styles.fieldLabel}>{t.quantityLabel}</Text>
              </View>
              <Text style={styles.tripHint}>
                {tripStats.trips}{" "}
                {tripStats.trips === 1 ? "trip" : "trips"} ·{" "}
                {tripStats.loadUtilizationPct}% load
              </Text>
            </View>
            <View style={styles.quantityRow}>
              <TextInput
                style={styles.inputField}
                keyboardType="number-pad"
                value={quantityDraft}
                onChangeText={handleQuantityChange}
                onBlur={handleQuantityBlur}
                placeholder="1000"
                placeholderTextColor={colors.ink45}
                accessibilityLabel="Harvest quantity in kilograms"
              />
              <View style={styles.quickPresetRow}>
                {CANONICAL_QUANTITY_PRESETS_KG.map((kg) => {
                  const active = value.quantityKg === kg;
                  return (
                    <TouchableOpacity
                      key={kg}
                      onPress={() => setQuantityPreset(kg)}
                      style={[
                        styles.presetChip,
                        active && styles.presetChipActive,
                      ]}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          active && styles.presetChipTextActive,
                        ]}
                      >
                        {kg >= 1000 ? `${kg / 1000}t` : `${kg}kg`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Vehicle & Horizon */}
          <View style={styles.vehicleHorizonRow}>
            <View style={[styles.fieldGroup, { flex: 1, marginBottom: 0 }]}>
              <View style={styles.fieldLabelRow}>
                <Ionicons name="bus-outline" size={14} color={colors.leaf} />
                <Text style={styles.fieldLabel}>{t.vehicleLabel}</Text>
              </View>
              <View style={styles.stackedSelect}>
                {metadata.vehicleTypes.map((vehicle) => {
                  const isSelected = value.vehicleType === vehicle.code;
                  return (
                    <TouchableOpacity
                      key={vehicle.code}
                      onPress={() => update("vehicleType", vehicle.code)}
                      style={[
                        styles.selectRowOption,
                        isSelected && styles.selectRowOptionActive,
                      ]}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.selectOptionText,
                          isSelected && styles.selectOptionTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {localizeVehicleName(
                          vehicle.code,
                          vehicle.displayName,
                          language,
                        )}
                      </Text>
                      <Text
                        style={[
                          styles.selectOptionCapacity,
                          isSelected && styles.selectOptionCapacityActive,
                        ]}
                      >
                        {vehicle.capacityKg >= 1000
                          ? `${vehicle.capacityKg / 1000}t`
                          : `${vehicle.capacityKg}kg`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.fieldGroup, { width: 112, marginBottom: 0 }]}>
              <View style={styles.fieldLabelRow}>
                <Ionicons name="time-outline" size={14} color={colors.leaf} />
                <Text style={styles.fieldLabel}>{t.horizonLabel}</Text>
              </View>
              <View style={styles.horizonColumn}>
                {metadata.horizons.map((horizon) => {
                  const isSelected = value.horizonHours === horizon;
                  return (
                    <TouchableOpacity
                      key={horizon}
                      onPress={() => update("horizonHours", horizon)}
                      style={[
                        styles.horizonBtn,
                        isSelected && styles.horizonBtnActive,
                      ]}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.horizonBtnText,
                          isSelected && styles.horizonBtnTextActive,
                        ]}
                      >
                        {horizon} {t.hoursSuffix}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </>
      )}

      {/* Footer Info & Analyze Button */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerNote}>
            {t.safeRuleNote} (≥{metadata.thresholds.safeMarginPct.toFixed(0)}%
            {" & "}LKR {formatLkr(metadata.thresholds.safeAbsoluteFloorLkr)} min)
          </Text>
          <Text style={styles.routePreview}>
            {currentRoute
              ? `${currentRoute.distanceKm.toFixed(0)} km one-way · terrain ×${currentRoute.terrainFactor.toFixed(2)}`
              : "Validated route matrix"}
            {metadata.fuelPrices.dieselLkrPerLiter !== null
              ? ` · CPC Diesel LKR ${metadata.fuelPrices.dieselLkrPerLiter.toFixed(0)}/L`
              : ""}
            {metadataLive ? " · LIVE CONFIG" : " · VERIFIED DEFAULTS"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onAnalyze}
          disabled={loading}
          style={[styles.analyzeBtn, loading && styles.analyzeBtnDisabled]}
          activeOpacity={0.82}
          accessibilityRole="button"
        >
          <Text style={styles.analyzeBtnText}>
            {loading ? t.analyzingBtn : t.analyzeBtn}
          </Text>
          {!loading && (
            <Ionicons name="arrow-forward" size={16} color={colors.cream} />
          )}
        </TouchableOpacity>
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
    marginBottom: 12,
    gap: 10,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  headerTextGroup: {
    flex: 1,
  },
  collapseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.ink10,
    alignItems: "center",
    justifyContent: "center",
  },
  collapsedSummary: {
    backgroundColor: colors.canvas,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  collapsedSummaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
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
  },
  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.ink,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    minHeight: 38,
  },
  demoBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: colors.cream,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 7,
  },
  fieldLabelRowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  fieldLabelInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fieldLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.ink60,
    letterSpacing: 0.9,
  },
  tripHint: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.moss,
    fontVariant: ["tabular-nums"],
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink15,
    minHeight: 40,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.moss,
    borderColor: colors.moss,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.ink,
  },
  chipTextActive: {
    color: colors.cream,
    fontWeight: "800",
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputField: {
    width: 92,
    height: 44,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink15,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14.5,
    fontWeight: "800",
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  quickPresetRow: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  presetChip: {
    flex: 1,
    height: 44,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  presetChipActive: {
    backgroundColor: colors.lime,
    borderColor: colors.leaf,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink75,
    fontVariant: ["tabular-nums"],
  },
  presetChipTextActive: {
    color: colors.ink,
    fontWeight: "900",
  },
  vehicleHorizonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  stackedSelect: {
    gap: 6,
  },
  selectRowOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink15,
    borderRadius: 12,
    paddingHorizontal: 10,
    minHeight: 42,
    gap: 6,
  },
  selectRowOptionActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  selectOptionText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.ink,
  },
  selectOptionTextActive: {
    color: colors.cream,
    fontWeight: "800",
  },
  selectOptionCapacity: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.ink45,
    fontVariant: ["tabular-nums"],
  },
  selectOptionCapacityActive: {
    color: colors.lime,
  },
  horizonColumn: {
    gap: 6,
    flex: 1,
  },
  horizonBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink15,
    alignItems: "center",
    justifyContent: "center",
  },
  horizonBtnActive: {
    backgroundColor: colors.moss,
    borderColor: colors.moss,
  },
  horizonBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: colors.ink,
  },
  horizonBtnTextActive: {
    color: colors.cream,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.ink10,
    paddingTop: 12,
    gap: 11,
  },
  footerInfo: {
    gap: 4,
  },
  footerNote: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.ink60,
  },
  routePreview: {
    fontSize: 9.5,
    fontWeight: "700",
    color: colors.ink45,
    letterSpacing: 0.4,
    fontVariant: ["tabular-nums"],
  },
  analyzeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.clay,
    minHeight: 48,
    paddingVertical: 13,
    borderRadius: 18,
  },
  analyzeBtnDisabled: {
    opacity: 0.6,
  },
  analyzeBtnText: {
    fontSize: 13.5,
    fontWeight: "900",
    color: colors.cream,
    letterSpacing: 0.2,
  },
});
