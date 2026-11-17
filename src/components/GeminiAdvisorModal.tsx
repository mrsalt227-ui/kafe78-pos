import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Lightbulb, 
  Copy, 
  Check, 
  Bot,
  ArrowRight
} from 'lucide-react';
import { formatRupiah } from '../utils/pos';

interface GeminiAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  period: 'today' | 'week' | 'all';
  summary: {
    totalRevenue: number;
    totalHpp: number;
    grossProfit: number;
    grossMarginPercent: number;
    totalTransactions: number;
    avgOrderValue: number;
    totalQtySold: number;
  };
  categoryBreakdown: {
    category: string;
    revenue: number;
    hppTotal: number;
    profitTotal: number;
    marginPercent: number;
    qty: number;
  }[];
  topItems: {
    name: string;
    category: string;
    qty: number;
    revenue: number;
    profitTotal: number;
    marginPercent: number;
    unitPrice: number;
    unitCost: number;
  }[];
  lowMarginItems: {
    name: string;
    category: string;
    qty: number;
    revenue: number;
    profitTotal: number;
    marginPercent: number;
    unitPrice: number;
    unitCost: number;
  }[];
}

type FocusType = 'comprehensive' | 'margins' | 'pricing' | 'promos';

export const GeminiAdvisorModal: React.FC<GeminiAdvisorModalProps> = ({
  isOpen,
  onClose,
  period,
  summary,
  categoryBreakdown,
  topItems,
  lowMarginItems,
}) => {
  const [focus, setFocus] = useState<FocusType>('comprehensive');
  const [loading, setLoading] = useState(false);
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [sourceModel, setSourceModel] = useState<string>('gemini-3.8-flash');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<number | null>(null);

  const fetchAnalysis = async (focusMode: FocusType = focus) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/gemini/analyze-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period,
          summary,
          categoryBreakdown,
          topItems,
          lowMarginItems,
          focus: focusMode,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server status ${res.status}`);
      }

      const data = await res.json();
      if (data.analysis) {
        setAnalysisText(data.analysis);
        setSourceModel(data.source || 'gemini-3.8-flash');
        setGeneratedAt(data.generatedAt || Date.now());
      } else {
        throw new Error(data.error || 'Tidak ada analisis yang diterima');
      }
    } catch (err: any) {
      console.error('Failed to fetch Gemini analysis:', err);
      setErrorMsg('Gagal terhubung dengan server analisis AI. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !analysisText && !loading) {
      fetchAnalysis('comprehensive');
    }
  }, [isOpen]);

  const handleCopy = () => {
    if (!analysisText) return;
    navigator.clipboard.writeText(analysisText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const periodLabel = period === 'today' ? 'Hari Ini' : period === 'week' ? '7 Hari Terakhir' : 'Semua Waktu';

  const renderFormattedMarkdown = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-3 text-xs leading-relaxed text-[#1C1C1E]">
        {lines.map((line, idx) => {
          const trimmed = line.trim();

          if (trimmed === '---') {
            return <hr key={idx} className="my-3 border-[#E5E5EA]" />;
          }

          if (trimmed.startsWith('### ')) {
            const heading = trimmed.replace('### ', '');
            return (
              <div key={idx} className="pt-2 pb-1">
                <h4 className="font-bold text-sm text-[#1C1C1E] flex items-center gap-1.5 tracking-tight">
                  {heading}
                </h4>
              </div>
            );
          }

          if (trimmed.startsWith('## ')) {
            const heading = trimmed.replace('## ', '');
            return (
              <div key={idx} className="pt-2 pb-1 border-b border-[#F2F2F7]">
                <h3 className="font-extrabold text-base text-[#1C1C1E]">
                  {heading}
                </h3>
              </div>
            );
          }

          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const content = trimmed.substring(2);
            return (
              <div key={idx} className="flex items-start gap-2 pl-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5B4FE9] mt-1.5 shrink-0"></span>
                <span className="flex-1">
                  {formatBoldSegments(content)}
                </span>
              </div>
            );
          }

          if (/^\d+\.\s/.test(trimmed)) {
            const match = trimmed.match(/^(\d+)\.\s(.*)$/);
            if (match) {
              const num = match[1];
              const content = match[2];
              return (
                <div key={idx} className="flex items-start gap-2.5 p-2 rounded-[12px] bg-[#F8F8FA] border border-[#E5E5EA]">
                  <span className="w-5 h-5 rounded-full bg-[#5B4FE9] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {num}
                  </span>
                  <span className="flex-1 text-[#1C1C1E] font-medium">
                    {formatBoldSegments(content)}
                  </span>
                </div>
              );
            }
          }

          if (!trimmed) {
            return <div key={idx} className="h-1" />;
          }

          return (
            <p key={idx} className="text-[#3A3A3C]">
              {formatBoldSegments(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  const formatBoldSegments = (raw: string) => {
    const parts = raw.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-[#1C1C1E]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/45 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-[#E5E5EA] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#F2F2F7] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[20px] bg-[#5B4FE9]/10 flex items-center justify-center text-[#5B4FE9] shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#1C1C1E]">
                  Konsultan Keuangan AI Warung Sontoloyo
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#5B4FE9]/10 text-[#5B4FE9] text-[10px] font-bold border border-[#5B4FE9]/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5B4FE9] animate-pulse"></span>
                  {sourceModel}
                </span>
              </div>
              <p className="text-xs text-[#8E8E93]">
                Analisis HPP, margin laba kotor, dan rekomendasi menu (Periode: {periodLabel})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={!analysisText || loading}
              className="p-2.5 rounded-[12px] text-[#636366] hover:bg-[#F2F2F7] transition-all disabled:opacity-40 cursor-pointer"
              title="Salin Analisis"
            >
              {copied ? (
                <Check className="w-4 h-4 text-[#34C759]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#636366] flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-6 py-3 bg-[#F8F8FA] border-b border-[#E5E5EA] text-xs">
          <div className="bg-white p-2.5 rounded-[12px] border border-[#E5E5EA]">
            <span className="text-[10px] text-[#8E8E93] font-medium block">Total Omzet</span>
            <span className="font-mono font-bold text-sm text-[#5B4FE9]">
              {formatRupiah(summary.totalRevenue)}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-[12px] border border-[#E5E5EA]">
            <span className="text-[10px] text-[#8E8E93] font-medium block">Total HPP</span>
            <span className="font-mono font-bold text-sm text-[#FF9500]">
              {formatRupiah(summary.totalHpp)}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-[12px] border border-[#E5E5EA]">
            <span className="text-[10px] text-[#8E8E93] font-medium block">Laba Kotor</span>
            <span className="font-mono font-bold text-sm text-[#34C759]">
              {formatRupiah(summary.grossProfit)}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-[12px] border border-[#E5E5EA]">
            <span className="text-[10px] text-[#8E8E93] font-medium block">Margin Kotor</span>
            <span className="font-mono font-bold text-sm text-[#1C1C1E]">
              {summary.grossMarginPercent}%
              <span className={`text-[10px] ml-1 font-semibold ${summary.grossMarginPercent >= 55 ? 'text-[#34C759]' : 'text-[#FF9500]'}`}>
                {summary.grossMarginPercent >= 55 ? '(Sehat)' : '(Cukup)'}
              </span>
            </span>
          </div>
        </div>

        {/* Focus Selector */}
        <div className="px-6 py-2.5 bg-white border-b border-[#F2F2F7] flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            <span className="text-xs text-[#8E8E93] font-medium mr-1">Fokus Analisis:</span>
            {[
              { id: 'comprehensive', label: 'Ringkasan Eksekutif' },
              { id: 'margins', label: 'Margin & HPP' },
              { id: 'pricing', label: 'Strategi Harga' },
              { id: 'promos', label: 'Bundling & Promo' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setFocus(f.id as FocusType);
                  fetchAnalysis(f.id as FocusType);
                }}
                disabled={loading}
                className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all cursor-pointer ${
                  focus === f.id
                    ? 'bg-[#5B4FE9] text-white shadow-sm'
                    : 'text-[#636366] hover:text-[#1C1C1E] hover:bg-[#F2F2F7]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchAnalysis(focus)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#5B4FE9] hover:text-[#4A3FD8] disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>

        {/* Modal Body / Analysis Display */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="space-y-4 py-8">
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-[20px] bg-[#5B4FE9]/10 text-[#5B4FE9] flex items-center justify-center animate-pulse">
                  <Bot className="w-6 h-6 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-[#1C1C1E]">
                    Gemini AI Sedang Menganalisis Data Warung Sontoloyo...
                  </h4>
                  <p className="text-xs text-[#8E8E93]">
                    Menghitung kontribusi margin hidangan, rasio HPP, dan menyusun rekomendasi taktis
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 max-w-xl mx-auto pt-3">
                <div className="h-4 bg-[#F2F2F7] rounded-[8px] animate-pulse w-3/4"></div>
                <div className="h-16 bg-[#F8F8FA] rounded-[20px] border border-[#E5E5EA] animate-pulse"></div>
                <div className="h-4 bg-[#F2F2F7] rounded-[8px] animate-pulse w-1/2"></div>
                <div className="h-20 bg-[#F8F8FA] rounded-[20px] border border-[#E5E5EA] animate-pulse"></div>
              </div>
            </div>
          ) : errorMsg ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#FFEBEB] text-[#FF3B30] flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <p className="text-xs text-[#FF3B30] font-semibold">{errorMsg}</p>
              <button
                onClick={() => fetchAnalysis(focus)}
                className="px-4 py-2 rounded-[12px] bg-[#5B4FE9] text-white text-xs font-semibold cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          ) : analysisText ? (
            <div className="space-y-4">
              {renderFormattedMarkdown(analysisText)}
            </div>
          ) : (
            <div className="text-center py-12 text-[#8E8E93] text-xs">
              Klik "Segarkan" untuk meminta analisis dari AI Advisor.
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-[#F2F2F7] bg-[#F8F8FA] flex items-center justify-between text-[11px] text-[#8E8E93]">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759]" />
            Dihitung otomatis berdasarkan data transaksi aktual & sistem HPP Warung Sontoloyo
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-[12px] bg-[#1A1B2E] text-white font-semibold text-xs hover:bg-[#25263B] cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
