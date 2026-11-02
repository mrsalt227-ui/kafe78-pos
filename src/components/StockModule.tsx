import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Layers, 
  ArrowDownUp, 
  X,
  AlertCircle
} from 'lucide-react';
import { MenuItem, StockBatch, formatRupiah } from '../utils/pos';
import { soundEffects } from '../utils/audio';

interface StockModuleProps {
  menu: MenuItem[];
  batches: StockBatch[];
  stokMode: 'fifo' | 'atomic';
  onToggleStokMode: () => void;
  onAddStockBatch: (menuId: string, qty: number, costPrice: number) => void;
  onUpdateMenuStockDirect: (menuId: string, newStock: number) => void;
  soundEnabled: boolean;
}

export const StockModule: React.FC<StockModuleProps> = ({
  menu,
  batches,
  stokMode,
  onToggleStokMode,
  onAddStockBatch,
  onUpdateMenuStockDirect,
  soundEnabled,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedMenuId, setSelectedMenuId] = useState(menu[0]?.id || '');
  const [restockQty, setRestockQty] = useState(20);
  const [costPrice, setCostPrice] = useState(10000);

  // Menu bisa datang belakangan dari Firebase; pastikan pilihan item valid.
  useEffect(() => {
    if (menu.length === 0) return;
    if (!menu.some((m) => m.id === selectedMenuId)) {
      setSelectedMenuId(menu[0].id);
    }
  }, [menu, selectedMenuId]);

  const totalItems = menu.length;
  const lowStockCount = menu.filter((m) => m.stok > 0 && m.stok <= 15).length;
  const outOfStockCount = menu.filter((m) => m.stok === 0).length;
  const totalStockUnits = menu.reduce((sum, m) => sum + m.stok, 0);

  const filteredMenu = menu.filter(
    (m) =>
      m.n.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMenuId || restockQty <= 0) return;
    if (soundEnabled) soundEffects.tap();
    onAddStockBatch(selectedMenuId, restockQty, costPrice);
    setShowRestockModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E5E5EA] rounded-2xl p-4 shadow-2xs">
        <div>
          <h2 className="font-bold text-base text-[#1C1C1E]">
            Inventaris & Stok
          </h2>
          <p className="text-xs text-[#8E8E93]">
            {totalStockUnits} total porsi tersedia · Metode: <span className="font-mono uppercase text-[#007AFF] font-bold">{stokMode}</span>
          </p>
        </div>

        <button
          onClick={onToggleStokMode}
          className="px-3.5 py-1.5 rounded-xl bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1C1C1E] text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto border border-[#E5E5EA]"
        >
          <ArrowDownUp className="w-3.5 h-3.5 text-[#007AFF]" />
          Ganti Mode ({stokMode.toUpperCase()})
        </button>
      </div>

      {/* Apple Health style Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-[#8E8E93] font-medium">Total Menu</span>
          <div className="text-2xl font-bold text-[#1C1C1E] mt-1">{totalItems}</div>
          <span className="text-[11px] text-[#636366]">{totalStockUnits} Porsi</span>
        </div>

        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-[#FF9500] font-medium">Stok Menipis</span>
          <div className="text-2xl font-bold text-[#FF9500] mt-1">{lowStockCount}</div>
          <span className="text-[11px] text-[#8E8E93]">Sisa ≤ 15 porsi</span>
        </div>

        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-[#FF3B30] font-medium">Stok Habis</span>
          <div className="text-2xl font-bold text-[#FF3B30] mt-1">{outOfStockCount}</div>
          <span className="text-[11px] text-[#8E8E93]">Perlu restock</span>
        </div>

        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-[#007AFF] font-medium">Batch FIFO</span>
          <div className="text-2xl font-bold text-[#007AFF] mt-1">{batches.length} Batch</div>
          <span className="text-[11px] text-[#8E8E93]">Rotasi stok masuk</span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white border border-[#E5E5EA] rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari item stok..."
            className="w-full bg-[#F2F2F7] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#1C1C1E] placeholder-[#8E8E93] focus:outline-none"
          />
        </div>

        <button
          onClick={() => setShowRestockModal(true)}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah Stok Masuk
        </button>
      </div>

      {/* Inset Grouped Table (Apple Settings Style) */}
      <div className="bg-white border border-[#E5E5EA] rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1C1C1E]">
            <thead className="bg-[#F2F2F7] text-[#636366] font-semibold border-b border-[#E5E5EA]">
              <tr>
                <th className="py-2.5 px-4">Nama Item</th>
                <th className="py-2.5 px-4">Kategori</th>
                <th className="py-2.5 px-4">Harga Jual</th>
                <th className="py-2.5 px-4">Sisa Stok</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Penyesuaian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F2F7]">
              {filteredMenu.map((item) => {
                const isOut = item.stok === 0;
                const isLow = item.stok > 0 && item.stok <= 15;

                return (
                  <tr key={item.id} className="hover:bg-[#F8F8FA] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#1C1C1E]">
                      {item.n}
                    </td>
                    <td className="py-3 px-4 text-[#636366]">
                      {item.category}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-[#1C1C1E]">
                      {formatRupiah(item.h)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      {item.stok}
                    </td>
                    <td className="py-3 px-4">
                      {isOut ? (
                        <span className="text-[#FF3B30] font-semibold">Habis</span>
                      ) : isLow ? (
                        <span className="text-[#FF9500] font-medium">Menipis</span>
                      ) : (
                        <span className="text-[#34C759] font-medium">Tersedia</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onUpdateMenuStockDirect(item.id, Math.max(0, item.stok - 5))}
                          className="px-2 py-1 rounded-lg bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1C1C1E] text-xs font-mono font-medium"
                        >
                          -5
                        </button>
                        <button
                          onClick={() => onUpdateMenuStockDirect(item.id, item.stok + 10)}
                          className="px-2 py-1 rounded-lg bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] text-xs font-mono font-semibold"
                        >
                          +10
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Modal (Apple Sheet Style) */}
      {showRestockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-[#E5E5EA]">
            <div className="flex items-center justify-between pb-3 border-b border-[#F2F2F7] mb-3">
              <h3 className="font-semibold text-sm text-[#1C1C1E]">Tambah Stok Masuk</h3>
              <button
                onClick={() => setShowRestockModal(false)}
                className="w-7 h-7 rounded-full bg-[#F2F2F7] text-[#636366] flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#636366] mb-1">Pilih Item:</label>
                <select
                  value={selectedMenuId}
                  onChange={(e) => setSelectedMenuId(e.target.value)}
                  className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl px-3 py-2 text-[#1C1C1E] focus:outline-none"
                >
                  {menu.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.n} (Sisa: {m.stok})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#636366] mb-1">Jumlah Unit Masuk:</label>
                <input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(Number(e.target.value) || 0)}
                  className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl px-3 py-2 text-[#1C1C1E] font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#636366] mb-1">Harga Beli / Modal per Unit (Rp):</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={costPrice}
                  onChange={(e) => setCostPrice(Number(e.target.value) || 0)}
                  className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl px-3 py-2 text-[#1C1C1E] font-mono focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#F2F2F7]">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#F2F2F7] text-[#636366] font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white font-semibold"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
