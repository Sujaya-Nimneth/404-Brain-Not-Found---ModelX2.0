import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  View,
  Text,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { colors } from "./src/theme/colors";
import type { AnalyzeRequest, AnalyzeResponse } from "./src/types/atie";
import { defaultDemoRequest, verifiedDemoResponse } from "./src/data/metadata";
import { analyzeConsignment } from "./src/api/atieClient";
import { Header } from "./src/components/Header";
import { HeroSection } from "./src/components/HeroSection";
import { ConsignmentSetup } from "./src/components/ConsignmentSetup";
import { PrimaryDirectiveCard } from "./src/components/PrimaryDirectiveCard";
import { RouteLedger } from "./src/components/RouteLedger";
import { WeatherDisruptions } from "./src/components/WeatherDisruptions";
import { ModelEvaluationCard } from "./src/components/ModelEvaluationSummary";

export default function App() {
  const [request, setRequest] = useState<AnalyzeRequest>({
    ...defaultDemoRequest,
    demoMode: false,
  });

  const [result, setResult] = useState<AnalyzeResponse | null>(
    verifiedDemoResponse
  );
  const [loading, setLoading] = useState<boolean>(false);

  const runAnalysis = useCallback(
    async (targetRequest: AnalyzeRequest) => {
      setLoading(true);
      try {
        const response = await analyzeConsignment(targetRequest);
        setResult(response);
      } catch (err) {
        console.error("Failed to analyze consignment:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleDemo = useCallback(() => {
    const demoReq = { ...defaultDemoRequest, demoMode: true };
    setRequest(demoReq);
    void runAnalysis(demoReq);
  }, [runAnalysis]);

  const handleAnalyze = useCallback(() => {
    void runAnalysis({ ...request, demoMode: false });
  }, [request, runAnalysis]);

  const handleRefresh = useCallback(() => {
    void runAnalysis(request);
  }, [request, runAnalysis]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleRefresh}
              colors={[colors.moss]}
              tintColor={colors.moss}
            />
          }
        >
          {/* Header */}
          <Header
            onRefresh={handleRefresh}
            loading={loading}
            modelSummary={{
              maeLkr: result?.modelEvaluationSummary?.modelMaeLkr ?? null,
              symmetryPct:
                result?.modelEvaluationSummary?.modelDirectionalSymmetryPct ??
                null,
            }}
          />

          {/* Hero Section */}
          <HeroSection />

          {/* Consignment Setup Form & Options */}
          <ConsignmentSetup
            value={request}
            onChange={setRequest}
            onAnalyze={handleAnalyze}
            onDemo={handleDemo}
            loading={loading}
          />

          {/* Primary Directive Recommendation Card */}
          {result && <PrimaryDirectiveCard response={result} />}

          {/* Route Ledger & Market Comparison Cards */}
          {result && <RouteLedger markets={result.marketComparisons} />}

          {/* Corridor Weather Warnings */}
          {result && result.weatherAlerts && (
            <WeatherDisruptions alerts={result.weatherAlerts} />
          )}

          {/* Model Accuracy & Baseline Benchmarks */}
          {result && result.modelEvaluationSummary && (
            <ModelEvaluationCard summary={result.modelEvaluationSummary} />
          )}

          {/* Footer note */}
          <View style={styles.footerBrand}>
            <Text style={styles.footerBrandText}>
              ATIE · Agricultural Trade & Intelligence Engine · ModelX 2.0
            </Text>
            <Text style={styles.footerSubText}>
              Verified Sri Lankan Wholesale Optimization Corridor
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  footerBrand: {
    marginTop: 10,
    marginBottom: 20,
    alignItems: "center",
    gap: 4,
  },
  footerBrandText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.ink45,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  footerSubText: {
    fontSize: 8.5,
    color: colors.ink45,
  },
});
