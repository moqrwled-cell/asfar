import { 
  DailyOrder, 
  DebtRecord, 
  DebtEntry, 
  Expense, 
  ManualIncome, 
  PaymentMethod, 
  Department, 
  UISettings, 
  SyncStatus,
  Worker 
} from './types';
import { supabase } from './supabase';

// العمال المعتمدون حسب طلب المستخدم
export const WORKERS: Worker[] = [
  { name: 'عبدالله', pin: '1988', role: 'cashier' },
  { name: 'أحمد', pin: '2001', role: 'cashier' },
  { name: 'مقداد', pin: '7227', role: 'admin' }, // المدير / المالك
];

// الأقسام الافتراضية الشاملة للسوبر ماركت
export const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'dept_dairy', name: 'ألبان وأجبان', icon: 'Milk', color: '#3b82f6', profitRate: 15, sortOrder: 1 },
  { id: 'dept_canned', name: 'معلبات ومؤن', icon: 'Box', color: '#f59e0b', profitRate: 18, sortOrder: 2 },
  { id: 'dept_drinks', name: 'مشروبات وعصائر', icon: 'CupSoda', color: '#06b6d4', profitRate: 22, sortOrder: 3 },
  { id: 'dept_snacks', name: 'تسالي وحلويات', icon: 'Candy', color: '#ec4899', profitRate: 25, sortOrder: 4 },
  { id: 'dept_bakery', name: 'مخبوزات وتوست', icon: 'Wheat', color: '#d97706', profitRate: 20, sortOrder: 5 },
  { id: 'dept_cleaning', name: 'منظفات وعناية', icon: 'Sparkles', color: '#10b981', profitRate: 22, sortOrder: 6 },
  { id: 'dept_frozen', name: 'مجمدات ولحوم', icon: 'Snowflake', color: '#6366f1', profitRate: 18, sortOrder: 7 },
  { id: 'dept_oils_eggs', name: 'بيض وزيوت', icon: 'Egg', color: '#eab308', profitRate: 14, sortOrder: 8 },
  { id: 'dept_spices', name: 'بهارات وبقوليات', icon: 'Salad', color: '#84cc16', profitRate: 25, sortOrder: 9 },
  { id: 'dept_tobacco', name: 'سجائر ودخان', icon: 'Cigarette', color: '#64748b', profitRate: 10, sortOrder: 10 },
  { id: 'dept_produce', name: 'خضار وفواكه', icon: 'Apple', color: '#22c55e', profitRate: 25, sortOrder: 11 },
  { id: 'dept_staples', name: 'مواد تموينية', icon: 'ShoppingBag', color: '#8b5cf6', profitRate: 12, sortOrder: 12 },
  { id: 'dept_general', name: 'متفرقات / عام', icon: 'Store', color: '#64748b', profitRate: 18, sortOrder: 13 },
];

// الحالة المحلية للمتجر
let currentDailyOrders: DailyOrder[] = [];
let currentDebts: DebtRecord[] = [];
let currentExpenses: Expense[] = [];
let currentManualIncomes: ManualIncome[] = [];
let currentDepartments: Department[] = [...DEFAULT_DEPARTMENTS];
let currentUISettings: UISettings = { fontSize: 'normal', rowDensity: 'normal', theme: 'dark' };

let syncStatus: SyncStatus = {
  isOnline: navigator.onLine,
  isSyncing: false,
  lastSyncedAt: null,
  pendingChangesCount: 0,
};

let listeners: (() => void)[] = [];

// =================== دوال مساعدة ===================

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export function getTodayDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTime(): string {
  const d = new Date();
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatCurrency(n: number): string {
  return (n || 0).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ₪';
}

// Pub / Sub لتحديث واجهات React
export function subscribeToStore(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

function notify() {
  listeners.forEach(l => {
    try { l(); } catch (err) { console.error('Error in store listener:', err); }
  });
}

// =================== الحفظ والاسترجاع المحلي (Offline-First) ===================

const LOCAL_STORAGE_KEY = 'meqdad_market_data_v1';

function saveToLocalStorage() {
  try {
    const payload = {
      dailyOrders: currentDailyOrders,
      debts: currentDebts,
      expenses: currentExpenses,
      manualIncomes: currentManualIncomes,
      departments: currentDepartments,
      uiSettings: currentUISettings,
      savedAt: Date.now(),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('LocalStorage save error:', err);
  }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.dailyOrders)) currentDailyOrders = data.dailyOrders;
      if (Array.isArray(data.debts)) currentDebts = data.debts;
      if (Array.isArray(data.expenses)) currentExpenses = data.expenses;
      if (Array.isArray(data.manualIncomes)) currentManualIncomes = data.manualIncomes;
      if (Array.isArray(data.departments) && data.departments.length > 0) currentDepartments = data.departments;
      if (data.uiSettings) currentUISettings = data.uiSettings;
    }
  } catch (err) {
    console.error('LocalStorage load error:', err);
  }
}

