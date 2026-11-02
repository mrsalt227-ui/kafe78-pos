import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Database, getDatabase, onValue, ref } from 'firebase/database';

export const BASE_PATH = 'servers/78/v2';
export const LEGACY_PATH = 'servers/78';
export const CLOUD_CONFIG_KEY = 'kafe78_cloud_config';

export type CloudStatus = 'unconfigured' | 'connecting' | 'connected' | 'offline' | 'error';

export interface FirebaseConfig {
  apiKey: string;
  authDomain?: string;
  databaseURL?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export interface CloudClient {
  db: Database;
  projectId: string;
  databaseURL: string;
}

function envConfig(): FirebaseConfig | null {
  const env = import.meta.env;
  const apiKey = (env.VITE_FIREBASE_API_KEY || '').trim();
  const projectId = (env.VITE_FIREBASE_PROJECT_ID || '').trim();
  const databaseURL = (env.VITE_FIREBASE_DATABASE_URL || '').trim();
  if (!apiKey || (!projectId && !databaseURL)) return null;
  return {
    apiKey,
    projectId: projectId || undefined,
    databaseURL: databaseURL || undefined,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || undefined,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || undefined,
    appId: env.VITE_FIREBASE_APP_ID || undefined,
  };
}

export function getFirebaseConfig(): FirebaseConfig | null {
  const fromEnv = envConfig();
  if (fromEnv) return fromEnv;
  try {
    const raw = localStorage.getItem(CLOUD_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FirebaseConfig;
    if (!parsed?.apiKey) return null;
    if (!parsed.projectId && !parsed.databaseURL) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isEnvConfigured(): boolean {
  return envConfig() !== null;
}

export function saveFirebaseConfig(config: FirebaseConfig | null): void {
  if (config) {
    localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(config));
  } else {
    localStorage.removeItem(CLOUD_CONFIG_KEY);
  }
}

export function cloudRefPath(path: string): string {
  return `${BASE_PATH}/${path}`;
}

let status: CloudStatus = 'unconfigured';
let lastError: string | null = null;
const statusListeners = new Set<() => void>();

export function getCloudStatus(): CloudStatus {
  return status;
}

export function getCloudError(): string | null {
  return lastError;
}

export function subscribeCloudStatus(listener: () => void): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

function setStatus(next: CloudStatus, error: string | null = null) {
  status = next;
  lastError = error;
  statusListeners.forEach((l) => l());
}

async function probeDatabaseUrl(projectId: string): Promise<string> {
  const candidates = [
    `https://${projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`,
    `https://${projectId}-default-rtdb.firebaseio.com`,
    `https://${projectId}.firebaseio.com`,
  ];
  for (const url of candidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${url}/.json?shallow=true`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) return url;
    } catch {
      // try next candidate
    }
  }
  return candidates[0];
}

let initPromise: Promise<CloudClient | null> | null = null;

export function initFirebase(): Promise<CloudClient | null> {
  if (!initPromise) initPromise = doInit();
  return initPromise;
}

async function doInit(): Promise<CloudClient | null> {
  const config = getFirebaseConfig();
  if (!config) {
    setStatus('unconfigured');
    return null;
  }

  setStatus('connecting');

  try {
    const databaseURL =
      config.databaseURL?.trim() ||
      (config.projectId ? await probeDatabaseUrl(config.projectId) : '');

    if (!databaseURL) {
      setStatus('error', 'databaseURL tidak ditemukan');
      return null;
    }

    const existing = getApps();
    const app: FirebaseApp = existing.length > 0 ? existing[0] : initializeApp(config);
    const db = getDatabase(app);

    onValue(
      ref(db, '.info/connected'),
      (snap) => {
        if (snap.val() === true) {
          setStatus('connected');
        } else {
          setStatus('offline');
        }
      },
      (err) => setStatus('error', err.message)
    );

    return {
      db,
      projectId: config.projectId || '',
      databaseURL,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal terhubung ke Firebase';
    setStatus('error', message);
    return null;
  }
}

export function sanitizeForCloud<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
