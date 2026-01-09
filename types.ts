
export enum MealStatus {
  ORDERED = 'ORDERED',
  KITCHEN_READY = 'KITCHEN_READY',
  DISPATCHED = 'DISPATCHED',
  DELIVERED = 'DELIVERED'
}

export enum AgeGroup {
  ADULT = 'ผู้ใหญ่',
  CHILD = 'เด็ก'
}

export interface MealLog {
  id: string;
  orderNumber: string;
  roomNumber: string;
  patientName: string;
  hn: string;
  mealType: string;
  ageGroup: AgeGroup;
  menuItems: string;
  omitItems?: string; // งด
  allergyItems?: string; // แพ้
  status: MealStatus;
  
  // Dynamic Custom Data
  customFields?: Record<string, string>;

  // Admin Data
  adminName: string;
  orderTimestamp: string;

  // Kitchen Data
  kitchenStaffName?: string;
  kitchenPhoto?: string;
  kitchenTimestamp?: string;

  // Dispatch Data
  dispatchStaffName?: string;
  dispatchPhoto?: string;
  dispatchTimestamp?: string;

  // Delivery Data
  deliveryStaffName?: string;
  deliveryPhoto?: string;
  deliveryTimestamp?: string;
}

export type UserRole = 'ADMIN' | 'KITCHEN' | 'SERVER' | 'VIEWER';
