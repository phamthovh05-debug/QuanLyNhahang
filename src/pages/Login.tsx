import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardListIcon,
  EyeIcon,
  EyeOffIcon,
  LockKeyholeIcon,
  UserRoundIcon } from
'lucide-react';
import { Button } from '../components/ui/Button';
import { ROLE_HOME, useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { normalizeLoginName, readAdminAccounts } from './Admin';

export function Login() {
  const accounts = readAdminAccounts();
  const { login } = useAuth();
  const { cashierShifts } = useApp();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setLoading(true);
    setError(null);
    window.setTimeout(() => {
      const err = login(username, password);
      setLoading(false);
      if (err) {
        setError(err);
        return;
      }

      const loginName = normalizeLoginName(username);
      const account = accounts.find((item) =>
        normalizeLoginName(item.username) === loginName ||
        normalizeLoginName(item.name) === loginName
      );
      const destination = account?.role === 'Thu ngân'
        ? cashierShifts.some((shift) => shift.cashier === account.name && shift.status === 'OPEN')
          ? '/cashier'
          : '/cashier?screen=shift'
        : account ? ROLE_HOME[account.role] : '/';
      navigate(destination, { replace: true });
    }, 350);
  };

  return (
    <main className="grid min-h-screen w-full bg-slate-50 lg:grid-cols-2">
      <section
        className="relative flex min-h-[310px] flex-col justify-between overflow-hidden bg-cover bg-center px-7 py-7 text-white sm:min-h-[370px] sm:px-12 sm:py-10 lg:min-h-screen lg:px-14 lg:py-12 xl:px-20"
        style={{ backgroundImage: "url('/2bbcaae5-e9ae-4d34-95d5-4b8b63c0b2a5.jpg')" }}>
        <div className="absolute inset-0 bg-slate-950/55" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/65 via-blue-950/10 to-slate-950/70" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 shadow-lg backdrop-blur-md">
            <ClipboardListIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-white">BếpKho</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/70">
              Sen Vàng Restaurant
            </p>
          </div>
        </div>

        <div className="relative my-12 max-w-xl lg:my-auto lg:py-16">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-medium text-blue-50 backdrop-blur">
            ẨM THỰC SEN VÀNG
          </span>
          <h1 className="max-w-lg text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl xl:text-5xl">
            Trọn vị món ngon,
            <span className="block text-blue-200">trọn tâm trải nghiệm.</span>
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-white/80 sm:text-base">
            Không gian ấm cúng, món Việt đậm đà và sự chỉn chu trong từng trải nghiệm
            — chào mừng bạn đến với Sen Vàng.
          </p>
        </div>

        <p className="relative text-xs text-white/60">© 2026 Sen Vàng Restaurant</p>
      </section>

      <section className="flex min-h-[520px] items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 px-5 py-12 sm:px-8 lg:min-h-screen lg:px-12">
        <div className="w-full max-w-[440px] rounded-[26px] border border-white bg-white p-7 shadow-[0_24px_70px_rgba(30,64,175,0.12)] sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-900/20">
              <ClipboardListIcon className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Đăng nhập
            </h2>
          </div>

          <form className="space-y-5" onSubmit={submit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Tên đăng nhập hoặc họ tên
              </span>
              <span className="relative block">
                <UserRoundIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  aria-label="Tên đăng nhập hoặc họ tên"
                  placeholder="Nhập tên đăng nhập hoặc họ tên"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10" />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Mật khẩu</span>
              <span className="relative block">
                <LockKeyholeIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  aria-label="Mật khẩu"
                  aria-describedby={error ? 'login-error' : undefined}
                  placeholder="Nhập mật khẩu"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10" />
                <button
                  type="button"
                  onClick={() => setShow((visible) => !visible)}
                  aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-pressed={show}
                  className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                  {show
                    ? <EyeOffIcon aria-hidden="true" className="h-[18px] w-[18px]" />
                    : <EyeIcon aria-hidden="true" className="h-[18px] w-[18px]" />}
                </button>
              </span>
            </label>

            {error && (
              <p id="login-error" role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="h-12 w-full gap-2 rounded-xl bg-blue-600 text-sm shadow-md shadow-blue-900/10 hover:bg-blue-700" disabled={loading}>
              {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
