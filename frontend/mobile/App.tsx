import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  analyzeConsignment,
  AtieMobileApiError,
  fetchDataStatus,
  fetchMetadataConfig,
  getActiveApiBaseUrl,
  setCustomApiBaseUrl,
  setCustomApiKey,
} from "./src/api/atieClient";
import { BottomTabBar } from "./src/components/BottomTabBar";
import { ConsignmentSetup } from "./src/components/ConsignmentSetup";
import { DataProvenanceCard } from "./src/components/DataProvenanceCard";
import { ForecastTrajectoryPanel } from "./src/components/ForecastTrajectoryPanel";
import { Header } from "./src/components/Header";
import { HeroSection } from "./src/components/HeroSection";
import { ModelEvaluationCard } from "./src/components/ModelEvaluationSummary";
import { PrimaryDirectiveCard } from "./src/components/PrimaryDirectiveCard";
import { ProfitComparisonChart } from "./src/components/ProfitComparisonChart";
import { RouteLedger } from "./src/components/RouteLedger";
import { ServerSettingsModal } from "./src/components/ServerSettingsModal";
import {
  AnalysisErrorBanner,
  shouldShowSourceNotice,
  SourceProvenanceNotice,
} from "./src/components/StatusBanners";
import { WeatherDisruptions } from "./src/components/WeatherDisruptions";
import {
  demoRequest,
  demoResponse,
  fallbackMetadataConfig,
} from "./src/data/metadata";
import {
  findMatchingCachedResult,
  loadCachedLiveResult,
  loadCachedMetadata,
  loadCustomApiKey,
  loadCustomEndpoint,
  loadSavedLanguage,
  saveCachedLiveResult,
  saveCachedMetadata,
  saveCustomApiKey,
  saveCustomEndpoint,
  saveLanguage,
} from "./src/storage/offlineCache";
import { colors } from "./src/theme/colors";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  CachedResultSnapshot,
  DataStatus,
  LanguageCode,
  MetadataConfig,
  MobileTab,
} from "./src/types/atie";
import { sameRequest } from "./src/utils/format";

interface ResultSnapshot {
  request: AnalyzeRequest;
  response: AnalyzeResponse;
  cachedAt: string | null;
}

interface FailureNotice {
  message: string;
  keptPreviousResult: boolean;
}

