import React from 'react';
import { Bike, CheckCircle2, Clock } from 'lucide-react';
import { Order, getElapsedTimerString } from '../utils/pos';
import { soundEffects } from '../utils/audio';

interface AntarModuleProps {
  orders: Order[];
  onMarkDelivered: (orderId: string) => void;
  soundEnabled: boolean;
}

export const AntarModule: React.FC<AntarModuleProps> = ({
  orders,
  onMarkDelivered,
  soundEnabled,
}) => {
  const readyOrders = orders.filter((o) => o.status === 'siap_antar');

  const handleDeliver = (orderId: string) => {
    if (soundEnabled) soundEffects.tap();
    onMarkDelivered(orderId);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E5E5EA] rounded-2xl p-4 shadow-2xs">
        <div>
          <h2 className="font-bold text-base text-[#1C1C1E]">
            Antar Pesanan (Runner)
          </h2>
          <p className="text-xs text-[#8E8E93]">
            {readyOrders.length} hidangan matang siap disajikan ke meja tamu
          </p>
        </div>
      </div>

      {readyOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E5EA] p-12 text-center text-[#8E8E93] space-y-2">
          <CheckCircle2 className="w-10 h-10 mx-auto text-[#007AFF]" />
          <h3 className="font-bold text-sm text-[#1C1C1E]">Semua Hidangan Sudah Terantar</h3>
          <p className="text-xs text-[#8E8E93] max-w-sm mx-auto">
            Tidak ada piring yang menunggu di meja pick-up saat ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {readyOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-[#007AFF] p-4 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-[#F2F2F7] pb-2.5 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-9 h-9 rounded-xl bg-[#007AFF] text-white font-mono font-bold text-sm flex items-center justify-center">
                      {order.meja}
                    </span>
                    <div>
                      <div className="font-bold text-sm text-[#1C1C1E]">MEJA {order.meja}</div>
                      <div className="text-[10px] text-[#8E8E93] font-mono">{order.id}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F2F2F7] text-[#636366] text-xs font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{getElapsedTimerString(order.createdAt)}</span>
                  </div>
                </div>

                <div className="text-xs text-[#8E8E93] font-medium mb-1.5">
                  Menu untuk Meja {order.meja}:
                </div>
                <div className="space-y-1 bg-[#F2F2F7] rounded-xl p-3 border border-[#E5E5EA]/60 text-xs">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[#1C1C1E]">
                      <span className="font-medium">
                        {item.qty}× {item.n}
                      </span>
                      {item.note && (
                        <span className="text-[11px] text-[#FF9500]">
                          ({item.note})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#F2F2F7]">
                <button
                  onClick={() => handleDeliver(order.id)}
                  className="w-full py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Selesai Diantar ke Meja {order.meja}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
