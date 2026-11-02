import React from 'react';
import { X, Printer, CheckCircle } from 'lucide-react';
import { Order, formatRupiah } from '../utils/pos';

interface ReceiptModalProps {
  order: Order | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(order.paidAt || Date.now()).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 border border-[#E5E5EA]">
        {/* iOS Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#F2F2F7] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-[#34C759]" />
            <span className="text-xs font-semibold text-[#1C1C1E]">Pembayaran Berhasil</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup Struk"
            className="w-7 h-7 rounded-full bg-[#E5E5EA] text-[#636366] hover:text-[#1C1C1E] flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Authentic Thermal Receipt Paper */}
        <div className="p-6 bg-[#FCFCFD] text-[#1C1C1E] font-mono text-xs select-all">
          <div className="text-center space-y-1 pb-3.5 border-b border-dashed border-[#D1D1D6]">
            <h2 className="font-bold text-sm tracking-widest uppercase">KAFE 78</h2>
            <p className="text-[10px] text-[#636366]">Jl. Kopi Harapan No. 78, Jakarta</p>
            <p className="text-[10px] text-[#8E8E93]">{formattedDate}</p>
          </div>

          <div className="py-2.5 border-b border-dashed border-[#D1D1D6] text-[11px] space-y-0.5">
            <div className="flex justify-between">
              <span>Tiket:</span>
              <span className="font-bold">{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Meja:</span>
              <span className="font-bold">MEJA {order.meja}</span>
            </div>
            <div className="flex justify-between text-[#636366]">
              <span>Kasir:</span>
              <span>{order.cashierName || 'Kasir'}</span>
            </div>
          </div>

          <div className="py-2.5 border-b border-dashed border-[#D1D1D6] space-y-1.5">
            {order.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between font-medium">
                  <span className="truncate pr-2">{item.n}</span>
                  <span className="shrink-0">{formatRupiah(item.h * item.qty)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-[#8E8E93]">
                  <span>
                    {item.qty} × {formatRupiah(item.h)}
                  </span>
                  {item.note && <span className="italic">({item.note})</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="py-2.5 border-b border-dashed border-[#D1D1D6] space-y-1 text-[11px]">
            <div className="flex justify-between text-[#636366]">
              <span>Subtotal</span>
              <span>{formatRupiah(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-[#34C759]">
                <span>Diskon</span>
                <span>-{formatRupiah(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#636366]">
              <span>PB1 (10%)</span>
              <span>{formatRupiah(order.tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-[#E5E5EA]">
              <span>TOTAL</span>
              <span>{formatRupiah(order.total)}</span>
            </div>
          </div>

          <div className="py-2 text-[11px] space-y-0.5 border-b border-dashed border-[#D1D1D6]">
            <div className="flex justify-between">
              <span>Metode:</span>
              <span className="font-bold uppercase">{order.paymentMethod || 'TUNAI'}</span>
            </div>
            {order.paymentMethod === 'Tunai' && (
              <>
                <div className="flex justify-between text-[#636366]">
                  <span>Tunai:</span>
                  <span>{formatRupiah(order.cashGiven || order.total)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Kembalian:</span>
                  <span>{formatRupiah(order.change || 0)}</span>
                </div>
              </>
            )}
          </div>

          <div className="pt-3 text-center text-[10px] text-[#8E8E93] space-y-0.5">
            <p>Terima kasih atas kunjungan Anda!</p>
            <p className="font-mono text-[9px] text-[#C7C7CC] pt-1">* {order.id} *</p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-[#F2F2F7] p-3.5 flex items-center justify-end gap-2 border-t border-[#E5E5EA]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-[#1C1C1E] text-xs font-semibold border border-[#D1D1D6]"
          >
            Selesai
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Struk
          </button>
        </div>
      </div>
    </div>
  );
};
