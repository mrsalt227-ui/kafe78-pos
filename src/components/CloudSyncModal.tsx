import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, Trash2, X, Check } from 'lucide-react';
import {
  BASE_PATH,
  FirebaseConfig,
  getFirebaseConfig,
  isEnvConfigured,
  saveFirebaseConfig,
} from '../lib/firebase';
import { useCloudStatus } from '../hooks/useCloudState';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMPTY: FirebaseConfig = {
  apiKey: '',
  authDomain: '',
  databaseURL: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose }) => {
  const { status, error, configured } = useCloudStatus();
  const [form, setForm] = useState<FirebaseConfig>(EMPTY);
  const [rawJson, setRawJson] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const envLocked = isEnvConfigured();

  useEffect(() => {
    if (!isOpen) return;
    const existing = getFirebaseConfig();
    setForm(existing ? { ...EMPTY, ...existing } : EMPTY);
    setRawJson(existing ? JSON.stringify(existing, null, 2) : '');
    setMessage(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const update = (key: keyof FirebaseConfig, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePasteJson = (text: string) => {
    setRawJson(text);
    try {
      const parsed = JSON.parse(text) as FirebaseConfig;
      if (!parsed || typeof parsed !== 'object') return;
      setForm((prev) => ({ ...prev, ...parsed }));
      setMessage('Config terdeteksi dari JSON. Periksa lalu simpan.');
    } catch {
      // biarkan user menempel manual
    }
  };

  const handleSave = () => {
    const apiKey = (form.apiKey || '').trim();
    const projectId = (form.projectId || '').trim();
    const databaseURL = (form.databaseURL || '').trim();

    if (!apiKey) {
      setMessage('apiKey wajib diisi.');
      return;
    }
    if (!projectId && !databaseURL) {
      setMessage('Isi projectId atau databaseURL.');
      return;
    }

    saveFirebaseConfig({
      ...form,
      apiKey,
      projectId: projectId || undefined,
      databaseURL: databaseURL || undefined,
    });
    setMessage('Tersimpan. Memuat ulang…');
    setTimeout(() => window.location.reload(), 600);
  };

  const handleDisconnect = () => {
    saveFirebaseConfig(null);
    setMessage('Koneksi cloud dilepas. Memuat ulang…');
    setTimeout(() => window.location.reload(), 600);
  };

  const statusMeta =
    status === 'connected'
      ? { label: 'Tersambung realtime', tone: 'text-[#34C759]', bg: 'bg-[#E9F9EE]', Icon: Cloud }
      : status === 'connecting'
      ? { label: 'Menghubungkan…', tone: 'text-[#FF9500]', bg: 'bg-[#FFF4E5]', Icon: RefreshCw }
      : status === 'offline'
      ? { label: 'Offline (data diantrekan)', tone: 'text-[#FF9500]', bg: 'bg-[#FFF4E5]', Icon: CloudOff }
      : status === 'error'
      ? { label: 'Gagal terhubung', tone: 'text-[#FF3B30]', bg: 'bg-[#FFEBEB]', Icon: CloudOff }
      : { label: 'Belum tersambung', tone: 'text-[#8E8E93]', bg: 'bg-[#F2F2F7]', Icon: CloudOff };

  const fields: { key: keyof FirebaseConfig; label: string; placeholder: string }[] = [
    { key: 'apiKey', label: 'API Key', placeholder: 'AIza…' },
    { key: 'databaseURL', label: 'Database URL', placeholder: 'https://xxx-default-rtdb.asia-southeast1.firebasedatabase.app' },
    { key: 'projectId', label: 'Project ID', placeholder: 'kasir-abc5f' },
    { key: 'authDomain', label: 'Auth Domain', placeholder: 'kasir-abc5f.firebaseapp.com' },
    { key: 'appId', label: 'App ID', placeholder: '1:123456789:web:abcdef' },
    { key: 'storageBucket', label: 'Storage Bucket', placeholder: 'kasir-abc5f.appspot.com' },
    { key: 'messagingSenderId', label: 'Messaging Sender ID', placeholder: '123456789' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-[#F2F2F7] sm:rounded-2xl rounded-t-2xl shadow-2xl">
        <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-[#E5E5EA] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#007AFF] text-white flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-[#1C1C1E]">Sinkronisasi Cloud</h2>
              <p className="text-[11px] text-[#8E8E93] leading-none mt-0.5">Firebase Realtime Database · {BASE_PATH}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="p-2 rounded-lg bg-[#F2F2F7] text-[#8E8E93] hover:text-[#1C1C1E] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl ${statusMeta.bg}`}>
            <statusMeta.Icon className={`w-4 h-4 ${statusMeta.tone}`} />
            <div className="flex-1">
              <p className={`text-xs font-semibold ${statusMeta.tone}`}>{statusMeta.label}</p>
              {error && <p className="text-[11px] text-[#8E8E93] mt-0.5 break-words">{error}</p>}
              {!configured && (
                <p className="text-[11px] text-[#8E8E93] mt-0.5">
                  Tanpa cloud, data hanya tersimpan di perangkat ini.
                </p>
              )}
            </div>
          </div>

          {envLocked ? (
            <p className="text-[11px] text-[#8E8E93] bg-white rounded-xl border border-[#E5E5EA] px-3 py-2.5">
              Konfigurasi dibaca dari environment (<span className="font-mono">VITE_FIREBASE_*</span>) sehingga tidak bisa diubah dari sini.
            </p>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-[#E5E5EA] p-3 space-y-2">
                <label className="text-[11px] font-semibold text-[#3A3A3C]">Tempel firebaseConfig (JSON)</label>
                <textarea
                  value={rawJson}
                  onChange={(e) => handlePasteJson(e.target.value)}
                  placeholder={'{\n  "apiKey": "…",\n  "databaseURL": "…",\n  "projectId": "…"\n}'}
                  rows={4}
                  className="w-full text-[11px] font-mono rounded-lg border border-[#E5E5EA] bg-[#F9F9FB] px-2.5 py-2 text-[#1C1C1E] outline-none focus:border-[#007AFF] resize-y"
                />
              </div>

              <div className="bg-white rounded-xl border border-[#E5E5EA] divide-y divide-[#F2F2F7]">
                {fields.map((f) => (
                  <div key={f.key} className="px-3 py-2">
                    <label className="text-[10px] font-semibold text-[#8E8E93] uppercase tracking-wide">{f.label}</label>
                    <input
                      value={(form[f.key] as string) || ''}
                      onChange={(e) => update(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full mt-0.5 text-xs bg-transparent text-[#1C1C1E] outline-none placeholder:text-[#C7C7CC]"
                    />
                  </div>
                ))}
              </div>

              {message && (
                <p className="flex items-center gap-1.5 text-[11px] text-[#007AFF]">
                  <Check className="w-3.5 h-3.5" /> {message}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-[#007AFF] text-white text-xs font-semibold hover:bg-[#0066D6] transition-colors cursor-pointer"
                >
                  Simpan & Hubungkan
                </button>
                {configured && (
                  <button
                    onClick={handleDisconnect}
                    className="px-3 py-2.5 rounded-xl bg-white border border-[#FF3B30]/30 text-[#FF3B30] text-xs font-semibold hover:bg-[#FFEBEB] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Lepas
                  </button>
                )}
              </div>

              <p className="text-[10px] leading-relaxed text-[#8E8E93]">
                Data disinkronkan ke <span className="font-mono">{BASE_PATH}/</span> (master_menu, orders, stok_fifo, laporan,
                settings, chat). Pastikan Realtime Database Rules mengizinkan baca/tulis, atau login anonim aktif.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
