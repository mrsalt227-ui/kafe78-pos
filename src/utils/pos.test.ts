import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOrderSummary,
  calculateChange,
  deductFifoStock,
  formatRupiah,
  getElapsedTimerString,
  getTimerUrgency,
  StockBatch,
  calculateHppAndProfit,
  MenuItem,
  Order,
} from './pos.js';

test('formatRupiah formats correctly', () => {
  assert.equal(formatRupiah(25000), 'Rp 25.000');
  assert.equal(formatRupiah(0), 'Rp 0');
});

test('calculateOrderSummary calculates subtotal, discount, tax and grand total', () => {
  const items = [
    { h: 20000, qty: 2 }, // 40.000
    { h: 15000, qty: 1 }, // 15.000
  ];
  // Subtotal = 55.000
  // Discount 10% = 5.500 -> Taxable = 49.500
  // Tax 10% = 4.950 -> Grand total = 54.450
  const summary = calculateOrderSummary(items, 10, 10);
  assert.equal(summary.subtotal, 55000);
  assert.equal(summary.discountAmount, 5500);
  assert.equal(summary.tax, 4950);
  assert.equal(summary.grandTotal, 54450);
});

test('calculateChange handles exact cash, excess cash, and underpayment', () => {
  assert.equal(calculateChange(50000, 100000), 50000);
  assert.equal(calculateChange(50000, 50000), 0);
  assert.equal(calculateChange(50000, 40000), 0);
});

test('deductFifoStock depletes oldest batches first', () => {
  const batches: StockBatch[] = [
    { id: 'b2', menuId: 'm1', qty: 10, costPrice: 12000, dateIn: 200 },
    { id: 'b1', menuId: 'm1', qty: 5, costPrice: 10000, dateIn: 100 },
  ];

  // Request 8 items: 5 from b1 (older), 3 from b2
  const result = deductFifoStock(batches, 8);
  assert.equal(result.qtyDeducted, 8);
  assert.equal(result.remainingBatches.length, 1);
  assert.equal(result.remainingBatches[0].id, 'b2');
  assert.equal(result.remainingBatches[0].qty, 7);
});

test('getTimerUrgency returns normal, warn, late', () => {
  const now = 10000000;
  assert.equal(getTimerUrgency(now - 5 * 60 * 1000, now), 'normal');
  assert.equal(getTimerUrgency(now - 10 * 60 * 1000, now), 'warn');
  assert.equal(getTimerUrgency(now - 20 * 60 * 1000, now), 'late');
});

test('calculateHppAndProfit accurately computes revenue, HPP, gross profit and margins', () => {
  const menu: MenuItem[] = [
    { id: 'm1', n: 'Kopi Susu', h: 18000, costPrice: 7000, category: 'Kopi', stok: 50 },
    { id: 'm2', n: 'Roti Bakar', h: 16000, costPrice: 6000, category: 'Dessert', stok: 30 },
  ];

  const orders: Order[] = [
    {
      id: 'o1',
      meja: '01',
      items: [
        { id: 'm1', n: 'Kopi Susu', h: 18000, costPrice: 7000, qty: 2 }, // rev: 36000, hpp: 14000
        { id: 'm2', n: 'Roti Bakar', h: 16000, costPrice: 6000, qty: 1 }, // rev: 16000, hpp: 6000
      ],
      subtotal: 52000,
      discount: 2000,
      tax: 5000,
      total: 55000,
      createdAt: Date.now(),
      status: 'selesai',
      paymentStatus: 'paid',
    },
  ];

  const analysis = calculateHppAndProfit(orders, menu);
  // Total item revenue = 36000 + 16000 = 52000
  // Total HPP = 14000 + 6000 = 20000
  // Gross Profit = 52000 - 20000 - 2000 (discount) = 30000
  // Gross Margin = (30000 / 52000) * 100 = 57.69% -> 57.7%
  assert.equal(analysis.totalRevenue, 52000);
  assert.equal(analysis.totalHpp, 20000);
  assert.equal(analysis.grossProfit, 30000);
  assert.equal(analysis.grossMarginPercent, 57.7);
  assert.equal(analysis.totalQtySold, 3);
  assert.equal(analysis.itemBreakdown.length, 2);
  assert.equal(analysis.categoryBreakdown.length, 2);
});

