export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Analytics {
  totalUsers: number;
  totalStations: number;
  totalOrders: number;
  completedOrders: number;
  completionRate: number;
  totalRevenue: number;
  platformCommission: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  total: number;
  deliveryAddress: string;
  createdAt: string;
}
