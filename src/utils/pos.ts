export interface MenuItem {
  id: string;
  n: string; // name
  h: number; // price (harga jual)
  costPrice?: number; // HPP (Harga Pokok Penjualan) per porsi
  category: 'Kopi' | 'Non-Kopi' | 'Makanan' | 'Snack' | 'Dessert';
  stok: number;
  icon?: string;
  description?: string;
}

export interface CartItem {
  id: string;
  n: string;
  h: number;
  costPrice?: number;
  qty: number;
  note?: string;
}

export interface OrderItem {
  id: string;
  n: string;
  h: number;
  costPrice?: number;
  qty: number;
  note?: string;
  done?: boolean;
}

export interface Order {
  id: string;
  meja: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  createdAt: number;
  status:
    | 'menunggu_approval'
    | 'dapur'
    | 'siap_antar'
    | 'diantar'
    | 'selesai'
    | 'dibatalkan'
    | 'ditolak';
  paymentStatus: 'unpaid' | 'paid';
  paymentMethod?: 'Tunai' | 'QRIS' | 'Transfer';
  cashGiven?: number;
  change?: number;
  paidAt?: number;
  cashierName?: string;
  waiterName?: string;
  source?: 'staff_pos' | 'customer_web';
  sessionId?: string;
  tableId?: string;
  rejectionReason?: string;
}

export interface StockBatch {
  id: string;
  menuId: string;
  qty: number;
  costPrice: number;
  dateIn: number;
}

export function formatRupiah(amount: number): string {
  return 'Rp ' + (amount || 0).toLocaleString('id-ID');
}

/**
 * ID pesanan sebelumnya hanya 4 digit acak sehingga rawan bentrok
 * (terutama saat POS dan halaman customer membuat pesanan bersamaan).
 * Fungsi ini memastikan ID unik terhadap daftar yang sudah ada.
 */
export function generateOrderId(existingIds: Iterable<string> = []): string {
  const used = new Set(existingIds);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const id = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    if (!used.has(id)) return id;
  }
  return `ORD-${Date.now().toString().slice(-8)}`;
}

