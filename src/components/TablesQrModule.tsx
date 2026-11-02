import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Loader2, Printer, QrCode, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react';
import { QrImage } from './QrImage';
import {
  ApprovalMode,
  CustomerSettings,
  customerUrl,
  ensureTablesSeeded,
  rotateTableToken,
  useTables,
} from '../lib/customerOrdering';

interface TablesQrModuleProps {
  settings: CustomerSettings;
  onUpdateSettings: (next: CustomerSettings) => void;
}

export const TablesQrModule: React.FC<TablesQrModuleProps> = ({ settings, onUpdateSettings }) => {
  const { tables, loading } = useTables();
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    ensureTablesSeeded().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(customerUrl(token));
      setToast('Link menu disalin');
    } catch {
      setToast('Gagal menyalin link');
    }
  };

  const rotate = async (tableId: string) => {
    if (!confirm('Buat token QR baru? QR lama tidak akan berfungsi lagi.')) return;
    setBusy(tableId);
    try {
      await rotateTableToken(tableId);
      setToast('QR berhasil diperbarui');
    } catch {
      setToast('Gagal memperbarui QR');
    } finally {
      setBusy(null);
    }
  };

  const printAll = async () => {
    if (tables.length === 0) return;
    setBusy('print');
    try {
      const cards = await Promise.all(
        tables.map(async (t) => {
          const url = customerUrl(t.token);
          const dataUrl = await QRCode.toDataURL(url, { width: 480, margin: 1 });
          return { table: t, url, dataUrl };
        })
      );

      const win = window.open('', '_blank');
      if (!win) {
        setToast('Popup diblokir browser');
        return;
      }

      win.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8" />
        <title>QR Meja — Kafe 78</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, system-ui, sans-serif; margin: 0; padding: 24px; background: #fff; color: #1C1C1E; }
          h1 { font-size: 18px; margin: 0 0 4px; }
          p.sub { font-size: 12px; color: #8E8E93; margin: 0 0 20px; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
          .card { border: 1px solid #E5E5EA; border-radius: 16px; padding: 16px; text-align: center; page-break-inside: avoid; }
          .card img { width: 180px; height: 180px; }
          .name { font-size: 16px; font-weight: 700; margin-top: 8px; }
          .hint { font-size: 10px; color: #8E8E93; margin-top: 2px; }
          .url { font-size: 9px; color: #8E8E93; word-break: break-all; margin-top: 6px; }
          @media print { body { padding: 8px; } .grid { gap: 10px; } }
        </style></head><body>
        <h1>Kafe 78 — QR Pesan di Meja</h1>
        <p class="sub">Scan untuk melihat menu dan memesan langsung dari HP.</p>
        <div class="grid">
          ${cards
            .map(
              ({ table, url, dataUrl }) => `<div class="card">
                <img src="${dataUrl}" alt="QR ${table.name}" />
                <div class="name">${table.name}</div>
                <div class="hint">Scan untuk pesan</div>
                <div class="url">${url}</div>
              </div>`
            )
            .join('')}
        </div>
        <script>window.onload = () => { window.print(); };</script>
        </body></html>`);
      win.document.close();
    } catch {
      setToast('Gagal menyiapkan cetak QR');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#F2F2F7] text-[#1C1C1E] flex items-center justify-center">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold">Meja & QR Ordering</h2>
            <p className="text-[11px] text-[#8E8E93]">Satu QR permanen per meja</p>
          </div>
        </div>
        <button
          onClick={printAll}
          disabled={busy === 'print' || tables.length === 0}
          className="px-3 py-2 rounded-xl bg-[#007AFF] text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
        >
          {busy === 'print' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
          Cetak semua
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-4 mb-4">
        <p className="text-xs font-semibold text-[#3A3A3C] mb-3">Pengaturan pesanan customer</p>

        <div className="space-y-3">
          <div>
            <p className="text-[11px] text-[#8E8E93] mb-1.5">Mode persetujuan pesanan</p>
            <div className="bg-[#E5E5EA] p-1 rounded-xl flex gap-1">
              {(
                [
                  { id: 'auto_approve' as ApprovalMode, label: 'Langsung ke dapur' },
                  { id: 'staff_approval' as ApprovalMode, label: 'Perlu persetujuan kasir' },
                ]
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onUpdateSettings({ ...settings, orderApprovalMode: opt.id })}
                  className={`flex-1 px-2 py-2 rounded-lg text-[11px] font-medium transition-all ${
                    settings.orderApprovalMode === opt.id
                      ? 'bg-white text-[#1C1C1E] font-semibold shadow-xs'
                      : 'text-[#636366]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#007AFF]" />
              <div>
                <p className="text-xs font-medium text-[#1C1C1E]">Bayar mandiri dari HP</p>
                <p className="text-[10px] text-[#8E8E93]">Klaim QRIS/transfer, verifikasi kasir</p>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ ...settings, selfPaymentEnabled: !settings.selfPaymentEnabled })}
              aria-label="Aktifkan pembayaran mandiri"
              className={`w-11 h-6 rounded-full transition-colors relative ${
                settings.selfPaymentEnabled ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                  settings.selfPaymentEnabled ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#8E8E93] gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Memuat meja…
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {tables.map((table) => (
            <div key={table.id} className="bg-white rounded-2xl border border-[#E5E5EA] p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold">{table.name}</p>
                <span className="text-[10px] font-mono text-[#8E8E93]">{table.id}</span>
              </div>
              <div className="flex justify-center">
                <QrImage value={customerUrl(table.token)} size={116} />
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  onClick={() => copyLink(table.token)}
                  className="flex-1 py-1.5 rounded-lg bg-[#F2F2F7] text-[#3A3A3C] text-[10px] font-semibold flex items-center justify-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Salin
                </button>
                <button
                  onClick={() => rotate(table.id)}
                  disabled={busy === table.id}
                  className="p-1.5 rounded-lg bg-[#F2F2F7] text-[#636366]"
                  aria-label={`Rotasi QR ${table.name}`}
                >
                  {busy === table.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-[#8E8E93] flex items-center gap-1.5 mt-4">
        <ShieldCheck className="w-3 h-3" />
        Token QR acak 24 karakter. Rotasi jika QR dicurigai disalahgunakan.
      </p>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#1C1C1E] text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
};
