export type PaymentMethod = 'كاش' | 'بنك' | 'محفظة' | 'جوال بي';

export interface Department {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  profitRate?: number; // هامش الربح المقدر كنسبة مئوية
  sortOrder?: number;
}

export interface OrderItem {
  department: string; // اسم القسم (مثل: ألبان، معلبات، مشروبات...)
  price: number;      // سعر الوحدة
  quantity: number;   // الكمية
  note?: string;      // تفصيل اختياري إن رغب الكاشير
}

export interface DailyOrder {
  id: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  paidAmount: number;
  discountAmount?: number;
  isPaid: boolean;
  transferredToDebt?: boolean; // هل تم نقله لدفتر الديون
  paymentMethod?: PaymentMethod;
  workerName: string;
  note?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  createdAt: number;
}

export interface DebtEntry {
  id: string;
  debtId: string;
  customerName: string;
  itemDetails: string;
  amount: number;
  discountAmount?: number;
  isPaymentRecord: boolean; // هل هو سجل سداد دفعة نقدية
  paymentMethod?: PaymentMethod;
  date: string;
  time?: string;
  note?: string;
  workerName?: string;
  createdAt: number;
}

export interface DebtRecord {
  id: string;
  customerName: string;
  phone?: string;
  entries: DebtEntry[];
  totalDebt: number;     // إجمالي المشتريات بالدين
  totalPaid: number;     // إجمالي الدفعات المسددة
  totalDiscount: number; // إجمالي الخصم والمسامحة
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: 'فواتير' | 'إيجار' | 'كهرباء ومياه' | 'عمال ورواتب' | 'بضاعة كاش' | 'صيانة' | 'متفرقات';
  date: string;
  time: string;
  workerName: string;
  notes?: string;
  createdAt: number;
}

export interface ManualIncome {
  id: string;
  title: string;
  amount: number;
  paymentMethod: PaymentMethod;
  date: string;
  time: string;
  workerName: string;
  notes?: string;
  createdAt: number;
}

export interface Worker {
  name: string;
  pin: string;
  role: 'admin' | 'cashier';
}

export interface UISettings {
  fontSize: 'small' | 'normal' | 'large';
  rowDensity: 'compact' | 'normal' | 'spacious';
  theme: 'dark' | 'light';
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  pendingChangesCount: number;
}