// تحميل فوري عند تشغيل الكود
loadFromLocalStorage();

// =================== المزامنة السحابية مع Supabase ===================

export async function fetchFromSupabase() {
  if (!navigator.onLine) {
    syncStatus.isOnline = false;
    notify();
    return;
  }

  syncStatus.isSyncing = true;
  notify();

  try {
    const [
      ordersRes,
      debtsRes,
      debtEntriesRes,
      expensesRes,
      incomesRes,
      deptRes,
    ] = await Promise.all([
      supabase.from('market_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('market_debts').select('*').order('updated_at', { ascending: false }),
      supabase.from('market_debt_entries').select('*').order('created_at', { ascending: false }),
      supabase.from('market_expenses').select('*').order('created_at', { ascending: false }),
      supabase.from('market_incomes').select('*').order('created_at', { ascending: false }),
      supabase.from('market_departments').select('*').order('sort_order', { ascending: true }),
    ]);

    if (deptRes.data && deptRes.data.length > 0) {
      currentDepartments = deptRes.data.map(d => ({
        id: d.id,
        name: d.name,
        icon: d.icon,
        color: d.color,
        profitRate: Number(d.profit_rate) || 15,
        sortOrder: d.sort_order,
      }));
    }

    if (ordersRes.data) {
      currentDailyOrders = ordersRes.data.map(o => ({
        id: o.id,
        customerName: o.customer_name,
        items: o.items || [],
        totalAmount: Number(o.total_amount) || 0,
        paidAmount: Number(o.paid_amount) || 0,
        discountAmount: Number(o.discount_amount) || 0,
        isPaid: Boolean(o.is_paid),
        transferredToDebt: Boolean(o.transferred_to_debt),
        paymentMethod: o.payment_method,
        workerName: o.worker_name,
        note: o.note,
        date: o.date,
        time: o.time,
        createdAt: Number(o.created_at),
      }));
    }

    if (debtsRes.data) {
      const allEntries = debtEntriesRes.data || [];
      currentDebts = debtsRes.data.map(d => {
        const customerEntries = allEntries
          .filter(e => e.debt_id === d.id || e.customer_name.trim().toLowerCase() === d.customer_name.trim().toLowerCase())
          .map(e => ({
            id: e.id,
            debtId: d.id,
            customerName: e.customer_name,
            itemDetails: e.item_details,
            amount: Number(e.amount) || 0,
            discountAmount: Number(e.discount_amount) || 0,
            isPaymentRecord: Boolean(e.is_payment_record),
            paymentMethod: e.payment_method,
            date: e.date,
            time: e.time,
            note: e.note,
            workerName: e.worker_name,
            createdAt: Number(e.created_at),
          }));

        return {
          id: d.id,
          customerName: d.customer_name,
          phone: d.phone,
          entries: customerEntries,
          totalDebt: Number(d.total_debt) || 0,
          totalPaid: Number(d.total_paid) || 0,
          totalDiscount: Number(d.total_discount) || 0,
          notes: d.notes,
          createdAt: Number(d.created_at),
          updatedAt: Number(d.updated_at),
        };
      });
    }

    if (expensesRes.data) {
      currentExpenses = expensesRes.data.map(e => ({
        id: e.id,
        title: e.title,
        amount: Number(e.amount) || 0,
        category: e.category,
        date: e.date,
        time: e.time,
        workerName: e.worker_name,
        notes: e.notes,
        createdAt: Number(e.created_at),
      }));
    }

    if (incomesRes.data) {
      currentManualIncomes = incomesRes.data.map(i => ({
        id: i.id,
        title: i.title,
        amount: Number(i.amount) || 0,
        paymentMethod: i.payment_method,
        date: i.date,
        time: i.time,
        workerName: i.worker_name,
        notes: i.notes,
        createdAt: Number(i.created_at),
      }));
    }

    saveToLocalStorage();
    syncStatus.lastSyncedAt = Date.now();
    syncStatus.pendingChangesCount = 0;
  } catch (err) {
    console.error('Supabase fetch error:', err);
  } finally {
    syncStatus.isSyncing = false;
    notify();
  }
}

// تفعيل الاستماع اللحظي (Realtime) لـ Supabase
let realtimeChannel: any = null;
export function initSupabaseRealtime() {
  if (realtimeChannel) return;

  window.addEventListener('online', () => {
    syncStatus.isOnline = true;
    notify();
    fetchFromSupabase();
  });

  window.addEventListener('offline', () => {
    syncStatus.isOnline = false;
    notify();
  });

  fetchFromSupabase();

  realtimeChannel = supabase
    .channel('meqdad-market-realtime')
    .on('postgres_changes', { event: '*', schema: 'public' }, () => {
      fetchFromSupabase();
    })
    .subscribe();
}

// =================== الدفتر اليومي (Daily Orders) ===================

export function getDailyOrdersByDate(date: string): DailyOrder[] {
  return currentDailyOrders.filter(o => o.date === date);
}

export function getAllOrders(): DailyOrder[] {
  return currentDailyOrders;
}

export function getOrderTotal(order: DailyOrder): number {
  if (order.items && order.items.length > 0) {
    return order.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  }
  return order.totalAmount || 0;
}

export function getOrderRemainingAmount(order: DailyOrder): number {
  const total = getOrderTotal(order);
  const paid = order.paidAmount || 0;
  const discount = order.discountAmount || 0;
  return Math.max(0, total - paid - discount);
}

export async function addDailyOrder(params: {
  customerName: string;
  items: { department: string; price: number; quantity: number; note?: string }[];
  workerName: string;
  date?: string;
  note?: string;
  paymentMethod?: PaymentMethod;
  isPaid?: boolean;
}): Promise<DailyOrder> {
  const date = params.date || getTodayDate();
  const time = getCurrentTime();
  const totalAmount = params.items.reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity)), 0);
  const isPaid = params.isPaid ?? true; // افتراضياً كاش مدفوع

  const newOrder: DailyOrder = {
    id: generateId(),
    customerName: params.customerName.trim() || 'زبون عام (كاش)',
    items: params.items,
    totalAmount,
    paidAmount: isPaid ? totalAmount : 0,
    discountAmount: 0,
    isPaid,
    transferredToDebt: false,
    paymentMethod: params.paymentMethod || 'كاش',
    workerName: params.workerName,
    note: params.note?.trim() || '',
    date,
    time,
    createdAt: Date.now(),
  };

  currentDailyOrders = [newOrder, ...currentDailyOrders];
  saveToLocalStorage();
  notify();

  // حفظ في Supabase
  try {
    await supabase.from('market_orders').insert({
      id: newOrder.id,
      customer_name: newOrder.customerName,
      items: newOrder.items,
      total_amount: newOrder.totalAmount,
      paid_amount: newOrder.paidAmount,
      discount_amount: newOrder.discountAmount,
      is_paid: newOrder.isPaid,
      transferred_to_debt: newOrder.transferredToDebt,
      payment_method: newOrder.paymentMethod,
      worker_name: newOrder.workerName,
      note: newOrder.note,
      date: newOrder.date,
      time: newOrder.time,
      created_at: newOrder.createdAt,
    });
  } catch (err) {
    console.error('Failed to sync new order to Supabase:', err);
  }

  return newOrder;
}

