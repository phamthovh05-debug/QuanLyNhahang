import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DownloadIcon, FileTextIcon, PrinterIcon, SendIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, PageHeader } from '../components/ui/Card';
import { Field, inputClass } from '../components/ui/Field';
import { InvoiceModal } from '../components/cashier/InvoiceModal';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../contexts/AppContext';
import type { CashVoucher, FinancialReportDetails, Order, PayrollRecord, StockTx } from '../types';
import { formatDateTime, formatShortVnd, formatVnd } from '../utils/format';

type ReportRange = { start: string; end: string };
type PayrollReadResult = { rows: PayrollRecord[]; error: string };
type ExpenseDetail =
  | { kind: 'stock'; transaction: StockTx; order: Order }
  | { kind: 'voucher'; voucher: CashVoucher }
  | { kind: 'payroll'; payroll: PayrollRecord };
type ExpenseRow = {
  id: string;
  date: string;
  description: string;
  group: string;
  amount: number;
  status: string;
  detail: ExpenseDetail;
};
type ChartRow = { key: string; label: string; revenue: number; expense: number };
type ExpenseGroup = 'Giá vốn nguyên liệu' | 'Điện, nước, gas' | 'Lương nhân viên' | 'Chi phí hoạt động khác';

const PAYROLL_KEY = 'bepkho.payroll';
const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const isInRange = (value: string, range: ReportRange) => {
  const date = value.slice(0, 10);
  return date >= range.start && date <= range.end;
};
const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

function readPayroll(): PayrollReadResult {
  let stored: string | null;
  try {
    stored = window.localStorage.getItem(PAYROLL_KEY);
  } catch {
    return { rows: [], error: 'Không thể đọc bảng lương từ bộ nhớ trình duyệt.' };
  }
  if (!stored) return { rows: [], error: '' };
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return { rows: [], error: 'Dữ liệu bảng lương không đúng định dạng.' };
    const validRows = parsed.filter(isPayrollRecord);
    return {
      rows: validRows,
      error: validRows.length === parsed.length ? '' : 'Một số bản ghi bảng lương không hợp lệ và đã được bỏ qua.'
    };
  } catch {
    return { rows: [], error: 'Dữ liệu bảng lương bị lỗi định dạng, vui lòng kiểm tra lại bảng lương.' };
  }
}

function isPayrollRecord(value: unknown): value is PayrollRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' &&
    typeof record.month === 'string' &&
    typeof record.createdAt === 'string' &&
    Array.isArray(record.lines) &&
    typeof record.total === 'number' &&
    ['PENDING_ACCOUNTING', 'ACCOUNTANT_APPROVED', 'PENDING_MANAGER', 'MANAGER_APPROVED', 'REVISION_REQUESTED'].includes(String(record.status));
}

