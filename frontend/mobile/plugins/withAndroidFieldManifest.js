const fs = require("fs");
const path = require("path");
const {
  withAndroidManifest,
  withDangerousMod,
} = require("expo/config-plugins");

const INTENT_SCHEMES = [
  { action: "android.intent.action.VIEW", scheme: "whatsapp" },
  { action: "android.intent.action.SENDTO", scheme: "sms" },
  { action: "android.intent.action.SENDTO", scheme: "smsto" },
];

const NETWORK_SECURITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">localhost</domain>
    <domain includeSubdomains="false">127.0.0.1</domain>
    <domain includeSubdomains="false">10.0.2.2</domain>
    <domain includeSubdomains="false">10.0.3.2</domain>
    <domain includeSubdomains="true">local</domain>
  </domain-config>
  <debug-overrides>
    <trust-anchors>
      <certificates src="system" />
      <certificates src="user" />
    </trust-anchors>
  </debug-overrides>
</network-security-config>
`;

module.exports = function withAndroidFieldManifest(config) {
  const withXml = withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const xmlDir = path.join(
        modConfig.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "xml",
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, "network_security_config.xml"),
        NETWORK_SECURITY_CONFIG_XML,
        "utf8",
      );
      return modConfig;
    },
  ]);

  return withAndroidManifest(withXml, (modConfig) => {
    const manifest = modConfig.modResults.manifest;

    const mainApp = manifest.application?.[0];
    if (mainApp) {
      mainApp.$ = mainApp.$ || {};
      delete mainApp.$["android:usesCleartextTraffic"];
      mainApp.$["android:networkSecurityConfig"] =
        "@xml/network_security_config";
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
