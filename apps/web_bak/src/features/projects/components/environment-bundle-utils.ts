import type {
  CreateEnvironmentPayload,
  DebugTargetRule,
  EnvironmentDetail,
  EnvironmentEntry
} from "@api-hub/api-sdk";

const SUPPORTED_AUTH_MODES = ["none", "bearer", "api_key_header", "api_key_query", "basic"] as const;
const SUPPORTED_DEBUG_HOST_MODES = ["inherit", "append", "override"] as const;

type SupportedAuthMode = CreateEnvironmentPayload["authMode"];
type SupportedDebugHostMode = CreateEnvironmentPayload["debugHostMode"];
type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

export type EnvironmentBundle = {
  version: 1;
  exportedAt: string;
  environments: Array<Omit<CreateEnvironmentPayload, "isDefault">>;
};

export function buildEnvironmentBundle(environments: EnvironmentDetail[]): EnvironmentBundle {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    environments: environments.map((environment) => ({
      name: environment.name,
      baseUrl: environment.baseUrl,
      variables: cloneEntries(environment.variables),
      defaultHeaders: cloneEntries(environment.defaultHeaders),
      defaultQuery: cloneEntries(environment.defaultQuery),
      authMode: normalizeAuthMode(environment.authMode),
      authKey: environment.authKey ?? "",
      authValue: environment.authValue ?? "",
      debugHostMode: normalizeDebugHostMode(environment.debugHostMode),
      debugAllowedHosts: sanitizeDebugRules(environment.debugAllowedHosts)
    }))
  };
}

export function parseEnvironmentBundle(raw: string, translate?: TranslateFn): CreateEnvironmentPayload[] {
  const normalizedRaw = raw.trim();
  if (!normalizedRaw) {
    throw new Error(translateMessage("Environment bundle import is empty", undefined, translate));
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(normalizedRaw);
  } catch {
    throw new Error(translateMessage("Environment bundle must be valid JSON", undefined, translate));
  }

  if (!isRecord(parsed)) {
    throw new Error(translateMessage("Environment bundle must be a JSON object", undefined, translate));
  }

  if (parsed.version !== 1) {
    throw new Error(translateMessage("Only environment bundle version 1 is supported", undefined, translate));
  }

  if (!Array.isArray(parsed.environments)) {
    throw new Error(translateMessage("Environment bundle must include an environments array", undefined, translate));
  }

  return parsed.environments.map((item, index) => sanitizeEnvironmentPayload(item, index, translate));
}

export function buildClonedEnvironmentPayload(environment: EnvironmentDetail): CreateEnvironmentPayload {
  return {
    name: `${environment.name} Copy`,
    baseUrl: environment.baseUrl,
    isDefault: false,
    variables: cloneEntries(environment.variables),
    defaultHeaders: cloneEntries(environment.defaultHeaders),
    defaultQuery: cloneEntries(environment.defaultQuery),
    authMode: normalizeAuthMode(environment.authMode),
    authKey: environment.authKey ?? "",
    authValue: environment.authValue ?? "",
    debugHostMode: normalizeDebugHostMode(environment.debugHostMode),
    debugAllowedHosts: sanitizeDebugRules(environment.debugAllowedHosts)
  };
}

export function describeAuthMode(mode: SupportedAuthMode, translate?: TranslateFn): {
  keyLabel: string;
  valueLabel: string;
  keyPlaceholder: string;
  valuePlaceholder: string;
  helper: string;
} {
  switch (mode) {
    case "bearer":
      return {
        keyLabel: translateMessage("Header name", undefined, translate),
        valueLabel: translateMessage("Token", undefined, translate),
        keyPlaceholder: "Authorization",
        valuePlaceholder: "dev-token",
        helper: translateMessage("Adds a Bearer token to the selected header.", undefined, translate)
      };
    case "api_key_header":
      return {
        keyLabel: translateMessage("Header name", undefined, translate),
        valueLabel: translateMessage("API key", undefined, translate),
        keyPlaceholder: "x-api-key",
        valuePlaceholder: "ak_live_demo",
        helper: translateMessage("Injects a static API key header before request-level overrides.", undefined, translate)
      };
    case "api_key_query":
      return {
        keyLabel: translateMessage("Query parameter", undefined, translate),
        valueLabel: translateMessage("API key", undefined, translate),
        keyPlaceholder: "api_key",
        valuePlaceholder: "ak_live_demo",
        helper: translateMessage("Adds an API key to the URL query string before request-level overrides.", undefined, translate)
      };
    case "basic":
      return {
        keyLabel: translateMessage("Username", undefined, translate),
        valueLabel: translateMessage("Password", undefined, translate),
        keyPlaceholder: "demo-user",
        valuePlaceholder: "s3cr3t",
        helper: translateMessage("Builds a Basic Authorization header from username and password.", undefined, translate)
      };
    case "none":
    default:
      return {
        keyLabel: translateMessage("Auth key", undefined, translate),
        valueLabel: translateMessage("Auth value", undefined, translate),
        keyPlaceholder: "Authorization",
        valuePlaceholder: "dev-token",
        helper: translateMessage("Pick an auth mode to turn these values into a reusable preset.", undefined, translate)
      };
  }
}

