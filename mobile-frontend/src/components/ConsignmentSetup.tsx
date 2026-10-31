import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { colors } from "../theme/colors";
import type { AnalyzeRequest } from "../types/atie";
import {
  crops,
  markets,
  origins,
  vehicles,
  routes,
} from "../data/metadata";

interface Props {
  value: AnalyzeRequest;
  onChange: (request: AnalyzeRequest) => void;
  onAnalyze: () => void;
  onDemo: () => void;
  loading: boolean;
}

export function ConsignmentSetup({
  value,
  onChange,
  onAnalyze,
  onDemo,
  loading,
}: Props) {
  const [quantityInput, setQuantityInput] = useState(String(value.quantityKg));

  const update = <K extends keyof AnalyzeRequest>(
    key: K,
    val: AnalyzeRequest[K]
  ) => {
    onChange({ ...value, [key]: val });
  };

  const handleQuantityChange = (text: string) => {
    setQuantityInput(text);
    const parsed = parseInt(text.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(parsed) && parsed > 0) {
      update("quantityKg", parsed);
    }
  };

  const setQuantityPreset = (kg: number) => {
    setQuantityInput(String(kg));
    update("quantityKg", kg);
  };

  const currentRoute = routes.find(
    (r) =>
      r.originCode === value.originCode &&
      r.marketCode === value.defaultMarketCode
  );

  const uniqueMarkets = React.useMemo(() => {
    const seen = new Set<string>();
    return markets.filter((m) => {
      if (seen.has(m.code)) return false;
      seen.add(m.code);
      return true;
    });
  }, []);

  return (
    <View style={styles.card}>
      {/* Top Banner */}
      <View style={styles.headerRow}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.sectionTag}>CONSIGNMENT SETUP</Text>
          <Text style={styles.sectionTitle}>
            Tell us what is leaving the farm.
          </Text>
        </View>

        <TouchableOpacity
          onPress={onDemo}
          style={styles.demoBtn}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="sprout" size={16} color={colors.lime} />
          <Text style={styles.demoBtnText}>Load Northern Glut Demo</Text>
        </TouchableOpacity>
      </View>

      {/* Field: Crop Selection */}
      <View style={styles.fieldGroup}>
        <View style={styles.fieldLabelRow}>
          <MaterialCommunityIcons name="seed-outline" size={14} color={colors.leaf} />
          <Text style={styles.fieldLabel}>PRODUCE CROP</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {crops.map((c, index) => {
            const isSelected = value.cropCode === c.code;
            return (
              <TouchableOpacity
                key={`crop-option-${c.code}-${index}`}
                onPress={() => update("cropCode", c.code)}
                style={[styles.chip, isSelected && styles.chipActive]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextActive,
                  ]}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Field: Origin Selection */}
      <View style={styles.fieldGroup}>
        <View style={styles.fieldLabelRow}>
          <Ionicons name="location-outline" size={14} color={colors.leaf} />
          <Text style={styles.fieldLabel}>ORIGIN REGION</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {origins.map((o, index) => {
            const isSelected = value.originCode === o.code;
            return (
              <TouchableOpacity
                key={`origin-option-${o.code}-${index}`}
                onPress={() => update("originCode", o.code)}
                style={[styles.chip, isSelected && styles.chipActive]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextActive,
                  ]}
                >
                  {o.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Field: Default Target Market */}
      <View style={styles.fieldGroup}>
        <View style={styles.fieldLabelRow}>
          <Ionicons name="navigate-outline" size={14} color={colors.leaf} />
          <Text style={styles.fieldLabel}>DEFAULT TARGET MARKET</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {uniqueMarkets.map((m, index) => {
            const isSelected = value.defaultMarketCode === m.code;
            return (
              <TouchableOpacity
                key={`market-option-chip-${m.code}-${index}`}
                onPress={() => update("defaultMarketCode", m.code)}
                style={[styles.chip, isSelected && styles.chipActive]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextActive,
                  ]}
                >
                  {m.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Field: Harvest Quantity */}
      <View style={styles.fieldGroup}>
        <View style={styles.fieldLabelRow}>
          <FontAwesome5 name="weight-hanging" size={12} color={colors.leaf} />
          <Text style={styles.fieldLabel}>HARVEST QUANTITY (KG)</Text>
        </View>
        <View style={styles.quantityRow}>
          <TextInput
            style={styles.inputField}
            keyboardType="numeric"
            value={quantityInput}
            onChangeText={handleQuantityChange}
            placeholder="1000"
            placeholderTextColor={colors.ink45}
          />
          <View style={styles.quickPresetRow}>
            {[500, 1000, 2500, 5000].map((kg, index) => (
              <TouchableOpacity
                key={`preset-${kg}-${index}`}
                onPress={() => setQuantityPreset(kg)}
                style={[
                  styles.presetChip,
                  value.quantityKg === kg && styles.presetChipActive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    value.quantityKg === kg && styles.presetChipTextActive,
                  ]}
                >
                  {kg >= 1000 ? `${kg / 1000}t` : `${kg}kg`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Field: Vehicle & Horizon side by side */}
      <View style={styles.vehicleHorizonRow}>
        {/* Vehicle */}
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <View style={styles.fieldLabelRow}>
            <Ionicons name="bus-outline" size={14} color={colors.leaf} />
            <Text style={styles.fieldLabel}>VEHICLE</Text>
          </View>
          <View style={styles.stackedSelect}>
            {vehicles.map((v, index) => {
              const isSelected = value.vehicleType === v.code;
              return (
                <TouchableOpacity
                  key={`vehicle-option-${v.code}-${index}`}
                  onPress={() => update("vehicleType", v.code)}
                  style={[
                    styles.selectRowOption,
                    isSelected && styles.selectRowOptionActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.selectOptionText,
                      isSelected && styles.selectOptionTextActive,
                    ]}
                  >
                    {v.displayName}
                  </Text>
                  <Text
                    style={[
                      styles.selectOptionCapacity,
                      isSelected && styles.selectOptionCapacityActive,
                    ]}
                  >
                    {v.capacityKg >= 1000 ? `${v.capacityKg / 1000}t` : `${v.capacityKg}kg`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Horizon */}
        <View style={[styles.fieldGroup, { width: 110 }]}>
          <View style={styles.fieldLabelRow}>
            <Ionicons name="time-outline" size={14} color={colors.leaf} />
            <Text style={styles.fieldLabel}>HORIZON</Text>
          </View>
          <View style={styles.horizonColumn}>
            {([48, 72] as const).map((h, index) => {
              const isSelected = value.horizonHours === h;
              return (
                <TouchableOpacity
                  key={`horizon-option-${h}-${index}`}
                  onPress={() => update("horizonHours", h)}
                  style={[
                    styles.horizonBtn,
                    isSelected && styles.horizonBtnActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.horizonBtnText,
                      isSelected && styles.horizonBtnTextActive,
                    ]}
                  >
                    {h} Hours
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Footer Info & Analyze Button */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerNote}>
            Recommendations compare net profit after fuel, terrain, handling and
            spoilage. A reroute requires a 5% margin and LKR 1,000 minimum gain.
          </Text>
          <Text style={styles.routePreview}>
            {currentRoute
              ? `${currentRoute.distanceKm} km one-way · terrain factor ×${currentRoute.terrainFactor.toFixed(2)}`
              : "Corridor parameters mapped"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onAnalyze}
          disabled={loading}
          style={[styles.analyzeBtn, loading && styles.analyzeBtnDisabled]}
          activeOpacity={0.8}
        >
          <Text style={styles.analyzeBtnText}>
            {loading ? "Calculating safest route…" : "Analyze Market Route"}
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
    marginBottom: 16,
  },
  headerTextGroup: {
    marginBottom: 10,
  },
  sectionTag: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.moss,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.4,
  },
  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.ink,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  demoBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.cream,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.ink60,
    letterSpacing: 1,
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink15,
  },
  chipActive: {
    backgroundColor: colors.moss,
    borderColor: colors.moss,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
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
    width: 90,
    height: 42,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink15,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  quickPresetRow: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  presetChip: {
    flex: 1,
    height: 42,
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
  },
  presetChipTextActive: {
    color: colors.ink,
    fontWeight: "800",
  },
  vehicleHorizonRow: {
    flexDirection: "row",
    gap: 12,
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
    paddingVertical: 8,
  },
  selectRowOptionActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  selectOptionText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.ink,
  },
  selectOptionTextActive: {
    color: colors.cream,
    fontWeight: "700",
  },
  selectOptionCapacity: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink45,
  },
  selectOptionCapacityActive: {
    color: colors.lime,
  },
  horizonColumn: {
    gap: 6,
  },
  horizonBtn: {
    height: 38,
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
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
  },
  horizonBtnTextActive: {
    color: colors.cream,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.ink10,
    paddingTop: 14,
    gap: 12,
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
    fontSize: 9,
    fontWeight: "700",
    color: colors.ink45,
    letterSpacing: 0.6,
  },
  analyzeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.clay,
    paddingVertical: 14,
    borderRadius: 20,
    shadowColor: colors.clay,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  analyzeBtnDisabled: {
    opacity: 0.6,
  },
  analyzeBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.cream,
    letterSpacing: 0.3,
  },
});
