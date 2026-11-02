import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { onValue, ref, set } from 'firebase/database';
import {
  CloudClient,
  cloudRefPath,
  getFirebaseConfig,
  initFirebase,
  sanitizeForCloud,
  subscribeCloudStatus,
  getCloudStatus,
  getCloudError,
  CloudStatus,
} from '../lib/firebase';
import { ensureLegacyImport } from '../lib/migrateLegacy';

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function useCloudState<T>(
  localKey: string,
  remotePath: string,
  initial: T,
  cloudSeed: T = initial
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readLocal(localKey, initial));

  const valueRef = useRef(value);
  valueRef.current = value;

  const remoteJsonRef = useRef<string | null>(null);
  const readyRef = useRef(false);
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clientRef = useRef<CloudClient | null>(null);
  const cloudSeedRef = useRef(cloudSeed);
  cloudSeedRef.current = cloudSeed;
  const seededRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    initFirebase().then(async (client) => {
      if (cancelled || !client) return;
      clientRef.current = client;

      await ensureLegacyImport(client.db);
      if (cancelled) return;

      const node = ref(client.db, cloudRefPath(remotePath));
      unsubscribe = onValue(
        node,
        (snap) => {
          readyRef.current = true;
          if (!snap.exists()) {
            if (seededRef.current) return;
            seededRef.current = true;
            remoteJsonRef.current = null;
            const seed = cloudSeedRef.current;
            if (JSON.stringify(seed) !== JSON.stringify(valueRef.current)) {
              setValue(seed);
            }
            set(node, sanitizeForCloud(seed)).catch((err) => {
              console.warn(`[cloud] gagal seed ${remotePath}:`, err?.message);
            });
            return;
          }

          seededRef.current = true;
          const remote = snap.val() as T;
          const remoteJson = JSON.stringify(remote);
          remoteJsonRef.current = remoteJson;
          if (writeTimerRef.current) {
            clearTimeout(writeTimerRef.current);
            writeTimerRef.current = null;
          }
          if (remoteJson !== JSON.stringify(valueRef.current)) {
            setValue(remote);
          }
        },
        (err) => {
          readyRef.current = true;
          console.warn(`[cloud] gagal membaca ${remotePath}:`, err?.message);
        }
      );
    });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    };
  }, [remotePath]);

  useEffect(() => {
    try {
      localStorage.setItem(localKey, JSON.stringify(value));
    } catch {
      // storage penuh / private mode
    }

    const client = clientRef.current;
    if (!client || !readyRef.current) return;

    const json = JSON.stringify(value);
    if (json === remoteJsonRef.current) return;

    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    writeTimerRef.current = setTimeout(() => {
      remoteJsonRef.current = json;
      set(ref(client.db, cloudRefPath(remotePath)), sanitizeForCloud(value)).catch((err) => {
        console.warn(`[cloud] gagal menyimpan ${remotePath}:`, err?.message);
      });
    }, 250);
  }, [localKey, remotePath, value]);

  return [value, setValue];
}

export function useCloudStatus(): { status: CloudStatus; error: string | null; configured: boolean } {
  const [snapshot, setSnapshot] = useState(() => ({
    status: getCloudStatus(),
    error: getCloudError(),
    configured: getFirebaseConfig() !== null,
  }));

  const refresh = useCallback(() => {
    setSnapshot({
      status: getCloudStatus(),
      error: getCloudError(),
      configured: getFirebaseConfig() !== null,
    });
  }, []);

  useEffect(() => {
    refresh();
    return subscribeCloudStatus(refresh);
  }, [refresh]);

  return snapshot;
}
