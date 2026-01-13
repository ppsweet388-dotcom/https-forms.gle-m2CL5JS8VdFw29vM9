
export type OrderStatus = 'ordered' | 'ready_to_serve' | 'delivering' | 'delivered';

export interface PatientOrder {
  id: string;
  orderNumber: string;
  patientName: string;
  hn: string;
  roomNumber: string;
  foodType: string;
  restrictions: string;
  foodList: string;
  adminName: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  
  kitchen?: {
    chefName: string;
    finishedAt: string;
    photo: string;
  };
  
  dispatch?: {
    runnerName: string;
    dispatchedAt: string;
    photo: string;
  };

  delivery?: {
    serverName: string;
    deliveredAt: string;
    photo: string;
  };
}

export enum UserRole {
  ADMIN = 'ADMIN',
  KITCHEN = 'KITCHEN',
  SERVICE = 'SERVICE',
  DASHBOARD = 'DASHBOARD'
}
