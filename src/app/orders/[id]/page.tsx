'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
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

type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

type OrderItem = {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  price: number;
  total: number;
};

type Payment = {
  id: string;
  amount: number;
  paymentMethod: string | null;
  createdAt?: string;
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
  paymentStatus?: PaymentStatus | null;
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
    phone?: string;
    role: string;
  };
  items: OrderItem[];
  payments?: Payment[];
};

type User = {
  id: string;
  tenantId: string;
  fullName: string;
  phone: string;
  role: string;
};

const statusFlow: OrderStatus[] = [
  'NEW',
  'CHECKED',
  'CONFIRMED',
  'PREPARING',
  'SHIPPED',
  'DELIVERED',
];

const statusLabels: Record<OrderStatus, string> = {
  NEW: 'Yangi',
  CHECKED: 'Tekshirildi',
  CONFIRMED: 'Tasdiqlandi',
  PREPARING: 'Tayyorlanmoqda',
  SHIPPED: 'Yo‘lda',
  DELIVERED: 'Yetkazildi',
  PAID: 'Yopilgan',
};

const statusActionLabels: Partial<Record<OrderStatus, string>> = {
  CHECKED: 'Tekshirish',
  CONFIRMED: 'Tasdiqlash',
  PREPARING: 'Tayyorlash',
  SHIPPED: 'Yo‘lga chiqarish',
  DELIVERED: 'Yetkazildi',
};

const statusDescription: Record<OrderStatus, string> = {
  NEW: 'Yangi zakaz. Operator tekshirishi kerak.',
  CHECKED: 'Tekshirildi. Endi tasdiqlash mumkin.',
  CONFIRMED: 'Tasdiqlandi. Sklad tayyorlashni boshlaydi.',
  PREPARING: 'Sklad tayyorlamoqda.',
  SHIPPED: 'Zakaz yo‘lga chiqdi.',
  DELIVERED: 'Mahsulot yetkazilgan. Pul alohida to‘lovlarda yopiladi.',
  PAID: 'Eski yopilgan status. Endi to‘lov holati alohida yuritiladi.',
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

const paymentStatusLabels: Record<PaymentStatus, string> = {
  UNPAID: 'To‘lanmagan',
  PARTIAL: 'Qisman to‘langan',
  PAID: 'To‘liq to‘langan',
};

const paymentStatusClass: Record<PaymentStatus, string> = {
  UNPAID: 'bg-red-50 text-red-700',
  PARTIAL: 'bg-amber-50 text-amber-700',
  PAID: 'bg-emerald-50 text-emerald-700',
};

const paymentMethodLabels: Record<string, string> = {
  cash: 'Naqd',
  card: 'Karta',
  click: 'Click',
  transfer: 'Bank o‘tkazma',
  other: 'Boshqa',
};

function formatMoney(value?: number | null) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "0 so‘m";
  }

  return `${amount.toLocaleString()} so‘m`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Sana yo‘q';

  return new Date(value).toLocaleString();
}

function getNextStatus(status: OrderStatus) {
  const currentIndex = statusFlow.indexOf(status);

  if (currentIndex < 0 || currentIndex >= statusFlow.length - 1) {
    return null;
  }

  return statusFlow[currentIndex + 1];
}

function getActiveStatusIndex(status: OrderStatus) {
  if (status === 'PAID') {
    return statusFlow.length - 1;
  }

  const index = statusFlow.indexOf(status);

  return index < 0 ? 0 : index;
}

function getPaymentStatus(order: Order): PaymentStatus {
  if (order.paymentStatus) return order.paymentStatus;

  const paidAmount = Number(order.paidAmount ?? 0);
  const debtAmount = Number(order.debtAmount ?? 0);

  if (paidAmount <= 0 && debtAmount > 0) return 'UNPAID';
  if (debtAmount <= 0) return 'PAID';

  return 'PARTIAL';
}

