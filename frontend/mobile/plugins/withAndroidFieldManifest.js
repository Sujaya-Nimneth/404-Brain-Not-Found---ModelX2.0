const { withAndroidManifest } = require("expo/config-plugins");

const INTENT_SCHEMES = [
  { action: "android.intent.action.VIEW", scheme: "whatsapp" },
  { action: "android.intent.action.SENDTO", scheme: "sms" },
  { action: "android.intent.action.SENDTO", scheme: "smsto" },
];

module.exports = function withAndroidFieldManifest(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;

    const mainApp = manifest.application?.[0];
    if (mainApp) {
      mainApp.$ = mainApp.$ || {};
      // Allow cleartext HTTP to LAN / local ATIE gateway (:15173) and Spring Boot (:8080).
      mainApp.$["android:usesCleartextTraffic"] = "true";
    }

    manifest.queries = manifest.queries || [{ intent: [] }];
    const queryBlock = manifest.queries[0];
    queryBlock.intent = queryBlock.intent || [];

    for (const target of INTENT_SCHEMES) {
      const exists = queryBlock.intent.some((entry) => {
        const actionName = entry.action?.[0]?.$?.["android:name"];
        const dataScheme = entry.data?.[0]?.$?.["android:scheme"];
        return actionName === target.action && dataScheme === target.scheme;
      });
      if (!exists) {
        queryBlock.intent.push({
          action: [{ $: { "android:name": target.action } }],
          data: [{ $: { "android:scheme": target.scheme } }],
        });
      }
    }

    return modConfig;
  });
};
