import { Database, get, onValue, push, ref, remove, runTransaction, set, update } from 'firebase/database';
import { useEffect, useState } from 'react';
import { BASE_PATH, initFirebase, sanitizeForCloud } from './firebase';
import { MenuItem, Order, StockBatch, deductFifoStock } from '../utils/pos';

export const TABLES_PATH = `${BASE_PATH}/tables`;
export const SESSIONS_PATH = `${BASE_PATH}/sessions`;
export const CALLS_PATH = `${BASE_PATH}/waiter_calls`;
export const CLAIMS_PATH = `${BASE_PATH}/payment_claims`;
export const MENU_PATH = `${BASE_PATH}/master_menu`;
export const ORDERS_PATH = `${BASE_PATH}/orders`;
export const BATCHES_PATH = `${BASE_PATH}/stok_fifo`;
export const CHAT_PATH = `${BASE_PATH}/chat`;

export type ApprovalMode = 'auto_approve' | 'staff_approval';

export interface CustomerSettings {
  orderApprovalMode: ApprovalMode;
  selfPaymentEnabled: boolean;
}

export const DEFAULT_CUSTOMER_SETTINGS: CustomerSettings = {
  orderApprovalMode: 'auto_approve',
  selfPaymentEnabled: false,
};

export interface DiningTable {
  id: string;
  name: string;
  token: string;
  createdAt: number;
}

export interface TableSession {
  id: string;
  tableId: string;
  tableName: string;
  status: 'open' | 'closed';
  openedAt: number;
  closedAt?: number;
}

export type WaiterCallReason = 'help' | 'bill' | 'other';

export interface WaiterCall {
  id: string;
  tableId: string;
  tableName: string;
  sessionId: string;
  reason: WaiterCallReason;
  note?: string;
  status: 'open' | 'resolved';
  createdAt: number;
  resolvedAt?: number;
}

export interface PaymentClaim {
  id: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  amount: number;
  method: 'QRIS' | 'Transfer';
  status: 'pending' | 'verified' | 'rejected';
  createdAt: number;
  verifiedAt?: number;
  note?: string;
}

export const CALL_REASON_LABEL: Record<WaiterCallReason, string> = {
  help: 'Minta bantuan',
  bill: 'Minta tagihan',
  other: 'Lainnya',
};

export function generateToken(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function makeDefaultTables(count = 12): DiningTable[] {
  return Array.from({ length: count }, (_, i) => {
    const id = `T${String(i + 1).padStart(2, '0')}`;
    return {
      id,
      name: `Meja ${String(i + 1).padStart(2, '0')}`,
      token: generateToken(),
      createdAt: Date.now(),
    };
  });
}

export async function withDb<T>(fn: (db: Database) => Promise<T>): Promise<T> {
  const client = await initFirebase();
  if (!client) throw new Error('Firebase belum tersambung. Periksa konfigurasi cloud.');
  return fn(client.db);
}

/**
 * Menambahkan satu order baru ke daftar order di Firebase secara atomic,
 * aman dipakai bersamaan dari Waiter maupun Customer QR tanpa risiko
 * saling menimpa (race condition) atau duplikat.
 */
export async function pushOrderAtomic(order: Order): Promise<void> {
  await withDb(async (db) => {
    const ordersRef = ref(db, ORDERS_PATH);
    await runTransaction(ordersRef, (currentData) => {
      const existing = toList<Order>(currentData).map(({ _key, ...o }) => o as Order);
      if (existing.some((o) => o.id === order.id)) {
        return currentData;
      }
      return sanitizeForCloud([order, ...existing]);
    });
  });
}

function toList<T>(value: unknown): (T & { _key: string })[] {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) {
    return value
      .filter(Boolean)
      .map((item, idx) => ({ ...(item as T), _key: String(idx) }));
  }
  return Object.entries(value as Record<string, T>).map(([key, item]) => ({
    ...item,
    _key: key,
  }));
}

export function useRemoteList<T>(path: string): { items: (T & { _key: string })[]; loading: boolean } {
  const [items, setItems] = useState<(T & { _key: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let cancelled = false;

    initFirebase().then((client) => {
      if (cancelled || !client) {
        setLoading(false);
        return;
      }
      unsub = onValue(ref(client.db, path), (snap) => {
        setItems(toList<T>(snap.val()));
        setLoading(false);
      });
    });

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [path]);

  return { items, loading };
}

export function useRemoteValue<T>(path: string, initial: T): T {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let cancelled = false;

    initFirebase().then((client) => {
      if (cancelled || !client) return;
      unsub = onValue(ref(client.db, path), (snap) => {
        if (snap.exists()) setValue(snap.val() as T);
      });
    });

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [path]);

  return value;
}