export async function updateDailyOrder(id: string, updates: Partial<DailyOrder>) {
  const idx = currentDailyOrders.findIndex(o => o.id === id);
  if (idx === -1) return;

  const updated = { ...currentDailyOrders[idx], ...updates };
  if (updates.items) {
    updated.totalAmount = updated.items.reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity)), 0);
  }
  currentDailyOrders[idx] = updated;
  saveToLocalStorage();
  notify();

  try {
    await supabase.from('market_orders').update({
      customer_name: updated.customerName,
      items: updated.items,
      total_amount: updated.totalAmount,
      paid_amount: updated.paidAmount,
      discount_amount: updated.discountAmount,
      is_paid: updated.isPaid,
      transferred_to_debt: updated.transferredToDebt,
      payment_method: updated.paymentMethod,
      worker_name: updated.workerName,
      note: updated.note,
    }).eq('id', id);
  } catch (err) {
    console.error('Failed to update order in Supabase:', err);
  }
}

export async function deleteDailyOrder(id: string) {
  currentDailyOrders = currentDailyOrders.filter(o => o.id !== id);
  saveToLocalStorage();
  notify();

  try {
    await supabase.from('market_orders').delete().eq('id', id);
  } catch (err) {
    console.error('Failed to delete order from Supabase:', err);
  }
}

// تبديل حالة الدفع كامل / غير مدفوع
export async function toggleDailyOrderPaid(id: string) {
  const order = currentDailyOrders.find(o => o.id === id);
  if (!order) return;

  const total = getOrderTotal(order);
  const newIsPaid = !order.isPaid;
  const newPaidAmount = newIsPaid ? total : 0;

  await updateDailyOrder(id, {
    isPaid: newIsPaid,
    paidAmount: newPaidAmount,
    discountAmount: 0,
    paymentMethod: newIsPaid ? (order.paymentMethod || 'كاش') : undefined,
  });
}

