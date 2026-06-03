'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { LoadingSpinner } from '@/components/loading-spinner';

type Role = 'OWNER' | 'MANAGER' | 'SALES' | 'OPERATOR' | 'WAREHOUSE' | 'DELIVERY';

type User = {
  id: string;
  tenantId: string;
  fullName: string;
  phone: string;
  role: Role;
  createdAt: string;
};

type EmployeeForm = {
  fullName: string;
  phone: string;
  password: string;
  role: Role;
};

type RoleFilter = 'ALL' | Role;

const initialForm: EmployeeForm = {
  fullName: '',
  phone: '',
  password: '123456',
  role: 'SALES',
};

const roleLabels: Record<Role, string> = {
  OWNER: 'Direktor',
  MANAGER: 'Manager',
  SALES: 'Sotuvchi',
  OPERATOR: 'Operator',
  WAREHOUSE: 'Sklad',
  DELIVERY: 'Yetkazuvchi',
};

const roleDescriptions: Record<Role, string> = {
  OWNER: 'Tizim egasi. Barcha ma’lumotlarni boshqaradi.',
  MANAGER: 'Jamoani va asosiy jarayonlarni nazorat qiladi.',
  SALES: 'Mijoz qo‘shadi va o‘z zakazlarini yuritadi.',
  OPERATOR: 'Zakazlarni tekshiradi va tasdiqlashga tayyorlaydi.',
  WAREHOUSE: 'Sklad tayyorlash va jo‘natish bosqichlari.',
  DELIVERY: 'Yetkazish bosqichini yuritadi.',
};

const roleBadgeClass: Record<Role, string> = {
  OWNER: 'bg-slate-900 text-white',
  MANAGER: 'bg-violet-50 text-violet-700',
  SALES: 'bg-blue-50 text-blue-700',
  OPERATOR: 'bg-indigo-50 text-indigo-700',
  WAREHOUSE: 'bg-amber-50 text-amber-700',
  DELIVERY: 'bg-emerald-50 text-emerald-700',
};

const creatableRoles: Role[] = [
  'MANAGER',
  'SALES',
  'OPERATOR',
  'WAREHOUSE',
  'DELIVERY',
];

