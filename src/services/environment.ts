/**
 * BRANDTRACE — Environment and System Status Service
 *
 * Implements truthful, non-secret environment classification derived from:
 * 1. Explicit environment build configuration (VITE_APP_ENV).
 * 2. Actual server-side readiness probe (/api/ready).
 *
 * Never infers hosted staging or production from hostname or dialect alone.
 */

import { api, ReadyStatus } from './api';

export type AppEnvironment = 'local' | 'demo' | 'staging' | 'production' | 'unknown';

export interface SystemStatusData {
  environment: AppEnvironment;
  environmentLabel: string;
  readiness: 'ready' | 'checking' | 'unavailable' | 'mismatch';
  health: 'ok' | 'checking' | 'unavailable';
  databaseDialect: 'sqlite' | 'postgresql' | 'unknown';
  databaseConnected: boolean;
  lastCheckedAt: string | null;
  configurationMismatch: boolean;
  mismatchReason: string | null;
  groqConfigured: boolean;
  groqVisionModel: string | null;
  ocrAvailable: boolean;
  digitalPdfAvailable: boolean;
}

export const ENVIRONMENT_LABELS: Record<AppEnvironment, string> = {
  local: 'Local Development',
  demo: 'Local Demo',
  staging: 'Hosted Staging',
  production: 'Production',
  unknown: 'Environment Unverified',
};

/**
 * Return concise, user-facing badge labels suitable for headers and top bars.
 */
export function getDisplayEnvironmentBadge(status: SystemStatusData): { text: string; color: string; dotColor: string } {
  if (status.environment === 'staging') {
    return { text: 'HOSTED JUDGE DEMO', color: '#00E6A0', dotColor: '#00E6A0' };
  }
  if (status.environment === 'production') {
    return { text: 'BRANDTRACE PRODUCTION', color: '#00E6A0', dotColor: '#00E6A0' };
  }
  if (status.environment === 'local' || status.environment === 'demo') {
    return { text: 'LOCAL DEMO', color: '#00C8F0', dotColor: '#00C8F0' };
  }
  return { text: 'JUDGE DEMO · ENVIRONMENT UNVERIFIED', color: '#FCD34D', dotColor: '#F59E0B' };
}

/**
 * Read and validate the configured environment from import.meta.env.VITE_APP_ENV.
 * Never guesses staging or production if the variable is absent.
 */
export function getConfiguredEnvironment(): AppEnvironment {
  const raw = (import.meta.env.VITE_APP_ENV || '').trim().toLowerCase();
  if (raw === 'local' || raw === 'demo' || raw === 'staging' || raw === 'production') {
    return raw;
  }
  return 'unknown';
}

/**
 * Resolve truth-preserving system status from configuration and actual readiness.
 */
export function evaluateSystemStatus(
  configuredEnv: AppEnvironment,
  readyRes: ReadyStatus | null,
  probeError: boolean
): SystemStatusData {
  const environmentLabel = ENVIRONMENT_LABELS[configuredEnv];

  if (probeError || !readyRes) {
    return {
      environment: configuredEnv,
      environmentLabel,
      readiness: probeError ? 'unavailable' : 'checking',
      health: probeError ? 'unavailable' : 'checking',
      databaseDialect: 'unknown',
      databaseConnected: false,
      lastCheckedAt: probeError ? new Date().toISOString() : null,
      configurationMismatch: false,
      mismatchReason: null,
      groqConfigured: false,
      groqVisionModel: null,
      ocrAvailable: false,
      digitalPdfAvailable: true,
    };
  }

  const rawDialect = (readyRes.database || '').toLowerCase();
  const databaseDialect = rawDialect.includes('postgres')
    ? 'postgresql'
    : rawDialect.includes('sqlite')
    ? 'sqlite'
    : 'unknown';

  // Check for semantic configuration mismatch
  let configurationMismatch = false;
  let mismatchReason: string | null = null;

  if (configuredEnv === 'staging' && databaseDialect === 'sqlite') {
    configurationMismatch = true;
    mismatchReason = 'Configured as Hosted Staging but connected to local SQLite database.';
  } else if (configuredEnv === 'production' && databaseDialect === 'sqlite') {
    configurationMismatch = true;
    mismatchReason = 'Configured as Production but connected to local SQLite database.';
  } else if (configuredEnv === 'unknown') {
    configurationMismatch = true;
    mismatchReason = 'VITE_APP_ENV build variable is unconfigured or invalid.';
  }

  return {
    environment: configuredEnv,
    environmentLabel: configurationMismatch && configuredEnv === 'unknown' ? 'Environment Unverified' : environmentLabel,
    readiness: configurationMismatch ? 'mismatch' : 'ready',
    health: 'ok',
    databaseDialect,
    databaseConnected: readyRes.status === 'ready' || readyRes.status === 'ok',
    lastCheckedAt: new Date().toISOString(),
    configurationMismatch,
    mismatchReason,
    groqConfigured: Boolean(readyRes.groq_configured),
    groqVisionModel: readyRes.groq_vision_model || null,
    ocrAvailable: Boolean(readyRes.ocr_available),
    digitalPdfAvailable: readyRes.digital_pdf_available !== false,
  };
}

// Module-level cached status to prevent duplicate initial probes across components
let cachedStatus: SystemStatusData = {
  environment: getConfiguredEnvironment(),
  environmentLabel: ENVIRONMENT_LABELS[getConfiguredEnvironment()],
  readiness: 'checking',
  health: 'checking',
  databaseDialect: 'unknown',
  databaseConnected: false,
  lastCheckedAt: null,
  configurationMismatch: false,
  mismatchReason: null,
  groqConfigured: false,
  groqVisionModel: null,
  ocrAvailable: false,
  digitalPdfAvailable: true,
};

let activeProbePromise: Promise<SystemStatusData> | null = null;
const listeners = new Set<(status: SystemStatusData) => void>();

function notifyListeners() {
  for (const listener of listeners) {
    listener(cachedStatus);
  }
}

/**
 * Execute or reuse an in-flight readiness probe to obtain system status.
 */
export async function probeSystemStatus(forceRefresh = false): Promise<SystemStatusData> {
  if (!forceRefresh && activeProbePromise) {
    return activeProbePromise;
  }

  const configuredEnv = getConfiguredEnvironment();

  activeProbePromise = (async () => {
    try {
      // 5-second timeout safeguard for network readiness
      const readyRes = await Promise.race([
        api.ready(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Readiness timeout')), 5000)),
      ]);
      cachedStatus = evaluateSystemStatus(configuredEnv, readyRes, false);
    } catch {
      cachedStatus = evaluateSystemStatus(configuredEnv, null, true);
    } finally {
      activeProbePromise = null;
      notifyListeners();
    }
    return cachedStatus;
  })();

  return activeProbePromise;
}

/**
 * Get the current cached system status synchronously.
 */
export function getCachedSystemStatus(): SystemStatusData {
  return cachedStatus;
}

/**
 * Subscribe to system status updates. Returns unsubscribe function.
 */
export function subscribeSystemStatus(listener: (status: SystemStatusData) => void): () => void {
  listeners.add(listener);
  listener(cachedStatus);
  return () => {
    listeners.delete(listener);
  };
}
