"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LoadingSpinner } from "@/components/loading-spinner";

type OrderStatus =
  | "NEW"
  | "CHECKED"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "SHIPPED"
  | "DELIVERED"
  | "PAID";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
};

type Product = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  price: number;
  isActive: boolean;
};

type Order = {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  debtAmount: number;
  createdAt: string;
  customer: Customer;
  createdBy?: {
    id: string;
    fullName: string;
    role: string;
  } | null;
};

type FormItem = {
  productId: string;
  quantity: string;
};

type StatusFilter = "ALL" | OrderStatus;
type DebtFilter = "ALL" | "OPEN" | "CLOSED";

const statusLabels: Record<OrderStatus, string> = {
  NEW: "Yangi",
  CHECKED: "Tekshirildi",
  CONFIRMED: "Tasdiqlandi",
  PREPARING: "Tayyorlanmoqda",
  READY: "Tayyor",
  SHIPPED: "Yo‘lda",
  DELIVERED: "Yetkazildi",
  PAID: "Yopildi",
};

const statusBadgeClass: Record<OrderStatus, string> = {
  NEW: "bg-blue-50 text-blue-700",
  CHECKED: "bg-indigo-50 text-indigo-700",
  CONFIRMED: "bg-violet-50 text-violet-700",
  PREPARING: "bg-amber-50 text-amber-700",
  READY: "bg-emerald-50 text-emerald-700",
  SHIPPED: "bg-orange-50 text-orange-700",
  DELIVERED: "bg-emerald-50 text-emerald-700",
  PAID: "bg-slate-900 text-white",
};

const initialItems: FormItem[] = [
  {
    productId: "",
    quantity: "1",
  },
];

