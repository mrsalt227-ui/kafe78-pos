import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { Navigation, NavView } from './components/Navigation';
import { WaiterModule } from './components/WaiterModule';
import { KitchenModule } from './components/KitchenModule';
import { AntarModule } from './components/AntarModule';
import { CashierModule } from './components/CashierModule';
import { StockModule } from './components/StockModule';
import { ReportModule } from './components/ReportModule';
import { OwnerModule } from './components/OwnerModule';
import { ChatDrawer } from './components/ChatDrawer';
import { PinModal } from './components/PinModal';
import { ReceiptModal } from './components/ReceiptModal';
import { LoginScreen } from './components/LoginScreen';
import { CloudSyncModal } from './components/CloudSyncModal';
import { CustomerServiceModule } from './components/CustomerServiceModule';
import { TablesQrModule } from './components/TablesQrModule';
import {
  INITIAL_MENU,
  INITIAL_BATCHES,
  INITIAL_ORDERS,
  INITIAL_COMPLETED_ORDERS,
  INITIAL_CHAT_MESSAGES,
  ROLE_CONFIGS,
  RoleType,
  ChatMessage,
} from './data/seedData';
import { MenuItem, Order, StockBatch, CartItem, deductFifoStock } from './utils/pos';
import { useCloudState, useCloudStatus } from './hooks/useCloudState';
import {
  CALLS_PATH,
  CLAIMS_PATH,
  CustomerSettings,
  DEFAULT_CUSTOMER_SETTINGS,
  PaymentClaim,
  WaiterCall,
  closeSession,
  ensureTablesSeeded,
  pushOrderAtomic,
  useRemoteList,
} from './lib/customerOrdering';

const DEFAULT_PINS: Record<RoleType, string> = ROLE_CONFIGS.reduce(
  (acc, r) => ({ ...acc, [r.key]: r.defaultPin }),
  {} as Record<RoleType, string>
);

