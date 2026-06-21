"use client";

import { useRouter } from "next/navigation";

export default function DriverOnlyPage() {
  const router = useRouter();

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    router.push("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
          🚚
        </div>

        <h1 className="mt-6 text-2xl font-black text-slate-900">
          Bu akkaunt mobil ilova uchun
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Siz DELIVERY rolesiz. Yetkazish reyslarini Sales OS mobil ilovasi
          orqali boshqaring. Web panel direktor, manager, operator va sklad
          uchun mo‘ljallangan.
        </p>

        <button
          type="button"
          onClick={logout}
          className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Chiqish
        </button>
      </section>
    </main>
  );
}