function formatMoney(value?: number | null) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "0 so‘m";
  }

  return `${amount.toLocaleString()} so‘m`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function OrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [paidAmount, setPaidAmount] = useState("0");
  const [items, setItems] = useState<FormItem[]>(initialItems);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [debtFilter, setDebtFilter] = useState<DebtFilter>("ALL");

  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const productsById = useMemo(() => {
    const map = new Map<string, Product>();

    for (const product of products) {
      map.set(product.id, product);
    }

    return map;
  }, [products]);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const product = productsById.get(item.productId);
      const quantity = Number(item.quantity);

      if (!product || !Number.isFinite(quantity) || quantity <= 0) {
        return sum;
      }

      return sum + product.price * quantity;
    }, 0);
  }, [items, productsById]);

  const paidAmountNumber = useMemo(() => {
    const value = Number(paidAmount);

    if (!Number.isFinite(value) || value < 0) {
      return 0;
    }

    return value;
  }, [paidAmount]);

  const debtAmount = useMemo(() => {
    return Math.max(totalAmount - paidAmountNumber, 0);
  }, [totalAmount, paidAmountNumber]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !query ||
        order.customer.name.toLowerCase().includes(query) ||
        (order.customer.phone ?? "").toLowerCase().includes(query) ||
        (order.customer.address ?? "").toLowerCase().includes(query) ||
        statusLabels[order.status].toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" || order.status === statusFilter;

      const matchesDebt =
        debtFilter === "ALL" ||
        (debtFilter === "OPEN" && order.debtAmount > 0) ||
        (debtFilter === "CLOSED" && order.debtAmount <= 0);

      return matchesSearch && matchesStatus && matchesDebt;
    });
  }, [orders, searchQuery, statusFilter, debtFilter]);

  const openDebtTotal = useMemo(() => {
    return orders.reduce(
      (sum, order) => sum + Number(order.debtAmount ?? 0),
      0,
    );
  }, [orders]);

  function getToken() {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      router.push("/login");
      return null;
    }

    return token;
  }

  async function loadData() {
    setError("");
    setIsLoading(true);

    try {
      const token = getToken();
      if (!token) return;

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
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        router.push("/login");
        return;
      }

      if (!ordersResponse.ok) {
        throw new Error("Zakazlarni yuklashda xatolik");
      }

      if (!customersResponse.ok) {
        throw new Error("Mijozlarni yuklashda xatolik");
      }

      if (!productsResponse.ok) {
        throw new Error("Mahsulotlarni yuklashda xatolik");
      }

      const [ordersData, customersData, productsData] = await Promise.all([
        ordersResponse.json() as Promise<Order[]>,
        customersResponse.json() as Promise<Customer[]>,
        productsResponse.json() as Promise<Product[]>,
      ]);

      setOrders(ordersData);
      setCustomers(customersData);
      setProducts(productsData);

      if (!customerId && customersData.length > 0) {
        setCustomerId(customersData[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noma’lum xatolik");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isCreateOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeCreateModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCreateOpen, isCreating]);

  function updateItem(index: number, field: keyof FormItem, value: string) {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  function addItem() {
    setItems((currentItems) => [
      ...currentItems,
      {
        productId: "",
        quantity: "1",
      },
    ]);
  }

  function removeItem(index: number) {
    setItems((currentItems) => {
      if (currentItems.length === 1) {
        return currentItems;
      }

      return currentItems.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function validateOrder() {
    if (!customerId) {
      return "Mijoz tanlang";
    }

    if (items.length === 0) {
      return "Kamida bitta mahsulot tanlang";
    }

    for (const item of items) {
      if (!item.productId) {
        return "Har bir qatorda mahsulot tanlang";
      }

      const quantity = Number(item.quantity);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return "Mahsulot soni 0 dan katta bo‘lishi kerak";
      }
    }

    if (paidAmountNumber > totalAmount) {
      return "To‘langan summa jami summadan katta bo‘lishi mumkin emas";
    }

    return "";
  }

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setFormError("");
    setSuccessMessage("");

    const validationError = validateOrder();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsCreating(true);

    try {
      const token = getToken();
      if (!token) return;

      const [response] = await Promise.all([
        fetch(`${apiUrl}/orders`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerId,
            paidAmount: paidAmountNumber,
            items: items.map((item) => ({
              productId: item.productId,
              quantity: Number(item.quantity),
            })),
          }),
        }),
        sleep(700),
      ]);

      if (response.status === 403) {
        throw new Error("Zakaz yaratish uchun ruxsat yo‘q");
      }

      if (!response.ok) {
        throw new Error("Zakaz yaratishda xatolik");
      }

      setItems(initialItems);
      setPaidAmount("0");
      setFormError("");
      setIsCreateOpen(false);
      setSuccessMessage("Zakaz yaratildi");

      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Noma’lum xatolik");
    } finally {
      setIsCreating(false);
    }
  }

  function openCreateModal() {
    setError("");
    setFormError("");
    setSuccessMessage("");
    setIsCreateOpen(true);
  }

  function closeCreateModal() {
    if (isCreating) return;

    setFormError("");
    setIsCreateOpen(false);
  }

  function resetFilters() {
    setSearchQuery("");
    setStatusFilter("ALL");
    setDebtFilter("ALL");
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium text-slate-500">Orders</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Zakazlar</h1>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              + Yangi zakaz
            </button>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
                <p className="text-sm text-slate-500">Jami zakaz</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {orders.length}
                </p>
              </div>

              <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
                <p className="text-sm text-slate-500">Ochiq qarz</p>
                <p className="mt-1 text-2xl font-bold text-red-600">
                  {formatMoney(openDebtTotal)}
                </p>
              </div>
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

        <div className="grid gap-6">
          {isCreateOpen ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 px-4 py-6 backdrop-blur-sm"
              onClick={closeCreateModal}
            >
              <div
                className="w-full max-w-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <section className="max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-slate-900">
                      Yangi zakaz
                    </h2>

                    <button
                      type="button"
                      onClick={closeCreateModal}
                      disabled={isCreating}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Yopish
                    </button>
                  </div>

                  {formError ? (
                    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {formError}
                    </div>
                  ) : null}

                  <form onSubmit={createOrder} className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Mijoz
                      </label>
                      <select
                        value={customerId}
                        onChange={(event) => setCustomerId(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                      >
                        <option value="">Mijoz tanlang</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="block text-sm font-medium text-slate-700">
                          Mahsulotlar
                        </label>

                        <button
                          type="button"
                          onClick={addItem}
                          className="text-sm font-bold text-slate-900 hover:underline"
                        >
                          + Qo‘shish
                        </button>
                      </div>

                      <div className="space-y-3">
                        {items.map((item, index) => {
                          const product = productsById.get(item.productId);
                          const quantity = Number(item.quantity);
                          const rowTotal =
                            product && Number.isFinite(quantity) && quantity > 0
                              ? product.price * quantity
                              : 0;

                          return (
                            <div
                              key={index}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                            >
                              <div>
                                <label className="mb-2 block text-xs font-semibold text-slate-500">
                                  Mahsulot
                                </label>
                                <select
                                  value={item.productId}
                                  onChange={(event) =>
                                    updateItem(
                                      index,
                                      "productId",
                                      event.target.value,
                                    )
                                  }
                                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
                                >
                                  <option value="">Mahsulot tanlang</option>
                                  {products.map((productItem) => (
                                    <option
                                      key={productItem.id}
                                      value={productItem.id}
                                    >
                                      {productItem.name} ·{" "}
                                      {formatMoney(productItem.price)}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-3">
                                <div>
                                  <label className="mb-2 block text-xs font-semibold text-slate-500">
                                    Soni
                                  </label>
                                  <input
                                    value={item.quantity}
                                    onChange={(event) =>
                                      updateItem(
                                        index,
                                        "quantity",
                                        event.target.value,
                                      )
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
                                  />
                                </div>

                                <div>
                                  <label className="mb-2 block text-xs font-semibold text-slate-500">
                                    Narx
                                  </label>
                                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900">
                                    {formatMoney(product?.price)}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
                                <span className="text-slate-500">
                                  Qator jami
                                </span>
                                <span className="font-bold text-slate-900">
                                  {formatMoney(rowTotal)}
                                </span>
                              </div>

                              {items.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  className="mt-3 text-sm font-semibold text-red-600 hover:underline"
                                >
                                  Qatorni olib tashlash
                                </button>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        To‘langan summa
                      </label>
                      <input
                        value={paidAmount}
                        onChange={(event) => setPaidAmount(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                        placeholder="0"
                      />
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Jami</span>
                        <span className="font-bold text-slate-900">
                          {formatMoney(totalAmount)}
                        </span>
                      </div>

                      <div className="mt-2 flex justify-between">
                        <span className="text-slate-500">Qarz</span>
                        <span
                          className={
                            debtAmount > 0
                              ? "font-bold text-red-600"
                              : "font-bold text-emerald-600"
                          }
                        >
                          {formatMoney(debtAmount)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isCreating}
                      className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCreating ? (
                        <span className="flex items-center justify-center gap-2">
                          <LoadingSpinner />
                          Yaratilmoqda...
                        </span>
                      ) : (
                        "Zakaz yaratish"
                      )}
                    </button>
                  </form>
                </section>
              </div>
            </div>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Zakazlar ro‘yxati
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={loadData}
                  disabled={isLoading}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Yuklanmoqda..." : "Yangilash"}
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 md:col-span-2"
                  placeholder="Mijoz, telefon, manzil yoki status..."
                />

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as StatusFilter)
                  }
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                >
                  <option value="ALL">Barcha statuslar</option>
                  {Object.entries(statusLabels).map(([status, label]) => (
                    <option key={status} value={status}>
                      {label}
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
                  <option value="OPEN">Qarzi bor</option>
                  <option value="CLOSED">Qarzi yo‘q</option>
                </select>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  Ko‘rsatilmoqda:{" "}
                  <span className="font-bold text-slate-900">
                    {filteredOrders.length}
                  </span>{" "}
                  / {orders.length}
                </p>

                {searchQuery ||
                statusFilter !== "ALL" ||
                debtFilter !== "ALL" ? (
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
                        <div className="h-4 w-48 rounded bg-slate-200" />
                        <div className="mt-3 h-3 w-72 rounded bg-slate-100" />
                        <div className="mt-5 h-8 w-32 rounded-full bg-slate-100" />
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
                    Qidiruv yoki filterlarni o‘zgartiring.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="p-5 hover:bg-slate-50">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-bold text-slate-900 hover:underline"
                          >
                            {order.customer.name}
                          </Link>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              statusBadgeClass[order.status]
                            }`}
                          >
                            {statusLabels[order.status]}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(order.createdAt)}
                          {order.createdBy
                            ? ` · ${order.createdBy.fullName}`
                            : ""}
                        </p>
                      </div>

                      <div className="flex w-full flex-col gap-3 rounded-2xl bg-slate-50 p-4 text-sm md:w-64 md:shrink-0">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Jami</span>
                          <span className="font-bold text-slate-900">
                            {formatMoney(order.totalAmount)}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-slate-500">Qarz</span>
                          <span
                            className={
                              order.debtAmount > 0
                                ? "font-bold text-red-600"
                                : "font-bold text-emerald-600"
                            }
                          >
                            {formatMoney(order.debtAmount)}
                          </span>
                        </div>

                        <Link
                          href={`/orders/${order.id}`}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Batafsil
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
