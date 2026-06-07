export interface Worker {
  id: string;
  fullName: string;
  phone: string;
  role: string;
  marketerId: string;
  createdAt: string;
  photo?: string;
}

export interface Marketer {
  id: string;
  fullName: string;
  businessName: string;
  phone: string;
  standNumber: string;
  category: string;
  description: string;
  photo?: string;
  createdAt: string;
  workers: Worker[];
  verificationStatus?: "verified" | "pending" | "review";
  amountPaid?: number;
}

export interface DashboardStats {
  totalMarketers: number;
  totalWorkers: number;
  activeStands: number;
  categoryDist: { name: string; value: number }[];
  recentActivities: LiveActivity[];
}

export interface LiveActivity {
  id: string;
  type: string;
  timestamp: string;
  message: string;
  details?: string;
}

export interface AuthState {
  user: {
    username: string;
    fullName: string;
    role: 'admin' | 'marketer';
    id: string;
  } | null;
  token: string | null;
}