const filterRoles: Role[] = [
  'OWNER',
  'MANAGER',
  'SALES',
  'OPERATOR',
  'WAREHOUSE',
  'DELIVERY',
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function canManageEmployees(role?: string | null) {
  return role === 'OWNER';
}

export default function EmployeesPage() {
  const router = useRouter();

  const [employees, setEmployees] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [form, setForm] = useState<EmployeeForm>(initialForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');

  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const canManage = canManageEmployees(currentUser?.role);

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch =
        !query ||
        employee.fullName.toLowerCase().includes(query) ||
        employee.phone.toLowerCase().includes(query) ||
        roleLabels[employee.role].toLowerCase().includes(query) ||
        employee.role.toLowerCase().includes(query);

      const matchesRole = roleFilter === 'ALL' || employee.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [employees, searchQuery, roleFilter]);

  const roleCounts = useMemo(() => {
    const counts = new Map<Role, number>();

    for (const role of filterRoles) {
      counts.set(role, 0);
    }

    for (const employee of employees) {
      counts.set(employee.role, (counts.get(employee.role) ?? 0) + 1);
    }

    return counts;
  }, [employees]);

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

  async function loadEmployees() {
    setError('');
    setIsLoading(true);

    try {
      const token = getToken();
      if (!token) return;

      loadCurrentUser();

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
        throw new Error('Xodimlar ro‘yxatini ko‘rish uchun ruxsat yo‘q');
      }

      if (!response.ok) {
        throw new Error('Xodimlarni yuklashda xatolik');
      }

      const data = (await response.json()) as User[];
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

  function updateForm(field: keyof EmployeeForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function validateForm() {
    if (!form.fullName.trim()) {
      return 'Xodim ismi majburiy';
    }

    if (!form.phone.trim()) {
      return 'Telefon raqam majburiy';
    }

    if (!form.password.trim() || form.password.length < 6) {
      return 'Parol kamida 6 ta belgidan iborat bo‘lishi kerak';
    }

    return '';
  }

  async function createEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setSuccessMessage('');

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreating(true);

    try {
      const token = getToken();
      if (!token) return;

      const [response] = await Promise.all([
        fetch(`${apiUrl}/users`, {
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
        }),
        sleep(700),
      ]);

      if (response.status === 403) {
        throw new Error('Faqat OWNER xodim qo‘sha oladi');
      }

      if (response.status === 409) {
        throw new Error('Bu telefon raqam bilan xodim allaqachon mavjud');
      }

      if (!response.ok) {
        throw new Error('Xodim qo‘shishda xatolik');
      }

      setForm(initialForm);
      setSuccessMessage('Xodim qo‘shildi');
      await loadEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noma’lum xatolik');
    } finally {
      setIsCreating(false);
    }
  }

  function resetFilters() {
    setSearchQuery('');
    setRoleFilter('ALL');
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
              Har bir xodimning roli aniq bo‘lishi kerak. Role orqali kim
              mijoz qo‘shishi, kim zakaz statusini yuritishi nazorat qilinadi.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
              <p className="text-sm text-slate-500">Jami xodimlar</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {employees.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
              <p className="text-sm text-slate-500">Sotuvchilar</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">
                {roleCounts.get('SALES') ?? 0}
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
            <h2 className="text-lg font-bold text-slate-900">Yangi xodim</h2>
            <p className="mt-1 text-sm text-slate-500">
              MVP’da xodim yaratish oddiy: ism, telefon, parol va role.
            </p>

            {!canManage ? (
              <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-medium text-amber-700">
                Xodim qo‘shish faqat OWNER uchun. Sizning rolingiz:{' '}
                {currentUser ? roleLabels[currentUser.role] : 'noma’lum'}.
              </div>
            ) : (
              <form onSubmit={createEmployee} className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Xodim ismi *
                  </label>
                  <input
                    value={form.fullName}
                    onChange={(event) =>
                      updateForm('fullName', event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                    placeholder="Masalan: Sardor Sales"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Telefon *
                  </label>
                  <input
                    value={form.phone}
                    onChange={(event) => updateForm('phone', event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                    placeholder="+998901234567"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Boshlang‘ich parol *
                  </label>
                  <input
                    value={form.password}
                    onChange={(event) =>
                      updateForm('password', event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                    placeholder="123456"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Keyin alohida parol almashtirish flow qo‘shamiz.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Role
                  </label>
                  <select
                    value={form.role}
                    onChange={(event) =>
                      updateForm('role', event.target.value as Role)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                  >
                    {creatableRoles.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs text-slate-500">
                    {roleDescriptions[form.role]}
                  </p>
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
                    'Xodim qo‘shish'
                  )}
                </button>
              </form>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
            <div className="border-b border-slate-200 p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Xodimlar ro‘yxati
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Rollar real jarayonni boshqaradi: sotuv, operator, sklad,
                    yetkazish.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadEmployees}
                  disabled={isLoading}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? 'Yuklanmoqda...' : 'Yangilash'}
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 md:col-span-2"
                  placeholder="Ism, telefon yoki role bo‘yicha qidirish..."
                />

                <select
                  value={roleFilter}
                  onChange={(event) =>
                    setRoleFilter(event.target.value as RoleFilter)
                  }
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                >
                  <option value="ALL">Barcha rollar</option>
                  {filterRoles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  Ko‘rsatilmoqda:{' '}
                  <span className="font-bold text-slate-900">
                    {filteredEmployees.length}
                  </span>{' '}
                  / {employees.length}
                </p>

                {searchQuery || roleFilter !== 'ALL' ? (
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
            ) : filteredEmployees.length === 0 ? (
              <div className="p-6">
                <div className="rounded-2xl bg-slate-50 p-6 text-center">
                  <p className="font-semibold text-slate-900">
                    Xodim topilmadi
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Qidiruv yoki role filterini o‘zgartiring.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredEmployees.map((employee) => (
                  <div key={employee.id} className="p-5 hover:bg-slate-50">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900">
                            {employee.fullName}
                          </h3>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              roleBadgeClass[employee.role]
                            }`}
                          >
                            {roleLabels[employee.role]}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          {employee.phone}
                        </p>

                        <p className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          {roleDescriptions[employee.role]}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm md:min-w-40">
                        <p className="text-slate-500">Qo‘shilgan</p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {formatDate(employee.createdAt)}
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
