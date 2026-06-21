export type Role =
  | "OWNER"
  | "MANAGER"
  | "SALES"
  | "OPERATOR"
  | "WAREHOUSE"
  | "DELIVERY";

export type OrderStatus =
  | "NEW"
  | "CHECKED"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "SHIPPED"
  | "DELIVERED"
  | "PAID";

export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

export const fulfillmentStatusFlow: OrderStatus[] = [
  "NEW",
  "CHECKED",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "SHIPPED",
  "DELIVERED",
];

export function isRole(value: string | null | undefined): value is Role {
  return (
    value === "OWNER" ||
    value === "MANAGER" ||
    value === "SALES" ||
    value === "OPERATOR" ||
    value === "WAREHOUSE" ||
    value === "DELIVERY"
  );
}

export function canCreateCustomer(role: string | null | undefined) {
  return role === "OWNER" || role === "MANAGER" || role === "SALES";
}

export function canCreateOrder(role: string | null | undefined) {
  return (
    role === "OWNER" ||
    role === "MANAGER" ||
    role === "SALES" ||
    role === "OPERATOR"
  );
}

export function canAddPayment(role: string | null | undefined) {
  return (
    role === "OWNER" ||
    role === "MANAGER" ||
    role === "SALES" ||
    role === "OPERATOR"
  );
}

export function canManageProducts(role: string | null | undefined) {
  return role === "OWNER" || role === "MANAGER";
}

export function canManageEmployees(role: string | null | undefined) {
  return role === "OWNER" || role === "MANAGER";
}

export function canUpdateOrderStatus(role: string | null | undefined) {
  return (
    role === "OWNER" ||
    role === "MANAGER" ||
    role === "OPERATOR" ||
    role === "WAREHOUSE"
  );
}

export function nextStatusForRole(
  role: string | null | undefined,
  currentStatus: OrderStatus,
): OrderStatus | null {
  if (currentStatus === "PAID") return null;

  const nextStatus = getNextFulfillmentStatus(currentStatus);

  if (!nextStatus) return null;

  if (nextStatus === "SHIPPED" || nextStatus === "DELIVERED") {
    return null;
  }

  if (role === "OWNER" || role === "MANAGER") {
    return nextStatus;
  }

  if (role === "OPERATOR") {
    return nextStatus === "CHECKED" || nextStatus === "CONFIRMED"
      ? nextStatus
      : null;
  }

  if (role === "WAREHOUSE") {
    return nextStatus === "PREPARING" ? nextStatus : null;
  }

  if (role === "DELIVERY") {
    return null;
  }

  return null;
}

function getNextFulfillmentStatus(currentStatus: OrderStatus) {
  const index = fulfillmentStatusFlow.indexOf(currentStatus);

  if (index < 0 || index >= fulfillmentStatusFlow.length - 1) {
    return null;
  }

  return fulfillmentStatusFlow[index + 1];
}
