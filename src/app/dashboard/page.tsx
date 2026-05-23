'use client';

import { AppShell } from '@/components/app-shell';

const stats = [
  {
    label: 'Bugungi savdo',
    value: '620 000 so‘m',
    hint: 'Test order asosida',
  },
  {
    label: 'Ochiq qarz',
    value: '320 000 so‘m',
    hint: 'To‘lov kutilmoqda',
  },
  {
    label: 'Yangi zakazlar',
    value: '1 ta',
    hint: 'Status: NEW',
  },
  {
    label: 'Mijozlar',
    value: '1 ta',
    hint: 'Sales tomonidan qo‘shildi',
  },
];

const orderSteps = [
  'NEW',
  'CHECKED',
  'CONFIRMED',
  'PREPARING',
  'SHIPPED',
  'DELIVERED',
  'PAID',
];

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-500">Dashboard</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Sotuv boshqaruv paneli
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Bu yerda direktor va manager sotuv, zakaz, qarz va jarayon holatini
            tez tushunadi. Maqsad — ko‘p gap emas, aniq signal.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">
                {stat.label}
              </p>
              <p className="mt-3 text-2xl font-bold text-slate-900">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-slate-500">{stat.hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Zakaz jarayoni
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Zakaz qayerda turib qolganini tez ko‘rish uchun.
                </p>
              </div>

              <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                MVP
              </span>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-7">
              {orderSteps.map((step, index) => (
                <div
                  key={step}
                  className={
                    index === 0
                      ? 'rounded-xl border border-slate-900 bg-slate-900 p-3 text-center text-sm font-bold text-white'
                      : 'rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-sm font-semibold text-slate-600'
                  }
                >
                  {step}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                Hozirgi eng muhim signal:
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Yangi zakaz bor. Keyingi bosqichda operator uni tekshiradi,
                sklad esa tayyorlash jarayoniga oladi.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Tezkor amallar
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Xodim o‘ylab o‘tirmasin — kerakli ish darhol ko‘rinsin.
            </p>

            <div className="mt-5 space-y-3">
              <a
                href="/customers"
                className="block rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Mijozlarni ko‘rish
              </a>

              <a
                href="/orders"
                className="block rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Zakazlarni ko‘rish
              </a>

              <a
                href="/employees"
                className="block rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Xodimlar
              </a>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
