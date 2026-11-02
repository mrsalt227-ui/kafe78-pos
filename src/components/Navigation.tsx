import React from 'react';
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
  // Real role-based tab access matching the original repo
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
    { id: 'layanan' as NavView, label: 'Customer', icon: BellRing, badge: counts.layanan },
    { id: 'meja' as NavView, label: 'Meja & QR', icon: QrCode },
    { id: 'stok' as NavView, label: 'Stok', icon: Package, badge: counts.stokMenipis },
    { id: 'laporan' as NavView, label: 'Laporan', icon: BarChart3 },
    { id: 'owner' as NavView, label: 'Pengaturan', icon: Settings },
  ];

  const permittedList = allowedViews[currentRole] || ['waiter'];
  const visibleTabs = allTabs.filter((tab) => permittedList.includes(tab.id));

  return (
    <nav className="bg-[#F2F2F7] px-4 py-2 sticky top-[57px] z-30 overflow-x-auto no-scrollbar">
      <div className="max-w-7xl mx-auto flex items-center justify-start sm:justify-center">
        {/* iOS Segmented Control Container */}
        <div className="bg-[#E5E5EA] p-1 rounded-xl flex items-center gap-1 shadow-inner">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectView(tab.id)}
                aria-label={`Buka ${tab.label}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#1C1C1E] font-semibold shadow-xs'
                    : 'text-[#636366] hover:text-[#1C1C1E] hover:bg-black/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#007AFF]' : 'text-[#8E8E93]'}`} />
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center leading-tight ${
                      isActive ? 'bg-[#007AFF] text-white' : 'bg-[#8E8E93] text-white'
                    }`}
                  >
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