function canAddPayment(role?: string | null) {
  return ['OWNER', 'MANAGER', 'SALES', 'OPERATOR'].includes(role ?? '');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();

  const orderId = typeof params.id === 'string' ? params.id : '';

  const [order, setOrder] = useState<Order | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isAddingPayment, setIsAddingPayment] = useState(false);

  const [error, setError] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const nextStatus = useMemo(() => {
    if (!order) return null;

    return getNextStatus(order.status);
  }, [order]);

  const activeStatusIndex = useMemo(() => {
    if (!order) return 0;

    return getActiveStatusIndex(order.status);
  }, [order]);

  const paymentStatus = useMemo(() => {
    if (!order) return 'UNPAID' as PaymentStatus;

    return getPaymentStatus(order);
  }, [order]);

  const canUserAddPayment = canAddPayment(currentUser?.role);
  const hasDebt = Number(order?.debtAmount ?? 0) > 0;

  function getToken() {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      router.push('/login');
      return null;
    }

    return token;
  }

  function loadCurrentUser() {
    const savedUser = localStorage.getItem('user');

    if (!savedUser) {
      router.push('/login');
      return null;
    }

    const parsedUser = JSON.parse(savedUser) as User;
    setCurrentUser(parsedUser);

    return parsedUser;
  }

  async function loadOrder() {
    setError('');
    setIsLoading(true);

    try {
      const token = getToken();
      if (!token) return;

      loadCurrentUser();

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

  function openPaymentModal() {
    if (!order) return;

    setPaymentError('');
    setSuccessMessage('');
    setPaymentAmount(String(order.debtAmount || ''));
    setPaymentMethod('cash');
    setIsPaymentOpen(true);
  }

  function closePaymentModal() {
    if (isAddingPayment) return;

    setPaymentError('');
    setIsPaymentOpen(false);
  }

  async function addPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!order || isAddingPayment) return;

    setPaymentError('');
    setError('');
    setSuccessMessage('');

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('To‘g‘ri summa kiriting');
      return;
    }

    if (amount > order.debtAmount) {
      setPaymentError('To‘lov hozirgi qarzdan katta bo‘lmasin');
      return;
    }

    setIsAddingPayment(true);

    try {
      const token = getToken();
      if (!token) return;

      const [response] = await Promise.all([
        fetch(`${apiUrl}/orders/${order.id}/payments`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            paymentMethod,
          }),
        }),
        sleep(500),
      ]);

      if (response.status === 403) {
        throw new Error('To‘lov qo‘shish uchun ruxsat yo‘q');
      }

      if (!response.ok) {
        throw new Error('To‘lov qo‘shishda xatolik');
      }

      setPaymentError('');
      setIsPaymentOpen(false);
      setSuccessMessage('To‘lov qo‘shildi');

      await loadOrder();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Noma’lum xatolik');
    } finally {
      setIsAddingPayment(false);
    }
  }

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    if (!isPaymentOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isAddingPayment) {
        closePaymentModal();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaymentOpen, isAddingPayment]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link
            href="/orders"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            ← Zakazlarga qaytish
          </Link>

          <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Order detail
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Zakaz tafsilotlari
              </h1>
              <p className="mt-2 text-slate-600">
                Mahsulot statusi va to‘lov tarixi alohida yuritiladi.
              </p>
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

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {successMessage}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
            <LoadingSpinner label="Zakaz yuklanmoqda..." />
          </div>
        ) : !order ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="font-semibold text-slate-900">Zakaz topilmadi</p>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          statusBadgeClass[order.status]
                        }`}
                      >
                        {statusLabels[order.status]}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          paymentStatusClass[paymentStatus]
                        }`}
                      >
                        {paymentStatusLabels[paymentStatus]}
                      </span>
                    </div>

                    <h2 className="mt-4 text-2xl font-bold text-slate-900">
                      {order.customer.name}
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                      {order.customer.phone || 'Telefon yo‘q'} ·{' '}
                      {order.customer.address || 'Manzil yo‘q'}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                    <p className="text-xs font-semibold text-slate-500">
                      Zakaz ID
                    </p>
                    <p className="mt-1 font-mono text-sm font-bold text-slate-900">
                      {order.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Zakaz statusi
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {statusDescription[order.status]}
                    </p>
                  </div>

                  {nextStatus ? (
                    <button
                      onClick={updateStatus}
                      disabled={isUpdatingStatus}
                      className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isUpdatingStatus
                        ? 'Yangilanmoqda...'
                        : statusActionLabels[nextStatus] || 'Keyingi status'}
                    </button>
                  ) : (
                    <span className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">
                      Status yakunlangan
                    </span>
                  )}
                </div>

                <div className="mt-6 overflow-x-auto pb-2">
                  <div className="flex min-w-max items-center gap-2">
                    {statusFlow.map((status, index) => {
                      const isDone = index <= activeStatusIndex;

                      return (
                        <div key={status} className="flex items-center gap-2">
                          <div
                            className={`rounded-full px-3 py-2 text-xs font-bold ${
                              isDone
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {statusLabels[status]}
                          </div>

                          {index < statusFlow.length - 1 && (
                            <div
                              className={`h-0.5 w-8 ${
                                isDone ? 'bg-slate-900' : 'bg-slate-200'
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                  Mahsulotlar
                </h2>

                <div className="mt-4 divide-y divide-slate-100">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between"
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
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      To‘lov
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Pul bo‘lib-bo‘lib kelishi mumkin. Har biri alohida yoziladi.
                    </p>
                  </div>

                  {canUserAddPayment && hasDebt && (
                    <button
                      onClick={openPaymentModal}
                      className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      + To‘lov
                    </button>
                  )}
                </div>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-500">
                      Jami
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {formatMoney(order.totalAmount)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-4">
                      <p className="text-xs font-semibold text-emerald-700">
                        To‘langan
                      </p>
                      <p className="mt-1 font-bold text-emerald-800">
                        {formatMoney(order.paidAmount)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-red-50 p-4">
                      <p className="text-xs font-semibold text-red-700">
                        Qarz
                      </p>
                      <p className="mt-1 font-bold text-red-800">
                        {formatMoney(order.debtAmount)}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl p-4 ${
                      paymentStatusClass[paymentStatus]
                    }`}
                  >
                    <p className="text-sm font-bold">
                      Holat: {paymentStatusLabels[paymentStatus]}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                  To‘lovlar tarixi
                </h2>

                {!order.payments || order.payments.length === 0 ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                    Hali to‘lov kiritilmagan
                  </div>
                ) : (
                  <div className="mt-4 divide-y divide-slate-100">
                    {order.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-start justify-between gap-4 py-4"
                      >
                        <div>
                          <p className="font-bold text-slate-900">
                            {formatMoney(payment.amount)}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {paymentMethodLabels[
                              payment.paymentMethod ?? 'other'
                            ] ?? 'Boshqa'}
                          </p>
                        </div>

                        <p className="text-right text-xs font-semibold text-slate-500">
                          {formatDate(payment.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                  Qo‘shimcha
                </h2>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Yaratgan</span>
                    <span className="font-semibold text-slate-900">
                      {order.createdBy.fullName}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Yaratilgan</span>
                    <span className="font-semibold text-slate-900">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Yangilangan</span>
                    <span className="font-semibold text-slate-900">
                      {formatDate(order.updatedAt)}
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      {isPaymentOpen && order && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closePaymentModal();
            }
          }}
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  To‘lov qo‘shish
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Qarz: {formatMoney(order.debtAmount)}
                </p>
              </div>

              <button
                type="button"
                onClick={closePaymentModal}
                disabled={isAddingPayment}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-500 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ✕
              </button>
            </div>

            {paymentError && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                {paymentError}
              </div>
            )}

            <form onSubmit={addPayment} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Summa
                </label>
                <input
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  inputMode="numeric"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                  placeholder="125000"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  To‘lov turi
                </label>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                >
                  <option value="cash">Naqd</option>
                  <option value="card">Karta</option>
                  <option value="click">Click</option>
                  <option value="transfer">Bank o‘tkazma</option>
                  <option value="other">Boshqa</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isAddingPayment}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAddingPayment ? 'Qo‘shilmoqda...' : 'To‘lov qo‘shish'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