export default function App() {
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [activeTab, setActiveTab] = useState<MobileTab>("directive");
  const [serverModalOpen, setServerModalOpen] = useState(false);

  const [metadata, setMetadata] = useState<MetadataConfig>(
    fallbackMetadataConfig,
  );
  const [metadataLive, setMetadataLive] = useState(false);

  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);
  const [dataStatusUnavailable, setDataStatusUnavailable] = useState(false);
  const [backendReachable, setBackendReachable] = useState<boolean | null>(
    null,
  );

  const [request, setRequest] = useState<AnalyzeRequest>({
    ...demoRequest,
    demoMode: false,
  });

  const [result, setResult] = useState<ResultSnapshot | null>({
    request: demoRequest,
    response: {
      ...demoResponse,
      analysisState: {
        kind: "demo",
        message:
          "Showing the verified competition fixture. Select a consignment and tap Analyze for live model output.",
      },
    },
    cachedAt: null,
  });

  const [loading, setLoading] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [failure, setFailure] = useState<FailureNotice | null>(null);

  const activeControllerRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);
  const resultRef = useRef<ResultSnapshot | null>(result);
  const persistedLiveRef = useRef<CachedResultSnapshot | null>(null);
  resultRef.current = result;

  const refreshMetadataAndStatus = useCallback(async (signal?: AbortSignal) => {
    const [metaOutcome, statusOutcome] = await Promise.allSettled([
      fetchMetadataConfig(signal),
      fetchDataStatus(signal),
    ]);

    if (signal?.aborted) return;

    if (metaOutcome.status === "fulfilled") {
      setMetadata(metaOutcome.value);
      setMetadataLive(true);
      void saveCachedMetadata(metaOutcome.value);
    }

    if (statusOutcome.status === "fulfilled") {
      setDataStatus(statusOutcome.value);
      setDataStatusUnavailable(false);
      setBackendReachable(true);
    } else {
      setDataStatusUnavailable(true);
      setBackendReachable(metaOutcome.status === "fulfilled");
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const bootController = new AbortController();

    async function hydrateAndConnect() {
      const [savedLang, savedUrl, savedApiKey, cachedMeta, cachedLive] =
        await Promise.all([
          loadSavedLanguage(),
          loadCustomEndpoint(),
          loadCustomApiKey(),
          loadCachedMetadata(),
          loadCachedLiveResult(),
        ]);

      if (!mounted) return;

      if (savedLang) setLanguage(savedLang);
      if (savedUrl) setCustomApiBaseUrl(savedUrl);
      if (savedApiKey) setCustomApiKey(savedApiKey);
      if (cachedMeta) setMetadata(cachedMeta);
      if (cachedLive) persistedLiveRef.current = cachedLive;

      await refreshMetadataAndStatus(bootController.signal);
    }

    void hydrateAndConnect();

    return () => {
      mounted = false;
      bootController.abort();
      activeControllerRef.current?.abort();
    };
  }, [refreshMetadataAndStatus]);

  const handleLanguageChange = useCallback((nextLang: LanguageCode) => {
    setLanguage(nextLang);
    void saveLanguage(nextLang);
  }, []);

  const runAnalysis = useCallback(async (nextRequest: AnalyzeRequest) => {
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    const currentRunId = ++runIdRef.current;

    setRequest(nextRequest);
    setLoading(true);
    setFailure(null);
    setNoticeDismissed(false);

    try {
      const apiResponse = await analyzeConsignment(
        nextRequest,
        controller.signal,
      );
      if (currentRunId !== runIdRef.current || controller.signal.aborted) {
        return;
      }

      const nextSnapshot: ResultSnapshot = {
        request: nextRequest,
        response: {
          ...apiResponse,
          analysisState:
            apiResponse.analysisState ??
            (apiResponse.forecastSource === "DEMO_FIXTURE"
              ? {
                  kind: "demo",
                  message:
                    "Canonical competition fixture requested explicitly; these values are not live model output.",
                }
              : { kind: "live" }),
        },
        cachedAt: null,
      };

      setResult(nextSnapshot);
      if (apiResponse.forecastSource !== "DEMO_FIXTURE") {
        setBackendReachable(true);
        const toCache: CachedResultSnapshot = {
          request: nextRequest,
          response: nextSnapshot.response,
          cachedAt: new Date().toISOString(),
        };
        persistedLiveRef.current = toCache;
        void saveCachedLiveResult(toCache);
      }
    } catch (err: unknown) {
      if (
        currentRunId !== runIdRef.current ||
        controller.signal.aborted ||
        isAbortError(err)
      ) {
        return;
      }

      setBackendReachable(false);

      const inMemoryCurrent = resultRef.current;
      const keepInMemory =
        inMemoryCurrent !== null &&
        inMemoryCurrent.response.forecastSource !== "DEMO_FIXTURE" &&
        sameRequest(inMemoryCurrent.request, nextRequest);

      const diskMatch = findMatchingCachedResult(
        persistedLiveRef.current,
        nextRequest,
      );

      if (keepInMemory && inMemoryCurrent) {
        setResult(inMemoryCurrent);
        setFailure({
          message: formatApiError(err),
          keptPreviousResult: true,
        });
      } else if (diskMatch) {
        setResult({
          request: diskMatch.request,
          response: diskMatch.response,
          cachedAt: diskMatch.cachedAt,
        });
        setFailure({
          message: formatApiError(err),
          keptPreviousResult: true,
        });
      } else {
        setResult(null);
        setFailure({
          message: formatApiError(err),
          keptPreviousResult: false,
        });
      }
    } finally {
      if (currentRunId === runIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const handleAnalyze = useCallback(() => {
    void runAnalysis({ ...request, demoMode: false });
  }, [request, runAnalysis]);

  const handleDemo = useCallback(() => {
    void runAnalysis(demoRequest);
  }, [runAnalysis]);

  const handleRefresh = useCallback(() => {
    void refreshMetadataAndStatus();
    void runAnalysis({ ...request, demoMode: false });
  }, [refreshMetadataAndStatus, request, runAnalysis]);

  const handleSaveEndpoint = useCallback(
    (customUrl: string | null, customApiKey: string | null) => {
      setCustomApiBaseUrl(customUrl);
      setCustomApiKey(customApiKey);
      void saveCustomEndpoint(customUrl);
      void saveCustomApiKey(customApiKey);
      void refreshMetadataAndStatus();
      void runAnalysis({ ...request, demoMode: false });
    },
    [refreshMetadataAndStatus, request, runAnalysis],
  );

  const response = result?.response ?? null;
  const activeRequest = result?.request ?? request;
  const hasHighRiskWeather =
    response?.weatherAlerts.some((w) => w.riskLevel === "HIGH") ?? false;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleRefresh}
              colors={[colors.moss]}
              tintColor={colors.moss}
            />
          }
        >
          <Header
            language={language}
            onLanguageChange={handleLanguageChange}
            onOpenServerSettings={() => setServerModalOpen(true)}
            onRefresh={handleRefresh}
            loading={loading}
            backendReachable={backendReachable}
            modelSummary={{
              maeLkr: response?.modelEvaluationSummary?.modelMaeLkr ?? null,
              symmetryPct:
                response?.modelEvaluationSummary?.modelDirectionalSymmetryPct ??
                null,
            }}
          />

          {failure && (
            <AnalysisErrorBanner
              message={failure.message}
              keptPreviousResult={failure.keptPreviousResult}
              onOpenSettings={() => setServerModalOpen(true)}
              onLoadDemo={handleDemo}
              onDismiss={() => setFailure(null)}
            />
          )}

          {response &&
            !noticeDismissed &&
            shouldShowSourceNotice(response, result?.cachedAt ?? null) && (
              <SourceProvenanceNotice
                response={response}
                cachedAt={result?.cachedAt ?? null}
                onDismiss={() => setNoticeDismissed(true)}
              />
            )}

          {activeTab === "directive" && (
            <>
              <HeroSection language={language} />

              <ConsignmentSetup
                value={request}
                metadata={metadata}
                metadataLive={metadataLive}
                language={language}
                onChange={setRequest}
                onAnalyze={handleAnalyze}
                onDemo={handleDemo}
                loading={loading}
              />

              {response ? (
                <PrimaryDirectiveCard
                  request={activeRequest}
                  response={response}
                  language={language}
                />
              ) : (
                !failure && <EmptyResultState />
              )}
            </>
          )}

          {activeTab === "markets" &&
            (response ? (
              <>
                <ProfitComparisonChart
                  markets={response.marketComparisons}
                  language={language}
                />
                <RouteLedger
                  markets={response.marketComparisons}
                  language={language}
                />
              </>
            ) : (
              <EmptyResultState />
            ))}

          {activeTab === "forecast" &&
            (response ? (
              <ForecastTrajectoryPanel
                defaultMarketCode={activeRequest.defaultMarketCode}
                recommendedMarketCode={
                  response.primaryDirective.recommendedMarketCode
                }
                markets={response.marketComparisons}
                cropCode={activeRequest.cropCode}
                forecastSource={response.forecastSource}
                language={language}
              />
            ) : (
              <EmptyResultState />
            ))}

          {activeTab === "trust" && (
            <>
              {response && response.weatherAlerts.length > 0 && (
                <WeatherDisruptions
                  alerts={response.weatherAlerts}
                  language={language}
                />
              )}

              <DataProvenanceCard
                status={dataStatus}
                unavailable={dataStatusUnavailable}
                language={language}
              />

              {response && (
                <ModelEvaluationCard
                  summary={response.modelEvaluationSummary}
                  language={language}
                />
              )}
            </>
          )}

          <View style={styles.footerBrand}>
            <Text style={styles.footerBrandText}>
              ATIE ANDROID · SAFE ROUTING FIRST · MODELX 2.0
            </Text>
            <Text style={styles.footerSubText} numberOfLines={1}>
              {response
                ? `${response.forecastSource} · ${response.modelVersion} · ${getActiveApiBaseUrl()}`
                : getActiveApiBaseUrl()}
            </Text>
          </View>
        </ScrollView>

        <BottomTabBar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          language={language}
          marketCount={response?.marketComparisons.length ?? 0}
          hasHighRiskWeather={hasHighRiskWeather}
        />

        <ServerSettingsModal
          visible={serverModalOpen}
          language={language}
          onClose={() => setServerModalOpen(false)}
          onSaveEndpoint={handleSaveEndpoint}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function EmptyResultState() {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>No verified analysis loaded.</Text>
      <Text style={styles.emptySub}>
        Configure your harvest consignment on the Directive tab and run a safe
        route analysis, or load the canonical Northern glut demo fixture.
      </Text>
    </View>
  );
}

function formatApiError(error: unknown): string {
  if (error instanceof AtieMobileApiError) {
    const code = error.code ? ` (${error.code})` : "";
    const reqId = error.requestId ? ` [Req ${error.requestId}]` : "";
    return `${error.message.replace(/[.!?]+$/, "")}${code}.${reqId}`;
  }
  return error instanceof Error
    ? error.message
    : "ATIE API is currently unavailable.";
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
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
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 24,
  },
  emptyCard: {
    backgroundColor: colors.cream,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.ink10,
    padding: 24,
    marginBottom: 16,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.ink60,
    textAlign: "center",
  },
  footerBrand: {
    marginTop: 6,
    marginBottom: 8,
    alignItems: "center",
    gap: 3,
  },
  footerBrandText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.ink45,
    letterSpacing: 0.7,
  },
  footerSubText: {
    fontSize: 8.5,
    color: colors.ink45,
  },
});
