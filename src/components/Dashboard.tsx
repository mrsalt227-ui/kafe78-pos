import React from 'react';
import { 
  TrendingDown, 
  TrendingUp, 
  BarChart3, 
  Activity, 
  CreditCard,
  Wallet,
  Clock,
  AlertCircle
} from 'lucide-react';
const formatRupiahLocal = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID');

interface StatCardProps {
  title: string;
  value: string;
  delta: string;
  deltaUp: boolean;
  icon: React.ReactNode;
  iconColor: string;
  children?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({
  title, value, delta, deltaUp, icon, iconColor, children,
}) => (
  <div className="stat-card">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-[#5B4FE9]/10 flex items-center justify-center text-[#5B4FE9]">
          {icon}
        </div>
        <span className="text-[10px] font-semibold text-[#636366] uppercase tracking-wider">
          {title}
        </span>
      </div>
      {deltaUp ? <TrendingUp className="w-4 h-4 text-[#34C759]" /> : <TrendingDown className="w-4 h-4 text-[#FF3B30]" />}
    </div>
    <div className="text-2xl font-bold text-[#1C1C1E] mb-1">{value}</div>
    <div className={`text-xs font-medium ${deltaUp ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
      {delta} dari bulan lalu
    </div>
    {children && <div className="mt-4">{children}</div>}
  </div>
);

interface MiniBarChartProps {}
const MiniBarChart: React.FC<MiniBarChartProps> = () => {
  const values = [20, 45, 30, 60, 40, 85];
  const max = Math.max(...values);
  return (
    <div className="flex items-end gap-2 h-24 w-full">
      {values.map((v, i) => (
        <div
          key={i}
          className="w-full bg-[#5B4FE9]/20 rounded-t-sm transition-all hover:bg-[#5B4FE9]/40"
          style={{ height: `${(v / max) * 100}%` }}
        />
      ))}
    </div>
  );
};

interface MiniLineChartProps {}
const MiniLineChart: React.FC<MiniLineChartProps> = () => {
  const points = [10, 25, 18, 40, 32, 55, 48, 70];
  return (
    <svg className="w-full h-24" viewBox="0 0 100 60" fill="none">
      <defs>
        <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5B4FE9" />
          <stop offset="100%" stopColor="#5B4FE9" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <polyline
        points={points.map((p, i) => `${i * 14 + 10} ${60 - (p / 70) * 50}`).join(' ')}
        stroke="url(#grad)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={i * 14 + 10}
          cy={60 - (p / 70) * 50}
          r="2.5"
          fill="#5B4FE9"
        />
      ))}
    </svg>
  );
};

interface PaymentChipProps {}
const PaymentChip: React.FC<PaymentChipProps> = () => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#5B4FE9]/10 border border-[#5B4FE9]/20 mb-2">
    <div className="w-2 h-2 rounded-full bg-[#5B4FE9]"></div>
    <span className="text-[11px] text-[#B0B0C3]">Visa •••• 4242</span>
    <span className="ml-auto text-[10px] font-medium text-[#5B4FE9]">•••• 4242</span>
  </div>
);

export const Dashboard: React.FC = () => {
  const overdue = 24850000;
  const dueMonth = 142560000;
  const avgDays = 16;
  const availablePayout = 186540000;

  return (
    <div className="space-y-6">
      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pendapatan Tertunggak"
          value={formatRupiahLocal(overdue)}
          delta="+12.5%"
          deltaUp={false}
          icon={<AlertCircle className="w-5 h-5" />}
          iconColor="#FF3B30"
        />
        <StatCard
          title="Jatuh Tempo Bulan Ini"
          value={formatRupiahLocal(dueMonth)}
          delta="+8.2%"
          deltaUp={true}
          icon={<BarChart3 className="w-5 h-5" />}
          iconColor="#5B4FE9"
          children={<MiniBarChart />}
        />
        <StatCard
          title="Waktu Rata-Rata Pembayaran"
          value={`${avgDays} hari`}
          delta="-2 hari"
          deltaUp={true}
          icon={<Clock className="w-5 h-5" />}
          iconColor="#5B4FE9"
          children={<MiniLineChart />}
        />
        <StatCard
          title="Tersedia untuk Payout"
          value={formatRupiahLocal(availablePayout)}
          delta="Expects"
          deltaUp={true}
          icon={<Wallet className="w-5 h-5" />}
          iconColor="#34C759"
          children={
            <div className="space-y-2">
              <PaymentChip />
              <PaymentChip />
              <PaymentChip />
              <button className="w-full btn-pill btn-pill-dark text-[11px] px-3 py-1.5">
                Payout Sekarang
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
};
