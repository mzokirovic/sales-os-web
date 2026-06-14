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

type Customer = {
  id: string;
  tenantId: string;
  createdById: string | null;
  name: string;
  phone: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  note: string | null;
  createdAt: string;
};

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
  items: OrderItem[];
  payments: unknown[];
};

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

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();

  const customerId = typeof params.id === 'string' ? params.id : '';

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const totalSales = useMemo(() => {
    return orders.reduce((sum, order) => sum + Number(order.totalAmount ?? 0), 0);
  }, [orders]);

  const totalDebt = useMemo(() => {
    return orders.reduce((sum, order) => sum + Number(order.debtAmount ?? 0), 0);
  }, [orders]);

  const lastOrder = useMemo(() => {
    return orders[0] ?? null;
  }, [orders]);

  function getToken() {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      router.push('/login');
      return null;
    }

    return token;
  }

  async function loadCustomerDetail() {
    setError('');
    setIsLoading(true);

    try {
      const token = getToken();
      if (!token) return;

      const [customerResponse, ordersResponse] = await Promise.all([
        fetch(`${apiUrl}/customers/${customerId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${apiUrl}/orders?customerId=${encodeURIComponent(customerId)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (customerResponse.status === 401 || ordersResponse.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }

      if (customerResponse.status === 404) {
        throw new Error('Mijoz topilmadi');
      }

      if (!customerResponse.ok) {
        throw new Error('Mijoz ma’lumotlarini yuklashda xatolik');
      }

      if (!ordersResponse.ok) {
        throw new Error('Mijoz zakazlarini yuklashda xatolik');
      }

      const customerData = (await customerResponse.json()) as Customer;
      const ordersData = (await ordersResponse.json()) as Order[];

      setCustomer(customerData);
      setOrders(ordersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noma’lum xatolik');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (customerId) {
      loadCustomerDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link
            href="/customers"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          >
            <span className="text-lg leading-none">←</span>
            <span>Mijozlar</span>
          </Link>

          <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                {customer?.name ?? 'Mijoz tafsilotlari'}
              </h1>
            </div>

            <button
              onClick={loadCustomerDetail}
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

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3 text-slate-600">
              <LoadingSpinner />
              Yuklanmoqda...
            </div>
          </div>
        ) : customer ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Zakazlar</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {orders.length}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Jami savdo</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatMoney(totalSales)}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Qarz</p>
                <p className="mt-2 text-2xl font-bold text-red-600">
                  {formatMoney(totalDebt)}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Oxirgi zakaz</p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {lastOrder ? formatDate(lastOrder.createdAt) : 'Yo‘q'}
                </p>
              </div>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Mijoz ma’lumotlari
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Nomi</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {customer.name}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Telefon</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {customer.phone ?? 'Telefon yo‘q'}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Manzil</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {customer.address ?? 'Manzil yo‘q'}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Qo‘shilgan</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDate(customer.createdAt)}
                  </p>
                </div>
              </div>

              {customer.note ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Izoh</p>
                  <p className="mt-1 text-slate-700">{customer.note}</p>
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Mijoz zakazlari
                </h2>
              </div>

              {orders.length === 0 ? (
                <div className="p-6">
                  <div className="rounded-2xl bg-slate-50 p-6 text-center">
                    <p className="font-semibold text-slate-900">
                      Hali zakaz yo‘q
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {orders.map((order) => {
                    const paidAmount = Math.max(
                      Number(order.totalAmount ?? 0) -
                        Number(order.debtAmount ?? 0),
                      0,
                    );

                    return (
                      <div key={order.id} className="p-5 hover:bg-slate-50">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass[order.status]}`}
                              >
                                {statusLabels[order.status]}
                              </span>

                              <span className="text-sm text-slate-500">
                                {formatDate(order.createdAt)}
                              </span>
                            </div>

                            <p className="mt-2 font-semibold text-slate-900">
                              {order.items.length} ta mahsulot ·{' '}
                              {order.createdBy.fullName}
                            </p>
                          </div>

                          <div className="flex flex-col gap-3 md:items-end">
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              <div>
                                <p className="text-slate-500">Jami</p>
                                <p className="font-bold text-slate-900">
                                  {formatMoney(order.totalAmount)}
                                </p>
                              </div>

                              <div>
                                <p className="text-slate-500">To‘langan</p>
                                <p className="font-bold text-emerald-600">
                                  {formatMoney(paidAmount)}
                                </p>
                              </div>

                              <div>
                                <p className="text-slate-500">Qarz</p>
                                <p className="font-bold text-red-600">
                                  {formatMoney(order.debtAmount)}
                                </p>
                              </div>
                            </div>

                            <Link
                              href={`/orders/${order.id}`}
                              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                            >
                              Batafsil
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