export function calculateOrderSummary(
  items: { h: number; qty: number }[],
  discountPercent = 0,
  taxPercent = 10
) {
  const subtotal = items.reduce((sum, item) => sum + item.h * item.qty, 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const taxable = Math.max(0, subtotal - discountAmount);
  const tax = Math.round((taxable * taxPercent) / 100);
  const grandTotal = taxable + tax;

  return {
    subtotal,
    discountAmount,
    tax,
    grandTotal,
  };
}

export function calculateChange(total: number, cashGiven: number): number {
  if (cashGiven < total) return 0;
  return cashGiven - total;
}

export function deductFifoStock(
  batches: StockBatch[],
  qtyNeeded: number
): { remainingBatches: StockBatch[]; qtyDeducted: number } {
  let needed = qtyNeeded;
  let deducted = 0;
  const updatedBatches: StockBatch[] = [];

  // Sort oldest first
  const sorted = [...batches].sort((a, b) => a.dateIn - b.dateIn);

  for (const batch of sorted) {
    if (needed <= 0) {
      updatedBatches.push(batch);
      continue;
    }

    if (batch.qty <= needed) {
      needed -= batch.qty;
      deducted += batch.qty;
      // batch is fully depleted, do not include with qty > 0
    } else {
      deducted += needed;
      updatedBatches.push({
        ...batch,
        qty: batch.qty - needed,
      });
      needed = 0;
    }
  }

  return {
    remainingBatches: updatedBatches,
    qtyDeducted: deducted,
  };
}

export function getElapsedTimerString(startTimeMs: number, nowMs: number = Date.now()): string {
  const diff = Math.max(0, nowMs - startTimeMs);
  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function getTimerUrgency(startTimeMs: number, nowMs: number = Date.now()): 'normal' | 'warn' | 'late' {
  const minutes = (nowMs - startTimeMs) / 60000;
  if (minutes > 15) return 'late';
  if (minutes > 8) return 'warn';
  return 'normal';
}

export interface ItemHppBreakdown {
  id: string;
  name: string;
  category: string;
  qty: number;
  revenue: number;
  hppTotal: number;
  profitTotal: number;
  marginPercent: number;
  unitPrice: number;
  unitCost: number;
  marginStatus: 'Sehat' | 'Waspada' | 'Kritis';
}

export interface CategoryHppBreakdown {
  category: string;
  qty: number;
  revenue: number;
  hppTotal: number;
  profitTotal: number;
  marginPercent: number;
}

export interface HppProfitAnalysis {
  totalRevenue: number;
  totalHpp: number;
  grossProfit: number;
  grossMarginPercent: number;
  totalDiscount: number;
  totalTax: number;
  totalQtySold: number;
  itemBreakdown: ItemHppBreakdown[];
  categoryBreakdown: CategoryHppBreakdown[];
}

export function calculateHppAndProfit(
  orders: Order[],
  menuItems: MenuItem[] = []
): HppProfitAnalysis {
  const menuMap = new Map<string, MenuItem>();
  menuItems.forEach((m) => menuMap.set(m.id, m));

  let totalRevenue = 0;
  let totalHpp = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let totalQtySold = 0;

  const itemMap = new Map<string, {
    id: string;
    name: string;
    category: string;
    qty: number;
    revenue: number;
    hppTotal: number;
    unitPrice: number;
    unitCost: number;
  }>();

  const categoryMap = new Map<string, {
    category: string;
    qty: number;
    revenue: number;
    hppTotal: number;
  }>();

  for (const order of orders) {
    totalDiscount += order.discount || 0;
    totalTax += order.tax || 0;

    for (const item of order.items) {
      const menuItem = menuMap.get(item.id);
      // Cost per unit: from item, or menu, or default 40% of selling price
      const unitCost = item.costPrice ?? menuItem?.costPrice ?? Math.round(item.h * 0.4);
      const unitPrice = item.h;
      const itemQty = item.qty || 1;
      const itemRev = unitPrice * itemQty;
      const itemHpp = unitCost * itemQty;
      const category = menuItem?.category || 'Lainnya';

      totalRevenue += itemRev;
      totalHpp += itemHpp;
      totalQtySold += itemQty;

      // Item breakdown aggregation
      const existingItem = itemMap.get(item.id);
      if (existingItem) {
        existingItem.qty += itemQty;
        existingItem.revenue += itemRev;
        existingItem.hppTotal += itemHpp;
      } else {
        itemMap.set(item.id, {
          id: item.id,
          name: item.n,
          category,
          qty: itemQty,
          revenue: itemRev,
          hppTotal: itemHpp,
          unitPrice,
          unitCost,
        });
      }

      // Category breakdown aggregation
      const existingCat = categoryMap.get(category);
      if (existingCat) {
        existingCat.qty += itemQty;
        existingCat.revenue += itemRev;
        existingCat.hppTotal += itemHpp;
      } else {
        categoryMap.set(category, {
          category,
          qty: itemQty,
          revenue: itemRev,
          hppTotal: itemHpp,
        });
      }
    }
  }

  // Adjust gross profit with discounts if any
  const grossProfit = Math.max(0, totalRevenue - totalHpp - totalDiscount);
  const grossMarginPercent = totalRevenue > 0 ? Math.round(((grossProfit / totalRevenue) * 100) * 10) / 10 : 0;

  const itemBreakdown: ItemHppBreakdown[] = Array.from(itemMap.values()).map((it) => {
    const profitTotal = it.revenue - it.hppTotal;
    const marginPercent = it.revenue > 0 ? Math.round(((profitTotal / it.revenue) * 100) * 10) / 10 : 0;
    let marginStatus: 'Sehat' | 'Waspada' | 'Kritis' = 'Sehat';
    if (marginPercent < 45) marginStatus = 'Kritis';
    else if (marginPercent < 58) marginStatus = 'Waspada';

    return {
      ...it,
      profitTotal,
      marginPercent,
      marginStatus,
    };
  }).sort((a, b) => b.profitTotal - a.profitTotal);

  const categoryBreakdown: CategoryHppBreakdown[] = Array.from(categoryMap.values()).map((cat) => {
    const profitTotal = cat.revenue - cat.hppTotal;
    const marginPercent = cat.revenue > 0 ? Math.round(((profitTotal / cat.revenue) * 100) * 10) / 10 : 0;
    return {
      ...cat,
      profitTotal,
      marginPercent,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  return {
    totalRevenue,
    totalHpp,
    grossProfit,
    grossMarginPercent,
    totalDiscount,
    totalTax,
    totalQtySold,
    itemBreakdown,
    categoryBreakdown,
  };
}

