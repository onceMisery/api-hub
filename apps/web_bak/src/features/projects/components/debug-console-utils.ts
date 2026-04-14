export type DebugRequestPreset = {
  id: string;
  name: string;
  queryString: string;
  headersText: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type ParsedDebugCurlCommand = {
  method: string;
  url: string;
  queryString: string;
  headersText: string;
  body: string;
};

const DEBUG_PRESET_LIMIT = 12;
const DEBUG_PRESET_STORAGE_VERSION = "v1";

export function buildDebugPresetStorageKey(projectId?: number | null, endpointId?: number | null) {
  if (!projectId || !endpointId) {
    return null;
  }

  return `apihub.debug-presets.${DEBUG_PRESET_STORAGE_VERSION}.project-${projectId}.endpoint-${endpointId}`;
}

export function readDebugPresets(projectId?: number | null, endpointId?: number | null) {
  if (typeof window === "undefined") {
    return [];
  }

  const storageKey = buildDebugPresetStorageKey(projectId, endpointId);
  if (!storageKey) {
    return [];
  }

  const rawValue = window.localStorage.getItem(storageKey);
  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .filter(isDebugRequestPreset)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, DEBUG_PRESET_LIMIT);
  } catch {
    return [];
  }
}

export function saveDebugPreset(
  projectId: number | null | undefined,
  endpointId: number | null | undefined,
  input: {
    name: string;
    queryString: string;
    headersText: string;
    body: string;
  }
) {
  const presetName = input.name.trim();
  if (!presetName) {
    throw new Error("Preset name is required.");
  }

  const existingPresets = readDebugPresets(projectId, endpointId);
  const now = new Date().toISOString();
  const existingPreset = existingPresets.find((preset) => preset.name.trim().toLowerCase() === presetName.toLowerCase()) ?? null;

  const nextPreset: DebugRequestPreset = existingPreset
    ? {
        ...existingPreset,
        name: presetName,
        queryString: input.queryString,
        headersText: input.headersText,
        body: input.body,
        updatedAt: now
      }
    : {
        id: buildPresetId(),
        name: presetName,
        queryString: input.queryString,
        headersText: input.headersText,
        body: input.body,
        createdAt: now,
        updatedAt: now
      };

  const nextPresets = [...existingPresets.filter((preset) => preset.id !== nextPreset.id), nextPreset]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, DEBUG_PRESET_LIMIT);

  writeDebugPresets(projectId, endpointId, nextPresets);

  return nextPresets;
}

export function deleteDebugPreset(projectId?: number | null, endpointId?: number | null, presetId?: string) {
  const nextPresets = readDebugPresets(projectId, endpointId).filter((preset) => preset.id !== presetId);
  writeDebugPresets(projectId, endpointId, nextPresets);
  return nextPresets;
}

export function describeDebugPreset(preset: DebugRequestPreset) {
  const headerCount = splitHeaderLines(preset.headersText).length;

  return [
    preset.queryString.trim() ? "Query ready" : "No query",
    `${headerCount} header${headerCount === 1 ? "" : "s"}`,
    preset.body.trim() ? "Body ready" : "No body"
  ].join(" | ");
}

export function generateDebugCurlCommand(input: {
  method: string;
  url: string | null;
  headersText: string;
  body: string;
}) {
  if (!input.url) {
    return "";
  }

  const curlSegments = [`curl '${escapeSingleQuotes(input.url)}'`, `-X ${input.method.toUpperCase()}`];

  for (const header of splitHeaderLines(input.headersText)) {
    curlSegments.push(`-H '${escapeSingleQuotes(header)}'`);
  }

  if (input.body.trim()) {
    curlSegments.push(`--data-raw '${escapeSingleQuotes(input.body)}'`);
  }

  return curlSegments.join(" ");
}

