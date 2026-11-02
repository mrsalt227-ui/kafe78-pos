import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  Check,
  ChefHat,
  ChevronLeft,
  ClipboardList,
  Loader2,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { MenuItem, Order, formatRupiah } from '../../utils/pos';
import { BASE_PATH } from '../../lib/firebase';
import {
  CALL_REASON_LABEL,
  CLAIMS_PATH,
  CALLS_PATH,
  CustomerSettings,
  DEFAULT_CUSTOMER_SETTINGS,
  DiningTable,
  MENU_PATH,
  ORDERS_PATH,
  PaymentClaim,
  SESSIONS_PATH,
  TableSession,
  WaiterCall,
  WaiterCallReason,
  callWaiter,
  claimPayment,
  ensureOpenSession,
  findTableByToken,
  getSession,
  submitCustomerOrder,
  useRemoteList,
  useRemoteValue,
} from '../../lib/customerOrdering';

interface CustomerAppProps {
  token: string;
}

type ScreenState = 'loading' | 'invalid' | 'error' | 'ready';

interface CartEntry {
  qty: number;
  note?: string;
}

const STATUS_LABEL: Record<string, string> = {
  menunggu_approval: 'Menunggu konfirmasi kasir',
  dapur: 'Sedang disiapkan',
  siap_antar: 'Siap diantar',
  diantar: 'Sedang diantar',
  selesai: 'Selesai',
  ditolak: 'Ditolak kasir',
  dibatalkan: 'Dibatalkan',
};

const STATUS_TONE: Record<string, string> = {
  menunggu_approval: 'bg-[#FFF4E5] text-[#C76B00]',
  dapur: 'bg-[#FFF4E5] text-[#C76B00]',
  siap_antar: 'bg-[#EAF4FF] text-[#0066D6]',
  diantar: 'bg-[#EAF4FF] text-[#0066D6]',
  selesai: 'bg-[#E9F9EE] text-[#1B8A3D]',
  ditolak: 'bg-[#FFEBEB] text-[#C4271F]',
  dibatalkan: 'bg-[#F2F2F7] text-[#636366]',
};

