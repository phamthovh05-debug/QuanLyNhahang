import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, PageHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { inputClass } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { AttendanceCalendar } from '../components/attendance/AttendanceCalendar';
import { ATTENDANCE_KEY, readAttendanceRows, type AttendanceSession } from '../utils/attendance';

interface AttendanceSummary {
  username: string;
  name: string;
  department: string;
  workDays: number;
  hours: number;
  missing: number;
  days: Set<string>;
}

function localDateKey(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getSessionHours(session: AttendanceSession): number | null {
  if (!session.logoutAt) return null;
  const duration = Date.parse(session.logoutAt) - Date.parse(session.at);
  return Number.isFinite(duration) && duration > 0 ? duration / 3_600_000 : null;
}

export function Attendance() {
  const {user}=useAuth();
  const [cardRows,setCardRows]=useState<AttendanceSession[]>(readAttendanceRows);
  const [query,setQuery]=useState('');
  const [department,setDepartment]=useState('');
  const [day,setDay]=useState('');
  const [month,setMonth]=useState(()=>localDateKey(new Date().toISOString()).slice(0,7));
  const [showAttendanceSummary,setShowAttendanceSummary]=useState(false);
  const [selectedSummaryEmployee,setSelectedSummaryEmployee]=useState<string|null>(null);
  const managerRows=useMemo(
    ()=>cardRows.filter(row=>
      row.status==='Thành công'&&
      row.role!=='Quản lý'&&
      row.role!=='Admin'
    ),
    [cardRows]
  );
  const filtered=useMemo(()=>managerRows.filter(r=>
    (!query||`${r.name} ${r.employeeId}`.toLowerCase().includes(query.toLowerCase()))&&
    (!department||r.department===department)&&
    (!day||localDateKey(r.at)===day)&&
    (!month||localDateKey(r.at).startsWith(month))
  ).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)),[managerRows,query,department,day,month]);
  const monthRows=managerRows.filter(r=>localDateKey(r.at).startsWith(month));
  const summary=Object.values(monthRows.reduce<Record<string,AttendanceSummary>>((acc,row)=>{
    const date=localDateKey(row.at);
    const line=acc[row.username]??{
      username:row.username,
      name:row.name,
      department:row.department,
      workDays:0,
      hours:0,
      missing:0,
      days:new Set<string>()
    };
    if(!line.days.has(date)){
      line.days.add(date);
      line.workDays+=1;
    }
    const hours=getSessionHours(row);
    if(hours===null) line.missing+=1;
    else line.hours+=hours;
    acc[row.username]=line;
    return acc;
  },{})).sort((a,b)=>a.name.localeCompare(b.name,'vi'));
  const filteredSummary=summary.filter(line=>
    (!query||`${line.name} ${line.username}`.toLowerCase().includes(query.toLowerCase()))&&
    (!department||line.department===department)
  );
  const selectedEmployeeSummary=summary.find(line=>line.username===selectedSummaryEmployee);
  const selectedEmployeeSessions=monthRows
    .filter(row=>row.username===selectedSummaryEmployee)
    .sort((a,b)=>a.at.localeCompare(b.at));
  const updateAttendanceRows=(next:AttendanceSession[])=>{
    try {
      localStorage.setItem(ATTENDANCE_KEY,JSON.stringify(next));
      setCardRows(next);
      return true;
    } catch {
      return false;
    }
  };

  if(user?.role!=='Quản lý') {
    return <div className="px-6 py-6">
      <AttendanceCalendar records={cardRows} onRecordsChange={updateAttendanceRows} />
    </div>;
  }

  return <div className="px-6 py-6">
    <PageHeader
      title="Quản lý chấm công"
    subtitle="Xem lịch ca đã đăng ký, giờ quẹt thẻ và tổng hợp chấm công của nhân viên." />
    <AttendanceCalendar manager records={cardRows} onRecordsChange={updateAttendanceRows} />
    <p className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
    Dữ liệu quẹt thẻ giả lập được tạo cho các nhân viên để xem thử giao diện; dữ liệu này không dùng để lập bảng lương.
    </p>
    <Card className="mb-5 overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b p-4">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <input className={inputClass} placeholder="Tìm nhân viên / mã NV" value={query} onChange={event=>setQuery(event.target.value)} />
          <select className={inputClass} value={department} onChange={event=>setDepartment(event.target.value)}>
            <option value="">Tất cả bộ phận</option>
            {[...new Set(managerRows.map(row=>row.department).filter(Boolean))].map(value=><option key={value}>{value}</option>)}
          </select>
          <input className={inputClass} type="date" value={day} onChange={event=>setDay(event.target.value)} />
          <input className={inputClass} type="month" value={month} onChange={event=>setMonth(event.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={showAttendanceSummary ? 'secondary' : 'primary'}
            onClick={()=>{
              setShowAttendanceSummary(value=>!value);
              setSelectedSummaryEmployee(null);
            }}>
            {showAttendanceSummary ? 'Đóng tổng hợp' : 'Tổng hợp chấm công'}
          </Button>
        </div>
      </div>

      {showAttendanceSummary ? (
        selectedSummaryEmployee && selectedEmployeeSummary ? (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
              <div>
                <h2 className="font-semibold text-slate-900">{selectedEmployeeSummary.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedEmployeeSummary.department} · Tháng {month}</p>
              </div>
              <Button variant="secondary" onClick={()=>setSelectedSummaryEmployee(null)}>Quay lại danh sách</Button>
            </div>
            <div className="grid gap-3 border-b p-4 sm:grid-cols-3">
              <div className="rounded-xl bg-blue-50 p-3">
                <p className="text-xs text-blue-700">Ngày công</p>
                <p className="mt-1 text-xl font-bold text-blue-900">{selectedEmployeeSummary.workDays}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-xs text-emerald-700">Tổng giờ làm</p>
                <p className="mt-1 text-xl font-bold text-emerald-900">{selectedEmployeeSummary.hours.toFixed(2)} giờ</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-xs text-amber-700">Phiên thiếu giờ ra</p>
                <p className="mt-1 text-xl font-bold text-amber-900">{selectedEmployeeSummary.missing}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr><th className="p-3">Ngày</th><th>Giờ vào</th><th>Giờ ra</th><th>Tổng giờ</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedEmployeeSessions.map(session=>{
                    const hours=getSessionHours(session);
                    return <tr key={session.id}>
                      <td className="p-3">{new Date(session.at).toLocaleDateString('vi-VN')}</td>
                      <td>{new Date(session.at).toLocaleTimeString('vi-VN')}</td>
                      <td>{session.logoutAt ? new Date(session.logoutAt).toLocaleTimeString('vi-VN') : <Badge tone="amber">Chưa ghi nhận</Badge>}</td>
                      <td>{hours===null ? '—' : `${hours.toFixed(2)} giờ`}</td>
                    </tr>;
                  })}
                  {!selectedEmployeeSessions.length && <tr><td colSpan={4} className="p-8 text-center text-slate-400">Không có dữ liệu chấm công trong tháng này.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold text-slate-900">Tổng hợp chấm công tháng {month}</h2>
              <p className="mt-1 text-xs text-slate-500">
                Ngày công tính theo ngày có giờ vào; tổng giờ chỉ cộng các phiên có đủ giờ vào và giờ ra.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr><th className="p-3">Nhân viên</th><th>Bộ phận</th><th>Ngày công</th><th>Tổng giờ</th><th>Phiên thiếu giờ ra</th><th /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSummary.map(line=><tr key={line.username} className="hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-900">{line.name}</td>
                  <td>{line.department}</td>
                  <td><Badge tone="blue">{line.workDays} ngày</Badge></td>
                  <td><Badge tone="green">{line.hours.toFixed(2)} giờ</Badge></td>
                  <td>{line.missing ? <Badge tone="amber">{line.missing} phiên</Badge> : <Badge tone="green">Đầy đủ</Badge>}</td>
                  <td className="p-3 text-right"><Button size="sm" onClick={()=>setSelectedSummaryEmployee(line.username)}>Xem chi tiết</Button></td>
                </tr>)}
                {!filteredSummary.length && <tr><td colSpan={6} className="p-8 text-center text-slate-400">Không có nhân viên phù hợp với bộ lọc trong tháng này.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        )
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr><th className="p-3">Nhân viên / mã</th><th>Bộ phận</th><th>Ngày</th><th>Giờ vào</th><th>Giờ ra</th><th>Tổng giờ</th><th>Nguồn</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(row=>{
                const hours=getSessionHours(row);
                return <tr key={row.id} className="hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-900">{row.name}<div className="text-xs font-normal text-slate-500">{row.employeeId}</div></td>
                  <td>{row.department}</td>
                  <td>{new Date(row.at).toLocaleDateString('vi-VN')}</td>
                  <td>{new Date(row.at).toLocaleTimeString('vi-VN')}</td>
                  <td>{row.logoutAt ? new Date(row.logoutAt).toLocaleTimeString('vi-VN') : <Badge tone="amber">Chưa ghi nhận</Badge>}</td>
                  <td>{hours===null ? '—' : `${hours.toFixed(2)} giờ`}</td>
                  <td>{row.demo ? <Badge tone="blue">Thẻ mô phỏng</Badge> : <Badge tone="green">Quẹt thẻ</Badge>}</td>
                </tr>;
              })}
              {!filtered.length && <tr><td colSpan={7} className="p-8 text-center text-slate-400">Không có phiên chấm công phù hợp.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  </div>;
}