export default function App() {
  // Realtime sync: Firebase RTDB (servers/78) with localStorage cache fallback
  const [menu, setMenu] = useCloudState<MenuItem[]>('kafe78_menu', 'master_menu', INITIAL_MENU);
  const [orders, setOrders] = useCloudState<Order[]>('kafe78_orders', 'orders', INITIAL_ORDERS, []);
  const [completedOrders, setCompletedOrders] = useCloudState<Order[]>(
    'kafe78_completed',
    'laporan',
    INITIAL_COMPLETED_ORDERS,
    []
  );
  const [batches, setBatches] = useCloudState<StockBatch[]>('kafe78_batches', 'stok_fifo', INITIAL_BATCHES, []);
  const [stokMode, setStokMode] = useCloudState<'fifo' | 'atomic'>(
    'kafe78_stok_mode',
    'settings/stok_mode',
    'fifo'
  );
  const [pins, setPins] = useCloudState<Record<RoleType, string>>('kafe78_pins', 'settings/pins', DEFAULT_PINS);
  const [chatMessages, setChatMessages] = useCloudState<ChatMessage[]>(
    'kafe78_chat',
    'chat',
    INITIAL_CHAT_MESSAGES,
    []
  );

  const [customerSettings, setCustomerSettings] = useCloudState<CustomerSettings>(
    'kafe78_customer_settings',
    'settings/customer',
    DEFAULT_CUSTOMER_SETTINGS
  );

  const { status: cloudStatus } = useCloudStatus();
  const [isCloudOpen, setIsCloudOpen] = useState(false);
  const { items: waiterCalls } = useRemoteList<WaiterCall>(CALLS_PATH);
  const { items: paymentClaims } = useRemoteList<PaymentClaim>(CLAIMS_PATH);

  useEffect(() => {
    ensureTablesSeeded().catch(() => undefined);
  }, []);

  // Authentication & Session (like the original repo)
  const [currentRole, setCurrentRole] = useState<RoleType | null>(() => {
    try {
      const saved = localStorage.getItem('kafe78_session');
      return (saved as RoleType) || null;
    } catch {
      return null;
    }
  });

  // Current active view
  const [currentView, setCurrentView] = useState<NavView>('waiter');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [receiptModalOrder, setReceiptModalOrder] = useState<Order | null>(null);

  // Session disimpan per perangkat (tidak ikut disinkronkan ke cloud)
  useEffect(() => {
    if (currentRole) {
      localStorage.setItem('kafe78_session', currentRole);
    } else {
      localStorage.removeItem('kafe78_session');
    }
  }, [currentRole]);

  // Set default view on login based on role
  const handleLoginSuccess = (role: RoleType) => {
    setCurrentRole(role);
    if (role === 'waiter') setCurrentView('waiter');
    else if (role === 'dapur') setCurrentView('dapur');
    else if (role === 'antar') setCurrentView('antar');
    else if (role === 'kasir') setCurrentView('kasir');
    else if (role === 'stok') setCurrentView('stok');
    else if (role === 'laporan') setCurrentView('laporan');
    else if (role === 'owner') setCurrentView('waiter');
  };

  const handleLogout = () => {
    setCurrentRole(null);
    localStorage.removeItem('kafe78_session');
  };

  // Derived counts
  const occupiedTables = useMemo(() => {
    const list: string[] = [];
    orders.forEach((o) => {
      if (o.status !== 'selesai' && !list.includes(o.meja)) {
        list.push(o.meja);
      }
    });
    return list;
  }, [orders]);

  const navCounts = useMemo(() => {
    const pendingApprovals = orders.filter((o) => o.status === 'menunggu_approval').length;
    const openCalls = waiterCalls.filter((c) => c.status === 'open').length;
    const pendingClaims = paymentClaims.filter((c) => c.status === 'pending').length;
    return {
      dapur: orders.filter((o) => o.status === 'dapur').length,
      antar: orders.filter((o) => o.status === 'siap_antar').length,
      kasir: orders.filter((o) => o.paymentStatus === 'unpaid').length,
      stokMenipis: menu.filter((m) => m.stok <= 15).length,
      layanan: pendingApprovals + openCalls + pendingClaims,
    };
  }, [orders, menu, waiterCalls, paymentClaims]);

  // Handlers: Waiter Sends Order
  const handleSendOrder = (table: string, cartItems: CartItem[]) => {
    const subtotal = cartItems.reduce((sum, it) => sum + it.h * it.qty, 0);
    const tax = Math.round(subtotal * 0.1);
    const total = subtotal + tax;

    const newOrder: Order = {
      id: `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      meja: table,
      items: cartItems.map((c) => ({
        id: c.id,
        n: c.n,
        h: c.h,
        qty: c.qty,
        note: c.note,
        done: false,
      })),
      subtotal,
      discount: 0,
      tax,
      total,
      createdAt: Date.now(),
      status: 'dapur',
      paymentStatus: 'unpaid',
      waiterName: `${currentRole === 'waiter' ? 'Waiter' : 'Staf Kafe 78'}`,
    };

    // Deduct stock
    setMenu((prevMenu) => {
      return prevMenu.map((m) => {
        const cartItem = cartItems.find((ci) => ci.id === m.id);
        if (cartItem) {
          return {
            ...m,
            stok: Math.max(0, m.stok - cartItem.qty),
          };
        }
        return m;
      });
    });

    // Deduct batches if in FIFO mode
    if (stokMode === 'fifo') {
      setBatches((prevBatches) => {
        let current = [...prevBatches];
        cartItems.forEach((ci) => {
          const menuBatches = current.filter((b) => b.menuId === ci.id);
          const otherBatches = current.filter((b) => b.menuId !== ci.id);
          const { remainingBatches } = deductFifoStock(menuBatches, ci.qty);
          current = [...otherBatches, ...remainingBatches];
        });
        return current;
      });
    }

    // Update UI lokal langsung (responsif), lalu tulis ke Firebase secara
    // atomic supaya aman walau ada order lain (misal dari Customer QR)
    // masuk di waktu yang nyaris bersamaan.
    setOrders((prev) => [newOrder, ...prev]);
    pushOrderAtomic(newOrder).catch((err) => {
      console.warn('[order] gagal menyimpan order waiter ke cloud:', err?.message);
    });

    // Push system chat
    setChatMessages((prev) => [
      ...prev,
      {
        id: `chat-${Date.now()}`,
        sender: 'Sistem POS',
        role: 'system',
        channel: 'dapur',
        text: `Pesanan baru Meja ${table} (${cartItems.length} menu) masuk antrean dapur!`,
        timestamp: Date.now(),
      },
    ]);
  };

  // Handlers: Kitchen
  const handleMarkReady = (orderId: string) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return { ...ord, status: 'siap_antar' };
        }
        return ord;
      })
    );

    const targetOrder = orders.find((o) => o.id === orderId);
    if (targetOrder) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `chat-${Date.now()}`,
          sender: 'Dapur 78',
          role: 'dapur',
          channel: 'waiter-antar',
          text: `Pesanan Meja ${targetOrder.meja} (${targetOrder.id}) telah matang dan siap diambil di counter!`,
          timestamp: Date.now(),
        },
      ]);
    }
  };

  const handleToggleItemDone = (orderId: string, itemIdx: number) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const nextItems = [...ord.items];
          nextItems[itemIdx] = {
            ...nextItems[itemIdx],
            done: !nextItems[itemIdx].done,
          };
          return { ...ord, items: nextItems };
        }
        return ord;
      })
    );
  };

  // Handlers: Antar
  const handleMarkDelivered = (orderId: string) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return { ...ord, status: 'diantar' };
        }
        return ord;
      })
    );
  };

  // Handlers: Kasir / Payment
  const handleProcessPayment = (
    orderId: string,
    method: 'Tunai' | 'QRIS' | 'Transfer',
    cashGiven: number,
    change: number,
    discountAmount: number
  ) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    const paidOrder: Order = {
      ...target,
      discount: discountAmount,
      total: Math.max(0, target.subtotal - discountAmount + Math.round((target.subtotal - discountAmount) * 0.1)),
      status: 'selesai',
      paymentStatus: 'paid',
      paymentMethod: method,
      cashGiven,
      change,
      paidAt: Date.now(),
      cashierName: `${currentRole === 'kasir' ? 'Kasir 78' : 'Kasir Staf'}`,
    };

    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    setCompletedOrders((prev) => [paidOrder, ...prev]);
    setReceiptModalOrder(paidOrder);

    setChatMessages((prev) => [
      ...prev,
      {
        id: `chat-${Date.now()}`,
        sender: 'Kasir 78',
        role: 'kasir',
        channel: 'kasir',
        text: `Pembayaran Meja ${target.meja} (${paidOrder.id}) senilai ${paidOrder.total.toLocaleString(
          'id-ID'
        )} via ${method} telah berhasil dilunasi.`,
        timestamp: Date.now(),
      },
    ]);
  };

  // Handlers: Customer QR orders
  const handleApproveCustomerOrder = (orderId: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    setMenu((prevMenu) =>
      prevMenu.map((m) => {
        const line = target.items.find((it) => it.id === m.id);
        return line ? { ...m, stok: Math.max(0, m.stok - line.qty) } : m;
      })
    );

    if (stokMode === 'fifo') {
      setBatches((prevBatches) => {
        let current = [...prevBatches];
        target.items.forEach((line) => {
          const menuBatches = current.filter((b) => b.menuId === line.id);
          const otherBatches = current.filter((b) => b.menuId !== line.id);
          const { remainingBatches } = deductFifoStock(menuBatches, line.qty);
          current = [...otherBatches, ...remainingBatches];
        });
        return current;
      });
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'dapur' as const } : o))
    );

    setChatMessages((prev) => [
      ...prev,
      {
        id: `chat-${Date.now()}`,
        sender: 'Kasir 78',
        role: 'kasir',
        channel: 'dapur',
        text: `Pesanan customer ${target.meja} (${target.id}) disetujui dan diteruskan ke dapur.`,
        timestamp: Date.now(),
      },
    ]);
  };

  const handleRejectCustomerOrder = (orderId: string, reason: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: 'ditolak' as const, rejectionReason: reason || undefined }
          : o
      )
    );
  };

  const handleSettleSession = (sessionId: string) => {
    const sessionOrders = orders.filter(
      (o) => o.sessionId === sessionId && o.status !== 'ditolak' && o.status !== 'dibatalkan'
    );

    if (sessionOrders.length > 0) {
      const paidOrders: Order[] = sessionOrders.map((o) => ({
        ...o,
        status: 'selesai',
        paymentStatus: 'paid',
        paidAt: Date.now(),
        cashierName: 'Kasir 78',
      }));
      setCompletedOrders((prev) => [...paidOrders, ...prev]);
      setOrders((prev) => prev.filter((o) => o.sessionId !== sessionId));
    } else {
      setOrders((prev) => prev.filter((o) => o.sessionId !== sessionId));
    }

    closeSession(sessionId).catch((err) => {
      console.warn('Gagal menutup sesi:', err);
    });
  };

  // Handlers: Stock
  const handleAddStockBatch = (menuId: string, qty: number, costPrice: number) => {
    const newBatch: StockBatch = {
      id: `sb-${Date.now()}`,
      menuId,
      qty,
      costPrice,
      dateIn: Date.now(),
    };
    setBatches((prev) => [newBatch, ...prev]);
    setMenu((prev) =>
      prev.map((m) => (m.id === menuId ? { ...m, stok: m.stok + qty } : m))
    );
  };

  const handleUpdateMenuStockDirect = (menuId: string, newStock: number) => {
    setMenu((prev) =>
      prev.map((m) => (m.id === menuId ? { ...m, stok: newStock } : m))
    );
  };

  // Handlers: Owner
  const handleAddMenuItem = (item: Omit<MenuItem, 'id'>) => {
    const newItem: MenuItem = {
      ...item,
      id: `m-${Date.now()}`,
    };
    setMenu((prev) => [...prev, newItem]);
  };

  const handleEditMenuItem = (item: MenuItem) => {
    setMenu((prev) => prev.map((m) => (m.id === item.id ? item : m)));
  };

  const handleDeleteMenuItem = (id: string) => {
    setMenu((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdatePin = (role: RoleType, newPin: string) => {
    setPins((prev) => ({ ...prev, [role]: newPin }));
  };

  const handleResetDemoData = () => {
    setMenu(INITIAL_MENU);
    setOrders(INITIAL_ORDERS);
    setCompletedOrders(INITIAL_COMPLETED_ORDERS);
    setBatches(INITIAL_BATCHES);
    setStokMode('fifo');
    setPins(DEFAULT_PINS);
    setChatMessages(INITIAL_CHAT_MESSAGES);
    setCurrentRole('owner');
    setCurrentView('waiter');
  };

  // If not logged in, show genuine 6-digit PIN screen
  if (!currentRole) {
    return (
      <LoginScreen
        onSuccessLogin={handleLoginSuccess}
        pins={pins}
        soundEnabled={soundEnabled}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-[#1C1C1E] flex flex-col font-sans selection:bg-[#007AFF] selection:text-white pb-16">
      {/* Top Header */}
      <Header
        currentRole={currentRole}
        onOpenPinModal={() => setIsPinModalOpen(true)}
        onLogout={handleLogout}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((v) => !v)}
        onToggleChat={() => setIsChatOpen((v) => !v)}
        unreadChatCount={chatMessages.length > 3 ? 2 : 0}
        activeTablesCount={occupiedTables.length}
        totalTables={12}
        stokMode={stokMode}
        cloudStatus={cloudStatus}
        onOpenCloud={() => setIsCloudOpen(true)}
      />

      {/* Navigation Bar (Role filtered) */}
      <Navigation
        currentView={currentView}
        onSelectView={(v) => setCurrentView(v)}
        currentRole={currentRole}
        counts={navCounts}
      />

      {/* Main View Display */}
      <main className="flex-1 w-full">
        {currentView === 'waiter' && (
          <WaiterModule
            menu={menu}
            onSendOrder={handleSendOrder}
            soundEnabled={soundEnabled}
            occupiedTables={occupiedTables}
          />
        )}

        {currentView === 'dapur' && (
          <KitchenModule
            orders={orders}
            onMarkReady={handleMarkReady}
            onToggleItemDone={handleToggleItemDone}
            soundEnabled={soundEnabled}
          />
        )}

        {currentView === 'antar' && (
          <AntarModule
            orders={orders}
            onMarkDelivered={handleMarkDelivered}
            soundEnabled={soundEnabled}
          />
        )}

        {currentView === 'kasir' && (
          <CashierModule
            orders={orders}
            onProcessPayment={handleProcessPayment}
            onSettleSession={handleSettleSession}
            soundEnabled={soundEnabled}
          />
        )}

        {currentView === 'stok' && (
          <StockModule
            menu={menu}
            batches={batches}
            stokMode={stokMode}
            onToggleStokMode={() =>
              setStokMode((m) => (m === 'fifo' ? 'atomic' : 'fifo'))
            }
            onAddStockBatch={handleAddStockBatch}
            onUpdateMenuStockDirect={handleUpdateMenuStockDirect}
            soundEnabled={soundEnabled}
          />
        )}

        {currentView === 'layanan' && (
          <CustomerServiceModule
            orders={orders}
            menu={menu}
            onApproveOrder={handleApproveCustomerOrder}
            onRejectOrder={handleRejectCustomerOrder}
            onSettleSession={handleSettleSession}
            soundEnabled={soundEnabled}
          />
        )}

        {currentView === 'meja' && (
          <TablesQrModule settings={customerSettings} onUpdateSettings={setCustomerSettings} />
        )}

        {currentView === 'laporan' && (
          <ReportModule completedOrders={completedOrders} menu={menu} />
        )}

        {currentView === 'owner' && (
          <OwnerModule
            menu={menu}
            onAddMenuItem={handleAddMenuItem}
            onEditMenuItem={handleEditMenuItem}
            onDeleteMenuItem={handleDeleteMenuItem}
            pins={pins}
            onUpdatePin={handleUpdatePin}
            onResetDemoData={handleResetDemoData}
            soundEnabled={soundEnabled}
          />
        )}
      </main>

      {/* Internal Team Chat Drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        onSendMessage={(channel, text) => {
          setChatMessages((prev) => [
            ...prev,
            {
              id: `chat-${Date.now()}`,
              sender: `${currentRole?.toUpperCase() || 'STAF'}`,
              role: currentRole as ChatMessage['role'],
              channel,
              text,
              timestamp: Date.now(),
            },
          ]);
        }}
        soundEnabled={soundEnabled}
        activeRole={currentRole}
      />

      {/* PIN Role Authentication Modal (No Demo Shortcuts) */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccessRole={(role) => {
          setCurrentRole(role);
          if (role === 'waiter') setCurrentView('waiter');
          else if (role === 'dapur') setCurrentView('dapur');
          else if (role === 'antar') setCurrentView('antar');
          else if (role === 'kasir') setCurrentView('kasir');
          else if (role === 'stok') setCurrentView('stok');
          else if (role === 'laporan') setCurrentView('laporan');
          else if (role === 'owner') setCurrentView('owner');
        }}
        pins={pins}
        soundEnabled={soundEnabled}
      />

      {/* Printable Thermal Receipt Modal */}
      {receiptModalOrder && (
        <ReceiptModal
          order={receiptModalOrder}
          onClose={() => setReceiptModalOrder(null)}
        />
      )}

      {/* Firebase Realtime Database Connection */}
      <CloudSyncModal isOpen={isCloudOpen} onClose={() => setIsCloudOpen(false)} />
    </div>
  );
}
