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
      <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 border border-[#E5E5EA]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#F2F2F7] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#34C759]" />
            <span className="text-xs font-semibold text-[#1C1C1E]">Pembayaran Berhasil</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup Struk"
            className="w-8 h-8 rounded-full bg-[#F2F2F7] text-[#636366] hover:text-[#1C1C1E] flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Thermal Receipt Paper */}
        <div className="p-6 bg-[#FCFCFD] text-[#1C1C1E] font-mono text-xs select-all">
          <div className="text-center space-y-1 pb-4 border-b border-dashed border-[#D1D1D6]">
            <h2 className="font-bold text-sm tracking-widest uppercase">Warung Sontoloyo</h2>
            <p className="text-[10px] text-[#636366]">Terima kasih sudah mampir, sampai jumpa lagi!</p>
            <p className="text-[10px] text-[#8E8E93]">{formattedDate}</p>
          </div>

          <div className="py-3 border-b border-dashed border-[#D1D1D6] text-[11px] space-y-0.5">
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

          <div className="py-3 border-b border-dashed border-[#D1D1D6] space-y-1.5">
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

          <div className="py-3 border-b border-dashed border-[#D1D1D6] space-y-1 text-[11px]">
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
              <span>PPN (10%)</span>
              <span>{formatRupiah(order.tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-[#E5E5EA]">
              <span>TOTAL</span>
              <span>{formatRupiah(order.total)}</span>
            </div>
          </div>

          <div className="py-3 text-[11px] space-y-0.5 border-b border-dashed border-[#D1D1D6]">
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
        <div className="bg-[#F2F2F7] p-4 flex items-center justify-end gap-3 border-t border-[#E5E5EA]">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-[14px] bg-white hover:bg-[#E5E5EA] text-[#1C1C1E] text-xs font-semibold border border-[#D1D1D6] transition-colors cursor-pointer"
          >
            Selesai
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-[14px] bg-[#5B4FE9] hover:bg-[#4A3FD8] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Struk
          </button>
        </div>
      </div>
    </div>
  );
};
