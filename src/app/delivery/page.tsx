"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { LoadingSpinner } from "@/components/loading-spinner";

type DriverAvailability = "AVAILABLE" | "PLANNED" | "BUSY";

type Driver = {
  id: string;
  fullName: string;
  phone: string;
  role: "DELIVERY";
  availability: DriverAvailability;
  activeStopsCount: number;
};

type ReadyOrder = {
  id: string;
  status: "READY";
  totalAmount: number;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
  };
  items: {
    id: string;
    productName: string;
    quantity: number;
  }[];
};

type ActiveTrip = {
  id: string;
  status: "PLANNED" | "IN_PROGRESS";
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  driver: {
    id: string;
    fullName: string;
    phone: string;
    role: "DELIVERY";
  };
  stops: {
    id: string;
    sortOrder: number;
    status: "PENDING" | "DELIVERED" | "FAILED";
    deliveredAt: string | null;
    order: {
      id: string;
      status: string;
      customer: {
        id: string;
        name: string;
        phone: string | null;
        address: string | null;
        lat: number | null;
        lng: number | null;
      };
      items: {
        id: string;
        productName: string;
        quantity: number;
      }[];
    };
  }[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const availabilityLabels: Record<DriverAvailability, string> = {
  AVAILABLE: "Bo‘sh",
  PLANNED: "Rejada",
  BUSY: "Band",
};

const availabilityClass: Record<DriverAvailability, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700",
  PLANNED: "bg-amber-50 text-amber-700",
  BUSY: "bg-rose-50 text-rose-700",
};

const statusLabels: Record<ReadyOrder["status"], string> = {
  READY: "Tayyor",
};

type SavedUser = {
  role?: string | null;
};

const deliveryDispatchRoles = ["OWNER", "MANAGER", "OPERATOR", "WAREHOUSE"];

function canAccessDeliveryDispatch(role: string | null | undefined) {
  return Boolean(role && deliveryDispatchRoles.includes(role));
}

const tripStatusLabels: Record<ActiveTrip["status"], string> = {
  PLANNED: "Rejada",
  IN_PROGRESS: "Yo‘lda",
};

const tripStatusClass: Record<ActiveTrip["status"], string> = {
  PLANNED: "bg-amber-50 text-amber-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
};

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

export default function DeliveryDispatchPage() {
  const router = useRouter();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<ReadyOrder[]>([]);
  const [trips, setTrips] = useState<ActiveTrip[]>([]);

  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [cancellingTripId, setCancellingTripId] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedDriver = useMemo(
    () => drivers.find((driver) => driver.id === selectedDriverId) ?? null,
    [drivers, selectedDriverId],
  );

  const availableDrivers = useMemo(
    () => drivers.filter((driver) => driver.availability === "AVAILABLE"),
    [drivers],
  );

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      router.push("/login");
      return;
    }

    try {
      const user = JSON.parse(savedUser) as SavedUser;

      if (!canAccessDeliveryDispatch(user.role)) {
        router.push("/dashboard");
        return;
      }

      setIsAuthorized(true);
      loadData();
    } catch {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      router.push("/login");
    }
  }, [router]);

  async function request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = localStorage.getItem("accessToken");

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers ?? {}),
      },
    });

    if (!response.ok) {
      let message = "So‘rov bajarilmadi";

      try {
        const data = await response.json();
        message = data.message ?? message;
      } catch {
        // keep fallback message
      }

      throw new Error(message);
    }

    return response.json() as Promise<T>;
  }

  async function loadData() {
    try {
      setIsLoading(true);
      setError("");

      const [driversData, ordersData, tripsData] = await Promise.all([
        request<Driver[]>("/delivery/drivers"),
        request<ReadyOrder[]>("/delivery/ready-orders"),
        request<ActiveTrip[]>("/delivery/trips"),
      ]);

      setDrivers(driversData);
      setOrders(ordersData);
      setTrips(tripsData);

      const firstAvailableDriver = driversData.find(
        (driver) => driver.availability === "AVAILABLE",
      );

      setSelectedDriverId(
        (current) => current || firstAvailableDriver?.id || "",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ma’lumot yuklanmadi");
    } finally {
      setIsLoading(false);
    }
  }

  function toggleOrder(orderId: string) {
    setSelectedOrderIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId],
    );
  }

  async function createTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDriverId) {
      setError("Avval shofyor tanlang");
      return;
    }

    if (selectedOrderIds.length === 0) {
      setError("Kamida bitta zakaz tanlang");
      return;
    }

    try {
      setIsCreating(true);
      setError("");
      setSuccessMessage("");

      await request("/delivery/trips", {
        method: "POST",
        body: JSON.stringify({
          driverId: selectedDriverId,
          orderIds: selectedOrderIds,
        }),
      });

      setSuccessMessage(
        "Reys yaratildi. Driver boshlaganda zakaz Yo‘lda statusiga o‘tadi",
      );
      setSelectedOrderIds([]);
      setSelectedDriverId("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reys yaratilmadi");
    } finally {
      setIsCreating(false);
    }
  }

  async function cancelTrip(tripId: string) {
    const confirmed = window.confirm("Bu reys bekor qilinsinmi?");

    if (!confirmed) return;

    try {
      setCancellingTripId(tripId);
      setError("");
      setSuccessMessage("");

      await request(`/delivery/trips/${tripId}/cancel`, {
        method: "POST",
      });

      setSuccessMessage("Reys bekor qilindi. Shofyor bo‘shatildi.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reys bekor qilinmadi");
    } finally {
      setCancellingTripId(null);
    }
  }

  if (!isAuthorized) {
    return (
      <AppShell>
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <LoadingSpinner />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-3 rounded-3xl bg-white p-5 shadow-sm md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Delivery dispatch
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Yetkazib berish reyslari
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Tayyorlanayotgan zakazlarni tanlang, bo‘sh shofyorni belgilang va
              bitta reys yarating.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading || isCreating}
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Yangilash
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <LoadingSpinner />
          </div>
        ) : (
          <form
            onSubmit={createTrip}
            className="grid gap-6 lg:grid-cols-[1fr_380px]"
          >
            <section className="space-y-4">
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Reysga tayyor zakazlar
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      READY holatdagi, hali aktiv reysga qo‘shilmagan zakazlar.
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {orders.length} ta
                  </span>
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm">
                  Hozircha reysga tayyor zakaz yo‘q.
                </div>
              ) : (
                <div className="grid gap-3">
                  {orders.map((order) => {
                    const isSelected = selectedOrderIds.includes(order.id);

                    return (
                      <label
                        key={order.id}
                        className={
                          isSelected
                            ? "block cursor-pointer rounded-3xl border-2 border-slate-900 bg-white p-4 shadow-sm"
                            : "block cursor-pointer rounded-3xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
                        }
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOrder(order.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-300"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-slate-900">
                                {order.customer.name}
                              </h3>
                              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
                                {statusLabels[order.status]}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              {order.customer.phone || "Telefon yo‘q"} ·{" "}
                              {order.customer.address || "Manzil yo‘q"}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {order.items.map((item) => (
                                <span
                                  key={item.id}
                                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                                >
                                  {item.productName} × {item.quantity}
                                </span>
                              ))}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-slate-400">
                              <span>{formatDate(order.createdAt)}</span>
                              <span>{formatMoney(order.totalAmount)}</span>
                              <span>ID: {order.id.slice(0, 8)}</span>
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Shofyor</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Faqat bo‘sh shofyor reysga biriktiriladi.
                </p>

                <select
                  value={selectedDriverId}
                  onChange={(event) => setSelectedDriverId(event.target.value)}
                  className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none focus:border-slate-900"
                >
                  <option value="">Shofyor tanlang</option>
                  {availableDrivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.fullName} · {driver.phone}
                    </option>
                  ))}
                </select>

                {selectedDriver ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <p className="font-bold text-slate-900">
                      {selectedDriver.fullName}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedDriver.phone}
                    </p>
                    <span
                      className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${availabilityClass[selectedDriver.availability]}`}
                    >
                      {availabilityLabels[selectedDriver.availability]}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Reys</h2>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>Tanlangan zakaz</span>
                    <span className="font-bold text-slate-900">
                      {selectedOrderIds.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bo‘sh shofyorlar</span>
                    <span className="font-bold text-slate-900">
                      {availableDrivers.length}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    isCreating ||
                    !selectedDriverId ||
                    selectedOrderIds.length === 0
                  }
                  className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreating ? "Yaratilmoqda..." : "Reys yaratish"}
                </button>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Aktiv reyslar
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Yaratilgan reyslar shu yerda ko‘rinadi.
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {trips.length} ta
                  </span>
                </div>

                {trips.length === 0 ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    Hozircha aktiv reys yo‘q.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {trips.map((trip) => (
                      <div
                        key={trip.id}
                        className="rounded-2xl border border-slate-100 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900">
                              {trip.driver.fullName}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {trip.driver.phone}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${tripStatusClass[trip.status]}`}
                          >
                            {tripStatusLabels[trip.status]}
                          </span>
                        </div>

                        <div className="mt-3 space-y-2">
                          {trip.stops.map((stop) => (
                            <div
                              key={stop.id}
                              className="rounded-xl bg-slate-50 p-3"
                            >
                              <p className="text-sm font-bold text-slate-900">
                                {stop.sortOrder}. {stop.order.customer.name}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {stop.order.customer.address || "Manzil yo‘q"}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {stop.order.items.map((item) => (
                                  <span
                                    key={item.id}
                                    className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600"
                                  >
                                    {item.productName} × {item.quantity}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                  Driver status
                </h2>
                <div className="mt-4 space-y-3">
                  {drivers.map((driver) => (
                    <div
                      key={driver.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {driver.fullName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {driver.activeStopsCount} aktiv stop
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${availabilityClass[driver.availability]}`}
                      >
                        {availabilityLabels[driver.availability]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </form>
        )}
      </div>
    </AppShell>
  );
}
