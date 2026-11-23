import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDaysIcon,
  CalendarPlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock3Icon,
  PencilIcon,
  PlusIcon,
  Settings2Icon,
  Trash2Icon } from
'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, PageHeader } from '../ui/Card';
import { Field, inputClass } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { accounts as seedAccounts } from '../../data/seed';
import { useAuth } from '../../contexts/AuthContext';
import type { Account } from '../../types';

const SHIFTS_KEY = 'bepkho.workShifts.v1';
const REGISTRATIONS_KEY = 'bepkho.shiftRegistrations.v1';

interface WorkShift {
  id: string;
  name: string;
  role?: string;
  startTime: string;
  endTime: string;
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
}

interface ShiftRegistration {
  id: string;
  username: string;
  employeeName?: string;
  role?: string;
  department?: string;
  date: string;
  shiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
  registeredAt: string;
}

interface AttendanceRecord {
  id: string;
  username: string;
  name: string;
  employeeId: string;
  department: string;
  role: string;
  at: string;
  logoutAt?: string;
  status: string;
  method?: 'CARD' | 'APP';
  demo?: boolean;
}

interface AttendanceCalendarProps {
  records: AttendanceRecord[];
  onRecordsChange: (records: AttendanceRecord[]) => boolean;
  manager?: boolean;
  settingsOnly?: boolean;
}

type ShiftDraft = Omit<WorkShift, 'id'> & { id?: string };

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readAccounts(): Account[] {
  const saved = readStored<Account[]>('bepkho.admin.accounts', seedAccounts);
  return saved.filter((account) => account.role !== 'Admin' && account.role !== 'Quản lý');
}

function emptyDraft(): ShiftDraft {
  return {
    name: '',
    startTime: '08:00',
    endTime: '17:00',
    lateGraceMinutes: 5,
    earlyLeaveGraceMinutes: 5
  };
}

