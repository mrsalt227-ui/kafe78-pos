import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2,
  Receipt,
  ShoppingBag,
  Send,
  X,
  ChevronUp
} from 'lucide-react';
import { MenuItem, CartItem, formatRupiah } from '../utils/pos';
import { soundEffects } from '../utils/audio';

interface WaiterModuleProps {
  menu: MenuItem[];
  onSendOrder: (table: string, items: CartItem[]) => void;
  soundEnabled: boolean;
  occupiedTables: string[];
}

const CATEGORIES = ['Semua', 'Kopi', 'Non-Kopi', 'Makanan', 'Snack', 'Dessert'] as const;
const TABLES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

export const WaiterModule: React.FC<WaiterModuleProps> = ({
  menu,
  onSendOrder,
  soundEnabled,
  occupiedTables,
}) => {
  const [selectedTable, setSelectedTable] = useState<string>('01');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderSentToast, setOrderSentToast] = useState<string | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Filtered menu
  const filteredMenu = useMemo(() => {
    return menu.filter((item) => {
      const matchCat = selectedCategory === 'Semua' || item.category === selectedCategory;
      const matchQuery =
        !searchQuery ||
        item.n.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [menu, selectedCategory, searchQuery]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    if (soundEnabled) soundEffects.tap();
    const existing = cart.find((c) => c.id === item.id);
    const nextQty = (existing?.qty || 0) + 1;
    // Jangan biarkan keranjang melebihi stok yang tersedia.
    if (item.stok <= 0 || nextQty > item.stok) {
      setOrderSentToast(`Stok ${item.n} tinggal ${item.stok}`);
      setTimeout(() => setOrderSentToast(null), 2500);
      return;
    }
    setCart((prev) =>
      existing
        ? prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c))
        : [...prev, { id: item.id, n: item.n, h: item.h, costPrice: item.costPrice, qty: 1 }]
    );
  };

  const removeFromCart = (id: string) => {
    if (soundEnabled) soundEffects.tap();
    setCart((prev) => {
      const existing = prev.find((c) => c.id === id);
      if (existing && existing.qty > 1) {
        return prev.map((c) => (c.id === id ? { ...c, qty: c.qty - 1 } : c));
      }
      return prev.filter((c) => c.id !== id);
    });
  };

  const updateItemNote = (id: string, note: string) => {
    setCart((prev) => prev.map((c) => (c.id === id ? { ...c, note } : c)));
  };

  const clearCartItem = (id: string) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  };

  const getItemQtyInCart = (id: string) => {
    return cart.find((c) => c.id === id)?.qty || 0;
  };

  // Calculations
  const totalItemsCount = cart.reduce((sum, it) => sum + it.qty, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.h * item.qty, 0);
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;

  const handleSendOrder = () => {
    if (cart.length === 0) return;
    onSendOrder(selectedTable, cart);
    if (soundEnabled) soundEffects.bell();
    const sentMsg = `Pesanan Meja ${selectedTable} terkirim ke Dapur`;
    setOrderSentToast(sentMsg);
    setCart([]);
    setIsMobileCartOpen(false);
    setTimeout(() => {
      setOrderSentToast(null);
    }, 3500);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5 pb-24 lg:pb-6">
      {/* iOS Floating Toast */}
      {orderSentToast && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-[#1C1C1E] text-white px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 border border-white/10 animate-in fade-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
          <span className="font-medium text-xs tracking-tight">{orderSentToast}</span>
        </div>
      )}

      {/* Table Selector Header Card */}
      <div className="bg-white rounded-2xl p-4 border border-[#E5E5EA] shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-xs text-[#8E8E93] uppercase tracking-wider">
              Pilih Meja Tamu
            </h2>
            <span className="text-xs text-[#1C1C1E] font-bold">· Meja {selectedTable}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile View Cart Quick Button */}
            <button
              onClick={() => setIsMobileCartOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F2F2F7] hover:bg-[#E5E5EA] border border-[#E5E5EA] text-xs font-semibold text-[#1C1C1E] cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>Keranjang</span>
              {totalItemsCount > 0 && (
                <span className="px-1.5 py-0.2 bg-[#007AFF] text-white rounded-full text-[10px] font-bold">
                  {totalItemsCount}
                </span>
              )}
            </button>

            <div className="hidden sm:flex items-center gap-3 text-xs text-[#8E8E93]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#E5E5EA]"></span> Kosong
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF9500]"></span> Terisi
              </span>
            </div>
          </div>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
          {TABLES.map((t) => {
            const isSelected = selectedTable === t;
            const isOccupied = occupiedTables.includes(t);
            return (
              <button
                key={t}
                onClick={() => setSelectedTable(t)}
                className={`py-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#007AFF] text-white shadow-xs'
                    : isOccupied
                    ? 'bg-[#FFF2DE] text-[#B45309] border border-[#FDE68A]'
                    : 'bg-[#F2F2F7] text-[#1C1C1E] hover:bg-[#E5E5EA]'
                }`}
              >
                <span className="font-mono text-sm leading-none">{t}</span>
                <span className="text-[9px] font-normal opacity-75 mt-0.5">
                  {isOccupied ? 'Isi' : 'Free'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Layout: Menu + Desktop Cart Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Menu Catalog */}
        <div className="lg:col-span-8 space-y-3.5">
          {/* iOS Search Bar & Categories */}
          <div className="bg-white rounded-2xl p-3.5 border border-[#E5E5EA] shadow-2xs space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kopi, makanan, snack..."
                className="w-full bg-[#F2F2F7] rounded-xl pl-9 pr-4 py-2 text-xs text-[#1C1C1E] placeholder-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8E8E93] hover:text-[#1C1C1E]"
                >
                  Hapus
                </button>
              )}
            </div>

            {/* Category Segmented Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#1C1C1E] text-white'
                      : 'bg-[#F2F2F7] text-[#636366] hover:bg-[#E5E5EA]'
                  }`}
                >
                  {cat}
                </button>
              ))}
              <span className="text-[11px] text-[#8E8E93] ml-auto hidden sm:inline whitespace-nowrap">
                {filteredMenu.length} menu
              </span>
            </div>
          </div>

          {/* Menu Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredMenu.map((item) => {
              const qtyInCart = getItemQtyInCart(item.id);
              const isLowStock = item.stok <= 15 && item.stok > 0;
              const isOutOfStock = item.stok <= 0;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                    qtyInCart > 0
                      ? 'border-[#007AFF] shadow-xs'
                      : 'border-[#E5E5EA] hover:border-[#D1D1D6]'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-xs text-[#8E8E93] font-medium">
                        {item.category}
                      </span>
                      {isOutOfStock ? (
                        <span className="text-[10px] text-[#FF3B30] font-semibold">Habis</span>
                      ) : isLowStock ? (
                        <span className="text-[10px] text-[#FF9500] font-medium">Sisa {item.stok}</span>
                      ) : (
                        <span className="text-[10px] text-[#8E8E93]">Stok {item.stok}</span>
                      )}
                    </div>

                    <h3 className="font-semibold text-sm text-[#1C1C1E] leading-snug">
                      {item.n}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-[#636366] line-clamp-2 mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Footer Price & Stepper */}
                  <div className="mt-3.5 pt-2.5 border-t border-[#F2F2F7] flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#1C1C1E] font-mono">
                      {formatRupiah(item.h)}
                    </span>

                    {isOutOfStock ? (
                      <span className="text-[11px] text-[#8E8E93]">Habis</span>
                    ) : qtyInCart === 0 ? (
                      <button
                        onClick={() => addToCart(item)}
                        className="px-3 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 bg-[#F2F2F7] p-0.5 rounded-lg border border-[#E5E5EA]">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 rounded bg-white text-[#1C1C1E] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-[#1C1C1E] font-mono">
                          {qtyInCart}
                        </span>
                        <button
                          onClick={() => addToCart(item)}
                          className="p-1 rounded bg-[#007AFF] text-white hover:bg-[#0062CC] transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Desktop Cart / Order Slip (hidden on mobile, visible on desktop) */}
        <div className="hidden lg:block lg:col-span-4 sticky top-[125px]">
          <div className="bg-white rounded-2xl border border-[#E5E5EA] p-4 shadow-2xs space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#F2F2F7] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#1C1C1E]">Keranjang Pesanan</h3>
                <span className="text-xs text-[#8E8E93]">Meja {selectedTable}</span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-[#E5E5EA] text-[#1C1C1E] text-xs font-mono font-bold">
                Meja {selectedTable}
              </span>
            </div>

            {/* Cart Items */}
            {cart.length === 0 ? (
              <div className="py-10 text-center text-[#8E8E93] space-y-1.5">
                <Receipt className="w-8 h-8 mx-auto text-[#C7C7CC]" />
                <p className="text-xs font-medium text-[#1C1C1E]">Belum ada pesanan</p>
                <p className="text-[11px] text-[#8E8E93]">Pilih hidangan di sebelah kiri untuk menambah ke Meja {selectedTable}</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#F2F2F7] space-y-2 border border-[#E5E5EA]/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-xs text-[#1C1C1E]">{item.n}</h4>
                        <div className="text-[11px] text-[#636366] font-mono">
                          {formatRupiah(item.h)} × {item.qty} = {formatRupiah(item.h * item.qty)}
                        </div>
                      </div>
                      <button
                        onClick={() => clearCartItem(item.id)}
                        className="text-[#8E8E93] hover:text-[#FF3B30] p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-white rounded-lg p-0.5 border border-[#D1D1D6]">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 rounded text-[#1C1C1E] hover:bg-slate-100 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-mono font-bold text-[#1C1C1E]">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => {
                            const menuItem = menu.find((m) => m.id === item.id);
                            if (menuItem) addToCart(menuItem);
                          }}
                          className="p-1 rounded bg-[#007AFF] text-white hover:bg-[#0062CC] cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={item.note || ''}
                        onChange={(e) => updateItemNote(item.id, e.target.value)}
                        placeholder="Catatan khusus..."
                        className="flex-1 bg-white border border-[#D1D1D6] rounded-lg px-2.5 py-1 text-xs text-[#1C1C1E] placeholder-[#8E8E93] focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Calculations & Order Trigger */}
            {cart.length > 0 && (
              <div className="border-t border-[#F2F2F7] pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-[#636366]">
                  <span>Subtotal</span>
                  <span className="font-mono text-[#1C1C1E] font-medium">{formatRupiah(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#636366]">
                  <span>PB1 (Pajak Restoran 10%)</span>
                  <span className="font-mono text-[#1C1C1E] font-medium">{formatRupiah(tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-[#1C1C1E] pt-2 border-t border-[#F2F2F7]">
                  <span>Total Tagihan</span>
                  <span className="font-mono text-[#007AFF] text-base">{formatRupiah(total)}</span>
                </div>

                <button
                  onClick={handleSendOrder}
                  className="w-full mt-3 py-3 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  Kirim ke Dapur (Meja {selectedTable})
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE EXPERIENCE: Floating Bottom Bar (Easy Thumb Access) */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-4 inset-x-4 z-40 animate-in slide-in-from-bottom-4 duration-200">
          <div className="bg-[#1C1C1E] text-white rounded-2xl p-2.5 shadow-2xl border border-white/10 flex items-center justify-between gap-3">
            {/* Left: Tap to open bottom sheet */}
            <button
              onClick={() => setIsMobileCartOpen(true)}
              className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer pl-1"
            >
              <div className="w-8 h-8 rounded-xl bg-[#007AFF] text-white flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                {totalItemsCount}
              </div>
              <div className="truncate">
                <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                  <span>Meja {selectedTable}</span>
                  <ChevronUp className="w-3.5 h-3.5 text-[#8E8E93]" />
                </div>
                <div className="font-mono text-xs text-[#007AFF] font-bold">
                  {formatRupiah(total)}
                </div>
              </div>
            </button>

            {/* Right: Quick Send to Kitchen Button */}
            <button
              onClick={handleSendOrder}
              className="px-4 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] active:scale-98 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim Dapur</span>
            </button>
          </div>
        </div>
      )}

      {/* MOBILE EXPERIENCE: Slide-up iOS Bottom Sheet */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border-t border-[#E5E5EA] animate-in slide-in-from-bottom duration-250">
            {/* Grab Handle */}
            <div className="pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#D1D1D6] mx-auto"></div>
            </div>

            {/* Header */}
            <div className="px-5 py-3 border-b border-[#F2F2F7] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[#1C1C1E]">Keranjang Pesanan</h3>
                <p className="text-xs text-[#8E8E93]">Meja {selectedTable} · {totalItemsCount} hidangan</p>
              </div>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F2F2F7] text-[#636366] hover:text-[#1C1C1E] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-[#8E8E93] space-y-1.5">
                  <Receipt className="w-8 h-8 mx-auto text-[#C7C7CC]" />
                  <p className="text-xs font-medium text-[#1C1C1E]">Keranjang kosong</p>
                  <p className="text-[11px] text-[#8E8E93]">Pilih menu hidangan untuk menambah ke meja {selectedTable}</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-[#F2F2F7] space-y-2 border border-[#E5E5EA]/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-xs text-[#1C1C1E]">{item.n}</h4>
                        <div className="text-[11px] text-[#636366] font-mono">
                          {formatRupiah(item.h)} × {item.qty} = {formatRupiah(item.h * item.qty)}
                        </div>
                      </div>
                      <button
                        onClick={() => clearCartItem(item.id)}
                        className="text-[#8E8E93] hover:text-[#FF3B30] p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-white rounded-lg p-0.5 border border-[#D1D1D6]">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1.5 rounded text-[#1C1C1E] hover:bg-slate-100 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-mono font-bold text-[#1C1C1E]">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => {
                            const menuItem = menu.find((m) => m.id === item.id);
                            if (menuItem) addToCart(menuItem);
                          }}
                          className="p-1.5 rounded bg-[#007AFF] text-white hover:bg-[#0062CC] cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={item.note || ''}
                        onChange={(e) => updateItemNote(item.id, e.target.value)}
                        placeholder="Catatan khusus..."
                        className="flex-1 bg-white border border-[#D1D1D6] rounded-lg px-2.5 py-1.5 text-xs text-[#1C1C1E] placeholder-[#8E8E93] focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Calculation & Send Button */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-[#F2F2F7] bg-white space-y-2">
                <div className="flex justify-between text-xs text-[#636366]">
                  <span>Subtotal</span>
                  <span className="font-mono text-[#1C1C1E] font-medium">{formatRupiah(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-[#636366]">
                  <span>PB1 (Pajak Restoran 10%)</span>
                  <span className="font-mono text-[#1C1C1E] font-medium">{formatRupiah(tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-[#1C1C1E] pt-1.5 border-t border-[#F2F2F7]">
                  <span>Total Tagihan</span>
                  <span className="font-mono text-[#007AFF] text-base">{formatRupiah(total)}</span>
                </div>

                <button
                  onClick={handleSendOrder}
                  className="w-full mt-2 py-3.5 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Send className="w-4 h-4" />
                  Kirim ke Dapur (Meja {selectedTable})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
