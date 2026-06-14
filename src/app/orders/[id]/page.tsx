'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

type OrderItem = {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  price: number;
  total: number;
};

type Order = {
  id: string;
  tenantId: string;
  customerId: string;
  createdById: string;
  status: OrderStatus;
  totalAmount: number;
  paidAmount?: number | null;
  debtAmount: number;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    note: string | null;
  };
  createdBy: {
    id: string;
    fullName: string;
    phone: string;
    role: string;
  };
  items: OrderItem[];
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

function formatMoney(value?: number | null) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "0 so‘m";
  }

  return `${amount.toLocaleString()} so‘m`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function getNextStatus(status: OrderStatus) {
  const currentIndex = statusFlow.indexOf(status);

  if (currentIndex < 0 || currentIndex >= statusFlow.length - 1) {
    return null;
  }

  return statusFlow[currentIndex + 1];
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();

  const orderId = typeof params.id === 'string' ? params.id : '';

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const nextStatus = useMemo(() => {
    if (!order) return null;

    return getNextStatus(order.status);
  }, [order]);

  const activeStatusIndex = useMemo(() => {
    if (!order) return 0;

    return statusFlow.indexOf(order.status);
  }, [order]);

  function getToken() {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      router.push('/login');
      return null;
    }

    return token;
  }

  async function loadOrder() {
    setError('');
    setIsLoading(true);

    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${apiUrl}/orders/${orderId}`, {
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

      if (response.status === 404) {
        throw new Error('Zakaz topilmadi');
      }

      if (!response.ok) {
        throw new Error('Zakazni yuklashda xatolik');
      }

      const data = (await response.json()) as Order;
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noma’lum xatolik');
    } finally {
      setIsLoading(false);
    }
  }

  async function updateStatus() {
    if (!order || !nextStatus) return;

    setError('');
    setSuccessMessage('');
    setIsUpdatingStatus(true);

    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${apiUrl}/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      if (response.status === 403) {
        throw new Error('Bu statusga o‘tkazish uchun ruxsat yo‘q');
      }

      if (!response.ok) {
        throw new Error('Statusni yangilashda xatolik');
      }

      setSuccessMessage(`Status: ${statusLabels[nextStatus]}`);
      await loadOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noma’lum xatolik');
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          >
            <span className="text-lg leading-none">←</span>
            <span>Zakazlar</span>
          </Link>

          <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Zakaz tafsilotlari
              </h1>
            </div>

            <button
              onClick={loadOrder}
              disabled={isLoading}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Yuklanmoqda...' : 'Yangilash'}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3 text-slate-600">
              <LoadingSpinner />
              Zakaz yuklanmoqda...
            </div>
          </div>
        ) : order ? (
          <div className="grid gap-6 xl:grid-cols-3">
            <section className="space-y-6 xl:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900">
                        {order.customer.name}
                      </h2>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          statusBadgeClass[order.status]
                        }`}
                      >
                        {statusLabels[order.status]}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {order.customer.phone ?? 'Telefon yo‘q'} ·{' '}
                      {order.customer.address ?? 'Manzil yo‘q'}
                    </p>

                    {order.customer.note ? (
                      <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        {order.customer.note}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                    <p className="text-slate-500">Yaratilgan</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-6">
                  <h2 className="text-lg font-bold text-slate-900">
                    Mahsulotlar
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Zakaz yaratilgan paytdagi product snapshot.
                  </p>
                </div>

                <div className="divide-y divide-slate-100">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-900">
                          {item.productName}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.quantity} × {formatMoney(item.price)}
                        </p>
                      </div>

                      <p className="font-bold text-slate-900">
                        {formatMoney(item.total)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                  Status progress
                </h2>

                <div className="mt-5 overflow-x-auto pb-1">
                  <div className="flex min-w-[720px] items-start">
                    {statusFlow.map((status, index) => {
                      const isCompleted = index < activeStatusIndex;
                      const isCurrent = index === activeStatusIndex;
                      const isActive = index <= activeStatusIndex;

                      return (
                        <div
                          key={status}
                          className="flex flex-1 items-start last:flex-none"
                        >
                          <div className="flex flex-col items-center">
                            <div
                              className={
                                isActive
                                  ? 'flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white'
                                  : 'flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-400'
                              }
                            >
                              {index + 1}
                            </div>

                            <p
                              className={
                                isCurrent
                                  ? 'mt-2 w-24 text-center text-xs font-bold text-slate-900'
                                  : 'mt-2 w-24 text-center text-xs font-medium text-slate-500'
                              }
                            >
                              {statusLabels[status]}
                            </p>
                          </div>

                          {index < statusFlow.length - 1 ? (
                            <div
                              className={
                                isCompleted
                                  ? 'mt-4 h-1 flex-1 rounded-full bg-slate-900'
                                  : 'mt-4 h-1 flex-1 rounded-full bg-slate-100'
                              }
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                  Hisob-kitob
                </h2>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Jami</span>
                    <span className="font-bold text-slate-900">
                      {formatMoney(order.totalAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">To‘langan</span>
                    <span className="font-bold text-emerald-600">
                      {formatMoney(order.paidAmount ?? Math.max((order.totalAmount ?? 0) - (order.debtAmount ?? 0), 0))}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Qarz</span>
                    <span
                      className={
                        order.debtAmount > 0
                          ? 'font-bold text-red-600'
                          : 'font-bold text-emerald-600'
                      }
                    >
                      {formatMoney(order.debtAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Status</h2>

                <p className="mt-2 text-sm text-slate-500">
                  Hozirgi status:{' '}
                  <span className="font-bold text-slate-900">
                    {statusLabels[order.status]}
                  </span>
                </p>

                {nextStatus ? (
                  <button
                    type="button"
                    onClick={updateStatus}
                    disabled={isUpdatingStatus}
                    className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUpdatingStatus ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoadingSpinner />
                        Yangilanmoqda...
                      </span>
                    ) : (
                      `${statusLabels[nextStatus]} qilish`
                    )}
                  </button>
                ) : (
                  <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                    Zakaz yakunlangan.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                  Yaratgan xodim
                </h2>

                <p className="mt-3 font-bold text-slate-900">
                  {order.createdBy.fullName}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {order.createdBy.phone} · {order.createdBy.role}
                </p>
              </div>
            </aside>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
            Zakaz topilmadi.
          </div>
        )}
      </div>
    </AppShell>
  );
}