export function AttendanceCalendar({
  records,
  onRecordsChange,
  manager = false,
  settingsOnly = false
}: AttendanceCalendarProps) {
  const { user: currentUser } = useAuth();
  const canRegisterShift = currentUser?.role === 'Thu ngân' || currentUser?.role === 'Phục vụ';
  const [shifts, setShifts] = useState<WorkShift[]>(() => readStored(SHIFTS_KEY, []));
  const [registrations, setRegistrations] = useState<ShiftRegistration[]>(() => readStored(REGISTRATIONS_KEY, []));
  const [month, setMonth] = useState(() => localDateKey(new Date()).slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()));
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [selectedUsername, setSelectedUsername] = useState(() => {
    const accounts = readAccounts();
    return accounts[0]?.username ?? currentUser?.username ?? '';
  });
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [cardCode, setCardCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [setupOpen, setSetupOpen] = useState(false);
  const [shiftDraft, setShiftDraft] = useState<ShiftDraft | null>(null);

  const staff = useMemo(() => readAccounts(), []);
  useEffect(() => {
    const syncRegistrations = (event: StorageEvent) => {
      if (event.key === REGISTRATIONS_KEY) {
        setRegistrations(readStored(REGISTRATIONS_KEY, []));
      }
    };
    window.addEventListener('storage', syncRegistrations);
    return () => window.removeEventListener('storage', syncRegistrations);
  }, []);

  const employeeName = (username: string, savedName?: string) =>
    staff.find((account) => account.username === username)?.name ?? savedName ?? username;
  const employeeRole = (username: string, savedRole?: string) =>
    staff.find((account) => account.username === username)?.role ?? savedRole ?? 'Nhân viên';
  const registrationRole = (registration: ShiftRegistration) =>
    employeeRole(registration.username, registration.role);
  const sameRoleBoard = (registration: ShiftRegistration) =>
    manager || registrationRole(registration) === currentUser?.role;
  const viewedUsername = manager ? selectedUsername : currentUser?.username ?? '';
  const viewedStaff = staff.find((account) => account.username === viewedUsername) ?? currentUser;
  const viewedShifts = manager
    ? shifts
    : shifts.filter((shift) => !shift.role || shift.role === currentUser?.role);
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const today = localDateKey(new Date());
  const attendanceForDay = (date: string) => records
    .filter((record) =>
      record.username === viewedUsername &&
      localDateKey(new Date(record.at)) === date &&
      record.status === 'Thành công' &&
      (!record.demo || manager)
    )
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const selectedRegistration = registrations.find(
    (registration) => registration.username === viewedUsername && registration.date === selectedDate
  );
  const ownDateRegistrations = registrations.filter(
    (registration) =>
      registration.username === currentUser?.username &&
      registration.date === selectedDate
  );
  const allSelectedDateRegistrations = registrations.filter(
    (registration) => registration.date === selectedDate && sameRoleBoard(registration)
  );
  const selectedDateRegistrations = allSelectedDateRegistrations.filter(
    (registration) => manager || registrationRole(registration) === currentUser?.role
  );
  const selectedShiftRegistration = allSelectedDateRegistrations.find(
    (registration) =>
      registration.shiftId === selectedShiftId &&
      registration.username === currentUser?.username
  );
  const activeSession = records.find(
    (record) =>
      record.username === currentUser?.username &&
      Date.now() - Date.parse(record.at) <= 24 * 60 * 60 * 1000 &&
      !record.logoutAt &&
      !record.demo
  );
  const todayRecords = records.filter(
    (record) =>
      record.username === currentUser?.username &&
      localDateKey(new Date(record.at)) === today &&
      !record.demo
  ).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const selectedDayRecords = attendanceForDay(selectedDate);
  const selectedDayLogoutAt = selectedDayRecords.find((record) => record.logoutAt)?.logoutAt;
  const canClockIn = todayRecords.length === 0;
  const days = Array.from({ length: firstWeekday + daysInMonth }, (_, index) =>
    index < firstWeekday ? null : index - firstWeekday + 1
  );

  const saveRegistrations = (next: ShiftRegistration[]) => {
    try {
      window.localStorage.setItem(REGISTRATIONS_KEY, JSON.stringify(next));
      setRegistrations(next);
      setError('');
      return true;
    } catch {
      setError('Không thể lưu đăng ký ca làm. Vui lòng kiểm tra bộ nhớ trình duyệt.');
      return false;
    }
  };

  const saveShifts = (next: WorkShift[]) => {
    try {
      window.localStorage.setItem(SHIFTS_KEY, JSON.stringify(next));
      setShifts(next);
      setError('');
      return true;
    } catch {
      setError('Không thể lưu thiết lập ca làm. Vui lòng kiểm tra bộ nhớ trình duyệt.');
      return false;
    }
  };

  const selectMonth = (nextMonth: string) => {
    setMonth(nextMonth);
    const [nextYear, nextMonthNumber] = nextMonth.split('-').map(Number);
    const maxDay = new Date(nextYear, nextMonthNumber, 0).getDate();
    const currentDay = Number(selectedDate.slice(8, 10));
    setSelectedDate(`${nextMonth}-${String(Math.min(currentDay, maxDay)).padStart(2, '0')}`);
  };

  const registerShift = () => {
    if (!currentUser) return;
    if (!canRegisterShift) {
      setError('Chỉ nhân viên thu ngân và phục vụ mới được đăng ký ca.');
      return;
    }
    const latestRegistrations = readStored<ShiftRegistration[]>(REGISTRATIONS_KEY, []);
    const existingRegistration = latestRegistrations.find(
      (registration) =>
        registration.username === currentUser.username &&
        registration.date === selectedDate
    );
    if (existingRegistration) {
      setRegistrations(latestRegistrations);
      setError(`Bạn đã đăng ký ca ${existingRegistration.shiftName} trong ngày này rồi.`);
      return;
    }
    const shift = shifts.find(
      (item) =>
        item.id === selectedShiftId &&
        (!item.role || item.role === currentUser.role)
    );
    if (!shift) {
      setError('Ca làm không áp dụng cho loại nhân viên của bạn.');
      return;
    }
    const profiles = readStored<Record<string, { department?: string }>>('bepkho.staffProfiles', {});
    const registration: ShiftRegistration = {
      id: `${currentUser.username}-${selectedDate}-${shift.id}`,
      username: currentUser.username,
      employeeName: currentUser.name,
      role: currentUser.role,
      department: profiles[currentUser.username]?.department ?? currentUser.role,
      date: selectedDate,
      shiftId: shift.id,
      shiftName: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      lateGraceMinutes: shift.lateGraceMinutes,
      earlyLeaveGraceMinutes: shift.earlyLeaveGraceMinutes,
      registeredAt: new Date().toISOString()
    };
    const next = [
      registration,
      ...latestRegistrations.filter(
        (item) =>
          item.username !== registration.username ||
          item.date !== registration.date ||
          item.shiftId !== registration.shiftId
      )
    ];
    if (saveRegistrations(next)) {
      setMessage(`Đã đăng ký ${shift.name} vào ngày ${new Date(`${selectedDate}T12:00:00`).toLocaleDateString('vi-VN')}.`);
    }
  };

  const removeRegistration = (registration = selectedRegistration) => {
    if (!currentUser || !canRegisterShift || !registration || registration.username !== currentUser.username) return;
    const next = registrations.filter((item) => item.id !== registration.id);
    if (saveRegistrations(next)) setMessage(`Đã hủy đăng ký ${registration.shiftName}.`);
  };

  const recordSwipe = () => {
    if (!currentUser) return;
    const code = cardCode.trim().toLowerCase();
    if (!code) {
      setError('Quẹt thẻ hoặc nhập mã thẻ cá nhân để chấm công.');
      return;
    }
    const profiles = readStored<Record<string, { employeeId?: string; cardId?: string; department?: string }>>('bepkho.staffProfiles', {});
    const profile = profiles[currentUser.username];
    const matchesOwnCard = [
      currentUser.username,
      currentUser.name,
      profile?.employeeId,
      profile?.cardId
    ].some((value) => value?.trim().toLowerCase() === code);
    if (!matchesOwnCard) {
      setError('Mã thẻ không khớp với tài khoản đang đăng nhập.');
      return;
    }

    const now = new Date();
    const todayKey = localDateKey(now);
    const open = records.find(
      (record) =>
        record.username === currentUser.username &&
        Date.now() - Date.parse(record.at) <= 24 * 60 * 60 * 1000 &&
        !record.logoutAt &&
        !record.demo
    );

    if (open) {
      const next = records.map((record) =>
        record.id === open.id ? { ...record, logoutAt: now.toISOString() } : record
      );
      if (!onRecordsChange(next)) {
        setError('Không thể lưu dữ liệu chấm công. Vui lòng thử lại.');
        return;
      }
      setMessage(`Đã ghi nhận giờ ra ${now.toLocaleTimeString('vi-VN')}.`);
      setError('');
      setCardCode('');
      return;
    }

    const alreadyClocked = records.some(
      (record) =>
        record.username === currentUser.username &&
        localDateKey(new Date(record.at)) === todayKey &&
        !record.demo
    );
    if (alreadyClocked) {
      setMessage('Hôm nay đã ghi nhận đủ giờ vào và giờ ra.');
      return;
    }

    const record: AttendanceRecord = {
      id: `CARD-${currentUser.username}-${now.getTime()}`,
      username: currentUser.username,
      name: currentUser.name,
      employeeId: profile?.employeeId ?? currentUser.username,
      department: profile?.department ?? currentUser.role,
      role: currentUser.role,
      at: now.toISOString(),
      status: 'Thành công',
      method: 'CARD'
    };
    if (!onRecordsChange([record, ...records])) {
      setError('Không thể lưu dữ liệu chấm công. Vui lòng thử lại.');
      return;
    }
    setMessage(`Đã ghi nhận giờ vào ${now.toLocaleTimeString('vi-VN')}.`);
    setError('');
    setCardCode('');
  };

  const saveShiftDraft = () => {
    if (!shiftDraft) return;
    const name = shiftDraft.name.trim();
    if (!name || !shiftDraft.startTime || !shiftDraft.endTime) {
      setError('Vui lòng nhập tên ca và giờ bắt đầu, kết thúc.');
      return;
    }
    if (
      !Number.isFinite(Number(shiftDraft.lateGraceMinutes)) ||
      !Number.isFinite(Number(shiftDraft.earlyLeaveGraceMinutes)) ||
      shiftDraft.lateGraceMinutes < 0 ||
      shiftDraft.earlyLeaveGraceMinutes < 0
    ) {
      setError('Số phút cho phép không được nhỏ hơn 0.');
      return;
    }

    const nextShift: WorkShift = {
      ...shiftDraft,
      id: shiftDraft.id ?? `SHIFT-${Date.now()}`,
      name,
      role: shiftDraft.role || undefined,
      lateGraceMinutes: Math.floor(Number(shiftDraft.lateGraceMinutes)),
      earlyLeaveGraceMinutes: Math.floor(Number(shiftDraft.earlyLeaveGraceMinutes))
    };
    const next = shiftDraft.id
      ? shifts.map((item) => item.id === nextShift.id ? nextShift : item)
      : [...shifts, nextShift];
    if (saveShifts(next)) setShiftDraft(null);
  };

  const statusForDay = (date: string, registration: ShiftRegistration | undefined, dayRecords: AttendanceRecord[]) => {
    if (!dayRecords.length) return null;
    if (!registration) return 'Không có ca đăng ký';
    const inAt = new Date(dayRecords[0].at);
    const [startHour, startMinute] = registration.startTime.split(':').map(Number);
    const shiftStart = new Date(`${date}T00:00:00`);
    shiftStart.setHours(startHour, startMinute, 0, 0);
    const late = inAt.getTime() > shiftStart.getTime() + registration.lateGraceMinutes * 60_000;
    const outAt = dayRecords.find((record) => record.logoutAt)?.logoutAt;
    if (!outAt) return late ? 'Đi muộn · Chưa giờ ra' : 'Chưa quẹt thẻ ra';
    const [endHour, endMinute] = registration.endTime.split(':').map(Number);
    const shiftEnd = new Date(`${date}T00:00:00`);
    shiftEnd.setHours(endHour, endMinute, 0, 0);
    if (registration.endTime <= registration.startTime) shiftEnd.setDate(shiftEnd.getDate() + 1);
    const early = Date.parse(outAt) < shiftEnd.getTime() - registration.earlyLeaveGraceMinutes * 60_000;
    const statuses = [late ? 'Đi muộn' : '', early ? 'Về sớm' : ''].filter(Boolean);
    return statuses.join(' · ') || 'Đủ ca';
  };

  return (
    <div className="space-y-5">
      {!settingsOnly && <>
      <PageHeader
        title={manager ? 'Lịch ca làm' : canRegisterShift ? 'Đăng ký ca làm và chấm công' : 'Chấm công'}
        action={manager && (
          <Button onClick={() => { setSetupOpen(true); setError(''); }}>
            <Settings2Icon className="h-4 w-4" />
            Thiết lập chấm công
          </Button>
        )} />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Tháng">
              <input
                type="month"
                className={inputClass}
                value={month}
                onChange={(event) => selectMonth(event.target.value)} />
            </Field>
            {manager && (
              <Field label="Nhân viên">
                <select className={inputClass} value={selectedUsername} onChange={(event) => setSelectedUsername(event.target.value)}>
                  {staff.map((account) => <option key={account.username} value={account.username}>{account.name} · {account.role}</option>)}
                </select>
              </Field>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              aria-label="Tháng trước"
              onClick={() => {
                const previous = new Date(year, monthIndex - 1, 1);
                selectMonth(localDateKey(previous).slice(0, 7));
              }}>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <span className="min-w-32 text-center text-sm font-semibold text-slate-700">
              {new Date(year, monthIndex, 1).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
            </span>
            <Button
              variant="secondary"
              size="sm"
              aria-label="Tháng sau"
              onClick={() => {
                const next = new Date(year, monthIndex + 1, 1);
                selectMonth(localDateKey(next).slice(0, 7));
              }}>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-xs font-medium text-slate-500">
          {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'].map((label) => (
            <div key={label} className="px-1 py-3 text-[11px] sm:text-sm">{label}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((dayNumber, index) => {
            if (!dayNumber) return <div key={`empty-${index}`} className="min-h-32 border-b border-r border-slate-100 bg-slate-50/50 sm:min-h-40" />;
            const date = `${month}-${String(dayNumber).padStart(2, '0')}`;
            const registration = registrations.find((item) => item.username === viewedUsername && item.date === date);
            const ownDayBookings = registrations.filter(
              (item) => item.date === date && item.username === currentUser?.username
            );
            const showOwnBooking = (manager || canRegisterShift) && ownDayBookings.length > 0;
            const roleDayBookings = registrations.filter(
              (item) => item.date === date && sameRoleBoard(item)
            );
            const dayRecords = attendanceForDay(date);
            const logoutAt = dayRecords.find((record) => record.logoutAt)?.logoutAt;
            const status = statusForDay(date, registration, dayRecords);
            const isSelected = selectedDate === date;
            return (
              <button
                type="button"
                key={date}
                onClick={() => {
                  setSelectedDate(date);
                  setSelectedShiftId(registrations.find((item) => item.username === viewedUsername && item.date === date)?.shiftId ?? '');
                  setMessage('');
                  setError('');
                  setDayModalOpen(true);
                }}
                aria-label={`${date}${showOwnBooking ? ', bạn đã đăng ký ca' : ''}${dayRecords.length ? ', đã chấm công' : ''}`}
                className={`min-h-32 border-b border-r border-slate-100 p-2.5 text-left align-top transition sm:min-h-40 sm:p-3 ${showOwnBooking ? 'bg-emerald-50 hover:bg-emerald-100' : isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : 'bg-white hover:bg-blue-50/70'}`}>
                <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-1 text-sm font-semibold ${showOwnBooking ? 'bg-emerald-600 text-white' : date === today ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                  {dayNumber}
                </span>
                <div className="mt-2.5 space-y-1.5">
                  {manager || canRegisterShift
                    ? viewedShifts.length
                      ? viewedShifts.map((shift) => {
                        const bookings = roleDayBookings.filter((item) => item.shiftId === shift.id);
                        const ownBooking = bookings.some((booking) => booking.username === currentUser?.username);
                        return (
                        <div key={shift.id} className={`rounded-md px-1.5 py-1.5 text-[11px] leading-tight sm:px-2 sm:text-sm ${!bookings.length ? 'bg-slate-50 text-slate-600' : ownBooking ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                          <span className="block truncate font-semibold">{shift.name} · {shift.startTime}–{shift.endTime}</span>
                          <span className="mt-0.5 block truncate">
                            {!bookings.length
                              ? 'Chưa có người đăng ký'
                              : manager || bookings.some((booking) => registrationRole(booking) === currentUser?.role)
                                ? `${bookings.slice(0, 2).map((booking) => employeeName(booking.username, booking.employeeName)).join(', ')}${bookings.length > 2 ? ` +${bookings.length - 2}` : ''}`
                                : 'Đã có người đăng ký'}
                          </span>
                        </div>
                        );
                      })
                      : <p className="truncate text-[11px] text-slate-400 sm:text-xs">Chưa có ca phù hợp</p>
                    : null}
                  {dayRecords.length > 0 && (
                    <>
                      <p className="text-[11px] font-medium text-slate-700 sm:text-sm">Vào {new Date(dayRecords[0].at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                      {logoutAt
                        ? <p className="text-[11px] font-medium text-slate-700 sm:text-sm">Ra {new Date(logoutAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                        : <p className="text-[11px] font-medium text-amber-700 sm:text-sm">Chưa giờ ra</p>}
                      <Badge tone={!canRegisterShift && !manager ? 'green' : status === 'Đủ ca' ? 'green' : !registration ? 'slate' : 'amber'} className="!px-2 !py-1 !text-[10px] sm:!text-xs">
                        {!canRegisterShift && !manager ? 'Đã chấm công' : status}
                      </Badge>
                      {manager && dayRecords.some((record) => record.demo) && <p className="text-[10px] font-medium text-blue-700 sm:text-xs">Quẹt thẻ mô phỏng</p>}
                    </>
                  )}
                  {!dayRecords.length && date < today && <p className="text-[11px] text-slate-400 sm:text-xs">Chưa chấm công</p>}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {!manager && (
        <Modal
          open={dayModalOpen}
          onClose={() => setDayModalOpen(false)}
          title={canRegisterShift ? 'Đăng ký ca làm và chấm công' : 'Chấm công cá nhân'}
          description={new Date(`${selectedDate}T12:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          width="max-w-xl">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
              <span className="text-sm font-medium text-slate-700">{currentUser?.name}</span>
              <Badge tone="blue">{currentUser?.role ?? 'Nhân viên'}</Badge>
            </div>
            {canRegisterShift && <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">CA LÀM</p>
                <p className="mt-2 font-semibold text-slate-900">{selectedRegistration?.shiftName ?? 'Chưa đăng ký'}</p>
                {selectedRegistration && (
                  <>
                    <p className="mt-1 text-sm text-slate-600">{selectedRegistration.startTime} – {selectedRegistration.endTime}</p>
                    <p className="mt-1 text-xs text-slate-500">Nhân viên: {employeeName(selectedRegistration.username, selectedRegistration.employeeName)}</p>
                    <p className="mt-1 text-xs text-slate-500">Vị trí: {employeeRole(selectedRegistration.username, selectedRegistration.role)}</p>
                  </>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">CHẤM CÔNG</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {selectedDayRecords.length
                    ? `${new Date(selectedDayRecords[0].at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} / ${selectedDayLogoutAt ? new Date(selectedDayLogoutAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Chưa ghi nhận giờ ra'}`
                    : 'Chưa chấm công'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {statusForDay(selectedDate, selectedRegistration, selectedDayRecords) ?? (selectedRegistration ? 'Chưa chấm công' : 'Chưa đăng ký ca')}
                </p>
              </div>
            </div>}

            {canRegisterShift && selectedDateRegistrations.length > 0 && (
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-500">CA ĐÃ ĐƯỢC NHẬN</p>
                <div className="mt-2 space-y-2">
                  {selectedDateRegistrations.map((registration) => (
                    <div key={registration.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-800">{registration.shiftName}</span>
                      <span className="text-right text-slate-600">
                        {employeeName(registration.username, registration.employeeName)}
                        <span className="block text-xs text-slate-500">{employeeRole(registration.username, registration.role)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {canRegisterShift && ownDateRegistrations.length > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                <p className="text-xs font-semibold text-emerald-800">CA BẠN ĐÃ ĐĂNG KÝ</p>
                <div className="mt-2 space-y-2">
                  {ownDateRegistrations.map((registration) => (
                    <div key={registration.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-slate-800">
                        {registration.shiftName} · {registration.startTime}–{registration.endTime}
                      </span>
                      <Button variant="secondary" size="sm" onClick={() => removeRegistration(registration)}>
                        Hủy ca
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!canRegisterShift && <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              Lịch làm việc của bạn cố định theo tháng. Hãy chấm công khi bắt đầu và kết thúc ca.
            </p>}

            {selectedDate === today && (
              <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); recordSwipe(); }}>
                <Field label="Mã thẻ cá nhân" className="min-w-40 flex-1">
                  <input className={inputClass} value={cardCode} onChange={(event) => setCardCode(event.target.value)} autoComplete="off" placeholder="Nhập mã thẻ" />
                </Field>
                <Button type="submit" disabled={!activeSession && !canClockIn}>
                  <Clock3Icon className="h-4 w-4" />
                  {activeSession ? 'Ghi nhận giờ ra' : canClockIn ? 'Ghi nhận giờ vào' : 'Đã chấm công'}
                </Button>
              </form>
            )}

            {canRegisterShift && selectedDate >= today && !ownDateRegistrations.length && viewedShifts.length > 0 && (
                <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
                    <Field label="Chọn ca làm" className="min-w-48 flex-1">
                      <select className={inputClass} value={selectedShiftId} onChange={(event) => setSelectedShiftId(event.target.value)}>
                        <option value="">Chọn ca</option>
                        {viewedShifts.map((shift) => {
                          const bookings = allSelectedDateRegistrations.filter((registration) => registration.shiftId === shift.id);
                          return (
                            <option key={shift.id} value={shift.id}>
                              {shift.name} · {shift.startTime}–{shift.endTime}
                              {bookings.length ? ` · Đã đăng ký: ${bookings.length} nhân viên` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </Field>
                    <Button onClick={registerShift} disabled={!selectedShiftId || !!selectedShiftRegistration}>
                      <CalendarPlusIcon className="h-4 w-4" />
                      Đăng ký ca
                    </Button>
                  </div>
            )}
            {canRegisterShift && !viewedShifts.length && selectedDate >= today && (
              <p className="text-xs text-amber-700">Chưa có ca làm phù hợp với loại nhân viên của bạn.</p>
            )}
            {canRegisterShift && ownDateRegistrations.length > 0 && selectedDate >= today && (
                <p className="text-sm font-medium text-emerald-700">Bạn đã đăng ký ca trong ngày này.</p>
              )}
            {message && <p role="status" className="text-sm text-blue-700">{message}</p>}
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          </div>
        </Modal>
      )}

      {manager && (
        <>
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <h2 className="font-semibold text-slate-900">{viewedStaff?.name ?? 'Nhân viên'}</h2>
              <p className="text-xs text-slate-500">{viewedStaff?.role} · {selectedDate}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <CalendarDaysIcon className="h-4 w-4 text-blue-600" />
              Ca đăng ký: <strong>{selectedRegistration?.shiftName ?? 'Không có ca đăng ký'}</strong>
              {selectedRegistration && <span>({selectedRegistration.startTime}–{selectedRegistration.endTime})</span>}
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              {selectedDayRecords.length > 0
                ? <>
                    <span>Vào: <strong>{new Date(selectedDayRecords[0].at).toLocaleTimeString('vi-VN')}</strong></span>
                    <span>Ra: <strong>{selectedDayLogoutAt
                      ? new Date(selectedDayLogoutAt).toLocaleTimeString('vi-VN')
                      : 'Chưa ghi nhận'}</strong></span>
                    <Badge tone={statusForDay(selectedDate, selectedRegistration, selectedDayRecords) === 'Đủ ca' ? 'green' : selectedRegistration ? 'amber' : 'slate'}>
                      {statusForDay(selectedDate, selectedRegistration, selectedDayRecords)}
                    </Badge>
                  </>
                : <span className="text-slate-400">Chưa có dữ liệu chấm công</span>}
            </div>
          </Card>
          {!manager && viewedUsername === currentUser?.username && (
            <Card className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{canRegisterShift ? 'Đăng ký ca và chấm công cá nhân' : 'Chấm công cá nhân'}</h3>
                  <p className="mt-1 text-xs text-slate-500">{selectedDate}</p>
                </div>
                {selectedDate === today && (
                  <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); recordSwipe(); }}>
                    <Field label="Mã thẻ cá nhân" className="w-44">
                      <input className={inputClass} value={cardCode} onChange={(event) => setCardCode(event.target.value)} autoComplete="off" placeholder="Tên đăng nhập / mã thẻ" />
                    </Field>
                    <Button type="submit" disabled={!activeSession && !canClockIn}>
                      <Clock3Icon className="h-4 w-4" />
                      {activeSession ? 'Quẹt thẻ ghi nhận giờ ra' : canClockIn ? 'Quẹt thẻ ghi nhận giờ vào' : 'Đã chấm công hôm nay'}
                    </Button>
                  </form>
                )}
              </div>
              {canRegisterShift && selectedDate >= today && (
                <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
                  <Field label="Chọn ca làm đã được thiết lập" className="min-w-56 flex-1">
                    <select className={inputClass} value={selectedShiftId} onChange={(event) => setSelectedShiftId(event.target.value)}>
                      <option value="">Chọn ca làm</option>
                      {shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.name} · {shift.startTime}–{shift.endTime}</option>)}
                    </select>
                  </Field>
                  <Button onClick={registerShift} disabled={!shifts.length}>
                    <CalendarPlusIcon className="h-4 w-4" />
                    Đăng ký ca
                  </Button>
                  {selectedRegistration && <Button variant="secondary" onClick={() => removeRegistration()}>Hủy đăng ký</Button>}
                </div>
              )}
              {message && <p role="status" className="mt-3 text-sm text-blue-700">{message}</p>}
              {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
            </Card>
          )}
        </>
      )}
      </>}

      {manager && error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {manager && settingsOnly && (
        <Button onClick={() => { setSetupOpen(true); setError(''); }}>
          <Settings2Icon className="h-4 w-4" />
          Thiết lập chấm công
        </Button>
      )}

      {manager && (
        <Modal
          open={setupOpen}
          onClose={() => { setSetupOpen(false); setShiftDraft(null); setError(''); }}
          title="Thiết lập chấm công"
          width="max-w-4xl">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">Các ca làm việc</h3>
                <p className="text-xs text-slate-500">Thiết lập giờ ca và ngưỡng đi muộn, về sớm.</p>
              </div>
              <Button size="sm" onClick={() => { setShiftDraft(emptyDraft()); setError(''); }}>
                <PlusIcon className="h-4 w-4" />
                Thêm ca
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="p-3">Tên ca làm việc</th>
                    <th className="p-3">Loại nhân viên</th>
                    <th className="p-3">Bắt đầu</th>
                    <th className="p-3">Kết thúc</th>
                    <th className="p-3">Đi muộn (phút)</th>
                    <th className="p-3">Về sớm (phút)</th>
                    <th className="p-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shifts.map((shift) => (
                    <tr key={shift.id}>
                      <td className="p-3 font-medium">{shift.name}</td>
                      <td className="p-3">{shift.role ?? 'Tất cả nhân viên'}</td>
                      <td className="p-3">{shift.startTime}</td>
                      <td className="p-3">{shift.endTime}</td>
                      <td className="p-3">{shift.lateGraceMinutes}</td>
                      <td className="p-3">{shift.earlyLeaveGraceMinutes}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" aria-label={`Sửa ${shift.name}`} onClick={() => { setShiftDraft(shift); setError(''); }}>
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600" aria-label={`Xóa ${shift.name}`} onClick={() => {
                            const next = shifts.filter((item) => item.id !== shift.id);
                            if (saveShifts(next)) setSelectedShiftId((value) => value === shift.id ? '' : value);
                          }}>
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!shifts.length && <tr><td colSpan={7} className="p-8 text-center text-slate-400">Chưa thiết lập ca làm việc.</td></tr>}
                </tbody>
              </table>
            </div>

            {shiftDraft && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <h4 className="mb-3 text-sm font-semibold text-slate-900">{shiftDraft.id ? 'Sửa ca làm việc' : 'Thêm ca làm việc'}</h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Tên ca">
                    <input className={inputClass} value={shiftDraft.name} onChange={(event) => setShiftDraft({ ...shiftDraft, name: event.target.value })} placeholder="Ca sáng" />
                  </Field>
                  <Field label="Loại nhân viên">
                    <select className={inputClass} value={shiftDraft.role ?? ''} onChange={(event) => setShiftDraft({ ...shiftDraft, role: event.target.value })}>
                      <option value="">Tất cả nhân viên</option>
                      {[...new Set(staff.filter((account) => account.role !== 'Quản lý').map((account) => account.role))].sort((a, b) => a.localeCompare(b, 'vi')).map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Giờ bắt đầu">
                    <input className={inputClass} type="time" value={shiftDraft.startTime} onChange={(event) => setShiftDraft({ ...shiftDraft, startTime: event.target.value })} />
                  </Field>
                  <Field label="Giờ kết thúc">
                    <input className={inputClass} type="time" value={shiftDraft.endTime} onChange={(event) => setShiftDraft({ ...shiftDraft, endTime: event.target.value })} />
                  </Field>
                  <Field label="Cho phép muộn (phút)">
                    <input className={inputClass} type="number" min="0" value={shiftDraft.lateGraceMinutes} onChange={(event) => setShiftDraft({ ...shiftDraft, lateGraceMinutes: Number(event.target.value) })} />
                  </Field>
                  <Field label="Cho phép về sớm (phút)">
                    <input className={inputClass} type="number" min="0" value={shiftDraft.earlyLeaveGraceMinutes} onChange={(event) => setShiftDraft({ ...shiftDraft, earlyLeaveGraceMinutes: Number(event.target.value) })} />
                  </Field>
                </div>
                {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => { setShiftDraft(null); setError(''); }}>Hủy</Button>
                  <Button onClick={saveShiftDraft}>Lưu</Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
