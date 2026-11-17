import React, { useState, useEffect } from 'react';
import { Lock, Delete } from 'lucide-react';
import { RoleType } from '../data/seedData';
import { soundEffects } from '../utils/audio';

interface LoginScreenProps {
  onSuccessLogin: (role: RoleType) => void;
  pins: Record<RoleType, string>;
  soundEnabled: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSuccessLogin,
  pins,
  soundEnabled,
}) => {
  const [pinBuffer, setPinBuffer] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pinBuffer, pins]);

  const handleDigit = (digit: string) => {
    if (soundEnabled) soundEffects.tap();
    if (pinBuffer.length >= 6) return;
    const nextPin = pinBuffer + digit;
    setPinBuffer(nextPin);
    setErrorMsg('');

    if (nextPin.length === 6) {
      setTimeout(() => verifyPin(nextPin), 100);
    }
  };

  const handleBackspace = () => {
    if (soundEnabled) soundEffects.tap();
    setPinBuffer((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const verifyPin = (candidate: string) => {
    let matchedRole: RoleType | null = null;

    for (const [role, pin] of Object.entries(pins)) {
      if (pin === candidate) {
        matchedRole = role as RoleType;
        break;
      }
    }

    if (matchedRole) {
      if (soundEnabled) soundEffects.bell();
      onSuccessLogin(matchedRole);
    } else {
      if (soundEnabled) soundEffects.alert();
      setErrorMsg('PIN salah. Silakan periksa kembali.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#F2F2F7]">
      <div className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-xl border border-[#E5E5EA] space-y-7 text-center">
        {/* Brand & Header */}
        <div className="space-y-3">
          <div className="w-16 h-16 mx-auto rounded-[24px] bg-[#1A1B2E] text-white flex items-center justify-center font-bold text-3xl shadow-sm tracking-tight">
            WS
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-[#1C1C1E]">Warung Sontoloyo</h1>
            <p className="text-xs text-[#8E8E93] mt-0.5">Sistem Kasir & Operasional Restoran</p>
          </div>
        </div>

        {/* Passcode Indicator */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-[#636366]">Masukkan 6-Digit PIN</p>
          <div
            className={`flex items-center justify-center gap-4 py-1 transition-transform ${
              isShaking ? 'translate-x-1 duration-75 text-[#FF3B30]' : ''
            }`}
          >
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const isFilled = idx < pinBuffer.length;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border transition-all ${
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

          <p className="text-xs text-[#FF3B30] h-5 font-medium">{errorMsg}</p>
        </div>

        {/* Dialpad */}
        <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto">
          {keys.map((k) => (
            <button
              key={k.num}
              onClick={() => handleDigit(k.num)}
              className="w-full h-16 rounded-[20px] bg-[#F2F2F7] hover:bg-[#E5E5EA] active:bg-[#D1D1D6] flex flex-col items-center justify-center transition-colors select-none cursor-pointer"
            >
              <span className="font-semibold text-lg leading-none text-[#1C1C1E]">{k.num}</span>
              {k.sub && (
                <span className="text-[9px] font-semibold text-[#8E8E93] tracking-widest mt-0.5">
                  {k.sub}
                </span>
              )}
            </button>
          ))}
          <div className="w-full h-16"></div>
          <button
            onClick={() => handleDigit('0')}
            className="w-full h-16 rounded-[20px] bg-[#F2F2F7] hover:bg-[#E5E5EA] active:bg-[#D1D1D6] flex flex-col items-center justify-center transition-colors select-none cursor-pointer"
          >
            <span className="font-semibold text-lg leading-none text-[#1C1C1E]">0</span>
          </button>
          <button
            onClick={handleBackspace}
            aria-label="Hapus satu angka"
            className="w-full h-16 rounded-[20px] hover:bg-[#F2F2F7] flex items-center justify-center text-[#636366] hover:text-[#1C1C1E] transition-colors select-none cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Hint */}
        <div className="pt-3 text-[11px] text-[#8E8E93] border-t border-[#F2F2F7]">
          <span>Gunakan PIN akun Anda untuk mengakses sistem</span>
        </div>
      </div>
    </div>
  );
};
