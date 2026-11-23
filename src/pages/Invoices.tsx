import { useState } from 'react';
import { BanknoteIcon, CreditCardIcon, EyeIcon, PrinterIcon, QrCodeIcon, SearchIcon, WalletIcon } from 'lucide-react';
import { Card, CardHeader, PageHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { InvoiceModal } from '../components/cashier/InvoiceModal';
import { useApp } from '../contexts/AppContext';
import { formatDateTime, formatVnd } from '../utils/format';
import type { Order } from '../types';
import { billableQty } from '../utils/order';

const METHODS = ['Tất cả', 'Tiền mặt', 'Chuyển khoản', 'Thẻ'] as const;

export function Invoices() {
  const { orders, tableOf } = useApp();
  const [query, setQuery] = useState('');
  const [method, setMethod] = useState<string>('Tất cả');
  const [viewing, setViewing] = useState<Order | null>(null);

  const paid = orders.
  filter((o) => o.status === 'PAID').
  sort((a, b) => +new Date(b.paidAt ?? 0) - +new Date(a.paidAt ?? 0));

  const rows = paid.filter((o) => {
    const q = query.toLowerCase();
    const matchQ =
    !q ||
    o.id.toLowerCase().includes(q) ||
    (tableOf(o.tableId)?.name ?? '').toLowerCase().includes(q);
    return matchQ && (method === 'Tất cả' || o.paymentMethod === method);
  });

  const byMethod = (m: string) =>
  paid.filter((o) => o.paymentMethod === m).reduce((s, o) => s + o.total, 0);

  const statistics = [
    {
      name: 'Tổng thu',
      amount: formatVnd(paid.reduce((s, o) => s + o.total, 0)),
      note: `${paid.length} hóa đơn`,
      icon: WalletIcon,
      accentClass: 'border-l-blue-800 !bg-blue-100/70',
      iconClass: 'bg-blue-50 text-blue-800'
    },
    {
      name: 'Tiền mặt',
      amount: formatVnd(byMethod('Tiền mặt')),
      icon: BanknoteIcon,
      accentClass: 'border-l-emerald-500 !bg-emerald-100/70',
      iconClass: 'bg-emerald-50 text-emerald-700'
    },
    {
      name: 'Chuyển khoản',
      amount: formatVnd(byMethod('Chuyển khoản')),
      icon: QrCodeIcon,
      accentClass: 'border-l-blue-500 !bg-sky-100/70',
      iconClass: 'bg-blue-50 text-blue-700'
    },
    {
      name: 'Thẻ',
      amount: formatVnd(byMethod('Thẻ')),
      icon: CreditCardIcon,
      accentClass: 'border-l-violet-500 !bg-violet-100/70',
      iconClass: 'bg-violet-50 text-violet-700'
    }
  ];

  return (
    <div className="px-6 py-6">
      <PageHeader
        title="Lịch sử hóa đơn"
        subtitle="Tra cứu, xem lại và in lại hóa đơn đã thanh toán trong ca" />
      

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statistics.map(({ name, amount, note, icon: Icon, accentClass, iconClass }) => (
          <Card key={name} className={`!rounded-xl !shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-200 border-l-4 ${accentClass} p-5`}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-base font-bold uppercase tracking-wide text-slate-700">{name}</p>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="tabular mt-3 text-2xl font-bold tracking-tight text-slate-900">{amount}</p>
            {note && <p className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{note}</p>}
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title={`${rows.length} hóa đơn`}
          action={
          <div className="relative w-72">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Số hóa đơn, tên bàn"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100" />
            
            </div>
          } />
        
        <div className="flex flex-wrap gap-1.5 border-b border-slate-200 px-5 py-3">
          {METHODS.map((m) =>
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-out ${
            method === m ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
            }>
            
              {m}
            </button>
          )}
        </div>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead className="bg-slate-100">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-700">
                <th className="border-b-2 border-r border-slate-200 px-5 py-3 font-bold">Số HĐ</th>
                <th className="border-b-2 border-r border-slate-200 px-5 py-3 font-bold">Bàn</th>
                <th className="border-b-2 border-r border-slate-200 px-5 py-3 font-bold">Thời gian</th>
                <th className="border-b-2 border-r border-slate-200 px-5 py-3 text-right font-bold">Số món</th>
                <th className="border-b-2 border-r border-slate-200 px-5 py-3 font-bold">Phương thức</th>
                <th className="border-b-2 border-r border-slate-200 px-5 py-3 font-bold">Thu ngân</th>
                <th className="border-b-2 border-r border-slate-200 px-5 py-3 text-right font-bold">Tổng tiền</th>
                <th className="border-b-2 border-slate-200 px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((o) =>
              <tr key={o.id} className="transition-colors hover:bg-blue-50/40">
                  <td className="border-b border-r border-slate-200 px-5 py-3 font-semibold text-slate-900">{o.id}</td>
                  <td className="border-b border-r border-slate-200 px-5 py-3 font-medium text-slate-700">{tableOf(o.tableId)?.name ?? '—'}</td>
                  <td className="tabular border-b border-r border-slate-200 px-5 py-3 text-slate-600">{o.paidAt && formatDateTime(o.paidAt)}</td>
                  <td className="tabular border-b border-r border-slate-200 px-5 py-3 text-right font-medium text-slate-700">{o.lines.reduce((s, l) => s + billableQty(l), 0)}</td>
                  <td className="border-b border-r border-slate-200 px-5 py-3">
                    <Badge tone={o.paymentMethod === 'Tiền mặt' ? 'green' : o.paymentMethod === 'Thẻ' ? 'violet' : 'blue'}>
                      {o.paymentMethod}
                    </Badge>
                  </td>
                  <td className="border-b border-r border-slate-200 px-5 py-3 text-slate-600">{o.paidBy}</td>
                  <td className="tabular border-b border-r border-slate-200 px-5 py-3 text-right font-bold text-slate-900">{formatVnd(o.total)}</td>
                  <td className="border-b border-slate-200 px-5 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewing(o)}>
                        <EyeIcon className="h-3.5 w-3.5" />
                        Xem
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setViewing(o)}>
                        <PrinterIcon className="h-3.5 w-3.5" />
                        In lại
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
              {rows.length === 0 &&
              <tr>
                  <td colSpan={8} className="border-b border-slate-200 px-5 py-12 text-center text-sm text-slate-500">
                    Không có hóa đơn phù hợp.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </Card>

      <InvoiceModal order={viewing} onClose={() => setViewing(null)} />
    </div>);

}
