import { useMemo, useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { Card, PageHeader } from '../components/ui/Card';
import { inputClass } from '../components/ui/Field';
import { useApp } from '../contexts/AppContext';
import { formatDateTime } from '../utils/format';
import { billableQty } from '../utils/order';
import type { Order } from '../types';

type DishHistoryStatus = 'Món đã hủy' | 'Món đã hoàn thành';

interface DishHistoryRow {
  id: string;
  tableName: string;
  dishName: string;
  orderId: string;
  quantity: number;
  completedAt?: string;
  status: DishHistoryStatus;
}

function localDateKey(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDishHistory(orders: Order[], tableName: (tableId: string) => string | undefined): DishHistoryRow[] {
  return orders
    .filter((order) => !order.demo)
    .flatMap((order) => order.lines.flatMap((line) => {
      const cancellations = line.cancellationHistory?.length
        ? line.cancellationHistory
        : line.status === 'CANCELLED'
          ? [{
              qty: line.cancelledQty ?? line.qty,
              reason: line.cancelReason ?? 'Không ghi rõ lý do',
              note: line.cancelNote,
              cancelledBy: line.cancelledBy ?? '—',
              cancelledAt: line.cancelledAt ?? ''
            }]
          : [];
      const cancelledRows: DishHistoryRow[] = cancellations.map((entry, index) => ({
        id: `${order.id}-${line.lineId}-cancel-${index}`,
        tableName: tableName(order.tableId) ?? 'Chưa xác định bàn',
        dishName: line.name,
        orderId: order.id,
        quantity: entry.qty,
        completedAt: entry.cancelledAt || undefined,
        status: 'Món đã hủy'
      }));
      const completedQuantity = line.status === 'READY' ? billableQty(line) : 0;
      const completedRows: DishHistoryRow[] = completedQuantity > 0 && line.readyAt
        ? [{
            id: `${order.id}-${line.lineId}-ready`,
            tableName: tableName(order.tableId) ?? 'Chưa xác định bàn',
            dishName: line.name,
            orderId: order.id,
            quantity: completedQuantity,
            completedAt: line.readyAt,
            status: 'Món đã hoàn thành'
          }]
        : [];
      return [...cancelledRows, ...completedRows];
    }))
    .sort((a, b) => Date.parse(b.completedAt ?? '') - Date.parse(a.completedAt ?? ''));
}

export function KitchenHistory() {
  const { orders, tableOf, dishOf } = useApp();
  const [query, setQuery] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');
  const rows = useMemo(
    () => getDishHistory(
      orders.map((order) => ({
        ...order,
        lines: order.lines.filter((line) => !dishOf(line.dishId)?.readyMade)
      })),
      (tableId) => tableOf(tableId)?.name
    ),
    [orders, tableOf, dishOf]
  );
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi');
    return rows.filter((row) =>
      (!normalizedQuery || `${row.tableName} ${row.dishName} ${row.orderId}`.toLocaleLowerCase('vi').includes(normalizedQuery)) &&
      (!date || (row.completedAt && localDateKey(row.completedAt) === date)) &&
      (!status || row.status === status)
    );
  }, [rows, query, date, status]);

  return (
    <div className="px-6 py-6">
      <PageHeader title="Lịch sử món" subtitle="Theo dõi các món bếp đã hoàn thành hoặc đã hủy." />
      <Card className="overflow-hidden">
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-3">
          <input
            className={inputClass}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm bàn, món hoặc mã hóa đơn"
            aria-label="Tìm trong lịch sử món"
          />
          <input
            className={inputClass}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-label="Lọc lịch sử món theo ngày"
          />
          <select
            className={inputClass}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Lọc lịch sử món theo trạng thái"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Món đã hoàn thành">Món đã hoàn thành</option>
            <option value="Món đã hủy">Món đã hủy</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="p-3">Tên bàn</th>
                <th>Tên món</th>
                <th>Mã hóa đơn</th>
                <th className="text-right">Số lượng</th>
                <th>Ngày giờ hoàn thành / hủy</th>
                <th>Trạng thái món</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-900">{row.tableName}</td>
                  <td>{row.dishName}</td>
                  <td>{row.orderId}</td>
                  <td className="text-right tabular-nums">{row.quantity}</td>
                  <td>{row.completedAt ? formatDateTime(row.completedAt) : '—'}</td>
                  <td>
                    <Badge tone={row.status === 'Món đã hoàn thành' ? 'green' : 'red'}>
                      {row.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {!filteredRows.length && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    {rows.length ? 'Không tìm thấy món phù hợp với bộ lọc.' : 'Chưa có món hoàn thành hoặc món bị hủy.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
