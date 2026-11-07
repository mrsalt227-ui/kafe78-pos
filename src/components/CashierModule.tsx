import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  CreditCard, 
  QrCode, 
  Banknote, 
  CheckCircle2, 
  Percent, 
  Copy,
  Printer,
  Wallet,
  Check,
  X,
} from 'lucide-react';
import { Order, formatRupiah, calculateChange } from '../utils/pos';
import { soundEffects } from '../utils/audio';
import {
  CLAIMS_PATH,
  PaymentClaim,
  updateClaimStatus,
  useRemoteList,
} from '../lib/customerOrdering';

interface CashierModuleProps {
  orders: Order[];
  onProcessPayment: (
    orderId: string,
    method: 'Tunai' | 'QRIS' | 'Transfer',
    cashGiven: number,
    change: number,
    discountAmount: number
  ) => void;
  onSettleSession: (sessionId: string) => void;
  soundEnabled: boolean;
}

export const CashierModule: React.FC<CashierModuleProps> = ({
  orders,
  onProcessPayment,
  onSettleSession,
  soundEnabled,
}) => {
  const { items: claims } = useRemoteList<PaymentClaim>(CLAIMS_PATH);
  const pendingClaims = claims.filter((c) => c.status === 'pending');
  const unpaidOrders = useMemo(() => {
    // Hanya tampilkan tagihan untuk pesanan yang sudah diantar (atau selesai).
    // Pesanan yang masih menunggu approval/di dapur/siap antar belum boleh
    // ditagih di kasir.
    return orders.filter(
      (o) => o.paymentStatus === 'unpaid' && (o.status === 'diantar' || o.status === 'selesai')
    );
  }, [orders]);

  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    unpaidOrders[0]?.id || ''
  );
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'QRIS' | 'Transfer'>('Tunai');
  const [cashInput, setCashInput] = useState<number>(0);
  const [copiedBank, setCopiedBank] = useState<string | null>(null);

  const activeOrder = unpaidOrders.find((o) => o.id === selectedOrderId) || unpaidOrders[0];

  const subtotal = activeOrder?.subtotal || 0;
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const taxable = Math.max(0, subtotal - discountAmount);
  const tax = Math.round(taxable * 0.1);
  const grandTotal = taxable + tax;

  const change = calculateChange(grandTotal, cashInput);
  const isCashSufficient = cashInput >= grandTotal;

  const handleSelectOrder = (id: string) => {
    setSelectedOrderId(id);
    setDiscountPercent(0);
    const target = unpaidOrders.find((o) => o.id === id);
    if (target) {
      setCashInput(target.total);
    }
  };

  const handleQuickCash = (amount: number) => {
    if (soundEnabled) soundEffects.tap();
    setCashInput(amount);
  };

  const handlePay = () => {
    if (!activeOrder) return;
    if (paymentMethod === 'Tunai' && !isCashSufficient) {
      if (soundEnabled) soundEffects.alert();
      return;
    }

    if (soundEnabled) soundEffects.cash();
    onProcessPayment(
      activeOrder.id,
      paymentMethod,
      paymentMethod === 'Tunai' ? cashInput : grandTotal,
      paymentMethod === 'Tunai' ? change : 0,
      discountAmount
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedBank(label);
    setTimeout(() => setCopiedBank(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E5E5EA] rounded-2xl p-4 shadow-2xs">
        <div>
          <h2 className="font-bold text-base text-[#1C1C1E]">
            Kasir & Pembayaran
          </h2>
          <p className="text-xs text-[#8E8E93]">
            {unpaidOrders.length} tagihan meja yang belum diselesaikan
          </p>
        </div>
      </div>

      {/* Klaim Pembayaran Online (dari Customer QR) */}
      {pendingClaims.length > 0 && (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 shadow-2xs space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#EAF4FF] text-[#007AFF] flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-[#1C1C1E]">Klaim Pembayaran Online</h3>
              <p className="text-[11px] text-[#8E8E93]">
                {pendingClaims.length} klaim menunggu verifikasi
              </p>
            </div>
          </div>

          {pendingClaims.map((claim) => {
            const sessionOrders = orders.filter(
              (o) => o.sessionId === claim.sessionId && o.status !== 'ditolak'
            );
            return (
              <div key={claim._key} className="bg-[#F2F2F7] rounded-xl p-3 border border-[#E5E5EA]/60">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#1C1C1E]">{claim.tableName}</p>
                    <p className="text-[10px] text-[#8E8E93] mt-0.5">
                      {claim.method} · {sessionOrders.length} pesanan ·{' '}
                      {new Date(claim.createdAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <p className="text-xs font-bold text-[#1C1C1E]">{formatRupiah(claim.amount)}</p>
                </div>
                <div className="flex gap-2 mt-2.5">
                  <button
                    onClick={async () => {
                      if (soundEnabled) soundEffects.cash();
                      await updateClaimStatus(claim._key, 'verified');
                      onSettleSession(claim.sessionId);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-[#34C759] text-white text-[11px] font-semibold flex items-center justify-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Verifikasi & lunasi meja
                  </button>
                  <button
                    onClick={() => updateClaimStatus(claim._key, 'rejected')}
                    className="px-3 py-1.5 rounded-lg bg-[#FFEBEB] text-[#FF3B30] text-[11px] font-semibold flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Tolak
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tutup sesi meja Customer QR tanpa klaim online (bayar langsung di kasir).
          Hanya muncul kalau SEMUA pesanan aktif di sesi itu sudah diantar/selesai. */}
      {(() => {
        const unpaidSessionIds = Array.from(
          new Set(
            orders
              .filter((o) => o.sessionId && o.paymentStatus === 'unpaid')
              .map((o) => o.sessionId as string)
          )
        );
        const readySessionIds = unpaidSessionIds.filter((sessionId) => {
          const sessionOrders = orders.filter(
            (o) => o.sessionId === sessionId && o.status !== 'ditolak' && o.status !== 'dibatalkan'
          );
          return (
            sessionOrders.length > 0 &&
            sessionOrders.every((o) => o.status === 'diantar' || o.status === 'selesai')
          );
        });
        return readySessionIds.length > 0 && (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 shadow-2xs space-y-2">
          <p className="text-xs font-semibold text-[#3A3A3C] flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-[#8E8E93]" /> Tutup sesi meja QR (bayar di kasir)
          </p>
          <div className="space-y-2">
            {readySessionIds.map((sessionId) => {
              const sessionOrders = orders.filter((o) => o.sessionId === sessionId);
              const total = sessionOrders
                .filter((o) => o.status !== 'ditolak')
                .reduce((sum, o) => sum + o.total, 0);
              return (
                <div key={sessionId} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[#3A3A3C]">
                    {sessionOrders[0]?.meja || 'Meja'} · {formatRupiah(total)}
                  </span>
                  <button
                    onClick={() => onSettleSession(sessionId)}
                    className="px-3 py-1.5 rounded-lg bg-[#F2F2F7] text-[#1C1C1E] text-[11px] font-semibold"
                  >
                    Lunasi & tutup
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        );
      })()}

      {unpaidOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E5EA] p-12 text-center text-[#8E8E93] space-y-2">
          <CheckCircle2 className="w-10 h-10 mx-auto text-[#34C759]" />
          <h3 className="font-bold text-sm text-[#1C1C1E]">Semua Tagihan Telah Lunas</h3>
          <p className="text-xs text-[#8E8E93] max-w-sm mx-auto">
            Tidak ada pesanan yang menunggu pembayaran saat ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Unpaid Tables List */}
          <div className="lg:col-span-4 space-y-2.5">
            <div className="px-1">
              <span className="font-semibold text-xs text-[#8E8E93] uppercase tracking-wider">
                Daftar Meja Belum Lunas
              </span>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {unpaidOrders.map((ord) => {
                const isSelected = activeOrder?.id === ord.id;
                return (
                  <button
                    key={ord.id}
                    onClick={() => handleSelectOrder(ord.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-white border-[#007AFF] shadow-xs ring-1 ring-[#007AFF]/20'
                        : 'bg-white border-[#E5E5EA] hover:border-[#D1D1D6]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-[#F2F2F7] text-[#1C1C1E] font-bold font-mono text-xs flex items-center justify-center">
                          {ord.meja}
                        </span>
                        <div>
                          <div className="font-semibold text-xs text-[#1C1C1E]">Meja {ord.meja}</div>
                          <div className="text-[10px] text-[#8E8E93] font-mono">{ord.id}</div>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-semibold text-[#1C1C1E]">
                        {formatRupiah(ord.total)}
                      </span>
                    </div>

                    <div className="text-xs text-[#636366] truncate">
                      {ord.items.map((it) => `${it.qty}× ${it.n}`).join(', ')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Cash Register Checkout Desk */}
          <div className="lg:col-span-8 bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-2xs space-y-4">
            {activeOrder && (
              <>
                <div className="flex items-center justify-between border-b border-[#F2F2F7] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-[#1C1C1E] text-white font-mono font-bold text-sm flex items-center justify-center">
                      {activeOrder.meja}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-[#1C1C1E]">
                        Tagihan Meja {activeOrder.meja}
                      </h3>
                      <p className="text-[11px] text-[#8E8E93] font-mono">
                        {activeOrder.id} · Pelayan: {activeOrder.waiterName || 'Staf'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[#FF9500] px-2.5 py-0.5 rounded-full bg-[#FFF2DE]">
                    Belum Dibayar
                  </span>
                </div>

                {/* Ordered Items Table */}
                <div className="bg-[#F2F2F7] rounded-xl p-3 border border-[#E5E5EA]/60 space-y-1.5 max-h-[160px] overflow-y-auto">
                  {activeOrder.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs text-[#1C1C1E]">
                      <div>
                        <span className="font-medium">{it.qty}× {it.n}</span>
                        {it.note && <span className="text-[10px] text-[#FF9500] ml-1.5">({it.note})</span>}
                      </div>
                      <span className="font-mono text-[#636366]">{formatRupiah(it.h * it.qty)}</span>
                    </div>
                  ))}
                </div>

                {/* Promo Discount Segmented Control */}
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-[#636366]">Diskon Promosi:</span>
                  <div className="bg-[#E5E5EA] p-1 rounded-xl flex items-center gap-1">
                    {[0, 5, 10, 15, 20].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setDiscountPercent(pct)}
                        className={`flex-1 py-1 rounded-lg text-xs font-medium transition-all ${
                          discountPercent === pct
                            ? 'bg-white text-[#1C1C1E] font-semibold shadow-xs'
                            : 'text-[#636366] hover:text-[#1C1C1E]'
                        }`}
                      >
                        {pct === 0 ? '0%' : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Method Segmented Control */}
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-[#636366]">Metode Pembayaran:</span>
                  <div className="bg-[#E5E5EA] p-1 rounded-xl flex items-center gap-1">
                    {(['Tunai', 'QRIS', 'Transfer'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setPaymentMethod(m)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          paymentMethod === m
                            ? 'bg-white text-[#007AFF] font-semibold shadow-xs'
                            : 'text-[#636366] hover:text-[#1C1C1E]'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cash Method Input */}
                {paymentMethod === 'Tunai' && (
                  <div className="bg-[#F2F2F7] rounded-xl p-3.5 border border-[#E5E5EA]/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#636366]">Uang Diterima:</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleQuickCash(grandTotal)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#D1D1D6] text-xs font-medium text-[#1C1C1E] hover:bg-slate-50"
                        >
                          Uang Pas
                        </button>
                        {[50000, 100000, 200000].map((amt) => (
                          <button
                            key={amt}
                            onClick={() => handleQuickCash(amt)}
                            className="px-2.5 py-1 rounded-lg bg-white border border-[#D1D1D6] text-xs font-medium text-[#1C1C1E] hover:bg-slate-50 font-mono"
                          >
                            {amt / 1000}k
                          </button>
                        ))}
                      </div>
                    </div>

                    <input
                      type="number"
                      value={cashInput || ''}
                      onChange={(e) => setCashInput(Number(e.target.value) || 0)}
                      placeholder="Nominal tunai..."
                      className="w-full bg-white border border-[#D1D1D6] rounded-xl px-3 py-2 text-sm text-[#1C1C1E] font-mono focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
                    />

                    <div className="flex justify-between items-center text-xs pt-1 border-t border-[#E5E5EA]">
                      <span className="text-[#636366]">Kembalian:</span>
                      <span
                        className={`font-mono font-bold text-sm ${
                          isCashSufficient ? 'text-[#34C759]' : 'text-[#FF3B30]'
                        }`}
                      >
                        {isCashSufficient
                          ? formatRupiah(change)
                          : `Kurang ${formatRupiah(grandTotal - cashInput)}`}
                      </span>
                    </div>
                  </div>
                )}

                {/* QRIS Method Display */}
                {paymentMethod === 'QRIS' && (
                  <div className="bg-[#F2F2F7] rounded-xl p-4 text-center border border-[#E5E5EA]/60 space-y-2">
                    <div className="w-32 h-32 mx-auto bg-white p-2 rounded-xl border border-[#D1D1D6] flex items-center justify-center shadow-xs">
                      <QrCode className="w-24 h-24 text-[#1C1C1E]" />
                    </div>
                    <p className="text-xs font-medium text-[#1C1C1E]">
                      Pindai QRIS Kafe 78 dengan BCA, GoPay, OVO, atau ShopeePay
                    </p>
                  </div>
                )}

                {/* Bank Transfer Display */}
                {paymentMethod === 'Transfer' && (
                  <div className="bg-[#F2F2F7] rounded-xl p-3 border border-[#E5E5EA]/60 space-y-2 text-xs">
                    <div className="flex justify-between items-center p-2 bg-white rounded-lg border border-[#E5E5EA]">
                      <span><b className="text-[#007AFF]">BCA:</b> 788-019-2819</span>
                      <button
                        onClick={() => copyToClipboard('7880192819', 'BCA')}
                        className="text-[11px] text-[#007AFF] hover:underline"
                      >
                        {copiedBank === 'BCA' ? 'Tersalin' : 'Salin'}
                      </button>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-white rounded-lg border border-[#E5E5EA]">
                      <span><b className="text-[#FF9500]">Mandiri:</b> 137-00-887788-1</span>
                      <button
                        onClick={() => copyToClipboard('137008877881', 'Mandiri')}
                        className="text-[11px] text-[#007AFF] hover:underline"
                      >
                        {copiedBank === 'Mandiri' ? 'Tersalin' : 'Salin'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Calculations */}
                <div className="border-t border-[#F2F2F7] pt-2.5 space-y-1 text-xs">
                  <div className="flex justify-between text-[#636366]">
                    <span>Subtotal</span>
                    <span className="font-mono text-[#1C1C1E]">{formatRupiah(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-[#34C759]">
                      <span>Diskon ({discountPercent}%)</span>
                      <span className="font-mono">-{formatRupiah(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#636366]">
                    <span>PB1 (Pajak 10%)</span>
                    <span className="font-mono text-[#1C1C1E]">{formatRupiah(tax)}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-[#F2F2F7] font-bold text-[#1C1C1E]">
                    <span className="text-sm">TOTAL</span>
                    <span className="font-mono text-xl text-[#007AFF]">
                      {formatRupiah(grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Selesaikan Pembayaran Button */}
                <button
                  onClick={handlePay}
                  disabled={paymentMethod === 'Tunai' && !isCashSufficient}
                  className={`w-full py-3.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                    paymentMethod === 'Tunai' && !isCashSufficient
                      ? 'bg-[#E5E5EA] text-[#8E8E93] cursor-not-allowed'
                      : 'bg-[#007AFF] hover:bg-[#0062CC] text-white'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  Selesaikan Pembayaran & Cetak Struk (Meja {activeOrder.meja})
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
