import React, { useState } from 'react';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Edit2, 
  RotateCcw, 
  X,
  ShieldCheck
} from 'lucide-react';
import { MenuItem, formatRupiah } from '../utils/pos';
import { ROLE_CONFIGS, RoleType } from '../data/seedData';
import { soundEffects } from '../utils/audio';

interface OwnerModuleProps {
  menu: MenuItem[];
  onAddMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  onEditMenuItem: (item: MenuItem) => void;
  onDeleteMenuItem: (id: string) => void;
  pins: Record<RoleType, string>;
  onUpdatePin: (role: RoleType, newPin: string) => void;
  onResetDemoData: () => void;
  soundEnabled: boolean;
}

export const OwnerModule: React.FC<OwnerModuleProps> = ({
  menu,
  onAddMenuItem,
  onEditMenuItem,
  onDeleteMenuItem,
  pins,
  onUpdatePin,
  onResetDemoData,
  soundEnabled,
}) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'pins' | 'system'>('menu');
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState(20000);
  const [formCostPrice, setFormCostPrice] = useState(8000);
  const [formCategory, setFormCategory] = useState<MenuItem['category']>('Kopi');
  const [formStock, setFormStock] = useState(25);
  const [formDesc, setFormDesc] = useState('');

  const [pinEditingRole, setPinEditingRole] = useState<RoleType | null>(null);
  const [newPinValue, setNewPinValue] = useState('');

  const openCreateModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormPrice(20000);
    setFormCostPrice(8000);
    setFormCategory('Kopi');
    setFormStock(25);
    setFormDesc('');
    setShowItemModal(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.n);
    setFormPrice(item.h);
    setFormCostPrice(item.costPrice ?? Math.round(item.h * 0.4));
    setFormCategory(item.category);
    setFormStock(item.stok);
    setFormDesc(item.description || '');
    setShowItemModal(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formPrice <= 0) return;

    if (editingItem) {
      onEditMenuItem({
        id: editingItem.id,
        n: formName.trim(),
        h: formPrice,
        costPrice: formCostPrice,
        category: formCategory,
        stok: formStock,
        description: formDesc.trim(),
      });
    } else {
      onAddMenuItem({
        n: formName.trim(),
        h: formPrice,
        costPrice: formCostPrice,
        category: formCategory,
        stok: formStock,
        description: formDesc.trim(),
      });
    }

    if (soundEnabled) soundEffects.tap();
    setShowItemModal(false);
  };

  const handleSavePin = (role: RoleType) => {
    if (newPinValue.length !== 6 || !/^\d+$/.test(newPinValue)) {
      alert('PIN harus 6 digit angka');
      return;
    }
    onUpdatePin(role, newPinValue);
    setPinEditingRole(null);
    setNewPinValue('');
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E5E5EA] rounded-2xl p-4 shadow-2xs">
        <div>
          <h2 className="font-bold text-base text-[#1C1C1E]">
            Pengaturan & Menu
          </h2>
          <p className="text-xs text-[#8E8E93]">
            Katalog makanan, PIN hak akses, dan manajemen data
          </p>
        </div>

        {/* iOS Segmented Tabs */}
        <div className="bg-[#E5E5EA] p-1 rounded-xl flex items-center gap-1">
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'menu'
                ? 'bg-white text-[#1C1C1E] font-semibold shadow-xs'
                : 'text-[#636366] hover:text-[#1C1C1E]'
            }`}
          >
            Menu ({menu.length})
          </button>
          <button
            onClick={() => setActiveTab('pins')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'pins'
                ? 'bg-white text-[#1C1C1E] font-semibold shadow-xs'
                : 'text-[#636366] hover:text-[#1C1C1E]'
            }`}
          >
            PIN Akses
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'system'
                ? 'bg-white text-[#1C1C1E] font-semibold shadow-xs'
                : 'text-[#636366] hover:text-[#1C1C1E]'
            }`}
          >
            Sistem
          </button>
        </div>
      </div>

      {/* Tab: Menu Management */}
      {activeTab === 'menu' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white border border-[#E5E5EA] p-4 rounded-2xl shadow-2xs">
            <div>
              <h3 className="font-semibold text-xs text-[#8E8E93] uppercase tracking-wider">Katalog Hidangan</h3>
              <p className="text-xs text-[#1C1C1E]">Perubahan harga langsung aktif di layar kasir & waiter</p>
            </div>
            <button
              onClick={openCreateModal}
              className="px-3.5 py-1.5 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Menu
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {menu.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-[#E5E5EA] rounded-2xl p-4 flex flex-col justify-between shadow-2xs hover:border-[#D1D1D6] transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs text-[#8E8E93] font-medium">
                      {item.category}
                    </span>
                    <span className="text-[11px] text-[#636366]">Stok: {item.stok}</span>
                  </div>

                  <h4 className="font-semibold text-sm text-[#1C1C1E]">{item.n}</h4>
                  <p className="text-xs text-[#636366] line-clamp-2 mt-1">{item.description}</p>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-[#F2F2F7] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-[#1C1C1E]">
                      {formatRupiah(item.h)}
                    </span>
                    <span className="text-[11px] font-mono text-[#8E8E93]">
                      HPP: {formatRupiah(item.costPrice ?? Math.round(item.h * 0.4))}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {(() => {
                      const hpp = item.costPrice ?? Math.round(item.h * 0.4);
                      const profit = item.h - hpp;
                      const marginPct = item.h > 0 ? Math.round((profit / item.h) * 100) : 0;
                      return (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          marginPct >= 58
                            ? 'bg-[#EBF9F1] text-[#34C759]'
                            : marginPct >= 45
                            ? 'bg-[#FFF9E6] text-[#FF9500]'
                            : 'bg-[#FFEBEB] text-[#FF3B30]'
                        }`}>
                          Laba {formatRupiah(profit)} ({marginPct}%)
                        </span>
                      );
                    })()}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded-lg text-[#636366] hover:bg-[#F2F2F7] hover:text-[#007AFF] cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Hapus menu "${item.n}"?`)) {
                            onDeleteMenuItem(item.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-[#636366] hover:bg-[#FFEBEB] hover:text-[#FF3B30] cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: PIN Settings */}
      {activeTab === 'pins' && (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-2xs space-y-4">
          <div>
            <h3 className="font-semibold text-sm text-[#1C1C1E]">Kelola 6-Digit Passcode Staf</h3>
            <p className="text-xs text-[#8E8E93]">Passcode untuk masuk ke layar Waiter, Dapur, Kasir, atau Owner</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ROLE_CONFIGS.map((rc) => {
              const currentPin = pins[rc.key] || rc.defaultPin;
              const isEditing = pinEditingRole === rc.key;

              return (
                <div
                  key={rc.key}
                  className="bg-[#F2F2F7] rounded-xl p-3.5 border border-[#E5E5EA] space-y-2"
                >
                  <div className="font-semibold text-xs text-[#1C1C1E]">{rc.name}</div>
                  <div className="flex items-center justify-between">
                    {isEditing ? (
                      <input
                        type="text"
                        maxLength={6}
                        autoFocus
                        value={newPinValue}
                        onChange={(e) => setNewPinValue(e.target.value.replace(/\D/g, ''))}
                        className="w-24 bg-white border border-[#007AFF] rounded px-2 py-0.5 font-mono text-xs font-bold text-[#1C1C1E] focus:outline-none"
                      />
                    ) : (
                      <span className="font-mono font-bold text-sm text-[#1C1C1E] tracking-wider">
                        {currentPin}
                      </span>
                    )}

                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSavePin(rc.key)}
                          className="px-2 py-0.5 rounded bg-[#34C759] text-white text-[11px] font-semibold"
                        >
                          Simpan
                        </button>
                        <button
                          onClick={() => {
                            setPinEditingRole(null);
                            setNewPinValue('');
                          }}
                          className="px-2 py-0.5 rounded bg-[#E5E5EA] text-[#636366] text-[11px]"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setPinEditingRole(rc.key);
                          setNewPinValue(currentPin);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#D1D1D6] text-xs font-medium text-[#1C1C1E] hover:bg-slate-50"
                      >
                        Ubah PIN
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: System Reset */}
      {activeTab === 'system' && (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-2xs space-y-3 max-w-md">
          <h3 className="font-semibold text-sm text-[#1C1C1E]">Reset Data Demo</h3>
          <p className="text-xs text-[#8E8E93]">
            Kembalikan seluruh data transaksi, antrean meja, dan stok ke kondisi awal contoh Kafe 78.
          </p>
          <button
            onClick={() => {
              if (confirm('Kembalikan semua data ke setelan demo awal?')) {
                onResetDemoData();
              }
            }}
            className="px-4 py-2 rounded-xl bg-[#FFEBEB] text-[#FF3B30] hover:bg-[#FF3B30] hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset ke Data Awal
          </button>
        </div>
      )}

      {/* Item Modal (Apple Sheet Style) */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-[#E5E5EA]">
            <div className="flex items-center justify-between pb-3 border-b border-[#F2F2F7] mb-3">
              <h3 className="font-semibold text-sm text-[#1C1C1E]">
                {editingItem ? 'Edit Menu' : 'Tambah Menu Baru'}
              </h3>
              <button
                onClick={() => setShowItemModal(false)}
                className="w-7 h-7 rounded-full bg-[#F2F2F7] text-[#636366] flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#636366] mb-1">Nama Menu:</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nama kopi/makanan..."
                  className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl px-3 py-2 text-[#1C1C1E] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#636366] mb-1">Harga Jual (Rp):</label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value) || 0)}
                    className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl px-3 py-2 text-[#1C1C1E] font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#636366] mb-1">HPP / Modal (Rp):</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(Number(e.target.value) || 0)}
                    className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl px-3 py-2 text-[#1C1C1E] font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Live Margin Calculation */}
              <div className="bg-[#F2F2F7] rounded-xl p-2.5 flex items-center justify-between text-[11px]">
                <span className="text-[#636366]">Estimasi Margin Kotor:</span>
                {(() => {
                  const profit = formPrice - formCostPrice;
                  const marginPct = formPrice > 0 ? Math.round((profit / formPrice) * 100) : 0;
                  return (
                    <span className={`font-semibold font-mono ${marginPct >= 50 ? 'text-[#34C759]' : marginPct >= 35 ? 'text-[#FF9500]' : 'text-[#FF3B30]'}`}>
                      {formatRupiah(profit)} ({marginPct}%)
                    </span>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#636366] mb-1">Kategori:</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as MenuItem['category'])}
                    className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl px-3 py-2 text-[#1C1C1E] focus:outline-none"
                  >
                    <option value="Kopi">Kopi</option>
                    <option value="Non-Kopi">Non-Kopi</option>
                    <option value="Makanan">Makanan</option>
                    <option value="Snack">Snack</option>
                    <option value="Dessert">Dessert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#636366] mb-1">Stok Awal (Porsi):</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value) || 0)}
                    className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl px-3 py-2 text-[#1C1C1E] font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#636366] mb-1">Deskripsi:</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Keterangan bahan..."
                  className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl px-3 py-2 text-[#1C1C1E] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#F2F2F7]">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
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