export async function ensureTablesSeeded(): Promise<DiningTable[]> {
  return withDb(async (db) => {
    const snap = await get(ref(db, TABLES_PATH));
    const existing = toList<DiningTable>(snap.val());
    if (existing.length > 0) {
      return existing.map(({ _key, ...t }) => t as DiningTable);
    }
    const tables = makeDefaultTables(12);
    const payload: Record<string, DiningTable> = {};
    tables.forEach((t) => {
      payload[t.id] = t;
    });
    await set(ref(db, TABLES_PATH), sanitizeForCloud(payload));
    return tables;
  });
}

export function useTables(): { tables: DiningTable[]; loading: boolean } {
  const { items, loading } = useRemoteList<DiningTable>(TABLES_PATH);
  return {
    tables: items.map(({ _key, ...t }) => t as DiningTable).sort((a, b) => a.id.localeCompare(b.id)),
    loading,
  };
}

export async function rotateTableToken(tableId: string): Promise<string> {
  const token = generateToken();
  await withDb((db) => set(ref(db, `${TABLES_PATH}/${tableId}/token`), token));
  return token;
}

export async function findTableByToken(token: string): Promise<DiningTable | null> {
  return withDb(async (db) => {
    const snap = await get(ref(db, TABLES_PATH));
    const tables = toList<DiningTable>(snap.val());
    const found = tables.find((t) => t.token === token);
    return found ? (found as DiningTable) : null;
  });
}

export async function ensureOpenSession(table: DiningTable): Promise<TableSession> {
  return withDb(async (db) => {
    const snap = await get(ref(db, SESSIONS_PATH));
    const sessions = toList<TableSession>(snap.val());
    const open = sessions.find((s) => s.tableId === table.id && s.status === 'open');
    if (open) return open as TableSession;

    const sessionRef = push(ref(db, SESSIONS_PATH));
    const session: TableSession = {
      id: sessionRef.key as string,
      tableId: table.id,
      tableName: table.name,
      status: 'open',
      openedAt: Date.now(),
    };
    await set(sessionRef, sanitizeForCloud(session));
    return session;
  });
}

export async function getSession(sessionId: string): Promise<TableSession | null> {
  return withDb(async (db) => {
    const snap = await get(ref(db, `${SESSIONS_PATH}/${sessionId}`));
    return snap.exists() ? ({ ...snap.val(), id: sessionId } as TableSession) : null;
  });
}

export interface CustomerCartLine {
  id: string;
  qty: number;
  note?: string;
}

export interface SubmitOrderParams {
  table: DiningTable;
  session: TableSession;
  lines: CustomerCartLine[];
  approvalMode: ApprovalMode;
}

export interface SubmitOrderResult {
  order: Order;
  menu: MenuItem[];
}

