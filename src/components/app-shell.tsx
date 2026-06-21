"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

type User = {
  id: string;
  tenantId: string;
  fullName: string;
  phone: string;
  role: string;
};

type NavItem = {
  label: string;
  shortLabel: string;
  href: string;
  roles?: string[];
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    shortLabel: "D",
    href: "/dashboard",
  },
  {
    label: "Customers",
    shortLabel: "C",
    href: "/customers",
  },
  {
    label: "Products",
    shortLabel: "P",
    href: "/products",
  },
  {
    label: "Orders",
    shortLabel: "O",
    href: "/orders",
  },
  {
    label: "Delivery",
    shortLabel: "R",
    href: "/delivery",
    roles: ["OWNER", "MANAGER", "OPERATOR", "WAREHOUSE"],
  },
  {
    label: "Employees",
    shortLabel: "E",
    href: "/employees",
    roles: ["OWNER", "MANAGER"],
  },
];

const SIDEBAR_STORAGE_KEY = "sales-os-sidebar-collapsed";

function HamburgerIcon() {
  return (
    <span className="flex flex-col gap-1">
      <span className="block h-0.5 w-5 rounded-full bg-current" />
      <span className="block h-0.5 w-5 rounded-full bg-current" />
      <span className="block h-0.5 w-5 rounded-full bg-current" />
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const savedUser = localStorage.getItem("user");

    if (!token || !savedUser) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(savedUser) as User);

    const savedSidebarState = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    setIsSidebarCollapsed(savedSidebarState === "true");
  }, [pathname, router]);

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    router.push("/login");
  }

  function toggleSidebar() {
    setIsSidebarCollapsed((current) => {
      const nextValue = !current;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(nextValue));
      return nextValue;
    });
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-slate-700">
        Yuklanmoqda...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <aside
          className={
            isSidebarCollapsed
              ? "sticky top-0 hidden h-screen w-16 shrink-0 self-start overflow-y-auto border-r border-slate-200 bg-white px-3 py-4 transition-all md:block"
              : "sticky top-0 hidden h-screen w-72 shrink-0 self-start overflow-y-auto border-r border-slate-200 bg-white p-5 transition-all md:block"
          }
        >
          <div
            className={
              isSidebarCollapsed
                ? "mb-6 flex justify-center"
                : "mb-8 flex items-start gap-3"
            }
          >
            <button
              type="button"
              onClick={toggleSidebar}
              title={
                isSidebarCollapsed ? "Sidebarni ochish" : "Sidebarni yopish"
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100"
            >
              <HamburgerIcon />
            </button>

            {!isSidebarCollapsed ? (
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-slate-900">Sales OS</h1>
                <p className="mt-1 text-sm text-slate-500">Sotuv boshqaruvi</p>
              </div>
            ) : null}
          </div>

          <nav className="space-y-2">
            {navItems
              .filter((item) => !item.roles || item.roles.includes(user.role))
              .map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={
                      isActive
                        ? isSidebarCollapsed
                          ? "flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white"
                          : "block rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                        : isSidebarCollapsed
                          ? "flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          : "block rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }
                  >
                    {isSidebarCollapsed ? item.shortLabel : item.label}
                  </Link>
                );
              })}
          </nav>

          {!isSidebarCollapsed ? (
            <div className="mt-8 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Current user
              </p>
              <p className="mt-2 font-semibold text-slate-900">
                {user.fullName}
              </p>
              <p className="mt-1 text-sm text-slate-500">{user.role}</p>
            </div>
          ) : null}
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur md:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100 md:hidden"
                >
                  <HamburgerIcon />
                </button>

                <div className="min-w-0">
                  <p className="text-sm text-slate-500">Demo Paint</p>
                  <h2 className="truncate text-lg font-bold text-slate-900">
                    {user.fullName}
                  </h2>
                </div>
              </div>

              <button
                onClick={logout}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Chiqish
              </button>
            </div>
          </header>

          <div className="p-4 md:p-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
