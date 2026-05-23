'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';

type Employee = {
  id: string;
  tenantId: string;
  fullName: string;
  phone: string;
  role: string;
  createdAt: string;
};

type CreateEmployeeForm = {
  fullName: string;
  phone: string;
  password: string;
  role: string;
};

const initialForm: CreateEmployeeForm = {
  fullName: '',
  phone: '',
  password: '123456',
  role: 'SALES',
};

const roles = ['MANAGER', 'SALES', 'OPERATOR', 'WAREHOUSE', 'DELIVERY'];

export default function EmployeesPage() {
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState<CreateEmployeeForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  function getToken() {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      router.push('/login');
      return null;
    }

    return token;
  }

  async function loadEmployees() {
    setError('');
    setIsLoading(true);

    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${apiUrl}/users`, {
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

      if (response.status === 403) {
        throw new Error('Bu sahifaga kirish huquqingiz yo‘q');
      }

      if (!response.ok) {
        throw new Error('Xodimlarni yuklashda xatolik');
      }

      const data = (await response.json()) as Employee[];
      setEmployees(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noma’lum xatolik');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateForm(field: keyof CreateEmployeeForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function createEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');

    if (!form.fullName.trim() || !form.phone.trim() || !form.password.trim()) {
      setError('Ism, telefon va parol majburiy');
      return;
    }

    setIsCreating(true);

    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${apiUrl}/users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          password: form.password,
          role: form.role,
        }),
      });

      if (response.status === 403) {
        throw new Error('Faqat OWNER xodim yaratishi mumkin');
      }

      if (!response.ok) {
        throw new Error('Xodim yaratishda xatolik');
      }

      setForm(initialForm);
      await loadEmployees();
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
            <p className="text-sm font-medium text-slate-500">Employees</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Xodimlar
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Director/Owner xodim yaratadi. Har bir xodim o‘z roliga qarab
              systemdan foydalanadi.
            </p>
          </div>

          <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
            <p className="text-sm text-slate-500">Jami xodimlar</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {employees.length}
            </p>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Yangi xodim
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Xodimga rol bering. Keyin u shu rol bo‘yicha ishlaydi.
            </p>

            <form onSubmit={createEmployee} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Ism familiya
                </label>
                <input
                  value={form.fullName}
                  onChange={(event) =>
                    updateForm('fullName', event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                  placeholder="Masalan: Aziz Operator"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Telefon / Login
                </label>
                <input
                  value={form.phone}
                  onChange={(event) => updateForm('phone', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                  placeholder="+998901010101"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Parol
                </label>
                <input
                  value={form.password}
                  onChange={(event) =>
                    updateForm('password', event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                  placeholder="123456"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(event) => updateForm('role', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? 'Yaratilmoqda...' : 'Xodim qo‘shish'}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Xodimlar ro‘yxati
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Role system shu yerdan boshlanadi.
              </p>
            </div>

            {isLoading ? (
              <div className="p-6 text-slate-500">Yuklanmoqda...</div>
            ) : employees.length === 0 ? (
              <div className="p-6 text-slate-500">Xodimlar yo‘q</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex flex-col gap-3 p-5 hover:bg-slate-50 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900">
                          {employee.fullName}
                        </h3>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {employee.role}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {employee.phone}
                      </p>
                    </div>

                    <div className="text-sm text-slate-500">
                      {new Date(employee.createdAt).toLocaleDateString()}
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
