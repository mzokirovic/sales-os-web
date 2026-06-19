export type Role =
  | 'OWNER'
  | 'MANAGER'
  | 'SALES'
  | 'OPERATOR'
  | 'WAREHOUSE'
  | 'DELIVERY';

export type OrderStatus =
  | 'NEW'
  | 'CHECKED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'PAID';

export function isRole(value: string | null | undefined): value is Role {
  return (
    value === 'OWNER' ||
    value === 'MANAGER' ||
    value === 'SALES' ||
    value === 'OPERATOR' ||
    value === 'WAREHOUSE' ||
    value === 'DELIVERY'
  );
}

export function canViewDashboard(role: string | null | undefined) {
  return isRole(role);
}

export function canCreateCustomer(role: string | null | undefined) {
  return role === 'OWNER' || role === 'MANAGER' || role === 'SALES';
}

export function canCreateOrder(role: string | null | undefined) {
  return (
    role === 'OWNER' ||
    role === 'MANAGER' ||
    role === 'SALES' ||
    role === 'OPERATOR'
  );
}

export function canAddPayment(role: string | null | undefined) {
  return (
    role === 'OWNER' ||
    role === 'MANAGER' ||
    role === 'SALES' ||
    role === 'OPERATOR'
  );
}

export function canManageProducts(role: string | null | undefined) {
  return role === 'OWNER' || role === 'MANAGER';
}

export function canManageEmployees(role: string | null | undefined) {
  return role === 'OWNER' || role === 'MANAGER';
}

export function canUpdateOrderStatus(role: string | null | undefined) {
  return (
    role === 'OWNER' ||
    role === 'MANAGER' ||
    role === 'OPERATOR' ||
    role === 'WAREHOUSE' ||
    role === 'DELIVERY'
  );
}

export function nextStatusForRole(
  role: string | null | undefined,
  currentStatus: OrderStatus,
): OrderStatus | null {
  if (currentStatus === 'PAID') return null;

  const nextStatus = getNextFulfillmentStatus(currentStatus);

  if (!nextStatus) return null;

  if (role === 'OWNER' || role === 'MANAGER') {
    return nextStatus;
  }

  const allowedByRole: Partial<Record<Role, OrderStatus[]>> = {
    OPERATOR: ['CHECKED', 'CONFIRMED'],
    WAREHOUSE: ['PREPARING', 'SHIPPED'],
    DELIVERY: ['DELIVERED'],
  };

  if (!isRole(role)) return null;

  const allowedStatuses = allowedByRole[role] ?? [];

  return allowedStatuses.includes(nextStatus) ? nextStatus : null;
}

export const fulfillmentStatusFlow: OrderStatus[] = [
  'NEW',
  'CHECKED',
  'CONFIRMED',
  'PREPARING',
  'SHIPPED',
  'DELIVERED',
];

function getNextFulfillmentStatus(currentStatus: OrderStatus) {
  const index = fulfillmentStatusFlow.indexOf(currentStatus);

  if (index < 0 || index >= fulfillmentStatusFlow.length - 1) {
    return null;
  }

  return fulfillmentStatusFlow[index + 1];
}
