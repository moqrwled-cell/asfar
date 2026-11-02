import React, { useState, useEffect } from 'react';
import { 
  DailyOrder, 
  OrderItem, 
  PaymentMethod, 
  Department 
} from '../types';
import { 
  getDailyOrdersByDate, 
  addDailyOrder, 
  deleteDailyOrder, 
  toggleDailyOrderPaid, 
  payDailyOrderAmount, 
  transferSingleOrderToDebt,
  transferPreviousUnpaidToDebts,
  getOrderTotal, 
  getOrderRemainingAmount, 
  getTodayDate, 
  formatCurrency, 
  subscribeToStore, 
  getDepartments,
  getDebts 
} from '../store';
import AutoSuggestInput from './AutoSuggestInput';
import { 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ArrowLeft, 
  Search, 
  Calendar, 
  CreditCard, 
  User, 
  FileText, 
  AlertTriangle,
  Send,
  Sparkles,
  ShoppingBag,
  Coins
} from 'lucide-react';

interface Props {
  onBack: () => void;
  workerName: string;
}

export default function DailyBook({ onBack, workerName }: Props) {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [orders, setOrders] = useState<DailyOrder[]>([]);
  const [departments, setDepartments] = useState<Department[]>(getDepartments());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPaid, setFilterPaid] = useState<'all' | 'paid' | 'unpaid'>('all');

  // نموذج إضافة طلب جديد
  const [showAddModal, setShowAddModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    { department: 'ألبان وأجبان', price: 0, quantity: 1 }
  ]);
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('نقدي');
  const [isPaidQuick, setIsPaidQuick] = useState(true);

  // نافذة السداد الجزئي (إما نقل للدين أو خصم مسامحة فقط)
  const [partialModalOrder, setPartialModalOrder] = useState<DailyOrder | null>(null);
  const [partialPayAmount, setPartialPayAmount] = useState<number>(0);
  const [partialAction, setPartialAction] = useState<'debt' | 'discount'>('debt');
  const [partialMethod, setPartialMethod] = useState<PaymentMethod>('نقدي');

  // رسالة إشعار الترحيل التلقائي
  const [autoTransferInfo, setAutoTransferInfo] = useState<{ count: number; total: number } | null>(null);

  useEffect(() => {
    // تشغيل فحص النقل التلقائي للطلبات السابقة غير المدفوعة
    transferPreviousUnpaidToDebts().then(info => {
      if (info.transferredCount > 0) {
        setAutoTransferInfo({ count: info.transferredCount, total: info.totalAmount });
      }
    });

    loadData();
    const unsubscribe = subscribeToStore(() => {
      loadData();
    });
    return unsubscribe;
  }, [selectedDate]);

  const loadData = () => {
    setOrders(getDailyOrdersByDate(selectedDate));
    setDepartments(getDepartments());
  };

  // قائمة أسماء الزبائن للاقتراح التلقائي
  const debtorNames = getDebts().map(d => d.customerName);
  const todayCustomerNames = orders.map(o => o.customerName);
  const allSuggestedNames = Array.from(new Set([...debtorNames, ...todayCustomerNames]));

  // حساب إجمالي أصناف الطلب الجديد في النموذج
  const newOrderCalculatedTotal = orderItems.reduce(
    (sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 
    0
  );

  // إضافة صنف جديد في الفاتورة
  const handleAddItemRow = (deptName?: string) => {
    const chosenDept = deptName || departments[0]?.name || 'متفرقات / عام';
    setOrderItems(prev => [...prev, { department: chosenDept, price: 0, quantity: 1 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (orderItems.length > 1) {
      setOrderItems(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const handleUpdateItemRow = (idx: number, field: keyof OrderItem, val: any) => {
    setOrderItems(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleStepper = (idx: number, delta: number) => {
    setOrderItems(prev => {
      const copy = [...prev];
      const curQty = Number(copy[idx].quantity) || 1;
      const newQty = Math.max(1, curQty + delta);
      copy[idx] = { ...copy[idx], quantity: newQty };
      return copy;
    });
  };

  const handleResetForm = () => {
    setCustomerName('');
    setOrderItems([{ department: departments[0]?.name || 'ألبان وأجبان', price: 0, quantity: 1 }]);
    setNote('');
    setPaymentMethod('نقدي');
    setIsPaidQuick(true);
    setShowAddModal(false);
  };

  const handleSaveOrder = async () => {
    // تصفية الأصناف التي لها سعر أكبر من 0
    const validItems = orderItems.filter(i => Number(i.price) > 0 && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      alert('يرجى إدخال سعر واحد على الأقل للأصناف');
      return;
    }

    const cName = customerName.trim() || (isPaidQuick ? 'زبون عام' : 'زبون بدون اسم');

    await addDailyOrder({
      customerName: cName,
      items: validItems,
      workerName,
      date: selectedDate,
      note: note.trim(),
      paymentMethod,
      isPaid: isPaidQuick,
    });

    handleResetForm();
    loadData();
  };

  // معالجة السداد الجزئي
  const handleSavePartialPayment = async () => {
    if (!partialModalOrder) return;
    await payDailyOrderAmount(
      partialModalOrder.id,
      partialPayAmount,
      partialMethod,
      partialAction
    );
    setPartialModalOrder(null);
    loadData();
  };

  // نقل فردي فوري للديون
  const handleTransferToDebt = async (orderId: string) => {
    if (confirm('هل تريد ترحيل هذا الطلب إلى دفتر الديون لحساب هذا الزبون؟')) {
      const success = await transferSingleOrderToDebt(orderId);
      if (success) {
        loadData();
      }
    }
  };

  // تصفية الطلبات المعروضة
  const filteredOrders = orders.filter(o => {
    const matchSearch = o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.note && o.note.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchSearch) return false;
    if (filterPaid === 'paid') return o.isPaid;
    if (filterPaid === 'unpaid') return !o.isPaid;
    return true;
  });

  // إحصائيات اليوم الحالي
  const dayTotalSales = orders.reduce((sum, o) => sum + getOrderTotal(o), 0);
  const dayPaidTotal = orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
  const dayUnpaidTotal = orders.reduce((sum, o) => sum + getOrderRemainingAmount(o), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28 pt-4 px-3 sm:px-6 max-w-4xl mx-auto">
      {/* شريط الإشعار بالترحيل التلقائي للديون */}
      {autoTransferInfo && (
        <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-transparent border border-amber-500/30 flex items-center justify-between text-amber-300 text-xs sm:text-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              نظام الترحيل الذكي: تم نقل <strong>{autoTransferInfo.count}</strong> طلبات سابقة غير مدفوعة لدفتر الديون بقيمة <strong>{formatCurrency(autoTransferInfo.total)}</strong>
            </span>
          </div>
          <button 
            onClick={() => setAutoTransferInfo(null)}
            className="text-amber-400 hover:text-white px-2 py-1 rounded-lg text-xs"
          >
            إغلاق ✕
          </button>
        </div>
      )}

      {/* الرأس: زر الرجوع وعنوان الصفحة وتاريخ اليوم */}
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 px-3 py-2 rounded-2xl border border-slate-800 active-press"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>الرئيسية</span>
        </button>

        <div className="text-center">
          <h1 className="text-lg sm:text-xl font-bold text-white flex items-center justify-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <span>الدفتر اليومي والمبيعات</span>
          </h1>
          <span className="text-[11px] text-slate-400">سوبر ماركت مقداد • الوردية: {workerName}</span>
        </div>

        {/* منتقي التاريخ */}
        <div className="relative">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="text-xs bg-slate-900/90 text-emerald-400 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
          />
        </div>
      </div>

      {/* بطاقات الإحصائيات السريعة لأعلى اليومية */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
        <div className="glass-panel rounded-2xl p-3 text-center border-emerald-500/20">
          <span className="text-[10px] sm:text-xs text-slate-400 block mb-0.5">مبيعات اليوم</span>
          <span className="text-sm sm:text-lg font-bold text-emerald-400">{formatCurrency(dayTotalSales)}</span>
        </div>
        <div className="glass-panel rounded-2xl p-3 text-center border-blue-500/20">
          <span className="text-[10px] sm:text-xs text-slate-400 block mb-0.5">الكاش والمدفوع</span>
          <span className="text-sm sm:text-lg font-bold text-blue-400">{formatCurrency(dayPaidTotal)}</span>
        </div>
        <div className="glass-panel rounded-2xl p-3 text-center border-rose-500/20">
          <span className="text-[10px] sm:text-xs text-slate-400 block mb-0.5">ديون متبقية</span>
          <span className="text-sm sm:text-lg font-bold text-rose-400">{formatCurrency(dayUnpaidTotal)}</span>
        </div>
      </div>

      {/* شريط الإجراءات: إضافة طلب جديد، والبحث والفلترة */}
      <div className="space-y-3 mb-5">
        {/* زر الإضافة الكبير البارز */}
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-base shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 active-press"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>تسجيل طلب / بيع جديد (+)</span>
        </button>

        {/* البحث والتصفية */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الزبون أو الصنف..."
              className="w-full bg-slate-900/90 text-sm text-slate-200 pr-9 pl-3 py-2.5 rounded-2xl border border-slate-800 outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex bg-slate-900/80 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setFilterPaid('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterPaid === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              الكل ({orders.length})
            </button>
            <button
              onClick={() => setFilterPaid('paid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterPaid === 'paid' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              مدفوع
            </button>
            <button
              onClick={() => setFilterPaid('unpaid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterPaid === 'unpaid' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ديون
            </button>
          </div>
        </div>
      </div>

      {/* قائمة الطلبات المسجلة لليوم */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="glass-panel rounded-3xl p-8 text-center text-slate-400">
            <ShoppingBag className="w-12 h-12 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold">لا توجد طلبات مسجلة لهذا التاريخ</p>
            <p className="text-xs text-slate-500 mt-1">اضغط على "تسجيل طلب / بيع جديد" لإضافة أول طلب</p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const total = getOrderTotal(order);
            const remaining = getOrderRemainingAmount(order);
            const isFullyPaid = order.isPaid && remaining === 0;

            return (
              <div
                key={order.id}
                className={`glass-panel rounded-3xl p-4 transition-all border ${
                  isFullyPaid
                    ? 'border-emerald-500/25 bg-slate-900/60'
                    : order.transferredToDebt
                    ? 'border-purple-500/30 bg-purple-950/10'
                    : 'border-rose-500/30 bg-rose-950/10'
                }`}
              >
                {/* صف العنوان والحالة */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">{order.customerName}</span>
                      {order.transferredToDebt && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          نُقل لدفتر الديون 📒
                        </span>
                      )}
                      {order.discountAmount ? order.discountAmount > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          خصم {order.discountAmount} ₪
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{order.time}</span>
                      <span>•</span>
                      <span>بواسطة: {order.workerName}</span>
                      <span>•</span>
                      <span className="text-slate-300 font-medium">الدفع: {order.paymentMethod || 'نقدي'}</span>
                    </div>
                  </div>

                  {/* المبلغ الإجمالي للطلب */}
                  <div className="text-left">
                    <span className="text-lg font-black text-white">{formatCurrency(total)}</span>
                    {!isFullyPaid && remaining > 0 && (
                      <span className="block text-[11px] font-bold text-rose-400">
                        متبقي: {formatCurrency(remaining)}
                      </span>
                    )}
                  </div>
                </div>

                {/* تفاصيل الأصناف المشتراة (أقسام السوبر ماركت والأسعار) */}
                <div className="bg-slate-950/60 rounded-2xl p-2.5 mb-3 border border-slate-800/80">
                  <div className="flex flex-wrap gap-1.5">
                    {(order.items || []).map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 text-xs bg-slate-800/90 text-slate-200 px-2.5 py-1 rounded-xl border border-slate-700/50"
                      >
                        <span className="font-semibold text-emerald-400">{item.department}</span>
                        <span className="text-slate-400 text-[11px]">(×{item.quantity})</span>
                        <span className="text-white font-bold">{formatCurrency(item.price * item.quantity)}</span>
                        {item.note && <span className="text-[10px] text-slate-400">• {item.note}</span>}
                      </span>
                    ))}
                  </div>

                  {order.note && (
                    <div className="mt-2 pt-1.5 border-t border-slate-800/60 text-xs text-amber-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>ملاحظة: {order.note}</span>
                    </div>
                  )}
                </div>

                {/* أزرار الإجراءات السريعة في الأسفل */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/50">
                  <div className="flex items-center gap-1.5">
                    {/* زر التبديل بين مدفوع كامل / غير مدفوع */}
                    <button
                      type="button"
                      onClick={() => toggleDailyOrderPaid(order.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active-press ${
                        isFullyPaid
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${isFullyPaid ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span>{isFullyPaid ? 'مدفوع بالكامل' : 'تسجيل كمدفوع'}</span>
                    </button>

                    {/* زر السداد الجزئي (إذا لم يكن مدفوعاً كاملاً) */}
                    {!isFullyPaid && (
                      <button
                        type="button"
                        onClick={() => {
                          setPartialModalOrder(order);
                          setPartialPayAmount(order.paidAmount || 0);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-all active-press"
                      >
                        سداد جزئي...
                      </button>
                    )}

                    {/* زر الترحيل للديون (إذا كان غير مدفوع ولم يُنقل بعد) */}
                    {!isFullyPaid && !order.transferredToDebt && (
                      <button
                        type="button"
                        onClick={() => handleTransferToDebt(order.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition-all active-press flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>نقل للديون 📒</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('حذف هذا الطلب نهائياً؟')) {
                        deleteDailyOrder(order.id);
                      }
                    }}
                    className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    title="حذف الطلب"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* نافذة منبثقة (Modal) لإضافة طلب جديد بنظام الأقسام والأسعار السريعة */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">تسجيل طلب / بيع جديد</h3>
              </div>
              <button
                type="button"
                onClick={handleResetForm}
                className="text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* اسم الزبون مع الإكمال التلقائي */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                اسم الزبون
              </label>
              <AutoSuggestInput
                value={customerName}
                onChange={setCustomerName}
                suggestions={allSuggestedNames}
                placeholder="اسم الزبون (مثال: محمد، أبو أحمد...)"
                className="w-full bg-slate-950 text-white px-3.5 py-2.5 rounded-2xl border border-slate-700/80 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            {/* شريط الأقسام السريعة للاختيار المباشر */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                أضف قسماً للفاتورة:
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-950/50 rounded-2xl border border-slate-800/80">
                {departments.map(dept => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => handleAddItemRow(dept.name)}
                    className="text-xs bg-slate-800 hover:bg-emerald-500 hover:text-white text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700/60 transition-all active-press"
                  >
                    + {dept.name}
                  </button>
                ))}
              </div>
            </div>

            {/* قائمة الأصناف في هذا الطلب */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                أصناف الطلب والأسعار:
              </label>

              {orderItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 rounded-2xl p-2.5 border border-slate-800 flex items-center gap-2"
                >
                  {/* اختيار القسم */}
                  <select
                    value={item.department}
                    onChange={e => handleUpdateItemRow(idx, 'department', e.target.value)}
                    className="bg-slate-900 text-xs font-semibold text-emerald-400 py-2 px-2 rounded-xl border border-slate-700/60 outline-none w-36"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>

                  {/* حقل السعر */}
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.price === 0 ? '' : item.price}
                      onChange={e => handleUpdateItemRow(idx, 'price', parseFloat(e.target.value) || 0)}
                      placeholder="السعر ₪"
                      className="w-full bg-slate-900 text-white font-bold text-sm px-2.5 py-1.5 rounded-xl border border-slate-700/60 outline-none text-center focus:border-emerald-500"
                    />
                    <span className="absolute left-2 top-2 text-[11px] text-slate-500">₪</span>
                  </div>

                  {/* عداد الكمية التفاعلي (+ / -) */}
                  <div className="flex items-center bg-slate-900 rounded-xl border border-slate-700/60 p-0.5">
                    <button
                      type="button"
                      onClick={() => handleStepper(idx, -1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-300 active-press"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center font-bold text-xs text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStepper(idx, 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-300 active-press"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* حذف السطر */}
                  {orderItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* الملاحظة وطريقة الدفع */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  ملاحظة على الطلب
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="مثال: ابنه الصغير الي استلم، أو تفصيل"
                  className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl border border-slate-700/80 text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  طريقة الدفع
                </label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-slate-950 text-white font-semibold px-3 py-2 rounded-xl border border-slate-700/80 text-xs outline-none"
                >
                  <option value="نقدي">نقدي</option>
                  <option value="بنك فلسطين">بنك فلسطين</option>
                  <option value="بال باي">بال باي</option>
                  <option value="جوال بي">جوال بي</option>
                </select>
              </div>
            </div>

            {/* خيار حالة الدفع */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsPaidQuick(true)}
                className={`flex-1 py-2.5 rounded-2xl text-xs font-bold border transition-all ${
                  isPaidQuick
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                ✓ تم الدفع
              </button>
              <button
                type="button"
                onClick={() => setIsPaidQuick(false)}
                className={`flex-1 py-2.5 rounded-2xl text-xs font-bold border transition-all ${
                  !isPaidQuick
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-lg shadow-rose-500/20'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                ✕ دين على الحساب (غير مدفوع)
              </button>
            </div>

            {/* إجمالي الفاتورة وزر الحفظ النهائي */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">الإجمالي المطلوب:</span>
                <span className="text-2xl font-black text-emerald-400">
                  {formatCurrency(newOrderCalculatedTotal)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSaveOrder}
                className="py-3 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/25 active-press"
              >
                تأكيد وحفظ الطلب ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة السداد الجزئي (بناءً على طلب المستخدم: إما نقل للدين أو خصم مسامحة فقط) */}
      {partialModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                سداد جزئي لطلب: {partialModalOrder.customerName}
              </h3>
              <button
                type="button"
                onClick={() => setPartialModalOrder(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 rounded-2xl p-3 text-center border border-slate-800">
              <span className="text-xs text-slate-400 block">إجمالي قيمة الطلب الأصلية</span>
              <span className="text-xl font-black text-white">
                {formatCurrency(getOrderTotal(partialModalOrder))}
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                المبلغ المدفوع الآن نقدياً ₪:
              </label>
              <input
                type="number"
                step="any"
                min="0"
                max={getOrderTotal(partialModalOrder)}
                value={partialPayAmount}
                onChange={e => setPartialPayAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 text-emerald-400 font-black text-xl text-center py-2.5 rounded-2xl border border-slate-700 outline-none focus:border-emerald-500"
              />
            </div>

            {/* طريقة الدفع للمبلغ المدفوع */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">طريقة الدفع:</label>
              <select
                value={partialMethod}
                onChange={e => setPartialMethod(e.target.value as PaymentMethod)}
                className="w-full bg-slate-950 text-white font-semibold px-3 py-2 rounded-xl border border-slate-700 text-xs"
              >
                <option value="نقدي">نقدي</option>
                <option value="بنك فلسطين">بنك فلسطين</option>
                <option value="بال باي">بال باي</option>
                <option value="جوال بي">جوال بي</option>
              </select>
            </div>

            {/* تحديد مصير المبلغ المتبقي (نقل للدين أو خصم مسامحة فقط حسب طلب المستخدم) */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                مصير المبلغ المتبقي ({formatCurrency(Math.max(0, getOrderTotal(partialModalOrder) - partialPayAmount))}):
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPartialAction('debt')}
                  className={`py-3 px-2 rounded-2xl text-xs font-bold border transition-all text-center ${
                    partialAction === 'debt'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/80 shadow-lg shadow-purple-500/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <span className="block text-sm mb-1">📒</span>
                  نقل المتبقي لدفتر الديون
                </button>

                <button
                  type="button"
                  onClick={() => setPartialAction('discount')}
                  className={`py-3 px-2 rounded-2xl text-xs font-bold border transition-all text-center ${
                    partialAction === 'discount'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/80 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <span className="block text-sm mb-1">🎁</span>
                  خصم ومسامحة في الباقي
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPartialModalOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSavePartialPayment}
                className="py-2.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/30 active-press"
              >
                حفظ العملية ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
