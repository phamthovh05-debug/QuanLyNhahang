import { useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis } from
'recharts';
import { BanknoteIcon, CalendarDaysIcon, TrendingUpIcon } from 'lucide-react';
import { Card, CardHeader, PageHeader } from '../components/ui/Card';
import { useApp } from '../contexts/AppContext';
import { useMetrics } from '../hooks/useMetrics';
import { formatDayLabel, formatShortVnd, formatVnd } from '../utils/format';

type Tab = 'revenue' | 'cost' | 'profit';

const CONFIG: Record<
  Tab,
  {title: string;key: string;color: string;}> =
{
  revenue: {
    title: 'Doanh thu',
    key: 'Doanh thu',
    color: '#2246d4'
  },
  cost: {
    title: 'Chi phí nguyên liệu',
    key: 'Chi phí',
    color: '#f97316'
  },
  profit: {
    title: 'Lợi nhuận gộp',
    key: 'Lợi nhuận',
    color: '#10b981'
  }
};

export function Finance() {
  const { tab = 'revenue' } = useParams<{tab: Tab;}>();
  const cfg = CONFIG[tab as Tab in CONFIG ? tab as Tab : 'revenue'];
  const m = useMetrics();
  const { orders, ingredientOf, transactions, tableOf } = useApp();

  const data = m.series.map((s) => ({
    label: formatDayLabel(s.date),
    'Doanh thu': s.revenue,
    'Chi phí': s.cost,
    'Lợi nhuận': s.profit
  }));

  const todayValue =
  cfg.key === 'Doanh thu' ?
  m.revenueToday :
  cfg.key === 'Chi phí' ?
  m.costToday :
  m.profitToday;
  const monthValue =
  cfg.key === 'Doanh thu' ?
  m.revenueMonth :
  cfg.key === 'Chi phí' ?
  m.costMonth :
  m.profitMonth;

  return (
    <div className="px-6 py-6">
      <PageHeader title={cfg.title} />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Hôm nay',
            amount: todayValue,
            note: `Tổng ${cfg.title.toLocaleLowerCase('vi')} hôm nay`,
            icon: BanknoteIcon,
            accentClass: 'border-l-blue-800 !bg-blue-100/70',
            iconClass: 'bg-blue-50 text-blue-800'
          },
          {
            label: '7 ngày gần nhất',
            amount: monthValue,
            note: `Tổng ${cfg.title.toLocaleLowerCase('vi')} trong 7 ngày`,
            icon: CalendarDaysIcon,
            accentClass: 'border-l-emerald-500 !bg-emerald-100/70',
            iconClass: 'bg-emerald-50 text-emerald-700'
          },
          {
            label: 'Trung bình / ngày',
            amount: monthValue / 7,
            note: 'Bình quân trong 7 ngày gần nhất',
            icon: TrendingUpIcon,
            accentClass: 'border-l-violet-500 !bg-violet-100/70',
            iconClass: 'bg-violet-50 text-violet-700'
          }
        ].map(({ label, amount, note, icon: Icon, accentClass, iconClass }) => (
          <Card key={label} className={`!rounded-xl !shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-200 border-l-4 ${accentClass} p-5`}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-base font-bold uppercase tracking-wide text-slate-700">{label}</p>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="tabular mt-3 text-2xl font-bold tracking-tight text-slate-900">{formatVnd(amount)}</p>
            <p className="mt-2 inline-flex rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium text-slate-600">{note}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title={`${cfg.title} theo ngày`} />
        <div className="h-80 px-3 py-4">
          <ResponsiveContainer width="100%" height="100%">
            {cfg.key === 'Chi phí' ?
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => formatShortVnd(Number(v))} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip formatter={(v: number) => formatVnd(v)} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey={cfg.key} fill={cfg.color} radius={[6, 6, 0, 0]} barSize={28} />
              </BarChart> :

            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => formatShortVnd(Number(v))} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip formatter={(v: number) => formatVnd(v)} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Line type="monotone" dataKey={cfg.key} stroke={cfg.color} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            }
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Đơn hàng trong ca" />
          
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2.5 font-medium">Hóa đơn</th>
                <th className="px-5 py-2.5 font-medium">Bàn</th>
                <th className="px-5 py-2.5 text-right font-medium">Doanh thu</th>
                <th className="px-5 py-2.5 text-right font-medium">Giá vốn</th>
                <th className="px-5 py-2.5 text-right font-medium">Lợi nhuận</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.filter((o) => o.status === 'PAID').map((o) =>
              <tr key={o.id}>
                  <td className="px-5 py-3 font-medium text-slate-900">{o.id}</td>
                  <td className="px-5 py-3 text-slate-500">{tableOf(o.tableId)?.name ?? '—'}</td>
                  <td className="tabular px-5 py-3 text-right">
                    {formatVnd(o.total)}
                  </td>
                  <td className="tabular px-5 py-3 text-right text-orange-600">
                    {o.cost ? formatVnd(o.cost) : 'Chờ bếp'}
                  </td>
                  <td className="tabular px-5 py-3 text-right font-medium text-emerald-600">
                    {o.cost ? formatVnd(o.total - o.cost) : '—'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardHeader
            title={
            cfg.key === 'Chi phí' ?
            'Chi phí theo nguyên liệu' :
            'Đóng góp theo món'
            } />
          
          <ul className="divide-y divide-slate-100">
            {cfg.key === 'Chi phí' ?
            Object.entries(
              transactions.
              filter((t) => t.type !== 'NHẬP KHO').
              reduce<Record<string, number>>((acc, t) => {
                const name = ingredientOf(t.ingredientId).name;
                acc[name] = (acc[name] ?? 0) + t.value;
                return acc;
              }, {})
            ).
            sort((a, b) => b[1] - a[1]).
            map(([name, value]) =>
            <li
              key={name}
              className="flex items-center justify-between px-5 py-3 text-sm">
              
                      <span className="font-semibold text-brand-700">{name}</span>
                      <span className="tabular font-medium text-slate-900">
                        {formatVnd(value)}
                      </span>
                    </li>
            ) :
            m.topDishes.map((d) =>
            <li
              key={d.name}
              className="flex items-center justify-between px-5 py-3 text-sm">
              
                    <span className="font-semibold text-brand-700">
                      {d.name}
                      <span className="ml-2 text-xs text-slate-400">
                        {d.sold} phần
                      </span>
                    </span>
                    <span className="tabular font-medium text-slate-900">
                      {formatVnd(d.revenue)}
                    </span>
                  </li>
            )}
          </ul>
        </Card>
      </div>
    </div>);

}