function dateLabel(date: Date) {
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function expenseGroupForVoucher(voucher: CashVoucher): ExpenseGroup {
  const category = voucher.category.toLocaleLowerCase('vi-VN');
  return category.includes('điện') || category.includes('nước') || category.includes('gas')
    ? 'Điện, nước, gas'
    : 'Chi phí hoạt động khác';
}

function isExcludedExpenseVoucher(voucher: CashVoucher) {
  const category = voucher.category.toLocaleLowerCase('vi-VN');
  return !!voucher.debtId ||
    category.includes('thanh toán công nợ') ||
    category.includes('nguyên vật liệu') ||
    category.includes('nguyên liệu') ||
    category.includes('lương');
}

export function AccountantRevenueExpenseReport() {
  const { orders, transactions, cashLedger, ingredients, createFinancialReport } = useApp();
  const today = new Date();
  const initialStart = isoDate(new Date(today.getFullYear(), today.getMonth(), 1));
  const initialEnd = isoDate(today);
  const [draftStart, setDraftStart] = useState(initialStart);
  const [draftEnd, setDraftEnd] = useState(initialEnd);
  const [range, setRange] = useState<ReportRange>({ start: initialStart, end: initialEnd });
  const [rangeError, setRangeError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRow | null>(null);
  const [payrollRead] = useState<PayrollReadResult>(readPayroll);
  const [sendStatus, setSendStatus] = useState('');

  const setQuickRange = (period: 'today' | 'week' | 'month' | 'previousMonth') => {
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let end = new Date(start);
    if (period === 'week') {
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'previousMonth') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    }
    setDraftStart(isoDate(start));
    setDraftEnd(isoDate(end));
    setRangeError('');
    setSendStatus('');
  };

  const applyRange = () => {
    if (!draftStart || !draftEnd || draftStart > draftEnd) {
      setRangeError('Vui lòng chọn khoảng ngày hợp lệ: Từ ngày không được sau Đến ngày.');
      return;
    }
    setRange({ start: draftStart, end: draftEnd });
    setRangeError('');
    setSendStatus('');
  };

  const paidOrders = useMemo(
    () => orders
      .filter(order => !order.demo && order.status === 'PAID' && !!order.paidAt && isInRange(order.paidAt, range))
      .sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? '')),
    [orders, range]
  );
  const revenueNet = useMemo(
    () => paidOrders.reduce((sum, order) => sum + order.subtotal - order.discount, 0),
    [paidOrders]
  );

  const expenses = useMemo<ExpenseRow[]>(() => {
    const ordersById = new Map(orders.filter(order => !order.demo).map(order => [order.id, order]));
    const consumptionRows: ExpenseRow[] = transactions
      .filter(transaction => transaction.type === 'BÁN HÀNG' && isInRange(transaction.at, range))
      .flatMap(transaction => {
        const separator = transaction.reason.lastIndexOf('— ');
        const orderId = separator >= 0 ? transaction.reason.slice(separator + 2).trim() : '';
        const order = ordersById.get(orderId);
        if (!order) return [];
        return [{
          id: transaction.id,
          date: transaction.at,
          description: `${transaction.reason} · hóa đơn ${order.id}`,
          group: 'Giá vốn nguyên liệu',
          amount: transaction.value,
          status: 'Đã ghi nhận',
          detail: { kind: 'stock', transaction, order }
        }];
      });

    const voucherRows: ExpenseRow[] = cashLedger.vouchers
      .filter(voucher =>
        !voucher.demo &&
        voucher.type === 'PAYMENT' &&
        voucher.status === 'Đã xác nhận' &&
        voucher.accountingTreatment === 'EXPENSE' &&
        !isExcludedExpenseVoucher(voucher) &&
        isInRange(voucher.date, range)
      )
      .map(voucher => ({
        id: voucher.id,
        date: voucher.date,
        description: voucher.description || voucher.reason,
        group: expenseGroupForVoucher(voucher),
        amount: voucher.amount,
        status: voucher.status,
        detail: { kind: 'voucher', voucher }
      }));

    const payrollRows: ExpenseRow[] = payrollRead.rows
      .filter(payroll => !payroll.demo && payroll.status === 'MANAGER_APPROVED')
      .filter(payroll => isInRange(payroll.reviewedAt || payroll.createdAt, range))
      .map(payroll => ({
        id: payroll.id,
        date: payroll.reviewedAt || payroll.createdAt,
        description: `Bảng lương tháng ${payroll.month}`,
        group: 'Lương nhân viên',
        amount: payroll.total,
        status: 'Đã xác nhận',
        detail: { kind: 'payroll', payroll }
      }));

    return [...consumptionRows, ...voucherRows, ...payrollRows].sort((a, b) => b.date.localeCompare(a.date));
  }, [orders, transactions, cashLedger.vouchers, payrollRead.rows, range]);

  const cogs = expenses.filter(row => row.group === 'Giá vốn nguyên liệu').reduce((sum, row) => sum + row.amount, 0);
  const payrollTotal = expenses.filter(row => row.group === 'Lương nhân viên').reduce((sum, row) => sum + row.amount, 0);
  const utilities = expenses.filter(row => row.group === 'Điện, nước, gas').reduce((sum, row) => sum + row.amount, 0);
  const otherOperating = expenses.filter(row => row.group === 'Chi phí hoạt động khác').reduce((sum, row) => sum + row.amount, 0);
  const operating = payrollTotal + utilities + otherOperating;
  const totalExpenses = cogs + operating;
  const estimatedProfit = revenueNet - totalExpenses;
  const expenseGroups: { name: ExpenseGroup; amount: number }[] = [
    { name: 'Giá vốn nguyên liệu', amount: cogs },
    { name: 'Điện, nước, gas', amount: utilities },
    { name: 'Lương nhân viên', amount: payrollTotal },
    { name: 'Chi phí hoạt động khác', amount: otherOperating }
  ];

  const chartData = useMemo(() => {
    const start = new Date(`${range.start}T00:00:00`);
    const end = new Date(`${range.end}T00:00:00`);
    const dayCount = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    const weekly = dayCount > 31;
    const buckets = new Map<string, ChartRow>();
    const cursor = new Date(start);
    if (weekly) cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
    while (cursor <= end) {
      const keyDate = isoDate(cursor);
      const bucketEnd = new Date(cursor);
      if (weekly) bucketEnd.setDate(bucketEnd.getDate() + 6);
      const label = weekly ? `${dateLabel(cursor)}–${dateLabel(bucketEnd)}` : dateLabel(cursor);
      buckets.set(keyDate, { key: keyDate, label, revenue: 0, expense: 0 });
      cursor.setDate(cursor.getDate() + (weekly ? 7 : 1));
    }

    const bucketKey = (value: string) => {
      const date = new Date(`${value.slice(0, 10)}T00:00:00`);
      if (weekly) date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
      return isoDate(date);
    };
    paidOrders.forEach(order => {
      const key = bucketKey(order.paidAt ?? '');
      const bucket = buckets.get(key);
      if (bucket) bucket.revenue += order.subtotal - order.discount;
    });
    expenses.forEach(row => {
      const key = bucketKey(row.date);
      const bucket = buckets.get(key);
      if (bucket) bucket.expense += row.amount;
    });
    return [...buckets.values()];
  }, [range, paidOrders, expenses]);

  const exportReport = () => {
    const rows: (string | number)[][] = [
      ['BÁO CÁO TÀI CHÍNH', `${range.start} - ${range.end}`],
      ['Chỉ số', 'Số tiền'],
      ['Tổng doanh thu thuần', revenueNet],
      ['Tổng giá vốn nguyên liệu', cogs],
      ['Tổng chi phí hoạt động', operating],
      ['Lợi nhuận tạm tính', estimatedProfit],
      [],
      ['CHI TIẾT DOANH THU'],
      ['STT', 'Ngày ghi nhận', 'Mã hóa đơn', 'Số tiền trước giảm giá', 'Giảm giá', 'Doanh thu thuần', 'Trạng thái thanh toán'],
      ...paidOrders.map((order, index) => [index + 1, order.paidAt ?? '', order.id, order.subtotal, order.discount, order.subtotal - order.discount, 'Đã thanh toán']),
      [],
      ['CHI TIẾT CHI PHÍ'],
      ['STT', 'Ngày ghi nhận', 'Mã chứng từ', 'Nội dung chi phí', 'Nhóm chi phí', 'Số tiền', 'Trạng thái'],
      ...expenses.map((row, index) => [index + 1, row.date, row.id, row.description, row.group, row.amount, row.status])
    ];
    const csv = rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `bao-cao-tai-chinh-${range.start}-${range.end}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const sendReport = () => {
    if (!draftStart || !draftEnd || draftStart > draftEnd || draftStart !== range.start || draftEnd !== range.end) {
      setRangeError('Vui lòng bấm “Xem báo cáo” để áp dụng khoảng thời gian trước khi gửi.');
      setSendStatus('');
      return;
    }
    const details: FinancialReportDetails = {
      revenueRows: paidOrders.map(order => ({
        id: order.id,
        date: order.paidAt ?? '',
        subtotal: order.subtotal,
        discount: order.discount,
        netRevenue: order.subtotal - order.discount,
        status: 'Đã thanh toán'
      })),
      expenseRows: expenses.map(row => ({
        id: row.id,
        date: row.date,
        description: row.description,
        group: row.group,
        amount: row.amount,
        status: row.status
      }))
    };
    const report = createFinancialReport(range.start, range.end, {
      netRevenue: revenueNet,
      cogs,
      operatingExpenses: operating,
      totalExpenses,
      estimatedProfit,
      invoiceCount: paidOrders.length,
      expenseCount: expenses.length,
      utilities,
      payroll: payrollTotal,
      otherOperating
    }, details);
    if (report) setSendStatus(`Đã gửi báo cáo ${report.id} cho quản lý.`);
  };

  return <>
    <PageHeader
      title="Báo cáo tài chính"
      action={<div className="no-print flex flex-wrap gap-2">
        <Button variant="secondary" onClick={exportReport}><DownloadIcon className="h-4 w-4" />Xuất Excel (CSV)</Button>
        <Button variant="secondary" onClick={() => window.print()}><PrinterIcon className="h-4 w-4" />Xuất PDF</Button>
        <Button disabled={!!payrollRead.error} onClick={sendReport}><SendIcon className="h-4 w-4" />Gửi báo cáo cho quản lý</Button>
      </div>}
    />
    {sendStatus && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{sendStatus}</p>}

    <Card className="mb-5 overflow-hidden">
      <CardHeader title="Khoảng thời gian" />
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2 no-print">
          <Button size="sm" variant="secondary" onClick={() => setQuickRange('today')}>Hôm nay</Button>
          <Button size="sm" variant="secondary" onClick={() => setQuickRange('week')}>Tuần này</Button>
          <Button size="sm" variant="secondary" onClick={() => setQuickRange('month')}>Tháng này</Button>
          <Button size="sm" variant="secondary" onClick={() => setQuickRange('previousMonth')}>Tháng trước</Button>
        </div>
        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
          <Field label="Từ ngày"><input type="date" className={inputClass} value={draftStart} onChange={event => { setDraftStart(event.target.value); setSendStatus(''); setRangeError(''); }} /></Field>
          <Field label="Đến ngày"><input type="date" className={inputClass} value={draftEnd} onChange={event => { setDraftEnd(event.target.value); setSendStatus(''); setRangeError(''); }} /></Field>
          <Button className="no-print" onClick={applyRange}>Xem báo cáo</Button>
        </div>
        {rangeError && <p role="alert" className="text-sm text-red-700">{rangeError}</p>}
        {payrollRead.error && <p role="alert" className="text-sm text-amber-800">{payrollRead.error}</p>}
        <p className="text-xs text-slate-500">Doanh thu thuần không bao gồm VAT. Giá vốn lấy từ nguyên liệu thực tế đã xuất kho cho order; không cộng phiếu nhập hoặc thanh toán công nợ nhà cung cấp.</p>
      </div>
    </Card>

    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryMetric title="Tổng doanh thu thuần" amount={revenueNet} icon={<FileTextIcon className="h-5 w-5" />} tone="blue" />
      <SummaryMetric title="Tổng giá vốn nguyên liệu" amount={cogs} icon={<FileTextIcon className="h-5 w-5" />} tone="violet" />
      <SummaryMetric title="Tổng chi phí hoạt động" amount={operating} icon={<FileTextIcon className="h-5 w-5" />} tone="amber" />
      <SummaryMetric title="Lợi nhuận tạm tính" amount={estimatedProfit} icon={<FileTextIcon className="h-5 w-5" />} tone="green" />
    </div>

    <Card className="mb-5 overflow-hidden">
      <CardHeader title="Doanh thu và chi phí theo thời gian" />
      {paidOrders.length || expenses.length
        ? <div className="h-80 px-2 py-4 sm:px-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={value => formatShortVnd(Number(value))} width={54} />
              <Tooltip formatter={(value: number) => formatVnd(value)} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend />
              <Bar dataKey="revenue" name="Doanh thu thuần" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Tổng chi phí" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        : <p className="py-16 text-center text-sm text-slate-500">Chưa có dữ liệu doanh thu hoặc chi phí trong khoảng thời gian này.</p>}
    </Card>

    <Card className="mb-5 overflow-hidden">
      <CardHeader title="Cơ cấu chi phí" />
      {totalExpenses > 0
        ? <div className="space-y-4 p-5">
          {expenseGroups.map(group => {
            const share = group.amount / totalExpenses * 100;
            return <div key={group.name}>
              <div className="mb-1.5 flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-medium text-slate-800">{group.name}</span>
                <span className="font-semibold">{formatVnd(group.amount)} <span className="font-normal text-slate-500">({share.toFixed(1)}%)</span></span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${share}%` }} />
              </div>
            </div>;
          })}
        </div>
        : <p className="py-12 text-center text-sm text-slate-500">Chưa có dữ liệu chi phí trong khoảng thời gian này.</p>}
    </Card>

    <Card className="mb-5 overflow-hidden">
      <CardHeader title={`Chi tiết doanh thu (${paidOrders.length})`} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500"><tr>{['STT', 'Ngày ghi nhận', 'Mã hóa đơn', 'Số tiền trước giảm giá', 'Giảm giá', 'Doanh thu thuần', 'Trạng thái thanh toán', ''].map(label => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {paidOrders.map((order, index) => <tr key={order.id} className="hover:bg-slate-50/70">
              <td className="px-4 py-3">{index + 1}</td>
              <td className="whitespace-nowrap px-4 py-3">{formatDateTime(order.paidAt ?? '')}</td>
              <td className="px-4 py-3 font-semibold">{order.id}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right">{formatVnd(order.subtotal)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right">{formatVnd(order.discount)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">{formatVnd(order.subtotal - order.discount)}</td>
              <td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Đã thanh toán</span></td>
              <td className="px-4 py-3"><Button size="sm" variant="secondary" onClick={() => setSelectedOrder(order)}>Chi tiết</Button></td>
            </tr>)}
            {!paidOrders.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Chưa có hóa đơn đã thanh toán trong khoảng thời gian này.</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>

    <Card className="mb-5 overflow-hidden">
      <CardHeader
        title={`Chi tiết chi phí (${expenses.length})`}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500"><tr>{['STT', 'Ngày ghi nhận', 'Mã chứng từ', 'Nội dung chi phí', 'Nhóm chi phí', 'Số tiền', 'Trạng thái'].map(label => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.map((row, index) => <tr
              key={`${row.group}-${row.id}`}
              className="cursor-pointer hover:bg-slate-50/70 focus:bg-slate-50/70"
              role="button"
              tabIndex={0}
              aria-label={`Xem chi tiết chi phí ${row.id}`}
              onClick={() => setSelectedExpense(row)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedExpense(row);
                }
              }}>
              <td className="px-4 py-3">{index + 1}</td>
              <td className="whitespace-nowrap px-4 py-3">{formatDateTime(row.date)}</td>
              <td className="px-4 py-3 font-semibold">{row.id}</td>
              <td className="px-4 py-3">{row.description}</td>
              <td className="px-4 py-3">{row.group}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">{formatVnd(row.amount)}</td>
              <td className="px-4 py-3">{row.status}</td>
            </tr>)}
            {!expenses.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Chưa có chi phí hợp lệ trong khoảng thời gian này.</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>

    <InvoiceModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    {selectedExpense && <ExpenseDetailModal
      row={selectedExpense}
      ingredientName={id => ingredients.find(ingredient => ingredient.id === id)?.name ?? id}
      onClose={() => setSelectedExpense(null)}
    />}
  </>;
}