export const CustomerApp: React.FC<CustomerAppProps> = ({ token }) => {
  const [screen, setScreen] = useState<ScreenState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [table, setTable] = useState<DiningTable | null>(null);
  const [session, setSession] = useState<TableSession | null>(null);

  const [tab, setTab] = useState<'menu' | 'orders' | 'bill'>('menu');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('Semua');
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [detailNote, setDetailNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<'QRIS' | 'Transfer' | null>(null);
  const [lastCallAt, setLastCallAt] = useState(0);
  const [now, setNow] = useState(Date.now());

  const cartKey = `kafe78_cart_${token}`;
  const sessionKey = `kafe78_customer_session_${token}`;

  const { items: menuItems } = useRemoteList<MenuItem>(MENU_PATH);
  const { items: allOrders } = useRemoteList<Order>(ORDERS_PATH);
  const { items: sessions } = useRemoteList<TableSession>(SESSIONS_PATH);
  const { items: calls } = useRemoteList<WaiterCall>(CALLS_PATH);
  const { items: claims } = useRemoteList<PaymentClaim>(CLAIMS_PATH);
  const settings = useRemoteValue<CustomerSettings>(
    `${BASE_PATH}/settings/customer`,
    DEFAULT_CUSTOMER_SETTINGS
  );

  const sessionOrders = useMemo(
    () =>
      session
        ? allOrders
            .filter((o) => o.sessionId === session.id)
            .sort((a, b) => b.createdAt - a.createdAt)
        : [],
    [allOrders, session]
  );

  const liveSession = session ? sessions.find((s) => s.id === session.id) : null;
  const isClosed = liveSession?.status === 'closed';

  const myCalls = session ? calls.filter((c) => c.sessionId === session.id) : [];
  const openCall = myCalls.find((c) => c.status === 'open');
  const myClaims = session ? claims.filter((c) => c.sessionId === session.id) : [];
  const pendingClaim = myClaims.find((c) => c.status === 'pending');

  const billTotal = sessionOrders
    .filter((o) => o.paymentStatus === 'unpaid' && o.status !== 'ditolak' && o.status !== 'dibatalkan')
    .reduce((sum, o) => sum + o.total, 0);

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, entry]) => {
          const item = menuItems.find((m) => m.id === id);
          return item ? { item, qty: entry.qty, note: entry.note } : null;
        })
        .filter(Boolean) as { item: MenuItem; qty: number; note?: string }[],
    [cart, menuItems]
  );

  const cartCount = cartLines.reduce((sum, l) => sum + l.qty, 0);
  const cartSubtotal = cartLines.reduce((sum, l) => sum + l.item.h * l.qty, 0);
  const cartTax = Math.round(cartSubtotal * 0.1);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(cartKey);
      if (raw) setCart(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [cartKey]);

  useEffect(() => {
    try {
      localStorage.setItem(cartKey, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart, cartKey]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const found = await findTableByToken(token);
        if (cancelled) return;
        if (!found) {
          setScreen('invalid');
          return;
        }
        setTable(found);

        const stored = localStorage.getItem(sessionKey);
        let active: TableSession | null = null;
        if (stored) {
          active = await getSession(stored);
        }
        if (!active || active.status !== 'open') {
          active = await ensureOpenSession(found);
        }
        if (cancelled) return;
        localStorage.setItem(sessionKey, active.id);
        setSession(active);
        setScreen('ready');
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : 'Gagal memuat meja.');
        setScreen('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, sessionKey]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((m) => set.add(m.category));
    return ['Semua', ...Array.from(set)];
  }, [menuItems]);

  const visibleMenu = menuItems
    .filter((m) => (category === 'Semua' ? true : m.category === category))
    .filter((m) => (search.trim() ? m.n.toLowerCase().includes(search.toLowerCase()) : true));

  const addToCart = (item: MenuItem, qty: number, note?: string) => {
    setCart((prev) => {
      const current = prev[item.id];
      return {
        ...prev,
        [item.id]: { qty: (current?.qty || 0) + qty, note: note || current?.note },
      };
    });
    setToast(`${item.n} ditambahkan ke keranjang`);
  };

  const changeQty = (id: string, delta: number) => {
    setCart((prev) => {
      const current = prev[id];
      if (!current) return prev;
      const qty = current.qty + delta;
      if (qty <= 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: { ...current, qty } };
    });
  };

  const handleSubmitOrder = async () => {
    if (!table || !session || cartLines.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      await submitCustomerOrder({
        table,
        session,
        approvalMode: settings.orderApprovalMode,
        lines: cartLines.map((l) => ({ id: l.item.id, qty: l.qty, note: l.note })),
      });
      setCart({});
      setCartOpen(false);
      setTab('orders');
      setToast(
        settings.orderApprovalMode === 'staff_approval'
          ? 'Pesanan terkirim, menunggu konfirmasi kasir'
          : 'Pesanan terkirim ke dapur'
      );
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Gagal mengirim pesanan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCallWaiter = async (reason: WaiterCallReason) => {
    if (!table || !session) return;
    if (openCall) {
      setToast('Panggilan sebelumnya masih diproses staf');
      return;
    }
    if (now - lastCallAt < 45000) {
      const wait = Math.ceil((45000 - (now - lastCallAt)) / 1000);
      setToast(`Tunggu ${wait} detik sebelum memanggil lagi`);
      return;
    }
    try {
      await callWaiter({ table, session, reason });
      setLastCallAt(Date.now());
      setToast('Staf sudah diberi tahu');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Gagal memanggil pelayan');
    }
  };

  const handleClaimPayment = async () => {
    if (!table || !session || !payMethod || billTotal <= 0) return;
    try {
      await claimPayment({ table, session, amount: billTotal, method: payMethod });
      setPayMethod(null);
      setToast('Klaim pembayaran dikirim, menunggu verifikasi kasir');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Gagal mengirim pembayaran');
    }
  };

  if (screen === 'loading') {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center gap-3 text-[#636366]">
        <Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" />
        <p className="text-sm">Menyiapkan menu…</p>
      </div>
    );
  }

  if (screen === 'invalid' || screen === 'error') {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#FFEBEB] text-[#FF3B30] flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-bold text-[#1C1C1E]">
          {screen === 'invalid' ? 'QR code tidak valid' : 'Gagal terhubung'}
        </h1>
        <p className="text-sm text-[#8E8E93] mt-2 max-w-xs">
          {screen === 'invalid'
            ? 'QR yang kamu scan tidak dikenali. Silakan panggil staf untuk dibantu.'
            : errorMsg}
        </p>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#E9F9EE] text-[#34C759] flex items-center justify-center mb-4">
          <Check className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-bold text-[#1C1C1E]">Sesi meja sudah ditutup</h1>
        <p className="text-sm text-[#8E8E93] mt-2 max-w-xs">
          Terima kasih sudah berkunjung. Scan ulang QR di meja untuk memulai pesanan baru.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-[#1C1C1E] flex flex-col pb-24 font-sans">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-[#E5E5EA] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1C1C1E] text-white flex items-center justify-center font-bold text-sm">
              78
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">Kafe 78</h1>
              <p className="text-[11px] text-[#8E8E93] leading-none mt-0.5">
                Pesan langsung dari meja
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#EAF4FF] text-[#0066D6] text-[11px] font-semibold">
            {table?.name}
          </span>
        </div>
      </header>

      <main className="flex-1">
        {tab === 'menu' && (
          <div className="px-4 pt-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#8E8E93] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari menu…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#E5E5EA] text-sm outline-none focus:border-[#007AFF]"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar py-3 -mx-4 px-4">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    category === c
                      ? 'bg-[#1C1C1E] text-white border-[#1C1C1E]'
                      : 'bg-white text-[#636366] border-[#E5E5EA]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {visibleMenu.map((item) => {
                const soldOut = item.stok <= 0;
                return (
                  <button
                    key={item.id}
                    disabled={soldOut}
                    onClick={() => {
                      setDetailItem(item);
                      setDetailQty(1);
                      setDetailNote('');
                    }}
                    className={`text-left bg-white rounded-2xl border border-[#E5E5EA] p-3 flex gap-3 items-center transition-all ${
                      soldOut ? 'opacity-50' : 'active:scale-[0.99]'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl bg-[#F2F2F7] flex items-center justify-center text-2xl shrink-0">
                      {item.icon || '🍽️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold truncate">{item.n}</p>
                        {item.stok <= 5 && !soldOut && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FFF4E5] text-[#C76B00] shrink-0">
                            sisa {item.stok}
                          </span>
                        )}
                        {soldOut && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F2F2F7] text-[#8E8E93] shrink-0">
                            habis
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#8E8E93] line-clamp-1 mt-0.5">
                        {item.description || item.category}
                      </p>
                      <p className="text-sm font-bold text-[#1C1C1E] mt-1">{formatRupiah(item.h)}</p>
                    </div>
                    <span className="w-8 h-8 rounded-full bg-[#007AFF] text-white flex items-center justify-center shrink-0">
                      <Plus className="w-4 h-4" />
                    </span>
                  </button>
                );
              })}
              {visibleMenu.length === 0 && (
                <p className="text-center text-sm text-[#8E8E93] py-10">Menu tidak ditemukan.</p>
              )}
            </div>
          </div>
        )}

        {tab === 'orders' && (
          <div className="px-4 pt-3 space-y-3">
            {sessionOrders.length === 0 && (
              <div className="text-center py-16">
                <ClipboardList className="w-8 h-8 text-[#C7C7CC] mx-auto mb-2" />
                <p className="text-sm text-[#8E8E93]">Belum ada pesanan.</p>
              </div>
            )}
            {sessionOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl border border-[#E5E5EA] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#636366]">{order.id}</p>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      STATUS_TONE[order.status] || 'bg-[#F2F2F7] text-[#636366]'
                    }`}
                  >
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {order.items.map((it, idx) => (
                    <div key={`${order.id}-${idx}`} className="flex justify-between text-xs">
                      <span className="text-[#3A3A3C]">
                        {it.qty}× {it.n}
                        {it.note ? <span className="text-[#8E8E93]"> · {it.note}</span> : null}
                      </span>
                      <span className="text-[#636366]">{formatRupiah(it.h * it.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#F2F2F7]">
                  <span className="text-[11px] text-[#8E8E93]">
                    {new Date(order.createdAt).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="text-sm font-bold">{formatRupiah(order.total)}</span>
                </div>
              </div>
            ))}

            <button
              onClick={() => handleCallWaiter('help')}
              disabled={!!openCall}
              className="w-full py-3 rounded-xl bg-white border border-[#E5E5EA] text-sm font-semibold text-[#007AFF] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <BellRing className="w-4 h-4" />
              {openCall ? 'Menunggu staf…' : 'Panggil Pelayan'}
            </button>
          </div>
        )}

        {tab === 'bill' && (
          <div className="px-4 pt-3 space-y-3">
            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-4">
              <p className="text-[11px] uppercase tracking-wide text-[#8E8E93] font-semibold">
                Tagihan berjalan
              </p>
              <p className="text-2xl font-bold mt-1">{formatRupiah(billTotal)}</p>
              <p className="text-[11px] text-[#8E8E93] mt-1">
                {sessionOrders.length} pesanan dalam sesi {table?.name}
              </p>
            </div>

            {pendingClaim && (
              <div className="bg-[#FFF4E5] rounded-2xl p-3 flex items-start gap-2">
                <Wallet className="w-4 h-4 text-[#C76B00] mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[#C76B00]">
                    Pembayaran {pendingClaim.method} menunggu verifikasi kasir
                  </p>
                  <p className="text-[11px] text-[#C76B00]/80 mt-0.5">
                    {formatRupiah(pendingClaim.amount)} · tunjukkan bukti bayar ke kasir
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-[#E5E5EA] divide-y divide-[#F2F2F7]">
              <button
                onClick={() => handleCallWaiter('bill')}
                disabled={!!openCall}
                className="w-full px-4 py-3 flex items-center justify-between text-sm disabled:opacity-50"
              >
                <span className="flex items-center gap-2 font-medium">
                  <BellRing className="w-4 h-4 text-[#007AFF]" /> Minta tagihan ke kasir
                </span>
                <span className="text-[#C7C7CC]">›</span>
              </button>
              <button
                onClick={() => handleCallWaiter('help')}
                disabled={!!openCall}
                className="w-full px-4 py-3 flex items-center justify-between text-sm disabled:opacity-50"
              >
                <span className="flex items-center gap-2 font-medium">
                  <BellRing className="w-4 h-4 text-[#007AFF]" /> Panggil pelayan
                </span>
                <span className="text-[#C7C7CC]">›</span>
              </button>
            </div>

            {settings.selfPaymentEnabled && billTotal > 0 && !pendingClaim && (
              <div className="bg-white rounded-2xl border border-[#E5E5EA] p-4 space-y-3">
                <p className="text-sm font-semibold">Bayar dari HP</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['QRIS', 'Transfer'] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => setPayMethod(method)}
                      className={`py-2.5 rounded-xl border text-sm font-medium ${
                        payMethod === method
                          ? 'border-[#007AFF] bg-[#EAF4FF] text-[#0066D6]'
                          : 'border-[#E5E5EA] bg-white text-[#3A3A3C]'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleClaimPayment}
                  disabled={!payMethod}
                  className="w-full py-3 rounded-xl bg-[#007AFF] text-white text-sm font-semibold disabled:opacity-40"
                >
                  Kirim klaim bayar {formatRupiah(billTotal)}
                </button>
                <p className="text-[10px] text-[#8E8E93]">
                  Pembayaran diverifikasi manual oleh kasir. Sesi meja tetap ditutup oleh staf.
                </p>
              </div>
            )}

            {!settings.selfPaymentEnabled && (
              <p className="text-[11px] text-[#8E8E93] text-center px-4">
                Pembayaran dilakukan di kasir. Tekan “Minta tagihan” agar staf datang ke meja.
              </p>
            )}
          </div>
        )}
      </main>

      {cartCount > 0 && tab === 'menu' && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-20 left-4 right-4 z-30 bg-[#1C1C1E] text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-lg"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ShoppingBag className="w-4 h-4" /> {cartCount} item
          </span>
          <span className="text-sm font-bold">
            {formatRupiah(cartSubtotal + cartTax)} · Lihat
          </span>
        </button>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-t border-[#E5E5EA]">
        <div className="flex">
          {[
            { id: 'menu' as const, label: 'Menu', Icon: ChefHat },
            { id: 'orders' as const, label: 'Pesanan', Icon: ClipboardList },
            { id: 'bill' as const, label: 'Tagihan', Icon: Wallet },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-2.5 flex flex-col items-center gap-1 text-[10px] font-medium ${
                tab === id ? 'text-[#007AFF]' : 'text-[#8E8E93]'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {detailItem && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-end" onClick={() => setDetailItem(null)}>
          <div
            className="w-full bg-white rounded-t-3xl p-4 pb-6 max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 rounded-2xl bg-[#F2F2F7] flex items-center justify-center text-3xl">
                {detailItem.icon || '🍽️'}
              </div>
              <div className="flex-1">
                <p className="text-base font-bold">{detailItem.n}</p>
                <p className="text-xs text-[#8E8E93] mt-0.5">{detailItem.description}</p>
                <p className="text-sm font-bold mt-1">{formatRupiah(detailItem.h)}</p>
              </div>
              <button onClick={() => setDetailItem(null)} className="p-1.5 text-[#8E8E93]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="block text-[11px] font-semibold text-[#8E8E93] uppercase mt-4">
              Catatan (opsional)
            </label>
            <input
              value={detailNote}
              onChange={(e) => setDetailNote(e.target.value)}
              placeholder="mis. tanpa gula, tidak pedas"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-[#E5E5EA] text-sm outline-none focus:border-[#007AFF]"
            />

            <div className="flex items-center justify-between mt-4">
              <span className="text-sm font-medium">Jumlah</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDetailQty((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-full bg-[#F2F2F7] flex items-center justify-center"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-6 text-center text-sm font-bold">{detailQty}</span>
                <button
                  onClick={() => setDetailQty((q) => Math.min(detailItem.stok, q + 1))}
                  className="w-9 h-9 rounded-full bg-[#F2F2F7] flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                addToCart(detailItem, detailQty, detailNote.trim() || undefined);
                setDetailItem(null);
              }}
              className="w-full mt-5 py-3 rounded-xl bg-[#007AFF] text-white text-sm font-semibold"
            >
              Tambah · {formatRupiah(detailItem.h * detailQty)}
            </button>
          </div>
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-end" onClick={() => setCartOpen(false)}>
          <div
            className="w-full bg-white rounded-t-3xl p-4 pb-6 max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-base font-bold">Keranjang</p>
              <button onClick={() => setCartOpen(false)} className="p-1.5 text-[#8E8E93]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {cartLines.map(({ item, qty, note }) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F2F2F7] flex items-center justify-center text-lg">
                    {item.icon || '🍽️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.n}</p>
                    <p className="text-[11px] text-[#8E8E93] truncate">
                      {formatRupiah(item.h)} {note ? `· ${note}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => changeQty(item.id, -1)}
                      className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center"
                    >
                      {qty === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    </button>
                    <span className="w-4 text-center text-xs font-bold">{qty}</span>
                    <button
                      onClick={() => changeQty(item.id, 1)}
                      className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-[#F2F2F7] space-y-1 text-sm">
              <div className="flex justify-between text-[#636366]">
                <span>Subtotal</span>
                <span>{formatRupiah(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between text-[#636366]">
                <span>Pajak 10%</span>
                <span>{formatRupiah(cartTax)}</span>
              </div>
              <div className="flex justify-between font-bold pt-1">
                <span>Total</span>
                <span>{formatRupiah(cartSubtotal + cartTax)}</span>
              </div>
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={submitting || cartLines.length === 0}
              className="w-full mt-4 py-3 rounded-xl bg-[#007AFF] text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Kirim Pesanan ke Dapur
            </button>
            <p className="text-[10px] text-[#8E8E93] text-center mt-2">
              Harga dan stok dicek ulang saat pesanan dikirim.
            </p>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#1C1C1E] text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg max-w-[90vw] text-center">
          {toast}
        </div>
      )}
    </div>
  );
};