// سداد جزء من الطلب واختيار مصير المتبقي (إما نقل للدين أو خصم مسامحة)
export async function payDailyOrderAmount(
  orderId: string, 
  payAmount: number, 
  method: PaymentMethod, 
  action: 'debt' | 'discount'
) {
  const order = currentDailyOrders.find(o => o.id === orderId);
  if (!order) return;

  const total = getOrderTotal(order);
  const remaining = Math.max(0, total - payAmount);

  if (remaining === 0) {
    // تم الدفع كاملاً
    await updateDailyOrder(orderId, {
      isPaid: true,
      paidAmount: total,
      discountAmount: 0,
      paymentMethod: method,
    });
  } else if (action === 'discount') {
    // مسامحة في الباقي
    await updateDailyOrder(orderId, {
      isPaid: true,
      paidAmount: payAmount,
      discountAmount: remaining,
      paymentMethod: method,
      note: order.note ? `${order.note} | خصم ومسامحة: ${remaining} ₪` : `خصم ومسامحة: ${remaining} ₪`,
    });
  } else if (action === 'debt') {
    // نقل المتبقي فوراً إلى دفتر الديون
    await updateDailyOrder(orderId, {
      isPaid: false,
      paidAmount: payAmount,
      discountAmount: 0,
      paymentMethod: method,
      transferredToDebt: true,
    });

    // إضافة المتبقي كدين لحساب الزبون
    await addDebtFromOrder(order, remaining);
  }
}

// نقل طلب مفرد إلى دفتر الديون يدوياً
export async function transferSingleOrderToDebt(orderId: string): Promise<boolean> {
  const order = currentDailyOrders.find(o => o.id === orderId);
  if (!order) return false;

  const remaining = getOrderRemainingAmount(order);
  if (remaining <= 0) return false;

  await addDebtFromOrder(order, remaining);
  await updateDailyOrder(orderId, { transferredToDebt: true });
  return true;
}

// =================== محرك التحويل التلقائي للديون (Daily-to-Debt Transfer) ===================

export async function transferPreviousUnpaidToDebts(): Promise<{ transferredCount: number; totalAmount: number }> {
  const today = getTodayDate();
  let transferredCount = 0;
  let totalAmount = 0;

  for (const order of currentDailyOrders) {
    if (order.date < today && !order.transferredToDebt) {
      const remaining = getOrderRemainingAmount(order);
      if (remaining > 0) {
        await addDebtFromOrder(order, remaining);
        await updateDailyOrder(order.id, { transferredToDebt: true });
        transferredCount++;
        totalAmount += remaining;
      }
    }
  }

  return { transferredCount, totalAmount };
}

