'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { LoadingSpinner } from '@/components/loading-spinner';

type OrderStatus =
  | 'NEW'
  | 'CHECKED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'PAID';

type RecentOrder = {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  debtAmount: number;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
  };
  createdBy: {
    id: string;
    fullName: string;
    role: string;
  };
  items: {
    id: string;
    productName: string;
    quantity: number;
    price: number;
    total: number;
  }[];
};

type DashboardSummary = {
  totalSales: number;
  openDebt: number;
  ordersCount: number;
  customersCount: number;
  productsCount: number;
  activeProductsCount: number;
  newOrdersCount: number;
  statusBreakdown: {
    status: OrderStatus;
    count: number;
  }[];
  recentOrders: RecentOrder[];
};

const statusFlow: OrderStatus[] = [
  'NEW',
  'CHECKED',
  'CONFIRMED',
  'PREPARING',
  'SHIPPED',
  'DELIVERED',
  'PAID',
];

const statusLabels: Record<OrderStatus, string> = {
  NEW: 'Yangi',
  CHECKED: 'Tekshirildi',
  CONFIRMED: 'Tasdiqlandi',
  PREPARING: 'Tayyorlanmoqda',
  SHIPPED: 'Yo‘lda',
  DELIVERED: 'Yetkazildi',
  PAID: 'Yopildi',
};

const statusBadgeClass: Record<OrderStatus, string> = {
  NEW: 'bg-blue-50 text-blue-700',
  CHECKED: 'bg-indigo-50 text-indigo-700',
  CONFIRMED: 'bg-violet-50 text-violet-700',
  PREPARING: 'bg-amber-50 text-amber-700',
  SHIPPED: 'bg-orange-50 text-orange-700',
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  PAID: 'bg-slate-900 text-white',
};

function formatMoney(value: number) {
  return `${value.toLocaleString()} so‘m`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function DashboardPage() {
  const router = useRouter();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const statusCountMap = useMemo(() => {
    const map = new Map<OrderStatus, number>();

    for (const status of statusFlow) {
      map.set(status, 0);
    }

    for (const item of summary?.statusBreakdown ?? []) {
      map.set(item.status, item.count);
    }

    return map;
  }, [summary]);

  const maxStatusCount = useMemo(() => {
    const values = Array.from(statusCountMap.values());
    return Math.max(...values, 1);
  }, [statusCountMap]);

  async function loadSummary() {
    setError('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${apiUrl}/dashboard/summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Dashboard ma’lumotlarini yuklashda xatolik');
      }

      const data = (await response.json()) as DashboardSummary;
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noma’lum xatolik');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium text-slate-500">Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Sales OS boshqaruv paneli
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Real savdo, qarz, zakaz statuslari va oxirgi buyurtmalar bir
              joyda. Maqsad — direktor va manager vaziyatni tez tushunsin.
            </p>
          </div>

          <button
            onClick={loadSummary}
            disabled={isLoading}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner />
                Yangilanmoqda...
              </span>
            ) : (
              'Yangilash'
            )}
          </button>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="animate-pulse">
                    <div className="h-4 w-24 rounded bg-slate-200" />
                    <div className="mt-4 h-7 w-36 rounded bg-slate-100" />
                    <div className="mt-3 h-3 w-28 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="animate-pulse space-y-4">
                <div className="h-5 w-44 rounded bg-slate-200" />
                <div className="h-28 rounded-2xl bg-slate-100" />
              </div>
            </div>
          </div>
        ) : summary ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Jami savdo
                </p>
                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {formatMoney(summary.totalSales)}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Barcha zakazlar bo‘yicha
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Ochiq qarz
                </p>
                <p className="mt-3 text-2xl font-bold text-red-600">
                  {formatMoney(summary.openDebt)}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  To‘lov kutilayotgan summa
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Zakazlar
                </p>
                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {summary.ordersCount}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Yangi: {summary.newOrdersCount}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Mijozlar / mahsulotlar
                </p>
                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {summary.customersCount} / {summary.productsCount}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Aktiv mahsulotlar: {summary.activeProductsCount}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-1">
                <h2 className="text-lg font-bold text-slate-900">
                  Statuslar bo‘yicha
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Zakazlar qaysi bosqichda turganini ko‘rsatadi.
                </p>

                <div className="mt-5 space-y-4">
                  {statusFlow.map((status) => {
                    const count = statusCountMap.get(status) ?? 0;
                    const width = `${Math.max((count / maxStatusCount) * 100, count > 0 ? 8 : 0)}%`;

                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-slate-700">
                            {statusLabels[status]}
                          </span>
                          <span className="text-slate-500">{count}</span>
                        </div>

                        <div className="mt-2 h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-slate-900"
                            style={{ width }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
                <div className="border-b border-slate-200 p-6">
                  <h2 className="text-lg font-bold text-slate-900">
                    Oxirgi zakazlar
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Eng so‘nggi 5 ta zakaz.
                  </p>
                </div>

                {summary.recentOrders.length === 0 ? (
                  <div className="p-6">
                    <div className="rounded-2xl bg-slate-50 p-6 text-center">
                      <p className="font-semibold text-slate-900">
                        Hali zakaz yo‘q
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Birinchi zakaz yaratilganda shu yerda chiqadi.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {summary.recentOrders.map((order) => (
                      <div key={order.id} className="p-5 hover:bg-slate-50">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-slate-900">
                                {order.customer.name}
                              </h3>

                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  statusBadgeClass[order.status]
                                }`}
                              >
                                {order.status}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              {order.customer.phone ?? 'Telefon yo‘q'} ·{' '}
                              {order.customer.address ?? 'Manzil yo‘q'}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              Yaratgan: {order.createdBy.fullName} ·{' '}
                              {formatDate(order.createdAt)}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {order.items.map((item) => (
                                <span
                                  key={item.id}
                                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                                >
                                  {item.productName} × {item.quantity}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="min-w-48 rounded-2xl bg-slate-50 p-4 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Jami</span>
                              <span className="font-bold text-slate-900">
                                {formatMoney(order.totalAmount)}
                              </span>
                            </div>

                            <div className="mt-2 flex justify-between">
                              <span className="text-slate-500">Qarz</span>
                              <span className="font-bold text-red-600">
                                {formatMoney(order.debtAmount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
            Dashboard ma’lumotlari topilmadi.
          </div>
        )}
      </div>
    </AppShell>
  );
}
