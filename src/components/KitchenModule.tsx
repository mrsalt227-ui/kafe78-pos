import React, { useState, useEffect } from 'react';
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  Check, 
  ArrowRight
} from 'lucide-react';
import { Order, getElapsedTimerString, getTimerUrgency } from '../utils/pos';
import { soundEffects } from '../utils/audio';

interface KitchenModuleProps {
  orders: Order[];
  onMarkReady: (orderId: string) => void;
  onToggleItemDone: (orderId: string, itemIndex: number) => void;
  soundEnabled: boolean;
}

export const KitchenModule: React.FC<KitchenModuleProps> = ({
  orders,
  onMarkReady,
  onToggleItemDone,
  soundEnabled,
}) => {
  const [filter, setFilter] = useState<'all' | 'dapur' | 'siap_antar'>('all');
  const [, setTick] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const kitchenOrders = orders.filter((o) => o.status === 'dapur' || o.status === 'siap_antar');

  const filteredOrders = kitchenOrders.filter((o) => {
    if (filter === 'dapur') return o.status === 'dapur';
    if (filter === 'siap_antar') return o.status === 'siap_antar';
    return true;
  });

  const handleReady = (orderId: string) => {
    if (soundEnabled) soundEffects.bell();
    onMarkReady(orderId);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-[20px] border border-[#E5E5EA] p-5 shadow-sm">
        <div>
          <h2 className="font-bold text-base text-[#1C1C1E]">
            Layar Dapur (KDS)
          </h2>
          <p className="text-xs text-[#8E8E93]">
            {kitchenOrders.filter((o) => o.status === 'dapur').length} antrean hidangan sedang dimasak
          </p>
        </div>

        <div className="bg-[#F2F2F7] p-1 rounded-[16px] flex items-center gap-0.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-[12px] text-xs font-medium transition-all ${
              filter === 'all'
                ? 'bg-white text-[#1C1C1E] font-semibold shadow-sm'
                : 'text-[#636366] hover:text-[#1C1C1E] hover:bg-[#F2F2F7]'
            }`}
          >
            Semua ({kitchenOrders.length})
          </button>
          <button
            onClick={() => setFilter('dapur')}
            className={`px-3 py-1.5 rounded-[12px] text-xs font-medium transition-all ${
              filter === 'dapur'
                ? 'bg-[#5B4FE9] text-white shadow-sm'
                : 'text-[#636366] hover:text-[#1C1C1E] hover:bg-[#F2F2F7]'
            }`}
          >
            Memasak ({kitchenOrders.filter((o) => o.status === 'dapur').length})
          </button>
          <button
            onClick={() => setFilter('siap_antar')}
            className={`px-3 py-1.5 rounded-[12px] text-xs font-medium transition-all ${
              filter === 'siap_antar'
                ? 'bg-[#5B4FE9] text-white shadow-sm'
                : 'text-[#636366] hover:text-[#1C1C1E] hover:bg-[#F2F2F7]'
            }`}
          >
            Siap Antar ({kitchenOrders.filter((o) => o.status === 'siap_antar').length})
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-[#E5E5EA] p-10 text-center text-[#8E8E93] space-y-3">
          <CheckCircle2 className="w-10 h-10 mx-auto text-[#34C759]" />
          <h3 className="font-bold text-sm text-[#1C1C1E]">Antrean Dapur Bersih</h3>
          <p className="text-xs text-[#8E8E93] max-w-sm mx-auto">
            Dapur kosong melompong, santuy 😴. Pesanan baru bakal muncul otomatis di sini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const urgency = getTimerUrgency(order.createdAt);
            const timerText = getElapsedTimerString(order.createdAt);
            const isReady = order.status === 'siap_antar';
            const allItemsDone = order.items.every((it) => it.done);

            return (
              <div
                key={order.id}
                className={`bg-white rounded-[20px] border p-5 shadow-sm flex flex-col justify-between transition-all ${
                  isReady
                    ? 'border-[#5B4FE9] bg-[#F8F6FE]'
                    : urgency === 'late'
                    ? 'border-[#FF3B30] ring-1 ring-[#FF3B30]/20'
                    : urgency === 'warn'
                    ? 'border-[#FF9500]'
                    : 'border-[#E5E5EA]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-[#F2F2F7] pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-9 h-9 rounded-[16px] bg-[#1A1B2E] text-white font-mono font-bold text-xs flex items-center justify-center">
                        {order.meja}
                      </span>
                      <div>
                        <div className="font-semibold text-xs text-[#1C1C1E]">Meja {order.meja}</div>
                        <div className="text-[10px] text-[#8E8E93] font-mono">{order.id}</div>
                      </div>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-[10px] text-[10px] font-mono font-semibold ${
                        isReady
                          ? 'bg-[#F8F6FE] text-[#5B4FE9]'
                          : urgency === 'late'
                          ? 'bg-[#FFEBEB] text-[#FF3B30]'
                          : urgency === 'warn'
                          ? 'bg-[#FFF2DE] text-[#B45309]'
                          : 'bg-[#F2F2F7] text-[#636366]'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{timerText}</span>
                    </div>
                  </div>

                  <div className="space-y-2 py-1">
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => onToggleItemDone(order.id, idx)}
                        className={`p-2.5 rounded-[12px] border flex items-start gap-2.5 cursor-pointer transition-colors ${
                          item.done
                            ? 'bg-[#F2F2F7]/60 border-transparent text-[#8E8E93] line-through'
                            : 'bg-[#F2F2F7] border-[#E5E5EA] text-[#1C1C1E] hover:bg-[#E5E5EA]/70'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center shrink-0 border transition-colors ${
                            item.done
                              ? 'bg-[#34C759] border-[#34C759] text-white'
                              : 'border-[#C7C7CC] bg-white'
                          }`}
                        >
                          {item.done && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="flex-1">
                          <span className="font-medium text-xs">
                            {item.qty}× {item.n}
                          </span>
                          {item.note && (
                            <p className="text-[11px] text-[#FF9500] not-italic">
                              Catatan: {item.note}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#F2F2F7]">
                  {isReady ? (
                    <div className="py-2.5 px-3 rounded-[12px] bg-[#F8F6FE] text-[#5B4FE9] text-xs font-semibold text-center">
                      Siap Antar · Menunggu Pengantaran
                    </div>
                  ) : (
                    <button
                      onClick={() => handleReady(order.id)}
                      className={`w-full py-3 px-4 rounded-[14px] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm ${
                        allItemsDone
                          ? 'bg-[#34C759] hover:bg-[#2FB34F] text-white'
                          : 'bg-[#5B4FE9] hover:bg-[#4A3FD8] text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Tandai Siap Antar (Meja {order.meja})
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
