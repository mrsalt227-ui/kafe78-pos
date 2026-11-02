import React, { useState, useEffect } from 'react';
import { X, Lock, Delete } from 'lucide-react';
import { RoleType } from '../data/seedData';
import { soundEffects } from '../utils/audio';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessRole: (role: RoleType) => void;
  pins: Record<RoleType, string>;
  soundEnabled: boolean;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onSuccessRole,
  pins,
  soundEnabled,
}) => {
  const [pinBuffer, setPinBuffer] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPinBuffer('');
      setErrorMsg('');
      setIsShaking(false);
    }
  }, [isOpen]);

  // Physical keyboard support
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleKeyClick(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pinBuffer, pins]);

  if (!isOpen) return null;

  const handleKeyClick = (digit: string) => {
    if (soundEnabled) soundEffects.tap();
    if (pinBuffer.length >= 6) return;
    const newBuf = pinBuffer + digit;
    setPinBuffer(newBuf);
    setErrorMsg('');

    if (newBuf.length === 6) {
      setTimeout(() => verifyPin(newBuf), 100);
    }
  };

  const handleBackspace = () => {
    if (soundEnabled) soundEffects.tap();
    setPinBuffer((p) => p.slice(0, -1));
    setErrorMsg('');
  };

  const verifyPin = (candidate: string) => {
    let matchedRole: RoleType | null = null;
    for (const [role, pin] of Object.entries(pins)) {
      if (candidate === pin) {
        matchedRole = role as RoleType;
        break;
      }
    }

    if (matchedRole) {
      if (soundEnabled) soundEffects.bell();
      onSuccessRole(matchedRole);
      onClose();
    } else {
      if (soundEnabled) soundEffects.alert();
      setErrorMsg('PIN salah. Silakan coba lagi.');
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setPinBuffer('');
      }, 500);
    }
  };

  const keys = [
    { num: '1', sub: '' },
    { num: '2', sub: 'ABC' },
    { num: '3', sub: 'DEF' },
    { num: '4', sub: 'GHI' },
    { num: '5', sub: 'JKL' },
    { num: '6', sub: 'MNO' },
    { num: '7', sub: 'PQRS' },
    { num: '8', sub: 'TUV' },
    { num: '9', sub: 'WXYZ' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-6 border border-[#E5E5EA] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#007AFF]" />
            <h3 className="font-semibold text-sm text-[#1C1C1E]">Ganti Hak Akses / Kunci</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="w-7 h-7 rounded-full bg-[#F2F2F7] text-[#636366] hover:text-[#1C1C1E] flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Passcode Circles (Apple iOS Lockscreen Style) */}
        <div className="text-center space-y-2">
          <p className="text-xs text-[#636366]">Masukkan 6-Digit PIN Anda</p>
          <div
            className={`flex items-center justify-center gap-3.5 py-1 transition-transform ${
              isShaking ? 'translate-x-1 duration-75 text-[#FF3B30]' : ''
            }`}
          >
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const isFilled = idx < pinBuffer.length;
              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border transition-all ${
                    isFilled
                      ? isShaking
                        ? 'bg-[#FF3B30] border-[#FF3B30]'
                        : 'bg-[#1C1C1E] border-[#1C1C1E]'
                      : 'border-[#C7C7CC] bg-white'
                  }`}
                ></div>
              );
            })}
          </div>

          <p className="text-xs text-[#FF3B30] h-4 font-medium">{errorMsg}</p>
        </div>

        {/* iOS Phone / Passcode Dialpad */}
        <div className="grid grid-cols-3 gap-3.5 max-w-[240px] mx-auto">
          {keys.map((k) => (
            <button
              key={k.num}
              onClick={() => handleKeyClick(k.num)}
              className="w-16 h-16 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] active:bg-[#D1D1D6] flex flex-col items-center justify-center transition-colors mx-auto select-none cursor-pointer"
            >
              <span className="font-semibold text-xl leading-none text-[#1C1C1E]">{k.num}</span>
              {k.sub && (
                <span className="text-[9px] font-semibold text-[#8E8E93] tracking-widest mt-0.5">
                  {k.sub}
                </span>
              )}
            </button>
          ))}
          <div className="w-16 h-16"></div>
          <button
            onClick={() => handleKeyClick('0')}
            className="w-16 h-16 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] active:bg-[#D1D1D6] flex flex-col items-center justify-center transition-colors mx-auto select-none cursor-pointer"
          >
            <span className="font-semibold text-xl leading-none text-[#1C1C1E]">0</span>
          </button>
          <button
            onClick={handleBackspace}
            aria-label="Hapus satu angka"
            className="w-16 h-16 rounded-full hover:bg-[#F2F2F7] flex items-center justify-center text-[#636366] hover:text-[#1C1C1E] transition-colors mx-auto select-none cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center pt-2 border-t border-[#F2F2F7]">
          <p className="text-[11px] text-[#8E8E93]">
            Sistem otomatis mengarahkan ke tampilan sesuai peran PIN
          </p>
        </div>
      </div>
    </div>
  );
};
