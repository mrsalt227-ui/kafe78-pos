import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX, 
  MessageSquare, 
  Shield, 
  Clock,
  LogOut,
  ChevronRight,
  Cloud,
  CloudOff,
  RefreshCw
} from 'lucide-react';
import { ROLE_CONFIGS, RoleType } from '../data/seedData';
import { CloudStatus } from '../lib/firebase';

interface HeaderProps {
  currentRole: RoleType;
  onOpenPinModal: () => void;
  onLogout: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onToggleChat: () => void;
  unreadChatCount: number;
  activeTablesCount: number;
  totalTables: number;
  stokMode: 'fifo' | 'atomic';
  cloudStatus: CloudStatus;
  onOpenCloud: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onOpenPinModal,
  onLogout,
  soundEnabled,
  onToggleSound,
  onToggleChat,
  unreadChatCount,
  activeTablesCount,
  totalTables,
  stokMode,
  cloudStatus,
  onOpenCloud,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeRoleConfig = ROLE_CONFIGS.find((r) => r.key === currentRole) || ROLE_CONFIGS[0];

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-[#E5E5EA] px-4 py-2.5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1C1C1E] text-white flex items-center justify-center font-bold text-base shadow-xs tracking-tight">
            78
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight text-[#1C1C1E]">
                Kafe 78
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#E5E5EA] text-[#3A3A3C]">
                POS
              </span>
            </div>
            <p className="text-[11px] text-[#8E8E93] leading-none mt-0.5">
              Sistem Kasir & Restoran · <span className="uppercase font-mono text-[10px]">{stokMode}</span>
            </p>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Tables Status (iOS Grouped Pill) */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#F2F2F7] border border-[#E5E5EA] text-xs">
            <span className="w-2 h-2 rounded-full bg-[#34C759]"></span>
            <span className="text-[#636366]">Meja:</span>
            <span className="font-semibold text-[#1C1C1E] font-mono">
              {activeTablesCount}/{totalTables}
            </span>
          </div>

          {/* Clock */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F2F2F7] border border-[#E5E5EA] text-xs font-mono text-[#636366]">
            <Clock className="w-3.5 h-3.5 text-[#8E8E93]" />
            <span>{timeStr || '00:00:00'}</span>
          </div>

          {/* Cloud Sync Status */}
          <button
            onClick={onOpenCloud}
            title={
              cloudStatus === 'connected'
                ? 'Firebase realtime aktif'
                : cloudStatus === 'connecting'
                ? 'Menghubungkan ke Firebase…'
                : cloudStatus === 'offline'
                ? 'Offline — perubahan diantrekan'
                : cloudStatus === 'error'
                ? 'Gagal terhubung ke Firebase'
                : 'Aktifkan sinkronisasi Firebase'
            }
            aria-label="Status Sinkronisasi Cloud"
            className="px-2.5 py-1.5 rounded-lg bg-white border border-[#D1D1D6] hover:bg-[#F2F2F7] text-xs font-medium transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                cloudStatus === 'connected'
                  ? 'bg-[#34C759]'
                  : cloudStatus === 'connecting' || cloudStatus === 'offline'
                  ? 'bg-[#FF9500]'
                  : cloudStatus === 'error'
                  ? 'bg-[#FF3B30]'
                  : 'bg-[#C7C7CC]'
              }`}
            />
            {cloudStatus === 'connected' ? (
              <Cloud className="w-3.5 h-3.5 text-[#34C759]" />
            ) : cloudStatus === 'connecting' ? (
              <RefreshCw className="w-3.5 h-3.5 text-[#FF9500] animate-spin" />
            ) : (
              <CloudOff className="w-3.5 h-3.5 text-[#8E8E93]" />
            )}
            <span className="hidden sm:inline text-[#3A3A3C]">
              {cloudStatus === 'connected' ? 'Cloud' : cloudStatus === 'connecting' ? 'Sinkron…' : 'Lokal'}
            </span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Matikan Suara Audio' : 'Aktifkan Suara Audio'}
            aria-label={soundEnabled ? 'Matikan Audio' : 'Nyalakan Audio'}
            className={`p-2 rounded-lg border text-xs transition-colors flex items-center justify-center cursor-pointer ${
              soundEnabled
                ? 'bg-white text-[#007AFF] border-[#D1D1D6] hover:bg-[#F2F2F7]'
                : 'bg-[#F2F2F7] text-[#8E8E93] border-[#E5E5EA] hover:text-[#3A3A3C]'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Team Chat Button */}
          <button
            onClick={onToggleChat}
            aria-label="Buka Chat Tim Internal"
            className="relative px-3 py-1.5 rounded-lg bg-white border border-[#D1D1D6] hover:bg-[#F2F2F7] text-[#1C1C1E] text-xs font-medium transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#007AFF]" />
            <span className="hidden sm:inline">Pesan Tim</span>
            {unreadChatCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-[#FF3B30] text-white rounded-full text-[10px] font-bold">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Active Role Selector (Switch PIN) */}
          <button
            onClick={onOpenPinModal}
            aria-label="Ganti Hak Akses / Kunci"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#D1D1D6] hover:border-[#AEAEB2] text-[#1C1C1E] text-xs font-medium transition-all shadow-2xs cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-[#007AFF]" />
            <div className="text-left leading-tight">
              <span className="text-[10px] text-[#8E8E93] block">Peran</span>
              <span className="font-semibold text-[#1C1C1E]">{activeRoleConfig.name}</span>
            </div>
            <ChevronRight className="w-3 h-3 text-[#AEAEB2] ml-0.5" />
          </button>

          {/* Logout / Lock Button */}
          <button
            onClick={onLogout}
            title="Keluar / Kunci Layar Kasir"
            aria-label="Keluar / Kunci Layar Kasir"
            className="p-2 rounded-lg bg-white hover:bg-[#FFEBEB] text-[#8E8E93] hover:text-[#FF3B30] border border-[#D1D1D6] hover:border-[#FF3B30]/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
