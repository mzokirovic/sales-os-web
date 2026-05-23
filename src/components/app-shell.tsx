'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

type User = {
  id: string;
  tenantId: string;
  fullName: string;
  phone: string;
  role: string;
};

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
  },
  {
    label: 'Customers',
    href: '/customers',
  },
  {
    label: 'Orders',
    href: '/orders',
  },
  {
    label: 'Employees',
    href: '/employees',
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

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
      <main className="min-h-screen bg-slate-100 p-6 text-slate-700">
        Yuklanmoqda...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-slate-200 bg-white p-5 lg:block">
          <div className="mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white">
              S
            </div>

            <h1 className="mt-4 text-xl font-bold text-slate-900">
              Sales OS
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Sotuvdan zakazgacha boshqaruv paneli
            </p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    isActive
                      ? 'block rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white'
                      : 'block rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Current user
            </p>
            <p className="mt-2 font-semibold text-slate-900">
              {user.fullName}
            </p>
            <p className="mt-1 text-sm text-slate-500">{user.role}</p>
          </div>
        </aside>

        <section className="flex-1">
          <header className="border-b border-slate-200 bg-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Demo Paint</p>
                <h2 className="text-lg font-bold text-slate-900">
                  {user.fullName}
                </h2>
              </div>

              <button
                onClick={logout}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Chiqish
              </button>
            </div>
          </header>

          <div className="p-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