export function parseDebugCurlCommand(command: string): ParsedDebugCurlCommand {
  const trimmedCommand = command.trim();
  if (!trimmedCommand) {
    throw new Error("Paste a cURL command to import.");
  }

  const tokens = tokenizeCurlCommand(trimmedCommand);
  if (tokens.length === 0 || !/^curl(?:\.exe)?$/i.test(tokens[0] ?? "")) {
    throw new Error("Unsupported cURL command.");
  }

  let method = "GET";
  let url = "";
  const headers: string[] = [];
  let body = "";

  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (!token) {
      continue;
    }

    if (token === "-X" || token === "--request") {
      method = requireNextToken(tokens, ++index, token).toUpperCase();
      continue;
    }

    if (token === "-H" || token === "--header") {
      headers.push(requireNextToken(tokens, ++index, token));
      continue;
    }

    if (token === "--url") {
      url = requireNextToken(tokens, ++index, token);
      continue;
    }

    if (token === "-d" || token === "--data" || token === "--data-raw" || token === "--data-binary") {
      body = requireNextToken(tokens, ++index, token);
      continue;
    }

    if (isIgnoredCurlFlag(token)) {
      continue;
    }

    if (!token.startsWith("-") && !url) {
      url = token;
      continue;
    }

    throw new Error(`Unsupported cURL flag: ${token}`);
  }

  if (!url) {
    throw new Error("cURL command is missing a URL.");
  }

  const parsedUrl = new URL(url);

  return {
    method,
    url,
    queryString: parsedUrl.search.replace(/^\?/, ""),
    headersText: headers.join("\n"),
    body
  };
}

function writeDebugPresets(projectId?: number | null, endpointId?: number | null, presets: DebugRequestPreset[] = []) {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey = buildDebugPresetStorageKey(projectId, endpointId);
  if (!storageKey) {
    return;
  }

  if (presets.length === 0) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(presets));
}

function splitHeaderLines(headersText: string) {
  return headersText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function tokenizeCurlCommand(command: string) {
  const tokens: string[] = [];
  let currentToken = "";
  let activeQuote: "'" | '"' | null = null;
  let escapeNext = false;

  for (const character of command) {
    if (escapeNext) {
      currentToken += character;
      escapeNext = false;
      continue;
    }

    if (activeQuote === "'") {
      if (character === "'") {
        activeQuote = null;
      } else {
        currentToken += character;
      }
      continue;
    }

    if (activeQuote === '"') {
      if (character === '"') {
        activeQuote = null;
      } else if (character === "\\") {
        escapeNext = true;
      } else {
        currentToken += character;
      }
      continue;
    }

    if (character === "'" || character === '"') {
      activeQuote = character;
      continue;
    }

    if (character === "\\") {
      escapeNext = true;
      continue;
    }

    if (/\s/.test(character)) {
      if (currentToken) {
        tokens.push(currentToken);
        currentToken = "";
      }
      continue;
    }

    currentToken += character;
  }

  if (activeQuote || escapeNext) {
    throw new Error("Malformed cURL command.");
  }

  if (currentToken) {
    tokens.push(currentToken);
  }

  return tokens;
}

function requireNextToken(tokens: string[], index: number, flag: string) {
  const token = tokens[index];
  if (!token) {
    throw new Error(`Missing value for ${flag}.`);
  }
  return token;
}

function escapeSingleQuotes(value: string) {
  return value.replace(/'/g, `'\"'\"'`);
}

function isIgnoredCurlFlag(token: string) {
  return token === "--compressed" || token === "--location" || token === "-L" || token === "--silent" || token === "-s" || token === "-S";
}

function isDebugRequestPreset(value: unknown): value is DebugRequestPreset {
  if (!value || typeof value !== "object") {
    return false;
  }

  const preset = value as Partial<DebugRequestPreset>;

  return Boolean(
    typeof preset.id === "string" &&
      typeof preset.name === "string" &&
      typeof preset.queryString === "string" &&
      typeof preset.headersText === "string" &&
      typeof preset.body === "string" &&
      typeof preset.createdAt === "string" &&
      typeof preset.updatedAt === "string"
  );
}

function buildPresetId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `preset-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}