function sanitizeEnvironmentPayload(item: unknown, index: number, translate?: TranslateFn): CreateEnvironmentPayload {
  if (!isRecord(item)) {
    throw new Error(translateMessage("Environment #{index} must be an object", { index: index + 1 }, translate));
  }

  const name = asTrimmedString(item.name);
  const baseUrl = asTrimmedString(item.baseUrl);
  if (!name) {
    throw new Error(translateMessage("Environment #{index} is missing a name", { index: index + 1 }, translate));
  }
  if (!baseUrl) {
    throw new Error(translateMessage("Environment #{index} is missing a base URL", { index: index + 1 }, translate));
  }

  return {
    name,
    baseUrl,
    isDefault: false,
    variables: sanitizeEntries(item.variables),
    defaultHeaders: sanitizeEntries(item.defaultHeaders),
    defaultQuery: sanitizeEntries(item.defaultQuery),
    authMode: normalizeAuthMode(item.authMode, translate),
    authKey: asTrimmedString(item.authKey),
    authValue: asTrimmedString(item.authValue),
    debugHostMode: normalizeDebugHostMode(item.debugHostMode),
    debugAllowedHosts: sanitizeDebugRules(item.debugAllowedHosts)
  };
}

function normalizeAuthMode(mode: unknown, translate?: TranslateFn): SupportedAuthMode {
  const normalized = typeof mode === "string" ? mode.trim().toLowerCase() : "none";
  if (isSupportedAuthMode(normalized)) {
    return normalized;
  }

  throw new Error(
    translateMessage("Unsupported environment auth mode: {mode}", { mode: String(mode ?? "unknown") }, translate)
  );
}

function normalizeDebugHostMode(mode: unknown): SupportedDebugHostMode {
  const normalized = typeof mode === "string" ? mode.trim().toLowerCase() : "inherit";
  return isSupportedDebugHostMode(normalized) ? normalized : "inherit";
}

function sanitizeEntries(value: unknown): EnvironmentEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      const name = asTrimmedString(entry.name);
      if (!name) {
        return null;
      }

      return {
        name,
        value: typeof entry.value === "string" ? entry.value : String(entry.value ?? "")
      };
    })
    .filter((entry): entry is EnvironmentEntry => entry !== null);
}

function sanitizeDebugRules(value: unknown): DebugTargetRule[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((rule) => {
      if (!isRecord(rule)) {
        return null;
      }

      const pattern = asTrimmedString(rule.pattern);
      if (!pattern) {
        return null;
      }

      return {
        pattern,
        allowPrivate: Boolean(rule.allowPrivate)
      };
    })
    .filter((rule): rule is DebugTargetRule => rule !== null);
}

function translateMessage(key: string, values?: Record<string, string | number>, translate?: TranslateFn) {
  return translate ? translate(key, values) : formatTemplate(key, values);
}

function formatTemplate(template: string, values?: Record<string, string | number>) {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

function cloneEntries(entries: EnvironmentEntry[] | null | undefined): EnvironmentEntry[] {
  return (entries ?? []).map((entry) => ({
    name: entry.name,
    value: entry.value
  }));
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSupportedAuthMode(value: string): value is SupportedAuthMode {
  return SUPPORTED_AUTH_MODES.includes(value as SupportedAuthMode);
}

function isSupportedDebugHostMode(value: string): value is SupportedDebugHostMode {
  return SUPPORTED_DEBUG_HOST_MODES.includes(value as SupportedDebugHostMode);
}
