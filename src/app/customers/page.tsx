'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { LoadingSpinner } from '@/components/loading-spinner';

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

type User = {
  id: string;
  tenantId: string;
  fullName: string;
  phone: string;
  role: string;
};

type CustomerForm = {
  name: string;
  phone: string;
  address: string;
  note: string;
};

const initialForm: CustomerForm = {
  name: '',
  phone: '',
  address: '',
  note: '',
};

function canCreateCustomers(role?: string | null) {
  return role === 'OWNER' || role === 'MANAGER' || role === 'SALES';
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function CustomersPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [form, setForm] = useState<CustomerForm>(initialForm);
  const [searchQuery, setSearchQuery] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const canCreate = canCreateCustomers(currentUser?.role);

  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(query) ||
        (customer.phone ?? '').toLowerCase().includes(query) ||
        (customer.address ?? '').toLowerCase().includes(query) ||
        (customer.note ?? '').toLowerCase().includes(query)
      );
    });
  }, [customers, searchQuery]);

  const customersWithAddressCount = useMemo(() => {
    return customers.filter((customer) => customer.address).length;
  }, [customers]);

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

  async function loadCustomers() {
    setError('');
    setIsLoading(true);

    try {
      const token = getToken();
      if (!token) return;

      loadCurrentUser();

      const response = await fetch(`${apiUrl}/customers`, {
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
        throw new Error('Mijozlarni yuklashda xatolik');
      }

      const data = (await response.json()) as Customer[];
      setCustomers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noma’lum xatolik');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
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

  function updateForm(field: keyof CustomerForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function validateForm() {
    if (!form.name.trim()) {
      return 'Do‘kon yoki mijoz nomi majburiy';
    }

    return '';
  }

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setFormError('');
    setSuccessMessage('');

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsCreating(true);

    try {
      const token = getToken();
      if (!token) return;

      const [response] = await Promise.all([
        fetch(`${apiUrl}/customers`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: form.name.trim(),
            phone: form.phone.trim() || undefined,
            address: form.address.trim() || undefined,
            note: form.note.trim() || undefined,
          }),
        }),
        sleep(700),
      ]);

      if (response.status === 403) {
        throw new Error('Bu amal uchun ruxsat yo‘q');
      }

      if (!response.ok) {
        throw new Error('Mijoz qo‘shishda xatolik');
      }

      setForm(initialForm);
      setFormError('');
      setIsCreateOpen(false);
      setSuccessMessage('Mijoz qo‘shildi');

      await loadCustomers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Noma’lum xatolik');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium text-slate-500">Customers</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Mijozlar
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            {canCreate ? (
              <button
                type="button"
                onClick={openCreateModal}
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                + Yangi mijoz
              </button>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
                <p className="text-sm text-slate-500">Jami mijozlar</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {customers.length}
                </p>
              </div>

              <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
                <p className="text-sm text-slate-500">Manzilli</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  {customersWithAddressCount}
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
                      Yangi mijoz
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

                <form onSubmit={createCustomer} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Do‘kon / mijoz nomi *
                  </label>
                  <input
                    value={form.name}
                    onChange={(event) => updateForm('name', event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                    placeholder="Masalan: Ali Aka Qurilish Do‘koni"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Telefon
                  </label>
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      updateForm('phone', event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                    placeholder="+998901234567"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Manzil
                  </label>
                  <input
                    value={form.address}
                    onChange={(event) =>
                      updateForm('address', event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                    placeholder="Toshkent, Chilonzor"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Izoh
                  </label>
                  <textarea
                    value={form.note}
                    onChange={(event) => updateForm('note', event.target.value)}
                    className="min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                    placeholder="Masalan: doim fasad kraska oladi"
                  />
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
                    'Mijoz qo‘shish'
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
                    Mijozlar ro‘yxati
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={loadCustomers}
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
                  placeholder="Mijoz nomi, telefon, manzil yoki izoh bo‘yicha qidirish..."
                />
              </div>

              <p className="mt-3 text-sm text-slate-500">
                Ko‘rsatilmoqda:{' '}
                <span className="font-bold text-slate-900">
                  {filteredCustomers.length}
                </span>{' '}
                / {customers.length}
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
            ) : filteredCustomers.length === 0 ? (
              <div className="p-6">
                <div className="rounded-2xl bg-slate-50 p-6 text-center">
                  <p className="font-semibold text-slate-900">
                    Mijoz topilmadi
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Qidiruvni o‘zgartiring yoki yangi mijoz qo‘shing.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="p-5 hover:bg-slate-50">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-900">
                          {customer.name}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {customer.phone ?? 'Telefon yo‘q'} ·{' '}
                          {customer.address ?? 'Manzil yo‘q'}
                        </p>

                        {customer.note ? (
                          <p className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            {customer.note}
                          </p>
                        ) : null}
                      </div>

                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm md:min-w-40">
                        <p className="text-slate-500">Qo‘shilgan</p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {formatDate(customer.createdAt)}
                        </p>
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
