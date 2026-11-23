import { accounts as seedAccounts } from '../data/seed';
import type { Account } from '../types';

export const ATTENDANCE_KEY = 'bepkho.attendanceCards';

export type AttendanceSession = {
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
  payrollEligible?: boolean;
};

function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function localDateKey(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function readAttendanceRows(): AttendanceSession[] {
  const rows = readStored<AttendanceSession[]>(ATTENDANCE_KEY, []);
  const currentMonth = localDateKey(new Date().toISOString()).slice(0, 7);
  let migrated = false;
  const currentRows = rows.map((row) => {
    if (row.demo && !row.payrollEligible && localDateKey(row.at).startsWith(currentMonth)) {
      migrated = true;
      return { ...row, payrollEligible: true };
    }
    return row;
  });
  const employeesWithAttendance = new Set(
    currentRows
      .filter((row) => localDateKey(row.at).startsWith(currentMonth))
      .map((row) => row.username)
  );
  const savedAccounts = readStored<unknown>('bepkho.admin.accounts', null);
  const accounts = Array.isArray(savedAccounts) ? savedAccounts as Account[] : seedAccounts;
  const staff = accounts.filter((account) =>
    account.role !== 'Admin' &&
    account.role !== 'Quản lý' &&
    !employeesWithAttendance.has(account.username)
  );
  const profiles = readStored<Record<string, { employeeId?: string; department?: string }>>('bepkho.staffProfiles', {});
  const now = new Date();
  const simulated: AttendanceSession[] = [];

  staff.forEach((account, employeeIndex) => {
    const startHour = account.role === 'Nhân viên kho' || account.role === 'Kế toán'
      ? 8
      : account.role === 'Bếp'
        ? 9
        : 14;
    for (let day = 1; day <= now.getDate(); day += 1) {
      const date = new Date(now.getFullYear(), now.getMonth(), day);
      if ((date.getDay() + employeeIndex) % 7 === 0) continue;
      const dayKey = localDateKey(date.toISOString());
      const startMinute = (day * 7 + employeeIndex * 11) % 30;
      const start = new Date(date.getFullYear(), date.getMonth(), day, startHour, startMinute);
      const end = new Date(start.getTime() + (8 * 60 + (day + employeeIndex) % 3 * 15) * 60_000);
      simulated.push({
        id: `CARD-DEMO-${account.username}-${dayKey}`,
        username: account.username,
        name: account.name,
        employeeId: profiles[account.username]?.employeeId ?? account.username,
        department: profiles[account.username]?.department ?? account.role,
        role: account.role,
        at: start.toISOString(),
        logoutAt: end.toISOString(),
        status: 'Thành công',
        method: 'CARD',
        demo: true,
        payrollEligible: true
      });
    }
  });

  if (!simulated.length && !migrated) return rows;
  const next = [...simulated, ...currentRows];
  try {
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(next));
  } catch {
    return next;
  }
  return next;
}
