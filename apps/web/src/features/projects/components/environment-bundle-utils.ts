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

export function parseEnvironmentBundle(raw: string): CreateEnvironmentPayload[] {
  const normalizedRaw = raw.trim();
  if (!normalizedRaw) {
    throw new Error("Environment bundle import is empty");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(normalizedRaw);
  } catch {
    throw new Error("Environment bundle must be valid JSON");
  }

  if (!isRecord(parsed)) {
    throw new Error("Environment bundle must be a JSON object");
  }

  if (parsed.version !== 1) {
    throw new Error("Only environment bundle version 1 is supported");
  }

  if (!Array.isArray(parsed.environments)) {
    throw new Error("Environment bundle must include an environments array");
  }

  return parsed.environments.map((item, index) => sanitizeEnvironmentPayload(item, index));
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

export function describeAuthMode(mode: SupportedAuthMode): {
  keyLabel: string;
  valueLabel: string;
  keyPlaceholder: string;
  valuePlaceholder: string;
  helper: string;
} {
  switch (mode) {
    case "bearer":
      return {
        keyLabel: "Header name",
        valueLabel: "Token",
        keyPlaceholder: "Authorization",
        valuePlaceholder: "dev-token",
        helper: "Adds a Bearer token to the selected header."
      };
    case "api_key_header":
      return {
        keyLabel: "Header name",
        valueLabel: "API key",
        keyPlaceholder: "x-api-key",
        valuePlaceholder: "ak_live_demo",
        helper: "Injects a static API key header before request-level overrides."
      };
    case "api_key_query":
      return {
        keyLabel: "Query parameter",
        valueLabel: "API key",
        keyPlaceholder: "api_key",
        valuePlaceholder: "ak_live_demo",
        helper: "Adds an API key to the URL query string before request-level overrides."
      };
    case "basic":
      return {
        keyLabel: "Username",
        valueLabel: "Password",
        keyPlaceholder: "demo-user",
        valuePlaceholder: "s3cr3t",
        helper: "Builds a Basic Authorization header from username and password."
      };
    case "none":
    default:
      return {
        keyLabel: "Auth key",
        valueLabel: "Auth value",
        keyPlaceholder: "Authorization",
        valuePlaceholder: "dev-token",
        helper: "Pick an auth mode to turn these values into a reusable preset."
      };
  }
}

function sanitizeEnvironmentPayload(item: unknown, index: number): CreateEnvironmentPayload {
  if (!isRecord(item)) {
    throw new Error(`Environment #${index + 1} must be an object`);
  }

  const name = asTrimmedString(item.name);
  const baseUrl = asTrimmedString(item.baseUrl);
  if (!name) {
    throw new Error(`Environment #${index + 1} is missing a name`);
  }
  if (!baseUrl) {
    throw new Error(`Environment #${index + 1} is missing a base URL`);
  }

  return {
    name,
    baseUrl,
    isDefault: false,
    variables: sanitizeEntries(item.variables),
    defaultHeaders: sanitizeEntries(item.defaultHeaders),
    defaultQuery: sanitizeEntries(item.defaultQuery),
    authMode: normalizeAuthMode(item.authMode),
    authKey: asTrimmedString(item.authKey),
    authValue: asTrimmedString(item.authValue),
    debugHostMode: normalizeDebugHostMode(item.debugHostMode),
    debugAllowedHosts: sanitizeDebugRules(item.debugAllowedHosts)
  };
}

function normalizeAuthMode(mode: unknown): SupportedAuthMode {
  const normalized = typeof mode === "string" ? mode.trim().toLowerCase() : "none";
  if (isSupportedAuthMode(normalized)) {
    return normalized;
  }

  throw new Error(`Unsupported environment auth mode: ${String(mode ?? "unknown")}`);
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
