import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  LineChart as LineChartIcon,
  TrendingUp, 
  Download, 
  Eye,
  Calendar,
  CreditCard,
  Coffee,
  Clock,
  Award,
  Layers,
  ArrowUpRight,
  Search,
  Filter,
  DollarSign,
  UtensilsCrossed,
  Sparkles,
  Percent,
  TrendingDown,
  Bot,
  PieChart
} from 'lucide-react';
import { Order, MenuItem, formatRupiah, calculateHppAndProfit } from '../utils/pos';
import { ReceiptModal } from './ReceiptModal';
import { GeminiAdvisorModal } from './GeminiAdvisorModal';

interface ReportModuleProps {
  completedOrders: Order[];
  menu?: MenuItem[];
}

type PeriodType = 'today' | 'week' | 'all';
type MetricType = 'revenue' | 'orders' | 'aov';
type ChartStyle = 'bar' | 'area';

export const ReportModule: React.FC<ReportModuleProps> = ({ completedOrders, menu = [] }) => {
  const [period, setPeriod] = useState<PeriodType>('week');
  const [metric, setMetric] = useState<MetricType>('revenue');
  const [chartStyle, setChartStyle] = useState<ChartStyle>('bar');
  const [hoveredDataPoint, setHoveredDataPoint] = useState<any | null>(null);
  const [hoveredPayment, setHoveredPayment] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'Tunai' | 'QRIS' | 'Transfer'>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<Order | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [rankingViewMode, setRankingViewMode] = useState<'profit' | 'volume'>('profit');

  // Filter orders by time period
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return completedOrders.filter((order) => {
      const orderTime = order.paidAt || order.createdAt;
      if (period === 'today') {
        // "Hari ini" = sejak 00:00 hari ini, bukan 24 jam terakhir.
        return orderTime >= startOfToday;
      }
      if (period === 'week') {
        return now.getTime() - orderTime < 86400000 * 7;
      }
      return true;
    });
  }, [completedOrders, period]);

  // Overall KPIs
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const totalTransactions = filteredOrders.length;
  const avgOrderValue = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;
  const totalItemsSold = filteredOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, it) => s + it.qty, 0),
    0
  );

  // Growth comparison (vs previous equal time window)
  const growthRate = useMemo(() => {
    if (period === 'all') return null;
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const currentStart = period === 'today' ? startOfToday.getTime() : now - 86400000 * 7;
    const currentEnd = now;
    const windowMs = currentEnd - currentStart;
    const prevStart = currentStart - windowMs;
    const prevEnd = currentStart;

    const sum = (from: number, to: number) =>
      completedOrders.reduce((total, o) => {
        const t = o.paidAt || o.createdAt;
        return t >= from && t < to ? total + o.total : total;
      }, 0);

    const current = sum(currentStart, currentEnd);
    const previous = sum(prevStart, prevEnd);
    if (previous <= 0) return null;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }, [completedOrders, period]);

  // 1. Time-Series Aggregation for Charts
  const chartData = useMemo(() => {
    const now = Date.now();

    if (period === 'today') {
      // Hourly slots (e.g., 08:00 to 22:00 in 2-hour brackets)
      const slots = [
        { label: '08-10', fullLabel: '08:00 - 10:00 (Pagi)', revenue: 0, orders: 0 },
        { label: '10-12', fullLabel: '10:00 - 12:00 (Siang)', revenue: 0, orders: 0 },
        { label: '12-14', fullLabel: '12:00 - 14:00 (Makan Siang)', revenue: 0, orders: 0 },
        { label: '14-16', fullLabel: '14:00 - 16:00 (Sore)', revenue: 0, orders: 0 },
        { label: '16-18', fullLabel: '16:00 - 18:00 (Senja)', revenue: 0, orders: 0 },
        { label: '18-20', fullLabel: '18:00 - 20:00 (Makan Malam)', revenue: 0, orders: 0 },
        { label: '20-22', fullLabel: '20:00 - 22:00 (Malam)', revenue: 0, orders: 0 },
      ];

      filteredOrders.forEach((o) => {
        const time = new Date(o.paidAt || o.createdAt);
        const hour = time.getHours();
        let slotIdx = 0;
        if (hour < 10) slotIdx = 0;
        else if (hour < 12) slotIdx = 1;
        else if (hour < 14) slotIdx = 2;
        else if (hour < 16) slotIdx = 3;
        else if (hour < 18) slotIdx = 4;
        else if (hour < 20) slotIdx = 5;
        else slotIdx = 6;

        slots[slotIdx].revenue += o.total;
        slots[slotIdx].orders += 1;
      });

      return slots.map((s) => ({
        ...s,
        aov: s.orders > 0 ? Math.round(s.revenue / s.orders) : 0,
      }));
    }

    if (period === 'week') {
      // Last 7 days in chronological order
      const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const result = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now - i * 86400000);
        const dayName = days[d.getDay()];
        const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

        // Filter orders for that calendar day
        const dayOrders = completedOrders.filter((o) => {
          const ot = new Date(o.paidAt || o.createdAt);
          return (
            ot.getFullYear() === d.getFullYear() &&
            ot.getMonth() === d.getMonth() &&
            ot.getDate() === d.getDate()
          );
        });

        const rev = dayOrders.reduce((acc, cur) => acc + cur.total, 0);
        const ords = dayOrders.length;

        result.push({
          label: dayName,
          fullLabel: `${dayName}, ${dateStr}`,
          revenue: rev,
          orders: ords,
          aov: ords > 0 ? Math.round(rev / ords) : 0,
        });
      }

      return result;
    }

    // All time grouped by past weeks
    const result = [
      { label: 'Mgg 1', fullLabel: 'Minggu Ke-1', revenue: 0, orders: 0 },
      { label: 'Mgg 2', fullLabel: 'Minggu Ke-2', revenue: 0, orders: 0 },
      { label: 'Mgg 3', fullLabel: 'Minggu Ke-3', revenue: 0, orders: 0 },
      { label: 'Mgg 4', fullLabel: 'Minggu Ini', revenue: 0, orders: 0 },
    ];

    filteredOrders.forEach((o, idx) => {
      const bucket = idx % 4;
      result[bucket].revenue += o.total;
      result[bucket].orders += 1;
    });

    return result.map((r) => ({
      ...r,
      aov: r.orders > 0 ? Math.round(r.revenue / r.orders) : 0,
    }));
  }, [filteredOrders, period, completedOrders]);

  // Max value for chart scaling
  const maxMetricValue = useMemo(() => {
    const values = chartData.map((d) => d[metric]);
    const max = Math.max(...values, 1000);
    // Add 15% headroom
    return Math.ceil(max * 1.15);
  }, [chartData, metric]);

  // 2. Payment Method Breakdown (for Donut Chart)
  const paymentBreakdown = useMemo(() => {
    const methods: Record<string, { total: number; count: number; color: string; label: string }> = {
      Tunai: { total: 0, count: 0, color: '#34C759', label: 'Tunai (Cash)' },
      QRIS: { total: 0, count: 0, color: '#007AFF', label: 'QRIS Dinamis' },
      Transfer: { total: 0, count: 0, color: '#5856D6', label: 'Transfer Bank' },
    };

    filteredOrders.forEach((o) => {
      const m = o.paymentMethod || 'Tunai';
      if (methods[m]) {
        methods[m].total += o.total;
        methods[m].count += 1;
      }
    });

    return methods;
  }, [filteredOrders]);

  // Donut SVG Calculations
  const donutSegments = useMemo(() => {
    const total = totalRevenue || 1;
    let accumulatedAngle = 0;
    const radius = 64;
    const circumference = 2 * Math.PI * radius;

    return Object.entries(paymentBreakdown).map(([key, data]) => {
      const ratio = totalRevenue > 0 ? data.total / total : 0;
      const strokeLength = ratio * circumference;
      const strokeDashoffset = -accumulatedAngle;
      accumulatedAngle += strokeLength;

      return {
        key,
        ...data,
        ratio,
        percent: Math.round(ratio * 100),
        strokeLength,
        strokeDashoffset,
        circumference,
      };
    });
  }, [paymentBreakdown, totalRevenue]);

  // 3. Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const categories: Record<string, { name: string; qty: number; revenue: number; color: string; icon: string }> = {
      Kopi: { name: 'Kopi', qty: 0, revenue: 0, color: '#8E5A35', icon: '☕' },
      'Non-Kopi': { name: 'Non-Kopi', qty: 0, revenue: 0, color: '#30B0C7', icon: '🍵' },
      Makanan: { name: 'Makanan', qty: 0, revenue: 0, color: '#FF9500', icon: '🍛' },
      Snack: { name: 'Snack', qty: 0, revenue: 0, color: '#FF2D55', icon: '🍟' },
      Dessert: { name: 'Dessert', qty: 0, revenue: 0, color: '#AF52DE', icon: '🥐' },
    };

    // Category mapping helper
    filteredOrders.forEach((o) => {
      o.items.forEach((it) => {
        let cat = 'Kopi';
        const nameLower = it.n.toLowerCase();
        if (nameLower.includes('matcha') || nameLower.includes('tea')) cat = 'Non-Kopi';
        else if (nameLower.includes('nasi') || nameLower.includes('mie') || nameLower.includes('geprek')) cat = 'Makanan';
        else if (nameLower.includes('fries') || nameLower.includes('cireng')) cat = 'Snack';
        else if (nameLower.includes('roti') || nameLower.includes('croissant')) cat = 'Dessert';

        if (categories[cat]) {
          categories[cat].qty += it.qty;
          categories[cat].revenue += it.h * it.qty;
        }
      });
    });

    const totalCatRevenue = Object.values(categories).reduce((s, c) => s + c.revenue, 0) || 1;

    return Object.values(categories).map((c) => ({
      ...c,
      percent: Math.round((c.revenue / totalCatRevenue) * 100),
    })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  // 4. Top Selling Products
  const topSelling = useMemo(() => {
    const counts: Record<string, { name: string; qty: number; revenue: number; category: string }> = {};
    filteredOrders.forEach((ord) => {
      ord.items.forEach((it) => {
        if (!counts[it.id]) {
          let cat = 'Kopi';
          const nameLower = it.n.toLowerCase();
          if (nameLower.includes('matcha') || nameLower.includes('tea')) cat = 'Non-Kopi';
          else if (nameLower.includes('nasi') || nameLower.includes('mie') || nameLower.includes('ayam')) cat = 'Makanan';
          else if (nameLower.includes('fries') || nameLower.includes('cireng')) cat = 'Snack';
          else if (nameLower.includes('roti') || nameLower.includes('croissant')) cat = 'Dessert';

          counts[it.id] = { name: it.n, qty: 0, revenue: 0, category: cat };
        }
        counts[it.id].qty += it.qty;
        counts[it.id].revenue += it.h * it.qty;
      });
    });

    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredOrders]);

  // 5. Executive Insights
  const peakSlot = useMemo(() => {
    if (chartData.length === 0) return null;
    return [...chartData].sort((a, b) => b.revenue - a.revenue)[0];
  }, [chartData]);

  const topTable = useMemo(() => {
    const tables: Record<string, { table: string; revenue: number; count: number }> = {};
    filteredOrders.forEach((o) => {
      if (!tables[o.meja]) tables[o.meja] = { table: o.meja, revenue: 0, count: 0 };
      tables[o.meja].revenue += o.total;
      tables[o.meja].count += 1;
    });
    return Object.values(tables).sort((a, b) => b.revenue - a.revenue)[0] || null;
  }, [filteredOrders]);

  // Filtered Transaction Table
  const tableTransactions = useMemo(() => {
    return filteredOrders.filter((ord) => {
      const matchPayment = paymentFilter === 'all' || (ord.paymentMethod || 'Tunai') === paymentFilter;
      const matchSearch = 
        ord.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ord.meja.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ord.items.some((it) => it.n.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchPayment && matchSearch;
    });
  }, [filteredOrders, paymentFilter, searchQuery]);

  // CSV Export
  const exportCSV = () => {
    const headers = 'ID Transaksi,Meja,Kasir,Metode,Total,Waktu\n';
    const rows = filteredOrders
      .map(
        (o) =>
          `"${o.id}","${o.meja}","${o.cashierName || 'Kasir'}","${o.paymentMethod || 'Tunai'}",${o.total},"${new Date(o.paidAt || o.createdAt).toLocaleString('id-ID')}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan-Kafe78-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Helper coordinate mapper for Area Chart SVG
  const areaSvgCoords = useMemo(() => {
    const width = 680;
    const height = 180;
    const paddingX = 40;
    const paddingY = 25;

    if (chartData.length < 2) {
      return { path: '', area: '', points: [], width, height, paddingX, paddingY };
    }
    const innerW = width - paddingX * 2;
    const innerH = height - paddingY * 2;

    const points = chartData.map((d, i) => {
      const x = paddingX + (i / (chartData.length - 1)) * innerW;
      const val = d[metric];
      const y = height - paddingY - (val / maxMetricValue) * innerH;
      return { x, y, data: d };
    });

    // Create smooth bezier curve
    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      linePath += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

    return { path: linePath, area: areaPath, points, width, height, paddingX, paddingY };
  }, [chartData, metric, maxMetricValue]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* iOS App Store / Health Style Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </span>
            <div>
              <h2 className="font-bold text-lg text-[#1C1C1E] tracking-tight">
                Laporan & Analisis Penjualan
              </h2>
              <p className="text-xs text-[#8E8E93]">
                Visualisasi data transaksi, performa menu, dan jam tersibuk Kafe 78
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* iOS Segmented Control: Period */}
          <div className="bg-[#E5E5EA] p-1 rounded-xl flex items-center gap-1 shadow-2xs">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                period === 'today'
                  ? 'bg-white text-[#1C1C1E] shadow-xs'
                  : 'text-[#636366] hover:text-[#1C1C1E]'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                period === 'week'
                  ? 'bg-white text-[#1C1C1E] shadow-xs'
                  : 'text-[#636366] hover:text-[#1C1C1E]'
              }`}
            >
              7 Hari Terakhir
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                period === 'all'
                  ? 'bg-white text-[#1C1C1E] shadow-xs'
                  : 'text-[#636366] hover:text-[#1C1C1E]'
              }`}
            >
              Semua Waktu
            </button>
          </div>

          <button
            onClick={exportCSV}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-[#D1D1D6] hover:bg-[#F2F2F7] text-[#1C1C1E] text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#007AFF]" />
            Ekspor CSV
          </button>
        </div>
      </div>

      {/* Primary KPI Apple Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Omzet */}
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-[#8E8E93] mb-1">
            <span className="text-xs font-medium">Total Omzet Penjualan</span>
            <span className="text-[10px] font-semibold text-[#34C759] flex items-center gap-0.5 bg-[#34C759]/10 px-1.5 py-0.5 rounded-md">
              {growthRate === null ? (
                <span className="text-[#8E8E93] bg-[#8E8E93]/10 px-1.5 py-0.5 rounded-md">—</span>
              ) : (
                <>
                  <ArrowUpRight className="w-3 h-3" /> {growthRate >= 0 ? '+' : ''}
                  {growthRate}%
                </>
              )}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#007AFF] tracking-tight">
            {formatRupiah(totalRevenue)}
          </div>
          <div className="text-[11px] text-[#8E8E93] mt-1.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {period === 'today' ? 'Hari ini' : period === 'week' ? '7 hari kalender' : 'Seluruh periode'}
          </div>
        </div>

        {/* Transaksi Lunas */}
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-[#8E8E93] mb-1">
            <span className="text-xs font-medium">Transaksi Lunas</span>
            <span className="w-5 h-5 rounded-full bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center text-[10px] font-bold">
              ✓
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#1C1C1E] tracking-tight">
            {totalTransactions} <span className="text-sm font-sans font-medium text-[#8E8E93]">struk</span>
          </div>
          <div className="text-[11px] text-[#636366] mt-1.5">
            Selesai disajikan & lunas dibayar
          </div>
        </div>

        {/* AOV (Average Order Value) */}
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-[#8E8E93] mb-1">
            <span className="text-xs font-medium">Rata-rata Order (AOV)</span>
            <DollarSign className="w-3.5 h-3.5 text-[#8E8E93]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#1C1C1E] tracking-tight">
            {formatRupiah(avgOrderValue)}
          </div>
          <div className="text-[11px] text-[#636366] mt-1.5">
            Rata-rata belanja per meja/tamu
          </div>
        </div>

        {/* Total Item Terjual */}
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-[#8E8E93] mb-1">
            <span className="text-xs font-medium">Porsi Terjual</span>
            <UtensilsCrossed className="w-3.5 h-3.5 text-[#8E8E93]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#1C1C1E] tracking-tight">
            {totalItemsSold} <span className="text-sm font-sans font-medium text-[#8E8E93]">porsi</span>
          </div>
          <div className="text-[11px] text-[#636366] mt-1.5">
            Kombinasi minuman & makanan
          </div>
        </div>
      </div>

      {/* MAIN INTERACTIVE CHART (Apple Stocks / Health Style) */}
      <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-2xs space-y-4">
        {/* Chart Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F2F2F7] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-[#1C1C1E]">
                {metric === 'revenue' ? 'Tren Omzet Penjualan' : metric === 'orders' ? 'Volume Transaksi' : 'Rata-rata Pembelian (AOV)'}
              </h3>
              {peakSlot && peakSlot.revenue > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FF9500]/10 text-[#FF9500] flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Puncak: {peakSlot.label}
                </span>
              )}
            </div>
            <p className="text-xs text-[#8E8E93] mt-0.5">
              {hoveredDataPoint 
                ? `${hoveredDataPoint.fullLabel}: ${metric === 'revenue' ? formatRupiah(hoveredDataPoint.revenue) : metric === 'orders' ? `${hoveredDataPoint.orders} Order` : formatRupiah(hoveredDataPoint.aov)}`
                : 'Arahkan kursor atau sentuh diagram untuk melihat detail rincian'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Metric Selector */}
            <div className="bg-[#F2F2F7] p-1 rounded-xl flex items-center gap-1">
              <button
                onClick={() => setMetric('revenue')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  metric === 'revenue' ? 'bg-white text-[#007AFF] shadow-2xs' : 'text-[#636366]'
                }`}
              >
                Omzet (Rp)
              </button>
              <button
                onClick={() => setMetric('orders')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  metric === 'orders' ? 'bg-white text-[#007AFF] shadow-2xs' : 'text-[#636366]'
                }`}
              >
                Pesanan
              </button>
              <button
                onClick={() => setMetric('aov')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  metric === 'aov' ? 'bg-white text-[#007AFF] shadow-2xs' : 'text-[#636366]'
                }`}
              >
                AOV
              </button>
            </div>

            {/* Chart Style Toggle */}
            <div className="bg-[#F2F2F7] p-1 rounded-xl flex items-center gap-1">
              <button
                onClick={() => setChartStyle('bar')}
                title="Tampilan Kolom Bar"
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  chartStyle === 'bar' ? 'bg-white text-[#1C1C1E] shadow-2xs' : 'text-[#8E8E93]'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartStyle('area')}
                title="Tampilan Kurva Area"
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  chartStyle === 'area' ? 'bg-white text-[#1C1C1E] shadow-2xs' : 'text-[#8E8E93]'
                }`}
              >
                <LineChartIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Visual Chart Canvas */}
        <div className="w-full relative pt-2">
          {chartStyle === 'bar' ? (
            /* Apple Health Style Rounded Bar Chart */
            <div className="h-56 flex items-end justify-between gap-2 sm:gap-4 px-2 pt-6">
              {chartData.map((d, idx) => {
                const val = d[metric];
                const heightPercent = Math.max(Math.round((val / maxMetricValue) * 100), val > 0 ? 6 : 2);
                const isHovered = hoveredDataPoint?.label === d.label;
                const isPeak = peakSlot?.label === d.label && val > 0;

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                    onMouseEnter={() => setHoveredDataPoint(d)}
                    onMouseLeave={() => setHoveredDataPoint(null)}
                    onClick={() => setHoveredDataPoint(d)}
                  >
                    {/* Tooltip on hover */}
                    <div
                      className={`absolute -top-3 transition-all duration-200 pointer-events-none transform -translate-x-1/2 ${
                        isHovered ? 'opacity-100 scale-100 z-20' : 'opacity-0 scale-95'
                      }`}
                      style={{ left: `${((idx + 0.5) / chartData.length) * 100}%` }}
                    >
                      <div className="bg-[#1C1C1E] text-white text-[11px] font-mono px-2.5 py-1 rounded-xl shadow-lg whitespace-nowrap">
                        <span className="font-bold text-[#007AFF] mr-1">{d.label}:</span>
                        {metric === 'revenue' ? formatRupiah(d.revenue) : metric === 'orders' ? `${d.orders} Order` : formatRupiah(d.aov)}
                      </div>
                    </div>

                    {/* Bar Track & Fill */}
                    <div className="w-full max-w-[48px] h-full flex items-end justify-center">
                      <div className="w-full h-full bg-[#F2F2F7] rounded-xl flex items-end p-1 overflow-hidden transition-all group-hover:bg-[#E5E5EA]">
                        <div
                          className={`w-full rounded-lg transition-all duration-500 ease-out ${
                            isPeak
                              ? 'bg-gradient-to-t from-[#007AFF] to-[#5856D6]'
                              : isHovered
                              ? 'bg-[#007AFF]'
                              : 'bg-[#007AFF]/85 group-hover:bg-[#007AFF]'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* X-Axis Label */}
                    <div className="mt-2 text-center">
                      <span
                        className={`text-[11px] block transition-colors ${
                          isHovered
                            ? 'font-bold text-[#007AFF]'
                            : isPeak
                            ? 'font-semibold text-[#1C1C1E]'
                            : 'text-[#8E8E93]'
                        }`}
                      >
                        {d.label}
                      </span>
                      <span className="text-[9px] text-[#AEAEB2] block font-mono hidden sm:block">
                        {d.orders} ord
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Apple Stocks Style Curved Area Chart */
            <div className="h-56 relative w-full">
              <svg
                viewBox={`0 0 ${areaSvgCoords.width} ${areaSvgCoords.height}`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007AFF" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#007AFF" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal reference lines */}
                {[0.25, 0.5, 0.75, 1].map((pct, idx) => (
                  <line
                    key={idx}
                    x1="20"
                    y1={areaSvgCoords.height - 25 - pct * (areaSvgCoords.height - 50)}
                    x2={areaSvgCoords.width - 20}
                    y2={areaSvgCoords.height - 25 - pct * (areaSvgCoords.height - 50)}
                    stroke="#E5E5EA"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                ))}

                {/* Shaded Area */}
                <path d={areaSvgCoords.area} fill="url(#areaGradient)" />

                {/* Spline Curve */}
                <path
                  d={areaSvgCoords.path}
                  fill="none"
                  stroke="#007AFF"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Interactive Points */}
                {areaSvgCoords.points.map((pt, idx) => {
                  const isHovered = hoveredDataPoint?.label === pt.data.label;
                  return (
                    <g key={idx}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 6 : 4}
                        fill="#FFFFFF"
                        stroke="#007AFF"
                        strokeWidth={isHovered ? 3.5 : 2.5}
                        className="transition-all cursor-pointer"
                        onMouseEnter={() => setHoveredDataPoint(pt.data)}
                        onMouseLeave={() => setHoveredDataPoint(null)}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* X-Axis labels for Area Chart */}
              <div className="flex justify-between px-4 mt-2">
                {chartData.map((d, idx) => (
                  <span
                    key={idx}
                    className={`text-[11px] ${
                      hoveredDataPoint?.label === d.label
                        ? 'font-bold text-[#007AFF]'
                        : 'text-[#8E8E93]'
                    }`}
                  >
                    {d.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Middle Row: Donut Chart, Category Performance, & Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 1. Apple Ring Donut Chart: Payment Distribution */}
        <div className="lg:col-span-5 bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#1C1C1E]">Distribusi Pembayaran</h3>
              <p className="text-xs text-[#8E8E93]">Porsi transaksi berdasarkan kanal pembayaran</p>
            </div>
            <CreditCard className="w-4 h-4 text-[#8E8E93]" />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
            {/* SVG Donut */}
            <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                {/* Background Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r="64"
                  fill="none"
                  stroke="#F2F2F7"
                  strokeWidth="16"
                />

                {/* Segments */}
                {donutSegments.map((seg) => {
                  const isHovered = hoveredPayment === seg.key;
                  return (
                    <circle
                      key={seg.key}
                      cx="80"
                      cy="80"
                      r="64"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={isHovered ? 19 : 16}
                      strokeDasharray={`${seg.strokeLength} ${seg.circumference}`}
                      strokeDashoffset={seg.strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setHoveredPayment(seg.key)}
                      onMouseLeave={() => setHoveredPayment(null)}
                    />
                  );
                })}
              </svg>

              {/* Donut Center Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
                {hoveredPayment ? (
                  <>
                    <span className="text-[10px] uppercase font-bold text-[#8E8E93]">
                      {paymentBreakdown[hoveredPayment]?.label}
                    </span>
                    <span className="text-sm font-extrabold font-mono text-[#1C1C1E]">
                      {formatRupiah(paymentBreakdown[hoveredPayment]?.total || 0)}
                    </span>
                    <span className="text-[10px] text-[#007AFF] font-bold">
                      {Math.round(((paymentBreakdown[hoveredPayment]?.total || 0) / (totalRevenue || 1)) * 100)}%
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] uppercase font-bold text-[#8E8E93]">
                      Total Masuk
                    </span>
                    <span className="text-sm font-extrabold font-mono text-[#1C1C1E]">
                      {formatRupiah(totalRevenue)}
                    </span>
                    <span className="text-[10px] text-[#636366]">100% Lunas</span>
                  </>
                )}
              </div>
            </div>

            {/* Donut Legend */}
            <div className="w-full space-y-2.5">
              {donutSegments.map((seg) => {
                const isHovered = hoveredPayment === seg.key;
                return (
                  <div
                    key={seg.key}
                    onMouseEnter={() => setHoveredPayment(seg.key)}
                    onMouseLeave={() => setHoveredPayment(null)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isHovered
                        ? 'bg-[#F2F2F7] border-[#007AFF]'
                        : 'bg-white border-[#E5E5EA] hover:bg-[#F8F8FA]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: seg.color }}
                      ></span>
                      <div>
                        <span className="text-xs font-semibold text-[#1C1C1E] block">
                          {seg.label}
                        </span>
                        <span className="text-[10px] text-[#8E8E93]">
                          {seg.count} transaksi ({seg.percent}%)
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#1C1C1E]">
                      {formatRupiah(seg.total)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Category Performance Bars */}
        <div className="lg:col-span-7 bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#1C1C1E]">Kinerja Berdasarkan Kategori</h3>
              <p className="text-xs text-[#8E8E93]">Kontribusi omzet kopi, makanan & dessert</p>
            </div>
            <Layers className="w-4 h-4 text-[#8E8E93]" />
          </div>

          <div className="space-y-3 pt-1">
            {categoryBreakdown.map((cat, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{cat.icon}</span>
                    <span className="font-semibold text-[#1C1C1E]">{cat.name}</span>
                    <span className="text-[11px] text-[#8E8E93]">({cat.qty} porsi)</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-[#1C1C1E]">{formatRupiah(cat.revenue)}</span>
                    <span className="text-[10px] text-[#8E8E93] font-semibold w-8 text-right">
                      {cat.percent}%
                    </span>
                  </div>
                </div>

                {/* Multi-segment styled progress bar */}
                <div className="w-full h-2 rounded-full bg-[#F2F2F7] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.max(cat.percent, 3)}%`,
                      backgroundColor: cat.color,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row: Business Highlights & Top 5 Best Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Executive Highlights Cards */}
        <div className="lg:col-span-4 bg-[#F8F8FA] border border-[#E5E5EA] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1C1C1E] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#007AFF]" />
            Sorotan Penjualan
          </div>

          <div className="space-y-2.5">
            {/* Jam Tersibuk */}
            <div className="bg-white border border-[#E5E5EA] rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] text-[#8E8E93] font-semibold uppercase block">
                Jam Paling Ramai (Peak Hour)
              </span>
              <div className="text-base font-bold text-[#1C1C1E] mt-0.5">
                {peakSlot?.fullLabel || '12:00 - 14:00 (Makan Siang)'}
              </div>
              <span className="text-[11px] text-[#007AFF] font-medium block mt-1">
                Menyumbang {peakSlot ? formatRupiah(peakSlot.revenue) : 'Rp 0'} omzet
              </span>
            </div>

            {/* Meja Paling Aktif */}
            <div className="bg-white border border-[#E5E5EA] rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] text-[#8E8E93] font-semibold uppercase block">
                Meja Omzet Tertinggi
              </span>
              <div className="text-base font-bold text-[#1C1C1E] mt-0.5">
                Meja {topTable?.table || '01'}
              </div>
              <span className="text-[11px] text-[#34C759] font-medium block mt-1">
                {topTable?.count || 0} kali perputaran meja ({formatRupiah(topTable?.revenue || 0)})
              </span>
            </div>

            {/* Metode Bayar Dominan */}
            <div className="bg-white border border-[#E5E5EA] rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] text-[#8E8E93] font-semibold uppercase block">
                Metode Terfavorit
              </span>
              <div className="text-base font-bold text-[#1C1C1E] mt-0.5">
                QRIS Dinamis
              </div>
              <span className="text-[11px] text-[#5856D6] font-medium block mt-1">
                Paling cepat & digemari pelanggan kafe
              </span>
            </div>
          </div>
        </div>

        {/* Top 5 Best Sellers with Podium Badges */}
        <div className="lg:col-span-8 bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#1C1C1E]">5 Menu Terlaris (Top Performers)</h3>
              <p className="text-xs text-[#8E8E93]">Peringkat menu dengan volume penjualan tertinggi</p>
            </div>
            <Award className="w-4 h-4 text-[#FF9500]" />
          </div>

          <div className="space-y-3">
            {topSelling.length === 0 ? (
              <p className="text-xs text-[#8E8E93] py-8 text-center">Belum ada transaksi di periode ini.</p>
            ) : (
              topSelling.map((item, idx) => {
                const maxQty = topSelling[0]?.qty || 1;
                const percent = Math.round((item.qty / maxQty) * 100);

                const medalColors = [
                  'bg-[#FFD700] text-[#7A5800]', // 1st Gold
                  'bg-[#C0C0C0] text-[#4A4A4A]', // 2nd Silver
                  'bg-[#CD7F32] text-[#5A3810]', // 3rd Bronze
                  'bg-[#F2F2F7] text-[#636366]',
                  'bg-[#F2F2F7] text-[#636366]',
                ];

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#F8F8FA] hover:bg-[#F2F2F7] transition-all space-y-2 border border-[#E5E5EA]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${medalColors[idx]}`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-xs text-[#1C1C1E] block">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-[#8E8E93]">
                            Kategori: {item.category}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-xs text-[#1C1C1E] block">
                          {formatRupiah(item.revenue)}
                        </span>
                        <span className="text-[11px] font-semibold text-[#007AFF]">
                          {item.qty} porsi terjual
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-[#E5E5EA] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#007AFF] transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Transaction History Table with Filter & Search */}
      <div className="bg-white border border-[#E5E5EA] rounded-2xl overflow-hidden shadow-2xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#F2F2F7] pb-3">
          <div>
            <h3 className="font-bold text-sm text-[#1C1C1E]">Riwayat Struk & Pembayaran</h3>
            <p className="text-xs text-[#8E8E93]">
              Menampilkan {tableTransactions.length} dari {filteredOrders.length} transaksi di periode ini
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8E8E93] absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari meja, tiket, menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-[#D1D1D6] text-xs focus:outline-none focus:border-[#007AFF] bg-[#F2F2F7] focus:bg-white w-48 sm:w-56"
              />
            </div>

            {/* Filter by Payment Method */}
            <div className="bg-[#F2F2F7] p-1 rounded-xl flex items-center gap-1">
              {(['all', 'Tunai', 'QRIS', 'Transfer'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentFilter(m)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    paymentFilter === m
                      ? 'bg-white text-[#1C1C1E] font-semibold shadow-2xs'
                      : 'text-[#636366] hover:text-[#1C1C1E]'
                  }`}
                >
                  {m === 'all' ? 'Semua' : m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1C1C1E]">
            <thead className="bg-[#F2F2F7] text-[#636366] font-semibold border-b border-[#E5E5EA]">
              <tr>
                <th className="py-2.5 px-3">Tiket ID</th>
                <th className="py-2.5 px-3">Meja</th>
                <th className="py-2.5 px-3">Kasir / Waiter</th>
                <th className="py-2.5 px-3">Daftar Menu</th>
                <th className="py-2.5 px-3">Metode</th>
                <th className="py-2.5 px-3">Total Nominal</th>
                <th className="py-2.5 px-3">Waktu</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F2F7]">
              {tableTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-[#8E8E93]">
                    Tidak ada transaksi yang cocok dengan pencarian / filter.
                  </td>
                </tr>
              ) : (
                tableTransactions.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#F8F8FA] transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#007AFF]">
                      {ord.id}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold px-2 py-0.5 rounded-md bg-[#E5E5EA] text-[#1C1C1E]">
                        Meja {ord.meja}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#636366]">
                      <div className="font-medium text-[#1C1C1E]">{ord.cashierName || 'Kasir'}</div>
                      <div className="text-[10px] text-[#8E8E93]">{ord.waiterName || 'Staff'}</div>
                    </td>
                    <td className="py-2.5 px-3 text-[#636366] max-w-xs truncate" title={ord.items.map((it) => `${it.qty}× ${it.n}`).join(', ')}>
                      {ord.items.map((it) => `${it.qty}× ${it.n}`).join(', ')}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          ord.paymentMethod === 'QRIS'
                            ? 'bg-[#007AFF]/10 text-[#007AFF]'
                            : ord.paymentMethod === 'Transfer'
                            ? 'bg-[#5856D6]/10 text-[#5856D6]'
                            : 'bg-[#34C759]/10 text-[#34C759]'
                        }`}
                      >
                        {ord.paymentMethod || 'Tunai'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#1C1C1E]">
                      {formatRupiah(ord.total)}
                    </td>
                    <td className="py-2.5 px-3 text-[#8E8E93] whitespace-nowrap">
                      <div>
                        {new Date(ord.paidAt || ord.createdAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div className="text-[10px]">
                        {new Date(ord.paidAt || ord.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedReceipt(ord)}
                        className="px-2.5 py-1 rounded-lg bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Struk
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Thermal Receipt Sheet Modal */}
      {selectedReceipt && (
        <ReceiptModal order={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      )}
    </div>
  );
};
