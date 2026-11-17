import React, { useLayoutEffect, useRef, useState } from 'react';
import { 
  UtensilsCrossed, 
  ChefHat, 
  Bike, 
  Receipt, 
  Package, 
  BarChart3, 
  Settings,
  BellRing,
  QrCode
} from 'lucide-react';
import { RoleType } from '../data/seedData';

export type NavView = 'waiter' | 'dapur' | 'antar' | 'kasir' | 'stok' | 'laporan' | 'owner' | 'layanan' | 'meja';

interface NavigationProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  currentRole: RoleType;
  counts: {
    dapur: number;
    antar: number;
    kasir: number;
    stokMenipis: number;
    layanan: number;
  };
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onSelectView,
  currentRole,
  counts,
}) => {
  const allowedViews: Record<RoleType, NavView[]> = {
    waiter: ['waiter', 'antar', 'layanan'],
    dapur: ['dapur'],
    antar: ['antar'],
    kasir: ['kasir', 'stok', 'layanan'],
    stok: ['stok'],
    laporan: ['laporan'],
    owner: ['waiter', 'dapur', 'antar', 'kasir', 'stok', 'laporan', 'layanan', 'meja', 'owner'],
  };

  const allTabs = [
    { id: 'waiter' as NavView, label: 'Waiter', icon: UtensilsCrossed },
    { id: 'dapur' as NavView, label: 'Dapur', icon: ChefHat, badge: counts.dapur },
    { id: 'antar' as NavView, label: 'Antar', icon: Bike, badge: counts.antar },
    { id: 'kasir' as NavView, label: 'Kasir', icon: Receipt, badge: counts.kasir },
    { id: 'layanan' as NavView, label: 'Pelanggan', icon: BellRing, badge: counts.layanan },
    { id: 'meja' as NavView, label: 'Meja & QR', icon: QrCode },
    { id: 'stok' as NavView, label: 'Stok', icon: Package, badge: counts.stokMenipis },
    { id: 'laporan' as NavView, label: 'Laporan', icon: BarChart3 },
    { id: 'owner' as NavView, label: 'Pengaturan', icon: Settings },
  ];

  const permittedList = allowedViews[currentRole] || ['waiter'];
  const visibleTabs = allTabs.filter((tab) => permittedList.includes(tab.id));

  const pillRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const pill = pillRef.current;
    if (!pill) return;
    const active = pill.querySelector<HTMLElement>('[data-active="true"]');
    if (!active) return;
    setIndicator({
      left: active.offsetLeft,
      width: active.offsetWidth,
    });
  }, [currentView, currentRole]);

  return (
    <nav className="bg-[#F2F2F7] px-4 py-3 sticky top-0 z-30 -mt-px">
      <div className="max-w-7xl mx-auto">
        <div className="nav-pill" ref={pillRef}>
          <div
            className="nav-indicator"
            style={{
              transform: `translateX(${indicator.left}px)`,
              width: indicator.width,
            }}
          />
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectView(tab.id)}
                aria-label={`Buka ${tab.label}`}
                data-active={isActive ? 'true' : 'false'}
                className={`nav-pill-item ${
                  isActive ? 'nav-pill-item-active' : 'nav-pill-item-inactive'
                }`}
              >
                <Icon className={`w-3.5 h-3.5`} />
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center leading-tight bg-[#8E8E93] text-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
