'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
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

function formatMoney(value?: number | null) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "0 so‘m";
  }

  return `${amount.toLocaleString()} so‘m`;
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

  const [createForm, setCreateForm] = useState<ProductForm>(initialForm);
  const [editForm, setEditForm] = useState<ProductForm>(initialForm);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(
    null,
  );

  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const canManage = canManageProducts(currentUser?.role);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return products;

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(query) ||
        (product.sku ?? '').toLowerCase().includes(query) ||
        product.unit.toLowerCase().includes(query)
      );
    });
  }, [products, searchQuery]);

  const activeProductsCount = useMemo(() => {
    return products.filter((product) => product.isActive).length;
  }, [products]);

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

  useEffect(() => {
    if (!isCreateOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isCreating) {
        setFormError('');
        setIsCreateOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCreateOpen, isCreating]);

  function openCreateModal() {
    setError('');
    setFormError('');
    setSuccessMessage('');
    setIsCreateOpen(true);
  }

  function closeCreateModal() {
    if (isCreating) return;

    setFormError('');
    setIsCreateOpen(false);
  }

  function updateCreateForm(field: keyof ProductForm, value: string) {
    setCreateForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateEditForm(field: keyof ProductForm, value: string) {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function validateProductForm(form: ProductForm) {
    if (!form.name.trim()) {
      return 'Mahsulot nomi majburiy';
    }

    const price = Number(form.price);

    if (!Number.isFinite(price) || price < 0) {
      return 'Narx 0 yoki undan katta son bo‘lishi kerak';
    }

    return '';
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setFormError('');
    setSuccessMessage('');

    const validationError = validateProductForm(createForm);

    if (validationError) {
      setFormError(validationError);
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
            name: createForm.name.trim(),
            sku: createForm.sku.trim() || undefined,
            unit: createForm.unit.trim() || 'dona',
            price: Number(createForm.price),
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

      setCreateForm(initialForm);
      setFormError('');
      setIsCreateOpen(false);
      setSuccessMessage('Mahsulot qo‘shildi');

      await loadProducts();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Noma’lum xatolik');
    } finally {
      setIsCreating(false);
    }
  }

  function startEditing(product: Product) {
    setError('');
    setSuccessMessage('');
    setEditingProductId(product.id);
    setEditForm({
      name: product.name,
      sku: product.sku ?? '',
      unit: product.unit,
      price: String(product.price),
    });
  }

  function cancelEditing() {
    setEditingProductId(null);
    setEditForm(initialForm);
  }

  async function saveProduct(product: Product) {
    setError('');
    setSuccessMessage('');

    const validationError = validateProductForm(editForm);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSavingProductId(product.id);

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
            name: editForm.name.trim(),
            sku: editForm.sku.trim() || undefined,
            unit: editForm.unit.trim() || 'dona',
            price: Number(editForm.price),
          }),
        }),
        sleep(700),
      ]);

      if (response.status === 403) {
        throw new Error('Faqat OWNER yoki MANAGER mahsulotni tahrirlay oladi');
      }

      if (response.status === 409) {
        throw new Error('Bu nomdagi mahsulot allaqachon mavjud');
      }

      if (!response.ok) {
        throw new Error('Mahsulotni saqlashda xatolik');
      }

      setSuccessMessage('Mahsulot yangilandi');
      cancelEditing();
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noma’lum xatolik');
    } finally {
      setSavingProductId(null);
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
        product.isActive
          ? 'Mahsulot noaktiv qilindi'
          : 'Mahsulot aktiv qilindi',
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
              Mahsulotlar
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            {canManage ? (
              <button
                type="button"
                onClick={openCreateModal}
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                + Yangi mahsulot
              </button>
            ) : null}

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
                  {activeProductsCount}
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
                      Yangi mahsulot
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

                <form onSubmit={createProduct} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Mahsulot nomi *
                  </label>
                  <input
                    value={createForm.name}
                    onChange={(event) =>
                      updateCreateForm('name', event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                    placeholder="Masalan: Fasad kraska 20 L"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    SKU / kod
                  </label>
                  <input
                    value={createForm.sku}
                    onChange={(event) =>
                      updateCreateForm('sku', event.target.value)
                    }
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
                      value={createForm.unit}
                      onChange={(event) =>
                        updateCreateForm('unit', event.target.value)
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
                      value={createForm.price}
                      onChange={(event) =>
                        updateCreateForm('price', event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                      placeholder="256000"
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
                </section>
              </div>
            </div>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Mahsulotlar ro‘yxati
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={loadProducts}
                  disabled={isLoading}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? 'Yuklanmoqda...' : 'Yangilash'}
                </button>
              </div>

              <div className="mt-5">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                  placeholder="Mahsulot nomi, SKU yoki birlik bo‘yicha qidirish..."
                />
              </div>

              <p className="mt-3 text-sm text-slate-500">
                Ko‘rsatilmoqda:{' '}
                <span className="font-bold text-slate-900">
                  {filteredProducts.length}
                </span>{' '}
                / {products.length}
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
            ) : filteredProducts.length === 0 ? (
              <div className="p-6">
                <div className="rounded-2xl bg-slate-50 p-6 text-center">
                  <p className="font-semibold text-slate-900">
                    Mahsulot topilmadi
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Qidiruvni o‘zgartiring yoki yangi mahsulot qo‘shing.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const isEditing = editingProductId === product.id;
                  const isSaving = savingProductId === product.id;
                  const isUpdating = updatingProductId === product.id;

                  return (
                    <div
                      key={product.id}
                      className={`p-5 transition ${
                        isSaving || isUpdating
                          ? 'bg-slate-50 opacity-70'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {isEditing ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-xs font-semibold text-slate-500">
                                Mahsulot nomi
                              </label>
                              <input
                                value={editForm.name}
                                onChange={(event) =>
                                  updateEditForm('name', event.target.value)
                                }
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-xs font-semibold text-slate-500">
                                SKU / kod
                              </label>
                              <input
                                value={editForm.sku}
                                onChange={(event) =>
                                  updateEditForm('sku', event.target.value)
                                }
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-xs font-semibold text-slate-500">
                                Birlik
                              </label>
                              <input
                                value={editForm.unit}
                                onChange={(event) =>
                                  updateEditForm('unit', event.target.value)
                                }
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-xs font-semibold text-slate-500">
                                Narx
                              </label>
                              <input
                                value={editForm.price}
                                onChange={(event) =>
                                  updateEditForm('price', event.target.value)
                                }
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
                              />
                            </div>
                          </div>

                          <div className="mt-4 flex flex-col gap-2 md:flex-row">
                            <button
                              type="button"
                              onClick={() => saveProduct(product)}
                              disabled={isSaving}
                              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isSaving ? (
                                <span className="flex items-center justify-center gap-2">
                                  <LoadingSpinner />
                                  Saqlanmoqda...
                                </span>
                              ) : (
                                'Saqlash'
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={cancelEditing}
                              disabled={isSaving}
                              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Bekor qilish
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0 flex-1">
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
                                {product.isActive ? 'Aktiv' : 'Noaktiv'}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              {product.sku ?? 'SKU yo‘q'} · {product.unit}
                            </p>

                            <p className="mt-2 text-lg font-bold text-slate-900">
                              {formatMoney(product.price)}
                            </p>
                          </div>

                          <div className="flex flex-col gap-2 md:w-44">
                            {canManage ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEditing(product)}
                                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  Tahrirlash
                                </button>

                                <button
                                  type="button"
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
                              </>
                            ) : (
                              <span className="text-sm text-slate-400">
                                Faqat ko‘rish
                              </span>
                            )}
                          </div>
                        </div>
                      )}
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