function SummaryMetric({ title, amount, icon, tone }: { title: string; amount: number; icon: React.ReactNode; tone: 'blue' | 'violet' | 'amber' | 'green' }) {
  const styles = {
    blue: 'border-l-blue-700 bg-blue-50 text-blue-700',
    violet: 'border-l-violet-500 bg-violet-50 text-violet-700',
    amber: 'border-l-amber-500 bg-amber-50 text-amber-700',
    green: 'border-l-emerald-500 bg-emerald-50 text-emerald-700'
  };
  return <Card className={`border-l-4 p-5 ${styles[tone].split(' ').slice(0, 2).join(' ')}`}>
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm font-bold text-slate-700">{title}</p>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles[tone].split(' ').slice(2).join(' ')}`}>{icon}</span>
    </div>
    <p className="mt-3 text-xl font-bold tracking-tight text-slate-900">{formatVnd(amount)}</p>
  </Card>;
}

function ExpenseDetailModal({ row, ingredientName, onClose }: { row: ExpenseRow; ingredientName: (id: string) => string; onClose: () => void }) {
  const fields: [string, string][] = [
    ['Mã chứng từ', row.id],
    ['Ngày ghi nhận', formatDateTime(row.date)],
    ['Nội dung', row.description],
    ['Nhóm chi phí', row.group],
    ['Số tiền', formatVnd(row.amount)],
    ['Trạng thái', row.status]
  ];
  if (row.detail.kind === 'stock') {
    fields.push(
      ['Order liên quan', row.detail.order.id],
      ['Nguyên liệu', ingredientName(row.detail.transaction.ingredientId)],
      ['Số lượng xuất', `${row.detail.transaction.qty} ${row.detail.transaction.unit}`],
      ['Mã lô', row.detail.transaction.batchId]
    );
  } else if (row.detail.kind === 'voucher') {
    fields.push(
      ['Đối tượng', row.detail.voucher.partyName],
      ['Lý do', row.detail.voucher.reason],
      ['Phương thức', row.detail.voucher.method],
      ['Mã chứng từ nguồn', row.detail.voucher.sourceDocumentId ?? '—']
    );
  } else {
    fields.push(['Kỳ lương', row.detail.payroll.month], ['Người lập', row.detail.payroll.createdBy]);
  }
  return <Modal open onClose={onClose} title={`Chi tiết chi phí ${row.id}`} width="max-w-2xl" footer={<Button variant="secondary" onClick={onClose}>Đóng</Button>}>
    <dl className="grid gap-3 sm:grid-cols-2">
      {fields.map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3">
        <dt className="text-xs text-slate-500">{label}</dt>
        <dd className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</dd>
      </div>)}
    </dl>
  </Modal>;
}
