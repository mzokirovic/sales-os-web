'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';

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

type CreateCustomerForm = {
  name: string;
  phone: string;
  address: string;
  lat: string;
  lng: string;
  note: string;
};

const initialForm: CreateCustomerForm = {
  name: '',
  phone: '',
  address: '',
  lat: '',
  lng: '',
  note: '',
};

export default function CustomersPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState<CreateCustomerForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  async function loadCustomers() {
    setError('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        router.push('/login');
        return;
      }

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

  function updateForm(field: keyof CreateCustomerForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');

    if (!form.name.trim()) {
      setError('Do‘kon nomi majburiy');
      return;
    }

    setIsCreating(true);

    try {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        router.push('/login');
        return;
      }

      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        lat: form.lat ? Number(form.lat) : undefined,
        lng: form.lng ? Number(form.lng) : undefined,
        note: form.note.trim() || undefined,
      };

      const response = await fetch(`${apiUrl}/customers`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Mijoz qo‘shishda xatolik');
      }

      setForm(initialForm);
      await loadCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noma’lum xatolik');
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
              Do‘konlar / mijozlar
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Sotuvchi yangi do‘kon qo‘shadi. Keyinchalik shu ma’lumotlar map,
              route va zakazlar uchun ishlaydi.
            </p>
          </div>

          <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
            <p className="text-sm text-slate-500">Jami mijozlar</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {customers.length}
            </p>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-1">
            <h2 className="text-lg font-bold text-slate-900">
              Yangi do‘kon qo‘shish
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Minimal ma’lumot yetarli. Map uchun lat/lng keyin ham qo‘shiladi.
            </p>

            <form onSubmit={createCustomer} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Do‘kon nomi *
                </label>
                <input
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                  placeholder="Masalan: Bekzod Qurilish Market"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Telefon
                </label>
                <input
                  value={form.phone}
                  onChange={(event) => updateForm('phone', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                  placeholder="+998909001122"
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
                  placeholder="Toshkent, Yunusobod"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Lat
                  </label>
                  <input
                    value={form.lat}
                    onChange={(event) => updateForm('lat', event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                    placeholder="41.3667"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Lng
                  </label>
                  <input
                    value={form.lng}
                    onChange={(event) => updateForm('lng', event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                    placeholder="69.2847"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Izoh
                </label>
                <textarea
                  value={form.note}
                  onChange={(event) => updateForm('note', event.target.value)}
                  className="min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                  placeholder="Masalan: fasad bo‘yoqga qiziqadi"
                />
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? 'Qo‘shilmoqda...' : 'Do‘kon qo‘shish'}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Mijozlar ro‘yxati
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Sales o‘zi qo‘shgan mijozlarni, Owner esa tenantdagi hammasini
                ko‘radi.
              </p>
            </div>

            {isLoading ? (
              <div className="p-6 text-slate-500">Yuklanmoqda...</div>
            ) : customers.length === 0 ? (
              <div className="p-6">
                <div className="rounded-2xl bg-slate-50 p-6 text-center">
                  <p className="font-semibold text-slate-900">
                    Hali mijoz yo‘q
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Birinchi do‘konni chapdagi formadan qo‘shing.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex flex-col gap-4 p-5 hover:bg-slate-50 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900">
                          {customer.name}
                        </h3>
                        {customer.lat && customer.lng ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Map ready
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            Location kerak
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {customer.phone ?? 'Telefon yo‘q'} ·{' '}
                        {customer.address ?? 'Manzil yo‘q'}
                      </p>

                      {customer.note ? (
                        <p className="mt-2 text-sm text-slate-600">
                          {customer.note}
                        </p>
                      ) : null}
                    </div>

                    <div className="text-sm text-slate-500">
                      {new Date(customer.createdAt).toLocaleDateString()}
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
