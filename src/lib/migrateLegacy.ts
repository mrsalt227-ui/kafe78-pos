import { Database, get, ref, update } from 'firebase/database';
import { MenuItem, Order, OrderItem } from '../utils/pos';
import { BASE_PATH, LEGACY_PATH, sanitizeForCloud } from './firebase';

const MIGRATION_FLAG = 'meta/legacy_imported';

let migrationPromise: Promise<void> | null = null;

export function ensureLegacyImport(db: Database): Promise<void> {
  if (!migrationPromise) migrationPromise = run(db);
  return migrationPromise;
}

async function run(db: Database): Promise<void> {
  try {
    const flag = await get(ref(db, `${BASE_PATH}/${MIGRATION_FLAG}`));
    if (flag.exists()) return;

    const [menuSnap, laporanSnap] = await Promise.all([
      get(ref(db, `${LEGACY_PATH}/master_menu`)),
      get(ref(db, `${LEGACY_PATH}/laporan`)),
    ]);

    const menu = normalizeMenu(menuSnap.val());
    const orders = normalizeLaporan(laporanSnap.val());

    const updates: Record<string, unknown> = {
      [`${BASE_PATH}/${MIGRATION_FLAG}`]: Date.now(),
    };
    if (menu.length > 0) updates[`${BASE_PATH}/master_menu`] = sanitizeForCloud(menu);
    if (orders.length > 0) updates[`${BASE_PATH}/laporan`] = sanitizeForCloud(orders);

    await update(ref(db), updates);
    console.info(
      `[cloud] impor data lama: ${menu.length} menu, ${orders.length} transaksi`
    );
  } catch (err) {
    console.warn('[cloud] impor data lama gagal:', err);
  }
}

const CATEGORY_BY_KEYWORD: { pattern: RegExp; category: MenuItem['category'] }[] = [
  { pattern: /kopi|coffee|espresso|brew|pour|latte|americano|cappuccino/i, category: 'Kopi' },
  { pattern: /non[-\s]?kopi|tea|teh|matcha|chocolate|cokelat|juice/i, category: 'Non-Kopi' },
  { pattern: /dessert|pastry|patisserie|kue|cake|tart|puding|kudapan/i, category: 'Dessert' },
  { pattern: /snack|camil|fries|kentang|roti|toast/i, category: 'Snack' },
  { pattern: /makan|nasi|mie|rice|ayam|beef|pasta|burger|main course/i, category: 'Makanan' },
];

const VALID_CATEGORIES: MenuItem['category'][] = ['Kopi', 'Non-Kopi', 'Makanan', 'Snack', 'Dessert'];

function guessCategory(name: string, kategori?: string): MenuItem['category'] {
  const raw = `${kategori || ''} ${name || ''}`;
  const exact = VALID_CATEGORIES.find((c) => c.toLowerCase() === (kategori || '').toLowerCase());
  if (exact) return exact;
  const hit = CATEGORY_BY_KEYWORD.find((c) => c.pattern.test(raw));
  return hit ? hit.category : 'Makanan';
}

function normalizeMenu(raw: unknown): MenuItem[] {
  if (!raw) return [];
  const entries: [string, Record<string, unknown>][] = Array.isArray(raw)
    ? raw.filter(Boolean).map((item, idx) => [String(idx), item as Record<string, unknown>])
    : Object.entries(raw as Record<string, Record<string, unknown>>);

  return entries
    .filter(([, v]) => v && typeof v === 'object')
    .map(([key, v]) => {
      const name = String(v.n ?? v.name ?? 'Menu');
      const price = Number(v.h ?? v.harga ?? v.price ?? 0) || 0;
      return {
        id: String(v.id ?? key),
        n: name,
        h: price,
        costPrice: v.costPrice != null ? Number(v.costPrice) : undefined,
        category: guessCategory(name, v.kategori != null ? String(v.kategori) : v.category != null ? String(v.category) : undefined),
        stok: v.stok != null ? Number(v.stok) : 50,
        icon: v.icon != null ? String(v.icon) : '🍽️',
        description: v.description != null ? String(v.description) : v.kategori != null ? String(v.kategori) : undefined,
      };
    })
    .filter((m) => m.h > 0);
}

function normalizeLaporan(raw: unknown): Order[] {
  if (!raw) return [];
  const entries: [string, Record<string, unknown>][] = Array.isArray(raw)
    ? raw.filter(Boolean).map((item, idx) => [String(idx), item as Record<string, unknown>])
    : Object.entries(raw as Record<string, Record<string, unknown>>);

  return entries
    .filter(([, v]) => v && typeof v === 'object')
    .map(([key, v]) => {
      const rawItems = Array.isArray(v.items) ? (v.items as Record<string, unknown>[]) : [];
      const items: OrderItem[] = rawItems.map((it) => ({
        id: String(it.id ?? ''),
        n: String(it.n ?? 'Menu'),
        h: Number(it.h ?? 0) || 0,
        costPrice: it.costPrice != null ? Number(it.costPrice) : undefined,
        qty: Number(it.qty ?? 1) || 1,
        done: true,
      }));
      const subtotal = items.reduce((sum, it) => sum + it.h * it.qty, 0);
      const total = Number(v.total ?? subtotal) || subtotal;
      const ts = Number(v.ts ?? Date.now()) || Date.now();
      return {
        id: String(v.id ?? key),
        meja: String(v.meja ?? '-'),
        items,
        subtotal,
        discount: 0,
        tax: Math.max(0, total - subtotal),
        total,
        createdAt: ts,
        status: 'selesai',
        paymentStatus: 'paid',
        paymentMethod: 'Tunai',
        paidAt: ts,
        cashierName: 'Kasir 78',
      } as Order;
    })
    .filter((o) => o.items.length > 0 && o.total > 0);
}
