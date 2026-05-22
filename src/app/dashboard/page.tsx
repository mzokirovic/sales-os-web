'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type User = {
  id: string;
  tenantId: string;
  fullName: string;
  phone: string;
  role: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('user');

    if (!token || !savedUser) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(savedUser) as User);
  }, [router]);

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    router.push('/login');
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <p>Yuklanmoqda...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Sales OS</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Dashboard
              </h1>
              <p className="mt-2 text-slate-600">
                Xush kelibsiz, {user.fullName}
              </p>
            </div>

            <button
              onClick={logout}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Chiqish
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Role</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {user.role}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Tenant</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {user.tenantId}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Telefon</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {user.phone}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