export async function submitCustomerOrder({
  table,
  session,
  lines,
  approvalMode,
}: SubmitOrderParams): Promise<SubmitOrderResult> {
  return withDb(async (db) => {
    const menuSnap = await get(ref(db, MENU_PATH));
    const menu: MenuItem[] = toList<MenuItem>(menuSnap.val()).map(({ _key, ...m }) => m as MenuItem);

    const picked = lines
      .map((line) => {
        const item = menu.find((m) => m.id === line.id);
        return item ? { item, qty: Math.max(1, Math.floor(line.qty)), note: line.note } : null;
      })
      .filter(Boolean) as { item: MenuItem; qty: number; note?: string }[];

    if (picked.length === 0) throw new Error('Menu tidak ditemukan atau sudah tidak tersedia.');
    if (picked.length !== lines.length) {
      throw new Error('Sebagian menu sudah tidak tersedia. Muat ulang halaman lalu coba lagi.');
    }

    for (const { item, qty } of picked) {
      if (item.stok <= 0) throw new Error(`${item.n} sedang habis.`);
      if (item.stok < qty) throw new Error(`Stok ${item.n} tinggal ${item.stok}.`);
    }

    const items = picked.map(({ item, qty, note }) => ({
      id: item.id,
      n: item.n,
      h: item.h,
      costPrice: item.costPrice,
      qty,
      note,
      done: false,
    }));

    const subtotal = items.reduce((sum, it) => sum + it.h * it.qty, 0);
    const tax = Math.round(subtotal * 0.1);
    const total = subtotal + tax;

    const order: Order = {
      id: `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      meja: table.name,
      items,
      subtotal,
      discount: 0,
      tax,
      total,
      createdAt: Date.now(),
      status: approvalMode === 'auto_approve' ? 'dapur' : 'menunggu_approval',
      paymentStatus: 'unpaid',
      waiterName: 'Customer QR',
      source: 'customer_web',
      sessionId: session.id,
      tableId: table.id,
    };

    // Pakai transaction (bukan get-lalu-set) supaya aman kalau Waiter
    // sedang menulis order lain ke path yang sama secara bersamaan.
    await pushOrderAtomic(order);

    if (approvalMode === 'auto_approve') {
      const nextMenu = menu.map((m) => {
        const line = items.find((it) => it.id === m.id);
        return line ? { ...m, stok: Math.max(0, m.stok - line.qty) } : m;
      });
      await set(ref(db, MENU_PATH), sanitizeForCloud(nextMenu));

      const batchesSnap = await get(ref(db, BATCHES_PATH));
      let batches = toList<StockBatch>(batchesSnap.val()).map(({ _key, ...b }) => b as StockBatch);
      items.forEach((line) => {
        const menuBatches = batches.filter((b) => b.menuId === line.id);
        const others = batches.filter((b) => b.menuId !== line.id);
        const { remainingBatches } = deductFifoStock(menuBatches, line.qty);
        batches = [...others, ...remainingBatches];
      });
      await set(ref(db, BATCHES_PATH), sanitizeForCloud(batches));
    }

    const chatSnap = await get(ref(db, CHAT_PATH));
    const chat = toList(chatSnap.val());
    await set(
      ref(db, CHAT_PATH),
      sanitizeForCloud([
        ...chat,
        {
          id: `chat-${Date.now()}`,
          sender: `Customer ${table.name}`,
          role: 'system',
          channel: 'dapur',
          text: `Pesanan QR ${table.name} (${order.id}) masuk${approvalMode === 'staff_approval' ? ' — menunggu persetujuan kasir' : ' antrean dapur'}.`,
          timestamp: Date.now(),
        },
      ])
    );

    return { order, menu: nextMenuSafe(menu, items, approvalMode) };
  });
}

function nextMenuSafe(
  menu: MenuItem[],
  items: { id: string; qty: number }[],
  mode: ApprovalMode
): MenuItem[] {
  if (mode !== 'auto_approve') return menu;
  return menu.map((m) => {
    const line = items.find((it) => it.id === m.id);
    return line ? { ...m, stok: Math.max(0, m.stok - line.qty) } : m;
  });
}

export async function getSessionOrders(sessionId: string): Promise<Order[]> {
  return withDb(async (db) => {
    const snap = await get(ref(db, ORDERS_PATH));
    return toList<Order>(snap.val())
      .filter((o) => o.sessionId === sessionId)
      .map(({ _key, ...o }) => o as Order);
  });
}

export async function callWaiter(params: {
  table: DiningTable;
  session: TableSession;
  reason: WaiterCallReason;
  note?: string;
}): Promise<WaiterCall> {
  return withDb(async (db) => {
    const snap = await get(ref(db, CALLS_PATH));
    const calls = toList<WaiterCall>(snap.val());
    const active = calls.find((c) => c.sessionId === params.session.id && c.status === 'open');
    if (active) return active as WaiterCall;

    const callRef = push(ref(db, CALLS_PATH));
    const call: WaiterCall = {
      id: callRef.key as string,
      tableId: params.table.id,
      tableName: params.table.name,
      sessionId: params.session.id,
      reason: params.reason,
      note: params.note,
      status: 'open',
      createdAt: Date.now(),
    };
    await set(callRef, sanitizeForCloud(call));
    return call;
  });
}

export async function resolveWaiterCall(callId: string): Promise<void> {
  await withDb((db) =>
    update(ref(db, `${CALLS_PATH}/${callId}`), { status: 'resolved', resolvedAt: Date.now() })
  );
}

export async function claimPayment(params: {
  table: DiningTable;
  session: TableSession;
  amount: number;
  method: 'QRIS' | 'Transfer';
}): Promise<PaymentClaim> {
  return withDb(async (db) => {
    const claimRef = push(ref(db, CLAIMS_PATH));
    const claim: PaymentClaim = {
      id: claimRef.key as string,
      sessionId: params.session.id,
      tableId: params.table.id,
      tableName: params.table.name,
      amount: params.amount,
      method: params.method,
      status: 'pending',
      createdAt: Date.now(),
    };
    await set(claimRef, sanitizeForCloud(claim));
    return claim;
  });
}

export async function updateClaimStatus(
  claimId: string,
  status: 'verified' | 'rejected'
): Promise<void> {
  await withDb((db) =>
    update(ref(db, `${CLAIMS_PATH}/${claimId}`), { status, verifiedAt: Date.now() })
  );
}

export async function closeSession(sessionId: string): Promise<void> {
  await withDb((db) =>
    update(ref(db, `${SESSIONS_PATH}/${sessionId}`), { status: 'closed', closedAt: Date.now() })
  );
}

export async function deleteCall(callId: string): Promise<void> {
  await withDb((db) => remove(ref(db, `${CALLS_PATH}/${callId}`)));
}

export function customerUrl(token: string): string {
  const customerOrigin = (import.meta.env.VITE_CUSTOMER_APP_URL || '').trim();
  const base = customerOrigin || window.location.origin;
  return `${base}/?t=${encodeURIComponent(token)}`;
}