// دالة مساعدة لترحيل الطلب لدفتر الديون
async function addDebtFromOrder(order: DailyOrder, amount: number) {
  const custName = order.customerName.trim();
  let customer = currentDebts.find(d => d.customerName.trim().toLowerCase() === custName.toLowerCase());
  let customerId = customer ? customer.id : generateId();

  if (!customer) {
    // إنشاء حساب زبون جديد في دفتر الديون
    const newCustomer: DebtRecord = {
      id: customerId,
      customerName: custName,
      entries: [],
      totalDebt: 0,
      totalPaid: 0,
      totalDiscount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    currentDebts = [newCustomer, ...currentDebts];
    customer = newCustomer;

    try {
      await supabase.from('market_debts').insert({
        id: newCustomer.id,
        customer_name: newCustomer.customerName,
        total_debt: 0,
        total_paid: 0,
        total_discount: 0,
        created_at: newCustomer.createdAt,
        updated_at: newCustomer.updatedAt,
      });
    } catch (err) {
      console.error('Failed to create debt customer in Supabase:', err);
    }
  }

  // صياغة تفصيل المشتريات
  const itemsText = order.items && order.items.length > 0
    ? order.items.map(i => `${i.department} (×${i.quantity})`).join(' + ')
    : 'مشتريات متنوعة';

  const newEntryId = generateId();
  const entry: DebtEntry = {
    id: newEntryId,
    debtId: customerId,
    customerName: custName,
    itemDetails: `طلب يومي (${order.date}): ${itemsText}`,
    amount: amount,
    discountAmount: 0,
    isPaymentRecord: false,
    date: order.date,
    time: order.time,
    note: `نُقلت من الدفتر اليومي${order.note ? ` | ملاحظة: ${order.note}` : ''}`,
    workerName: order.workerName,
    createdAt: Date.now(),
  };

  const updatedEntries = [entry, ...(customer.entries || [])];
  const newTotalDebt = (customer.totalDebt || 0) + amount;

  customer.entries = updatedEntries;
  customer.totalDebt = newTotalDebt;
  customer.updatedAt = Date.now();

  saveToLocalStorage();
  notify();

  // مزامنة في Supabase
  try {
    await supabase.from('market_debt_entries').insert({
      id: entry.id,
      debt_id: entry.debtId,
      customer_name: entry.customerName,
      item_details: entry.itemDetails,
      amount: entry.amount,
      discount_amount: entry.discountAmount,
      is_payment_record: entry.isPaymentRecord,
      date: entry.date,
      time: entry.time,
      note: entry.note,
      worker_name: entry.workerName,
      created_at: entry.createdAt,
    });

    await supabase.from('market_debts').update({
      total_debt: newTotalDebt,
      updated_at: customer.updatedAt,
    }).eq('id', customerId);
  } catch (err) {
    console.error('Failed to sync debt entry to Supabase:', err);
  }
}

// =================== دفتر الديون (Customer Debts) ===================

export function getDebts(): DebtRecord[] {
  return currentDebts;
}

export function getCustomerRemainingDebt(customer: DebtRecord): number {
  return Math.max(0, (customer.totalDebt || 0) - (customer.totalPaid || 0) - (customer.totalDiscount || 0));
}

export async function addDebtCustomer(customerName: string, phone?: string): Promise<DebtRecord> {
  const trimmed = customerName.trim();
  const existing = currentDebts.find(d => d.customerName.trim().toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;

  const newCust: DebtRecord = {
    id: generateId(),
    customerName: trimmed,
    phone: phone?.trim(),
    entries: [],
    totalDebt: 0,
    totalPaid: 0,
    totalDiscount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  currentDebts = [newCust, ...currentDebts];
  saveToLocalStorage();
  notify();

  try {
    await supabase.from('market_debts').insert({
      id: newCust.id,
      customer_name: newCust.customerName,
      phone: newCust.phone,
      total_debt: 0,
      total_paid: 0,
      total_discount: 0,
      created_at: newCust.createdAt,
      updated_at: newCust.updatedAt,
    });
  } catch (err) {
    console.error('Failed to create customer in Supabase:', err);
  }

  return newCust;
}

export async function addDebtEntry(customerId: string, params: {
  itemDetails: string;
  amount: number;
  date?: string;
  note?: string;
  workerName?: string;
}) {
  const customer = currentDebts.find(d => d.id === customerId);
  if (!customer) return;

  const newEntry: DebtEntry = {
    id: generateId(),
    debtId: customerId,
    customerName: customer.customerName,
    itemDetails: params.itemDetails,
    amount: Number(params.amount) || 0,
    discountAmount: 0,
    isPaymentRecord: false,
    date: params.date || getTodayDate(),
    time: getCurrentTime(),
    note: params.note || '',
    workerName: params.workerName || '',
    createdAt: Date.now(),
  };

  customer.entries = [newEntry, ...(customer.entries || [])];
  customer.totalDebt = (customer.totalDebt || 0) + newEntry.amount;
  customer.updatedAt = Date.now();

  saveToLocalStorage();
  notify();

  try {
    await supabase.from('market_debt_entries').insert({
      id: newEntry.id,
      debt_id: newEntry.debtId,
      customer_name: newEntry.customerName,
      item_details: newEntry.itemDetails,
      amount: newEntry.amount,
      discount_amount: newEntry.discountAmount,
      is_payment_record: newEntry.isPaymentRecord,
      date: newEntry.date,
      time: newEntry.time,
      note: newEntry.note,
      worker_name: newEntry.workerName,
      created_at: newEntry.createdAt,
    });

    await supabase.from('market_debts').update({
      total_debt: customer.totalDebt,
      updated_at: customer.updatedAt,
    }).eq('id', customerId);
  } catch (err) {
    console.error('Failed to add debt entry to Supabase:', err);
  }
}

// تسديد دفعة نقدية مع خيار خصم تشجيعي
export async function payPartialDebt(customerId: string, params: {
  payAmount: number;
  discountAmount?: number;
  paymentMethod: PaymentMethod;
  note?: string;
  workerName?: string;
  date?: string;
}) {
  const customer = currentDebts.find(d => d.id === customerId);
  if (!customer) return;

  const payAmount = Number(params.payAmount) || 0;
  const discount = Number(params.discountAmount) || 0;
  const noteParts = [];
  if (params.note) noteParts.push(params.note);
  if (discount > 0) noteParts.push(`مسامحة وخصم: ${discount} ₪`);

  const paymentEntry: DebtEntry = {
    id: generateId(),
    debtId: customerId,
    customerName: customer.customerName,
    itemDetails: `دفعة نقدية (${params.paymentMethod})`,
    amount: payAmount,
    discountAmount: discount,
    isPaymentRecord: true,
    paymentMethod: params.paymentMethod,
    date: params.date || getTodayDate(),
    time: getCurrentTime(),
    note: noteParts.join(' | '),
    workerName: params.workerName || '',
    createdAt: Date.now(),
  };

  customer.entries = [paymentEntry, ...(customer.entries || [])];
  customer.totalPaid = (customer.totalPaid || 0) + payAmount;
  customer.totalDiscount = (customer.totalDiscount || 0) + discount;
  customer.updatedAt = Date.now();

  saveToLocalStorage();
  notify();

  try {
    await supabase.from('market_debt_entries').insert({
      id: paymentEntry.id,
      debt_id: paymentEntry.debtId,
      customer_name: paymentEntry.customerName,
      item_details: paymentEntry.itemDetails,
      amount: paymentEntry.amount,
      discount_amount: paymentEntry.discountAmount,
      is_payment_record: paymentEntry.isPaymentRecord,
      payment_method: paymentEntry.paymentMethod,
      date: paymentEntry.date,
      time: paymentEntry.time,
      note: paymentEntry.note,
      worker_name: paymentEntry.workerName,
      created_at: paymentEntry.createdAt,
    });

    await supabase.from('market_debts').update({
      total_paid: customer.totalPaid,
      total_discount: customer.totalDiscount,
      updated_at: customer.updatedAt,
    }).eq('id', customerId);
  } catch (err) {
    console.error('Failed to sync debt payment to Supabase:', err);
  }
}

export async function deleteDebtCustomer(customerId: string) {
  currentDebts = currentDebts.filter(d => d.id !== customerId);
  saveToLocalStorage();
  notify();

  try {
    await supabase.from('market_debt_entries').delete().eq('debt_id', customerId);
    await supabase.from('market_debts').delete().eq('id', customerId);
  } catch (err) {
    console.error('Failed to delete debt customer from Supabase:', err);
  }
}

export async function deleteDebtEntry(customerId: string, entryId: string) {
  const customer = currentDebts.find(d => d.id === customerId);
  if (!customer) return;

  const entry = customer.entries.find(e => e.id === entryId);
  if (!entry) return;

  if (entry.isPaymentRecord) {
    customer.totalPaid = Math.max(0, (customer.totalPaid || 0) - entry.amount);
    customer.totalDiscount = Math.max(0, (customer.totalDiscount || 0) - (entry.discountAmount || 0));
  } else {
    customer.totalDebt = Math.max(0, (customer.totalDebt || 0) - entry.amount);
  }

  customer.entries = customer.entries.filter(e => e.id !== entryId);
  customer.updatedAt = Date.now();

  saveToLocalStorage();
  notify();

  try {
    await supabase.from('market_debt_entries').delete().eq('id', entryId);
    await supabase.from('market_debts').update({
      total_debt: customer.totalDebt,
      total_paid: customer.totalPaid,
      total_discount: customer.totalDiscount,
      updated_at: customer.updatedAt,
    }).eq('id', customerId);
  } catch (err) {
    console.error('Failed to delete debt entry from Supabase:', err);
  }
}

// توليد كشف حساب واتساب جاهز للإرسال
export function generateWhatsAppDebtStatement(customer: DebtRecord): string {
  const remaining = getCustomerRemainingDebt(customer);
  const dateStr = new Date().toLocaleDateString('ar-EG', { dateStyle: 'full' });

  let text = `🛒 *سوبر ماركت مقداد* 🛒\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📋 *كشف حساب العميل:* ${customer.customerName}\n`;
  text += `📅 *التاريخ:* ${dateStr}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  text += `💰 *إجمالي المشتريات:* ${formatCurrency(customer.totalDebt)}\n`;
  text += `✅ *إجمالي المسدد:* ${formatCurrency(customer.totalPaid)}\n`;
  if (customer.totalDiscount > 0) {
    text += `🎁 *خصم ومسامحة:* ${formatCurrency(customer.totalDiscount)}\n`;
  }
  text += `🔴 *المبلغ المتبقي المطلوب:* *${formatCurrency(remaining)}*\n\n`;

  text += `📝 *آخر الحركات المسجلة:*\n`;
  const recentEntries = (customer.entries || []).slice(0, 5);
  recentEntries.forEach(e => {
    if (e.isPaymentRecord) {
      text += `• ✅ سداد: ${e.amount} ₪ (${e.date}) ${e.note ? `- ${e.note}` : ''}\n`;
    } else {
      text += `• 🛒 شراء: ${e.itemDetails} = ${e.amount} ₪ (${e.date})\n`;
    }
  });

  text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  text += `شاكرين لكم حسن تعاملكم معنا ونرحب بكم دائماً في سوبر ماركت مقداد 🌹`;

  return encodeURIComponent(text);
}

// =================== المصاريف (Expenses) ===================

export function getExpensesByDate(date: string): Expense[] {
  return currentExpenses.filter(e => e.date === date);
}

export function getAllExpenses(): Expense[] {
  return currentExpenses;
}

export async function addExpense(params: {
  title: string;
  amount: number;
  category: Expense['category'];
  workerName: string;
  notes?: string;
  date?: string;
}) {
  const newExp: Expense = {
    id: generateId(),
    title: params.title.trim(),
    amount: Number(params.amount) || 0,
    category: params.category,
    date: params.date || getTodayDate(),
    time: getCurrentTime(),
    workerName: params.workerName,
    notes: params.notes?.trim() || '',
    createdAt: Date.now(),
  };

  currentExpenses = [newExp, ...currentExpenses];
  saveToLocalStorage();
  notify();

  try {
    await supabase.from('market_expenses').insert({
      id: newExp.id,
      title: newExp.title,
      amount: newExp.amount,
      category: newExp.category,
      date: newExp.date,
      time: newExp.time,
      worker_name: newExp.workerName,
      notes: newExp.notes,
      created_at: newExp.createdAt,
    });
  } catch (err) {
    console.error('Failed to sync expense to Supabase:', err);
  }
}

export async function deleteExpense(id: string) {
  currentExpenses = currentExpenses.filter(e => e.id !== id);
  saveToLocalStorage();
  notify();

  try {
    await supabase.from('market_expenses').delete().eq('id', id);
  } catch (err) {
    console.error('Failed to delete expense from Supabase:', err);
  }
}

// =================== الإيرادات اليدوية (Manual Incomes) ===================

export function getIncomesByDate(date: string): ManualIncome[] {
  return currentManualIncomes.filter(i => i.date === date);
}

export function getAllManualIncomes(): ManualIncome[] {
  return currentManualIncomes;
}

export async function addManualIncome(params: {
  title: string;
  amount: number;
  paymentMethod: PaymentMethod;
  workerName: string;
  notes?: string;
  date?: string;
}) {
  const newInc: ManualIncome = {
    id: generateId(),
    title: params.title.trim(),
    amount: Number(params.amount) || 0,
    paymentMethod: params.paymentMethod,
    date: params.date || getTodayDate(),
    time: getCurrentTime(),
    workerName: params.workerName,
    notes: params.notes?.trim() || '',
    createdAt: Date.now(),
  };

  currentManualIncomes = [newInc, ...currentManualIncomes];
  saveToLocalStorage();
  notify();

  try {
    await supabase.from('market_incomes').insert({
      id: newInc.id,
      title: newInc.title,
      amount: newInc.amount,
      payment_method: newInc.paymentMethod,
      date: newInc.date,
      time: newInc.time,
      worker_name: newInc.workerName,
      notes: newInc.notes,
      created_at: newInc.createdAt,
    });
  } catch (err) {
    console.error('Failed to sync income to Supabase:', err);
  }
}

export async function deleteManualIncome(id: string) {
  currentManualIncomes = currentManualIncomes.filter(i => i.id !== id);
  saveToLocalStorage();
  notify();

  try {
    await supabase.from('market_incomes').delete().eq('id', id);
  } catch (err) {
    console.error('Failed to delete income from Supabase:', err);
  }
}

// =================== إدارة الصندوق والنقدية لحظة بلحظة ===================

export function getCashDrawerSummary(date: string = getTodayDate()) {
  // 1. مبيعات كاش مستلمة اليوم
  const dayOrders = getDailyOrdersByDate(date);
  const cashSales = dayOrders
    .filter(o => o.paymentMethod === 'كاش')
    .reduce((sum, o) => sum + (o.paidAmount || 0), 0);

  // مبيعات بنك / محفظة / جوال بي
  const bankSales = dayOrders
    .filter(o => o.paymentMethod !== 'كاش' && o.paidAmount > 0)
    .reduce((sum, o) => sum + (o.paidAmount || 0), 0);

  // 2. سداد ديون تم اليوم نقدياً
  const allDebtEntries = currentDebts.flatMap(d => d.entries || []);
  const todayDebtCashPayments = allDebtEntries
    .filter(e => e.date === date && e.isPaymentRecord && e.paymentMethod === 'كاش')
    .reduce((sum, e) => sum + e.amount, 0);

  const todayDebtBankPayments = allDebtEntries
    .filter(e => e.date === date && e.isPaymentRecord && e.paymentMethod !== 'كاش')
    .reduce((sum, e) => sum + e.amount, 0);

  // 3. إيرادات يدوية كاش
  const todayIncomes = getIncomesByDate(date);
  const cashIncomes = todayIncomes
    .filter(i => i.paymentMethod === 'كاش')
    .reduce((sum, i) => sum + i.amount, 0);

  // 4. مصاريف كاش تم دفعها من الدرج اليوم
  const todayExp = getExpensesByDate(date);
  const cashExpenses = todayExp.reduce((sum, e) => sum + e.amount, 0);

  // النقدية الفعلية المتوقعة في الدرج (الكاش الصافي في اليد)
  const netCashInDrawer = (cashSales + todayDebtCashPayments + cashIncomes) - cashExpenses;

  // إجمالي الإيرادات الكلية لليوم بجميع الطرق
  const totalDayRevenue = cashSales + bankSales + todayDebtCashPayments + todayDebtBankPayments + cashIncomes;

  return {
    cashSales,
    bankSales,
    todayDebtCashPayments,
    todayDebtBankPayments,
    cashIncomes,
    cashExpenses,
    netCashInDrawer,
    totalDayRevenue,
  };
}

// =================== حساب الأرباح والمبيعات للسوبر ماركت ===================

export function getProfitSummary(startDateMs: number, endDateMs: number) {
  // تصفية الطلبات في النطاق الزمني
  const orders = currentDailyOrders.filter(o => o.createdAt >= startDateMs && o.createdAt <= endDateMs);
  const expenses = currentExpenses.filter(e => e.createdAt >= startDateMs && e.createdAt <= endDateMs);

  let totalSales = 0;
  let estimatedCost = 0;

  // خريطة هوامش ربح الأقسام الافتراضية
  const deptMarginMap: Record<string, number> = {};
  currentDepartments.forEach(d => {
    deptMarginMap[d.name] = (d.profitRate || 18) / 100;
  });

  orders.forEach(o => {
    (o.items || []).forEach(item => {
      const lineTotal = Number(item.price) * Number(item.quantity);
      totalSales += lineTotal;
      const margin = deptMarginMap[item.department] ?? 0.18; // افتراضي 18% إن لم يحدد
      const itemCost = lineTotal * (1 - margin);
      estimatedCost += itemCost;
    });
  });

  const grossProfit = totalSales - estimatedCost; // الربح الإجمالي
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalExpenses; // صافي الربح بعد المصاريف
  const profitMarginPercent = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

  return {
    totalSales,
    estimatedCost,
    grossProfit,
    totalExpenses,
    netProfit,
    profitMarginPercent,
  };
}

// =================== أقسام السوبر ماركت (Departments) ===================

export function getDepartments(): Department[] {
  return currentDepartments;
}

export async function addDepartment(name: string, profitRate: number = 18, color: string = '#3b82f6') {
  const newDept: Department = {
    id: 'dept_' + generateId(),
    name: name.trim(),
    color,
    profitRate,
    sortOrder: currentDepartments.length + 1,
  };
  currentDepartments = [...currentDepartments, newDept];
  saveToLocalStorage();
  notify();

  try {
    await supabase.from('market_departments').insert({
      id: newDept.id,
      name: newDept.name,
      color: newDept.color,
      profit_rate: newDept.profitRate,
      sort_order: newDept.sortOrder,
    });
  } catch (err) {
    console.error('Failed to add department to Supabase:', err);
  }
}

// =================== إعدادات الواجهة والنسخ الاحتياطي ===================

export function getUISettings(): UISettings {
  return currentUISettings;
}

export function updateUISettings(newSettings: Partial<UISettings>) {
  currentUISettings = { ...currentUISettings, ...newSettings };
  saveToLocalStorage();
  notify();
}

export function getSyncStatus(): SyncStatus {
  return syncStatus;
}

// تصدير نسخة احتياطية كاملة JSON
export function exportBackupJSON(): string {
  const backup = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    dailyOrders: currentDailyOrders,
    debts: currentDebts,
    expenses: currentExpenses,
    manualIncomes: currentManualIncomes,
    departments: currentDepartments,
  };
  return JSON.stringify(backup, null, 2);
}

// استيراد نسخة احتياطية JSON
export async function importBackupJSON(jsonStr: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonStr);
    if (data.dailyOrders) currentDailyOrders = data.dailyOrders;
    if (data.debts) currentDebts = data.debts;
    if (data.expenses) currentExpenses = data.expenses;
    if (data.manualIncomes) currentManualIncomes = data.manualIncomes;
    if (data.departments) currentDepartments = data.departments;

    saveToLocalStorage();
    notify();

    // مزامنة فورية لكل ما تم استيراده مع Supabase
    if (Array.isArray(data.dailyOrders)) {
      for (const o of data.dailyOrders) {
        await supabase.from('market_orders').upsert({
          id: o.id,
          customer_name: o.customerName,
          items: o.items,
          total_amount: o.totalAmount,
          paid_amount: o.paidAmount,
          discount_amount: o.discountAmount,
          is_paid: o.isPaid,
          transferred_to_debt: o.transferredToDebt,
          payment_method: o.paymentMethod,
          worker_name: o.workerName,
          note: o.note,
          date: o.date,
          time: o.time,
          created_at: o.createdAt,
        });
      }
    }

    return true;
  } catch (err) {
    console.error('Import error:', err);
    return false;
  }
}
