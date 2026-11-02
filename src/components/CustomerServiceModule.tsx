import React, { useMemo, useState } from 'react';
import {
  BellRing,
  Check,
  CheckCircle2,
  ChefHat,
  ClipboardCheck,
  Clock,
  Loader2,
  Utensils,
  Wallet,
  X,
} from 'lucide-react';
import { MenuItem, Order, formatRupiah } from '../utils/pos';
import {
  CALLS_PATH,
  CLAIMS_PATH,
  CALL_REASON_LABEL,
  PaymentClaim,
  WaiterCall,
  resolveWaiterCall,
  updateClaimStatus,
  useRemoteList,
} from '../lib/customerOrdering';

interface CustomerServiceModuleProps {
  orders: Order[];
  menu: MenuItem[];
  onApproveOrder: (orderId: string) => void;
  onRejectOrder: (orderId: string, reason: string) => void;
  onSettleSession: (sessionId: string) => void;
  soundEnabled: boolean;
}

type Tab = 'approval' | 'calls' | 'payments';

export const CustomerServiceModule: React.FC<CustomerServiceModuleProps> = ({
  orders,
  menu,
  onApproveOrder,
  onRejectOrder,
  onSettleSession,
}) => {
  const [tab, setTab] = useState<Tab>('approval');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { items: calls } = useRemoteList<WaiterCall>(CALLS_PATH);
  const { items: claims } = useRemoteList<PaymentClaim>(CLAIMS_PATH);

  const pendingApprovals = orders.filter((o) => o.status === 'menunggu_approval');
  const openCalls = calls.filter((c) => c.status === 'open');
  const pendingClaims = claims.filter((c) => c.status === 'pending');

  const tabs = useMemo(
    () => [
      { id: 'approval' as Tab, label: 'Persetujuan', count: pendingApprovals.length, Icon: ClipboardCheck },
      { id: 'calls' as Tab, label: 'Panggilan', count: openCalls.length, Icon: BellRing },
      { id: 'payments' as Tab, label: 'Pembayaran', count: pendingClaims.length, Icon: Wallet },
    ],
    [pendingApprovals.length, openCalls.length, pendingClaims.length]
  );

  const menuMap = useMemo(() => {
    const map = new Map<string, MenuItem>();
    menu.forEach((m) => map.set(m.id, m));
    return map;
  }, [menu]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl bg-[#EAF4FF] text-[#007AFF] flex items-center justify-center">
          <Utensils className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[#1C1C1E]">Pesanan Customer QR</h2>
          <p className="text-[11px] text-[#8E8E93]">Persetujuan, panggilan meja, dan klaim pembayaran</p>
        </div>
      </div>

      <div className="bg-[#E5E5EA] p-1 rounded-xl flex gap-1 mb-4">
        {tabs.map(({ id, label, count, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === id ? 'bg-white text-[#1C1C1E] font-semibold shadow-xs' : 'text-[#636366]'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${tab === id ? 'text-[#007AFF]' : 'text-[#8E8E93]'}`} />
            <span className="hidden sm:inline">{label}</span>
            {count > 0 && (
              <span
                className={`text-[10px] font-bold px-1.5 rounded-full min-w-4 text-center ${
                  tab === id ? 'bg-[#007AFF] text-white' : 'bg-[#8E8E93] text-white'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'approval' && (
        <div className="space-y-3">
          {pendingApprovals.length === 0 && (
            <div className="text-center py-14 bg-white rounded-2xl border border-[#E5E5EA]">
              <CheckCircle2 className="w-8 h-8 text-[#34C759] mx-auto mb-2" />
              <p className="text-sm text-[#8E8E93]">Tidak ada pesanan menunggu persetujuan.</p>
            </div>
          )}

          {pendingApprovals.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-[#E5E5EA] p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">
                    {order.meja} · <span className="font-mono text-xs text-[#636366]">{order.id}</span>
                  </p>
                  <p className="text-[11px] text-[#8E8E93] mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(order.createdAt).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {' · '}Customer QR
                  </p>
                </div>
                <span className="text-sm font-bold">{formatRupiah(order.total)}</span>
              </div>

              <div className="mt-2 space-y-1">
                {order.items.map((it, idx) => {
                  const menuItem = menuMap.get(it.id);
                  return (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-[#3A3A3C]">
                        {it.qty}× {it.n}
                        {it.note ? <span className="text-[#8E8E93]"> · {it.note}</span> : null}
                        {menuItem && menuItem.stok < it.qty && (
                          <span className="text-[#FF3B30]"> · stok {menuItem.stok}</span>
                        )}
                      </span>
                      <span className="text-[#636366]">{formatRupiah(it.h * it.qty)}</span>
                    </div>
                  );
                })}
              </div>

              {rejecting === order.id ? (
                <div className="mt-3 space-y-2">
                  <input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Alasan penolakan (opsional)"
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E5EA] text-xs outline-none focus:border-[#FF3B30]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onRejectOrder(order.id, rejectReason.trim());
                        setRejecting(null);
                        setRejectReason('');
                      }}
                      className="flex-1 py-2 rounded-lg bg-[#FF3B30] text-white text-xs font-semibold"
                    >
                      Tolak pesanan
                    </button>
                    <button
                      onClick={() => setRejecting(null)}
                      className="px-3 py-2 rounded-lg bg-[#F2F2F7] text-[#636366] text-xs font-semibold"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => onApproveOrder(order.id)}
                    className="flex-1 py-2 rounded-lg bg-[#34C759] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" /> Setujui & kirim ke dapur
                  </button>
                  <button
                    onClick={() => setRejecting(order.id)}
                    className="px-3 py-2 rounded-lg bg-[#FFEBEB] text-[#FF3B30] text-xs font-semibold"
                  >
                    Tolak
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'calls' && (
        <div className="space-y-2.5">
          {openCalls.length === 0 && (
            <div className="text-center py-14 bg-white rounded-2xl border border-[#E5E5EA]">
              <BellRing className="w-8 h-8 text-[#C7C7CC] mx-auto mb-2" />
              <p className="text-sm text-[#8E8E93]">Tidak ada panggilan aktif.</p>
            </div>
          )}

          {openCalls.map((call) => (
            <div
              key={call._key}
              className="bg-white rounded-2xl border border-[#FF9500]/30 p-3.5 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-[#FFF4E5] text-[#C76B00] flex items-center justify-center shrink-0">
                <BellRing className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{call.tableName}</p>
                <p className="text-[11px] text-[#8E8E93]">
                  {CALL_REASON_LABEL[call.reason]} ·{' '}
                  {new Date(call.createdAt).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                {call.note && <p className="text-[11px] text-[#636366] mt-0.5">“{call.note}”</p>}
              </div>
              <button
                onClick={() => resolveWaiterCall(call._key)}
                className="px-3 py-2 rounded-lg bg-[#E9F9EE] text-[#1B8A3D] text-xs font-semibold flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Selesai
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-2.5">
          {pendingClaims.length === 0 && (
            <div className="text-center py-14 bg-white rounded-2xl border border-[#E5E5EA]">
              <Wallet className="w-8 h-8 text-[#C7C7CC] mx-auto mb-2" />
              <p className="text-sm text-[#8E8E93]">Tidak ada klaim pembayaran.</p>
            </div>
          )}

          {pendingClaims.map((claim) => {
            const sessionOrders = orders.filter(
              (o) => o.sessionId === claim.sessionId && o.status !== 'ditolak'
            );
            return (
              <div key={claim._key} className="bg-white rounded-2xl border border-[#E5E5EA] p-3.5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold">{claim.tableName}</p>
                    <p className="text-[11px] text-[#8E8E93] mt-0.5">
                      {claim.method} · {sessionOrders.length} pesanan ·{' '}
                      {new Date(claim.createdAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <p className="text-sm font-bold">{formatRupiah(claim.amount)}</p>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={async () => {
                      await updateClaimStatus(claim._key, 'verified');
                      onSettleSession(claim.sessionId);
                    }}
                    className="flex-1 py-2 rounded-lg bg-[#34C759] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" /> Verifikasi & lunasi meja
                  </button>
                  <button
                    onClick={() => updateClaimStatus(claim._key, 'rejected')}
                    className="px-3 py-2 rounded-lg bg-[#FFEBEB] text-[#FF3B30] text-xs font-semibold flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Tolak
                  </button>
                </div>
              </div>
            );
          })}

          <div className="mt-4 bg-white rounded-2xl border border-[#E5E5EA] p-3.5">
            <p className="text-xs font-semibold text-[#3A3A3C] mb-2 flex items-center gap-1.5">
              <ChefHat className="w-3.5 h-3.5 text-[#8E8E93]" /> Tutup meja tanpa klaim (bayar di kasir)
            </p>
            <div className="space-y-2">
              {Array.from(new Set(orders.filter((o) => o.sessionId && o.paymentStatus === 'unpaid').map((o) => o.sessionId as string))).map(
                (sessionId) => {
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
                }
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
