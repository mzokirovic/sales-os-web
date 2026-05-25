'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { LoadingSpinner } from '@/components/loading-spinner';

type Product = {
  id: string;
  tenantId: string;
  name: string;
  sku: string | null;
  unit: string;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type User = {
  id: string;
  tenantId: string;
  fullName: string;
  phone: string;
  role: string;
};

type ProductForm = {
  name: string;
  sku: string;
  unit: string;
  price: string;
};

const initialForm: ProductForm = {
  name: '',
  sku: '',
  unit: 'dona',
  price: '',
};

function formatMoney(value: number) {
  return `${value.toLocaleString()} so‘m`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canManageProducts(role?: string | null) {
  return role === 'OWNER' || role === 'MANAGER';
}

export default function ProductsPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [form, setForm] = useState<ProductForm>(initialForm);

  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const canManage = canManageProducts(currentUser?.role);

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

  async function loadProducts() {
    setError('');
    setIsLoading(true);

    try {
      const token = getToken();
      if (!token) return;

      loadCurrentUser();

      const response = await fetch(`${apiUrl}/products`, {
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
        throw new Error('Mahsulotlarni yuklashda xatolik');
      }

      const data = (await response.json()) as Product[];
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noma’lum xatolik');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateForm(field: keyof ProductForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setSuccessMessage('');

    if (!form.name.trim()) {
      setError('Mahsulot nomi majburiy');
      return;
    }

    const price = Number(form.price);

    if (!Number.isFinite(price) || price < 0) {
      setError('Narx 0 yoki undan katta son bo‘lishi kerak');
      return;
    }

    setIsCreating(true);

    try {
      const token = getToken();
      if (!token) return;

      const [response] = await Promise.all([
        fetch(`${apiUrl}/products`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: form.name.trim(),
            sku: form.sku.trim() || undefined,
            unit: form.unit.trim() || 'dona',
            price,
          }),
        }),
        sleep(700),
      ]);

      if (response.status === 403) {
        throw new Error('Faqat OWNER yoki MANAGER mahsulot qo‘sha oladi');
      }

      if (response.status === 409) {
        throw new Error('Bu nomdagi mahsulot allaqachon mavjud');
      }

      if (!response.ok) {
        throw new Error('Mahsulot yaratishda xatolik');
      }

      setForm(initialForm);
      setSuccessMessage('Mahsulot muvaffaqiyatli qo‘shildi');

      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noma’lum xatolik');
    } finally {
      setIsCreating(false);
    }
  }

  async function toggleProductActive(product: Product) {
    setError('');
    setSuccessMessage('');
    setUpdatingProductId(product.id);

    try {
      const token = getToken();
      if (!token) return;

      const [response] = await Promise.all([
        fetch(`${apiUrl}/products/${product.id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            isActive: !product.isActive,
          }),
        }),
        sleep(700),
      ]);

      if (response.status === 403) {
        throw new Error('Faqat OWNER yoki MANAGER mahsulotni o‘zgartira oladi');
      }

      if (!response.ok) {
        throw new Error('Mahsulot holatini o‘zgartirishda xatolik');
      }

      setSuccessMessage(
        !product.isActive
          ? 'Mahsulot aktiv qilindi'
          : 'Mahsulot vaqtincha noaktiv qilindi',
      );

      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noma’lum xatolik');
    } finally {
      setUpdatingProductId(null);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium text-slate-500">Products</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Mahsulotlar bazasi
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Zakazda mahsulot qo‘lda yozilmasligi uchun tayyor mahsulotlar
              bazasini yuritamiz. Keyingi bosqichda Orders form shu bazadan
              mahsulot tanlaydi.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
              <p className="text-sm text-slate-500">Jami</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {products.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
              <p className="text-sm text-slate-500">Aktiv</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">
                {products.filter((product) => product.isActive).length}
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
            <h2 className="text-lg font-bold text-slate-900">
              Yangi mahsulot
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Mahsulot nomi va narxi keyinchalik zakazga avtomatik tushadi.
            </p>

            {!canManage ? (
              <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-medium text-amber-700">
                Mahsulot qo‘shish faqat OWNER yoki MANAGER uchun.
              </div>
            ) : (
              <form onSubmit={createProduct} className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Mahsulot nomi *
                  </label>
                  <input
                    value={form.name}
                    onChange={(event) => updateForm('name', event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                    placeholder="Masalan: Fasad kraska 20L"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    SKU / kod
                  </label>
                  <input
                    value={form.sku}
                    onChange={(event) => updateForm('sku', event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                    placeholder="PAINT-FASAD-20L"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Birlik
                    </label>
                    <input
                      value={form.unit}
                      onChange={(event) =>
                        updateForm('unit', event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                      placeholder="dona"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Narx
                    </label>
                    <input
                      value={form.price}
                      onChange={(event) =>
                        updateForm('price', event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                      placeholder="250000"
                    />
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
                      Qo‘shilmoqda...
                    </span>
                  ) : (
                    'Mahsulot qo‘shish'
                  )}
                </button>
              </form>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Mahsulotlar ro‘yxati
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Aktiv mahsulotlar keyinchalik zakaz formida tanlanadi.
              </p>
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
            ) : products.length === 0 ? (
              <div className="p-6">
                <div className="rounded-2xl bg-slate-50 p-6 text-center">
                  <p className="font-semibold text-slate-900">
                    Hali mahsulot yo‘q
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Birinchi mahsulotni chapdagi formadan qo‘shing.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {products.map((product) => {
                  const isUpdating = updatingProductId === product.id;

                  return (
                    <div
                      key={product.id}
                      className={`flex flex-col gap-4 p-5 transition md:flex-row md:items-center md:justify-between ${
                        isUpdating
                          ? 'bg-slate-50 opacity-70'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900">
                            {product.name}
                          </h3>

                          <span
                            className={
                              product.isActive
                                ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700'
                                : 'rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500'
                            }
                          >
                            {product.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          {product.sku ?? 'SKU yo‘q'} · {product.unit}
                        </p>

                        <p className="mt-2 text-lg font-bold text-slate-900">
                          {formatMoney(product.price)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {canManage ? (
                          <button
                            onClick={() => toggleProductActive(product)}
                            disabled={isUpdating}
                            className={
                              product.isActive
                                ? 'rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
                                : 'rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
                            }
                          >
                            {isUpdating ? (
                              <span className="flex items-center justify-center gap-2">
                                <LoadingSpinner />
                                Yangilanmoqda...
                              </span>
                            ) : product.isActive ? (
                              'Noaktiv qilish'
                            ) : (
                              'Aktiv qilish'
                            )}
                          </button>
                        ) : (
                          <span className="text-sm text-slate-400">
                            Faqat ko‘rish
                          </span>
                        )}
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
