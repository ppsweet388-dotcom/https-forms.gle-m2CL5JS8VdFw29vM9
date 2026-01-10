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
export enum DietTexture {
  NORMAL = 'อาหารปกติ',
  SOFT = 'อาหารอ่อน',
  BLENDED = 'อาหารปั่นละเอียด',
  LIQUID = 'อาหารเหลว'
}
export interface MealLog {
  id: string;
  orderNumber: string;
  roomNumber: string;
  patientName: string;
  hn: string;
  mealType: string;
  ageGroup: AgeGroup;
  dietTexture?: DietTexture;
  menuItems: string;
  omitItems?: string;
  allergyItems?: string;
  status: MealStatus;
  adminName: string;
  orderTimestamp: string;
  kitchenStaffName?: string;
  kitchenTimestamp?: string;
  dispatchStaffName?: string;
  dispatchTimestamp?: string;
  deliveryStaffName?: string;
  deliveryTimestamp?: string;
  aiNote?: string;
}tring;
  deliveryPhoto?: string;
  deliveryTimestamp?: string;
}

export type UserRole = 'ADMIN' | 'KITCHEN' | 'SERVER' | 'VIEWER';
