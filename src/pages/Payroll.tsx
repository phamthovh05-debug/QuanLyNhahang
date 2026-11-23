import { useEffect, useMemo, useState } from 'react';
import { Card, PageHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Field, inputClass } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import type { PayrollLine, PayrollRecord } from '../types';
import { formatVnd } from '../utils/format';
import { readAttendanceRows } from '../utils/attendance';

const KEY = 'bepkho.payroll';

function readPayroll(): PayrollRecord[] {
  try {
    const rows = JSON.parse(localStorage.getItem(KEY) || '[]') as PayrollRecord[];
    return rows
      .filter(row => !row.demo)
      .map(row => row.status === 'ACCOUNTANT_APPROVED' ? { ...row, status: 'PENDING_MANAGER' } : row);
  } catch {
    return [];
  }
}

function localDateKey(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function Payroll() {
  const { user } = useAuth();
  const isAccountant = user?.role === 'Kế toán';
  const isManager = user?.role === 'Quản lý';
  const [rows, setRows] = useState<PayrollRecord[]>(readPayroll);
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [attendance] = useState(readAttendanceRows);
  const [rates, setRates] = useState<Record<string, string>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [revisionTarget, setRevisionTarget] = useState<PayrollRecord | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const visible = useMemo(
    () => isManager ? rows : rows.filter(row => row.month === currentMonth),
    [rows, currentMonth, isManager]
  );
  const attendanceLines = useMemo(() => {
    const summaries = new Map<string, PayrollLine & { days: Set<string> }>();
    attendance
      .filter(row => row.status === 'Thành công' && (!row.demo || row.payrollEligible) && row.role !== 'Quản lý' && row.role !== 'Admin' && localDateKey(row.at).startsWith(currentMonth))
      .forEach(row => {
        const line = summaries.get(row.username) ?? {
          username: row.username,
          name: row.name,
          department: row.department,
          workDays: 0,
          hours: 0,
          ratePerDay: 0,
          amount: 0,
          days: new Set<string>()
        };
        const day = localDateKey(row.at);
        if (!line.days.has(day)) {
          line.days.add(day);
          line.workDays += 1;
        }
        if (row.logoutAt) {
          const hours = (Date.parse(row.logoutAt) - Date.parse(row.at)) / 3_600_000;
          if (Number.isFinite(hours) && hours > 0) line.hours += hours;
        }
        summaries.set(row.username, line);
      });
    return [...summaries.values()]
      .map(line => ({
        username: line.username,
        name: line.name,
        department: line.department,
        workDays: line.workDays,
        hours: line.hours,
        ratePerDay: line.ratePerDay,
        amount: line.amount
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [attendance, currentMonth]);
  const hasPayroll = visible.some(row => !row.demo && row.status !== 'REVISION_REQUESTED');

  useEffect(() => {
    const syncPayroll = (event: StorageEvent) => {
      if (event.key === KEY) setRows(readPayroll());
    };
    window.addEventListener('storage', syncPayroll);
    return () => window.removeEventListener('storage', syncPayroll);
  }, []);

  const createPayroll = () => {
    if (!isAccountant || hasPayroll) return;
    if (!attendanceLines.length) {
      setError('Không có dữ liệu chấm công hợp lệ trong tháng này.');
      return;
    }
    const lines = attendanceLines.map(line => {
      const ratePerDay = Number(rates[line.username]);
      return { ...line, ratePerDay, amount: line.workDays * ratePerDay };
    });
    if (lines.some(line => !Number.isFinite(line.ratePerDay) || line.ratePerDay <= 0)) {
      setError('Nhập mức lương/ngày hợp lệ cho từng nhân viên.');
      return;
    }
    const createdAt = new Date().toISOString();
    const record: PayrollRecord = {
      id: `BL-${Date.now()}`,
      month: currentMonth,
      createdAt,
      createdBy: user.name,
      lines,
      total: lines.reduce((sum, line) => sum + line.amount, 0),
      status: 'PENDING_MANAGER'
    };
    const next = [record, ...rows];
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setRows(next);
      setCreateOpen(false);
      setRates({});
      setError('');
    } catch {
      setError('Không thể lưu bảng lương. Vui lòng kiểm tra dung lượng lưu trữ của trình duyệt.');
    }
  };

  const saveReview = (record: PayrollRecord, status: PayrollRecord['status'], note?: string) => {
    if (!isManager) return;
    const reviewedAt = new Date().toISOString();
    const next = rows.map(row => row.id === record.id
      ? {
          ...row,
          status,
          reviewedAt,
          reviewedBy: user?.name ?? '',
          accountingNote: status === 'REVISION_REQUESTED' ? note : undefined
        }
      : row);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setRows(next);
      setReviewError('');
      setRevisionTarget(null);
      setReviewNote('');
    } catch {
      setReviewError('Không thể lưu kết quả kiểm tra bảng lương. Vui lòng thử lại.');
    }
  };

  const requestRevision = () => {
    if (!revisionTarget) return;
    if (!reviewNote.trim()) {
      setReviewError('Vui lòng nhập lý do cần chỉnh sửa.');
      return;
    }
    saveReview(revisionTarget, 'REVISION_REQUESTED', reviewNote.trim());
  };

  return <div className="px-6 py-6">
    <PageHeader
      title="Bảng lương"
      action={isAccountant ? <Button onClick={() => { setRates({}); setError(''); setCreateOpen(true); }} disabled={hasPayroll || !attendanceLines.length}>Lập bảng lương</Button> : undefined} />
    {isAccountant && !hasPayroll && !attendanceLines.length && <p className="mb-4 text-sm text-slate-500">Chưa có dữ liệu chấm công hợp lệ trong tháng này.</p>}
    {reviewError && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{reviewError}</p>}
    {!visible.length ? <Card className="p-8 text-center text-sm text-slate-500">{isManager ? 'Chưa có bảng lương cần kiểm tra.' : 'Chưa có bảng lương trong tháng này.'}</Card> : visible.map(row => <Card key={row.id} className="mb-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <h2 className="font-semibold">Bảng lương {row.month}</h2>
        <div className="text-right">
          <p className="text-xs text-slate-500">Tổng lương</p>
          <p className="text-lg font-bold">{formatVnd(row.total)}</p>
          <Badge tone={row.status === 'MANAGER_APPROVED' ? 'green' : row.status === 'REVISION_REQUESTED' ? 'red' : 'amber'}>
            {row.status === 'MANAGER_APPROVED' ? 'Đã duyệt' : row.status === 'REVISION_REQUESTED' ? 'Yêu cầu chỉnh sửa' : 'Chờ quản lý kiểm tra'}
          </Badge>
        </div>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr className="border-b text-left text-xs text-slate-500"><th className="p-3">Nhân viên</th><th>Bộ phận</th><th>Công</th><th>Tổng giờ</th><th>Lương / công</th><th>Thành tiền</th></tr></thead><tbody>{row.lines.map(line => <tr key={line.username} className="border-b"><td className="p-3">{line.name}</td><td>{line.department}</td><td>{line.workDays}</td><td>{line.hours.toFixed(2)}</td><td>{formatVnd(line.ratePerDay)}</td><td className="font-semibold">{formatVnd(line.amount)}</td></tr>)}</tbody></table></div>
      {row.accountingNote && <p className="border-t border-slate-100 px-4 py-3 text-sm text-amber-800">{row.status === 'REVISION_REQUESTED' ? 'Yêu cầu chỉnh sửa' : 'Ghi chú kế toán'}: {row.accountingNote}</p>}
      {row.reviewedBy && <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">Xử lý bởi {row.reviewedBy} · {row.reviewedAt ? new Date(row.reviewedAt).toLocaleString('vi-VN') : ''}</p>}
      {isManager && row.status === 'PENDING_MANAGER' && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 p-4">
        <Button variant="secondary" onClick={() => { setReviewError(''); setReviewNote(''); setRevisionTarget(row); }}>Yêu cầu chỉnh sửa</Button>
        <Button onClick={() => saveReview(row, 'MANAGER_APPROVED')}>Duyệt bảng lương</Button>
      </div>}
    </Card>)}
    {isManager && <Modal
      open={!!revisionTarget}
      onClose={() => { setRevisionTarget(null); setReviewNote(''); setReviewError(''); }}
      title={revisionTarget ? `Yêu cầu chỉnh sửa bảng lương ${revisionTarget.month}` : ''}
      footer={<><Button variant="secondary" onClick={() => { setRevisionTarget(null); setReviewNote(''); setReviewError(''); }}>Hủy</Button><Button variant="danger" onClick={requestRevision}>Gửi yêu cầu</Button></>}
    >
      <Field label="Lý do cần chỉnh sửa">
        <textarea className={`${inputClass} min-h-24`} value={reviewNote} onChange={event => setReviewNote(event.target.value)} />
      </Field>
      {reviewError && <p role="alert" className="mt-3 text-sm text-red-700">{reviewError}</p>}
    </Modal>}
    {isAccountant && <Modal
      open={createOpen}
      onClose={() => { setCreateOpen(false); setError(''); }}
      title={`Lập bảng lương ${currentMonth}`}
      description="Nhập mức lương theo ngày công cho từng nhân viên."
      width="max-w-3xl"
      footer={<><Button variant="secondary" onClick={() => { setCreateOpen(false); setError(''); }}>Hủy</Button><Button onClick={createPayroll}>Tạo bảng lương</Button></>}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr><th className="px-3 py-2">Nhân viên</th><th className="px-3 py-2">Bộ phận</th><th className="px-3 py-2 text-right">Ngày công</th><th className="px-3 py-2 text-right">Tổng giờ</th><th className="px-3 py-2">Lương / ngày</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {attendanceLines.map(line => <tr key={line.username}>
              <td className="px-3 py-2 font-medium text-slate-900">{line.name}</td>
              <td className="px-3 py-2">{line.department}</td>
              <td className="px-3 py-2 text-right">{line.workDays}</td>
              <td className="px-3 py-2 text-right">{line.hours.toFixed(2)}</td>
              <td className="px-3 py-2"><input type="number" min="1" step="1000" className={inputClass} aria-label={`Lương theo ngày của ${line.name}`} value={rates[line.username] ?? ''} onChange={event => setRates({ ...rates, [line.username]: event.target.value })} /></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </Modal>}
  </div>;
}
