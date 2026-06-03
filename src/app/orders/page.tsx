'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { LoadingSpinner } from '@/components/loading-spinner';

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
};

type Product = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  price: number;
  isActive: boolean;
};

type OrderItem = {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  product?: Product | null;
};

type OrderStatus =
  | 'NEW'
  | 'CHECKED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'PAID';

type User = {
  id: string;
  tenantId: string;
  fullName: string;
  phone: string;
  role: string;
};

type Order = {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  debtAmount: number;
  createdAt: string;
  customer: Customer;
  items: OrderItem[];
  payments: {
    id: string;
    amount: number;
    paymentMethod: string | null;
  }[];
};

type FormItem = {
  productId: string;
  quantity: string;
};

type StatusFilter = 'ALL' | OrderStatus;
type DebtFilter = 'ALL' | 'WITH_DEBT' | 'NO_DEBT';

const initialItem: FormItem = {
  productId: '',
  quantity: '1',
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

const nextStatusMap: Record<OrderStatus, OrderStatus | null> = {
  NEW: 'CHECKED',
  CHECKED: 'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'SHIPPED',
  SHIPPED: 'DELIVERED',
  DELIVERED: 'PAID',
  PAID: null,
};

const statusLabels: Record<OrderStatus, string> = {
  NEW: 'Tekshirishga yuborish',
  CHECKED: 'Tasdiqlash',
  CONFIRMED: 'Skladga berish',
  PREPARING: 'Yo‘lga chiqarish',
  SHIPPED: 'Yetkazildi',
  DELIVERED: 'To‘liq yopish',
  PAID: 'Yopilgan',
};

const statusShortLabels: Record<OrderStatus, string> = {
  NEW: 'Yangi',
  CHECKED: 'Tekshirildi',
  CONFIRMED: 'Tasdiqlandi',
  PREPARING: 'Tayyorlanmoqda',
  SHIPPED: 'Yo‘lda',
  DELIVERED: 'Yetkazildi',
  PAID: 'Yopildi',
};

const statusDescription: Record<OrderStatus, string> = {
  NEW: 'Yangi zakaz. Operator tekshirishi kerak.',
  CHECKED: 'Tekshirildi. Endi tasdiqlash mumkin.',
  CONFIRMED: 'Tasdiqlandi. Sklad tayyorlashni boshlaydi.',
  PREPARING: 'Sklad tayyorlamoqda.',
  SHIPPED: 'Zakaz yo‘lga chiqdi.',
  DELIVERED: 'Yetkazildi. To‘lov yopilishi kerak.',
  PAID: 'Zakaz yopilgan.',
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canSeeStatusButton(role?: string | null) {
  return ['OWNER', 'MANAGER', 'OPERATOR', 'WAREHOUSE', 'DELIVERY'].includes(
    role ?? '',
  );
}

export default function OrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [customerId, setCustomerId] = useState('');
  const [paidAmount, setPaidAmount] = useState('0');
  const [items, setItems] = useState<FormItem[]>([{ ...initialItem }]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [debtFilter, setDebtFilter] = useState<DebtFilter>('ALL');

  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const productsById = useMemo(() => {
    return new Map(products.map((product) => [product.id, product]));
  }, [products]);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const product = productsById.get(item.productId);
      const quantity = Number(item.quantity) || 0;

      if (!product) return sum;

      return sum + quantity * product.price;
    }, 0);
  }, [items, productsById]);

  const paidAmountNumber = Number(paidAmount) || 0;
  const debtAmount = Math.max(totalAmount - paidAmountNumber, 0);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !query ||
        order.customer.name.toLowerCase().includes(query) ||
        (order.customer.phone ?? '').toLowerCase().includes(query) ||
        (order.customer.address ?? '').toLowerCase().includes(query) ||
        order.items.some((item) =>
          item.productName.toLowerCase().includes(query),
        );

      const matchesStatus =
        statusFilter === 'ALL' || order.status === statusFilter;

      const matchesDebt =
        debtFilter === 'ALL' ||
        (debtFilter === 'WITH_DEBT' && order.debtAmount > 0) ||
        (debtFilter === 'NO_DEBT' && order.debtAmount <= 0);

      return matchesSearch && matchesStatus && matchesDebt;
    });
  }, [orders, searchQuery, statusFilter, debtFilter]);

  const totalOpenDebt = useMemo(() => {
    return orders.reduce((sum, order) => sum + order.debtAmount, 0);
  }, [orders]);

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

  async function loadData() {
    setError('');
    setIsLoading(true);

    try {
      const token = getToken();
      if (!token) return;

      loadCurrentUser();

      const [ordersResponse, customersResponse, productsResponse] =
        await Promise.all([
          fetch(`${apiUrl}/orders`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${apiUrl}/customers`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${apiUrl}/products/active`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

      if (
        ordersResponse.status === 401 ||
        customersResponse.status === 401 ||
        productsResponse.status === 401
      ) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }

      if (!ordersResponse.ok || !customersResponse.ok || !productsResponse.ok) {
        throw new Error('Ma’lumotlarni yuklashda xatolik');
      }

      const ordersData = (await ordersResponse.json()) as Order[];
      const customersData = (await customersResponse.json()) as Customer[];
      const productsData = (await productsResponse.json()) as Product[];

      setOrders(ordersData);
      setCustomers(customersData);
      setProducts(productsData);

      if (!customerId && customersData.length > 0) {
        setCustomerId(customersData[0].id);
      }

      if (productsData.length > 0) {
        setItems((current) =>
          current.map((item) => ({
            ...item,
            productId: item.productId || productsData[0].id,
          })),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noma’lum xatolik');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateItem(index: number, field: keyof FormItem, value: string) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        productId: products[0]?.id ?? '',
        quantity: '1',
      },
    ]);
  }

  function removeItem(index: number) {
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  function resetFilters() {
    setSearchQuery('');
    setStatusFilter('ALL');
    setDebtFilter('ALL');
  }

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setSuccessMessage('');

    if (!customerId) {
      setError('Mijoz tanlash majburiy');
      return;
    }

    if (products.length === 0) {
      setError('Avval mahsulot qo‘shing');
      return;
    }

    const validItems = items
      .filter((item) => item.productId)
      .map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      }));

    if (validItems.length === 0) {
      setError('Kamida bitta mahsulot tanlang');
      return;
    }

    const hasInvalidItem = validItems.some((item) => item.quantity <= 0);

    if (hasInvalidItem) {
      setError('Mahsulot soni 0 dan katta bo‘lishi kerak');
      return;
    }

    if (paidAmountNumber > totalAmount) {
      setError('To‘langan summa jami summadan katta bo‘lmasligi kerak');
      return;
    }

    setIsCreating(true);

    try {
      const token = getToken();
      if (!token) return;

      const [response] = await Promise.all([
        fetch(`${apiUrl}/orders`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerId,
            paidAmount: paidAmountNumber,
            items: validItems,
          }),
        }),
        sleep(700),
      ]);

      if (response.status === 403) {
        throw new Error('Bu amal uchun ruxsat yo‘q');
      }

      if (!response.ok) {
        throw new Error('Zakaz yaratishda xatolik');
      }

      setPaidAmount('0');
      setItems([
        {
          productId: products[0]?.id ?? '',
          quantity: '1',
        },
      ]);

      setSuccessMessage('Zakaz yaratildi');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noma’lum xatolik');
    } finally {
      setIsCreating(false);
    }
  }

  async function updateOrderStatus(order: Order) {
    const nextStatus = nextStatusMap[order.status];

    if (!nextStatus) return;

    setError('');
    setSuccessMessage('');
    setUpdatingOrderId(order.id);

    try {
      const token = getToken();
      if (!token) return;

      const [response] = await Promise.all([
        fetch(`${apiUrl}/orders/${order.id}/status`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }),
        sleep(700),
      ]);

      if (response.status === 403) {
        throw new Error('Bu statusga o‘tkazish uchun ruxsat yo‘q');
      }

      if (!response.ok) {
        throw new Error('Statusni yangilashda xatolik');
      }

      setSuccessMessage('Status yangilandi');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noma’lum xatolik');
    } finally {
      setUpdatingOrderId(null);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium text-slate-500">Orders</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Zakazlar
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Ixcham Sales OS: mahsulot tanlash, qarzni ko‘rish, status
              yuritish va zakazlarni tez topish.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
              <p className="text-sm text-slate-500">Jami zakazlar</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {orders.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
              <p className="text-sm text-slate-500">Ochiq qarz</p>
              <p className="mt-1 text-2xl font-bold text-red-600">
                {formatMoney(totalOpenDebt)}
              </p>
            </div>
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

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-1">
            <h2 className="text-lg font-bold text-slate-900">Yangi zakaz</h2>
            <p className="mt-1 text-sm text-slate-500">
              Mahsulotni bazadan tanlang. Narx avtomatik hisoblanadi.
            </p>

            <form onSubmit={createOrder} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Mijoz
                </label>

                <select
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                >
                  {customers.length === 0 ? (
                    <option value="">Mijoz topilmadi</option>
                  ) : null}

                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">
                    Mahsulotlar
                  </label>

                  <button
                    type="button"
                    onClick={addItem}
                    disabled={products.length === 0}
                    className="text-sm font-semibold text-slate-900 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    + Qo‘shish
                  </button>
                </div>

                {products.length === 0 ? (
                  <div className="rounded-2xl bg-amber-50 p-4 text-sm font-medium text-amber-700">
                    Hali aktiv mahsulot yo‘q. Avval Products sahifasidan
                    mahsulot qo‘shing.
                  </div>
                ) : null}

                {items.map((item, index) => {
                  const selectedProduct = productsById.get(item.productId);
                  const quantity = Number(item.quantity) || 0;
                  const lineTotal = selectedProduct
                    ? selectedProduct.price * quantity
                    : 0;

                  return (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <label className="mb-2 block text-xs font-semibold text-slate-500">
                        Mahsulot
                      </label>

                      <select
                        value={item.productId}
                        onChange={(event) =>
                          updateItem(index, 'productId', event.target.value)
                        }
                        className="mb-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
                      >
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} · {formatMoney(product.price)}
                          </option>
                        ))}
                      </select>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-xs font-semibold text-slate-500">
                            Soni
                          </label>
                          <input
                            value={item.quantity}
                            onChange={(event) =>
                              updateItem(index, 'quantity', event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
                            placeholder="Soni"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-semibold text-slate-500">
                            Narx
                          </label>
                          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900">
                            {selectedProduct
                              ? formatMoney(selectedProduct.price)
                              : '—'}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Qator jami</span>
                          <span className="font-bold text-slate-900">
                            {formatMoney(lineTotal)}
                          </span>
                        </div>
                      </div>

                      {items.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="mt-3 text-sm font-semibold text-red-600 hover:underline"
                        >
                          O‘chirish
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  To‘langan summa
                </label>

                <input
                  value={paidAmount}
                  onChange={(event) => setPaidAmount(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                  placeholder="300000"
                />
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Jami</span>
                  <span className="font-bold text-slate-900">
                    {formatMoney(totalAmount)}
                  </span>
                </div>

                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-slate-500">Qarz</span>
                  <span className="font-bold text-red-600">
                    {formatMoney(debtAmount)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  isCreating || customers.length === 0 || products.length === 0
                }
                className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner />
                    Yaratilmoqda...
                  </span>
                ) : (
                  'Zakaz yaratish'
                )}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
            <div className="border-b border-slate-200 p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Zakazlar ro‘yxati
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Search va filter orqali kerakli zakazni tez toping.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadData}
                  disabled={isLoading}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? 'Yuklanmoqda...' : 'Yangilash'}
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 md:col-span-2"
                  placeholder="Mijoz, telefon, manzil yoki mahsulot qidirish..."
                />

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as StatusFilter)
                  }
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                >
                  <option value="ALL">Barcha statuslar</option>
                  {statusFlow.map((status) => (
                    <option key={status} value={status}>
                      {statusShortLabels[status]}
                    </option>
                  ))}
                </select>

                <select
                  value={debtFilter}
                  onChange={(event) =>
                    setDebtFilter(event.target.value as DebtFilter)
                  }
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                >
                  <option value="ALL">Hammasi</option>
                  <option value="WITH_DEBT">Qarzdorlar</option>
                  <option value="NO_DEBT">Qarzsizlar</option>
                </select>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  Ko‘rsatilmoqda:{' '}
                  <span className="font-bold text-slate-900">
                    {filteredOrders.length}
                  </span>{' '}
                  / {orders.length}
                </p>

                {searchQuery || statusFilter !== 'ALL' || debtFilter !== 'ALL' ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-sm font-semibold text-slate-700 hover:underline"
                  >
                    Filterlarni tozalash
                  </button>
                ) : null}
              </div>
            </div>

            {isLoading ? (
              <div className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-slate-100 bg-white p-5"
                    >
                      <div className="animate-pulse">
                        <div className="h-4 w-40 rounded bg-slate-200" />
                        <div className="mt-3 h-3 w-64 rounded bg-slate-100" />
                        <div className="mt-5 flex gap-2">
                          <div className="h-7 w-24 rounded-full bg-slate-100" />
                          <div className="h-7 w-28 rounded-full bg-slate-100" />
                          <div className="h-7 w-20 rounded-full bg-slate-100" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-6">
                <div className="rounded-2xl bg-slate-50 p-6 text-center">
                  <p className="font-semibold text-slate-900">
                    Zakaz topilmadi
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Search yoki filterlarni o‘zgartirib ko‘ring.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const nextStatus = nextStatusMap[order.status];
                  const activeStatusIndex = statusFlow.indexOf(order.status);
                  const canUpdateStatus = canSeeStatusButton(currentUser?.role);
                  const isUpdating = updatingOrderId === order.id;

                  return (
                    <div
                      key={order.id}
                      className={`p-5 transition ${
                        isUpdating
                          ? 'bg-slate-50 opacity-70'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-slate-900">
                                {order.customer.name}
                              </h3>

                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  statusBadgeClass[order.status]
                                }`}
                              >
                                {statusShortLabels[order.status]}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              {order.customer.phone ?? 'Telefon yo‘q'} ·{' '}
                              {order.customer.address ?? 'Manzil yo‘q'}
                            </p>

                            <p className="mt-2 text-sm text-slate-600">
                              {statusDescription[order.status]}
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

                          <div className="w-full rounded-2xl bg-slate-50 p-4 text-sm lg:w-56 lg:shrink-0">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Jami</span>
                              <span className="font-bold text-slate-900">
                                {formatMoney(order.totalAmount)}
                              </span>
                            </div>

                            <div className="mt-2 flex justify-between">
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

                            <div className="mt-4">
                              {nextStatus ? (
                                canUpdateStatus ? (
                                  <button
                                    onClick={() => updateOrderStatus(order)}
                                    disabled={isUpdating}
                                    className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isUpdating ? (
                                      <span className="flex items-center justify-center gap-2">
                                        <LoadingSpinner />
                                        Yangilanmoqda...
                                      </span>
                                    ) : (
                                      statusLabels[order.status]
                                    )}
                                  </button>
                                ) : (
                                  <div className="rounded-xl bg-amber-50 px-4 py-2 text-center text-sm font-semibold text-amber-700">
                                    Statusni mas’ul xodim o‘zgartiradi
                                  </div>
                                )
                              ) : (
                                <div className="rounded-xl bg-emerald-50 px-4 py-2 text-center text-sm font-semibold text-emerald-700">
                                  Yakunlangan
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white p-4">
                          <div className="overflow-x-auto pb-1">
                            <div className="flex min-w-[720px] items-start">
                              {statusFlow.map((status, index) => {
                                const isCompleted = index < activeStatusIndex;
                                const isCurrent = index === activeStatusIndex;
                                const isActive = index <= activeStatusIndex;

                                return (
                                  <div
                                    key={status}
                                    className="flex flex-1 items-start"
                                  >
                                    <div className="flex w-24 shrink-0 flex-col items-center">
                                      <div
                                        className={
                                          isCurrent
                                            ? 'flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white ring-4 ring-slate-100'
                                            : isActive
                                              ? 'flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white'
                                              : 'flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500'
                                        }
                                      >
                                        {index + 1}
                                      </div>

                                      <span
                                        className={
                                          isActive
                                            ? 'mt-2 text-center text-[11px] font-bold text-slate-900'
                                            : 'mt-2 text-center text-[11px] font-semibold text-slate-400'
                                        }
                                      >
                                        {statusShortLabels[status]}
                                      </span>
                                    </div>

                                    {index < statusFlow.length - 1 ? (
                                      <div
                                        className={
                                          isCompleted
                                            ? 'mt-4 h-1 flex-1 rounded-full bg-slate-900'
                                            : 'mt-4 h-1 flex-1 rounded-full bg-slate-200'
                                        }
                                      />
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
