import React, { useState, useEffect } from 'react';
import { 
  DebtRecord, 
  DebtEntry, 
  PaymentMethod, 
  TransferRecipient 
} from '../types';
import { 
  getDebts, 
  addDebtCustomer, 
  addDebtEntry, 
  payPartialDebt, 
  deleteDebtCustomer, 
  deleteDebtEntry, 
  getCustomerRemainingDebt, 
  generateWhatsAppDebtStatement, 
  formatCurrency, 
  subscribeToStore 
} from '../store';
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  UserPlus, 
  Phone, 
  Calendar, 
  Clock, 
  Trash2, 
  CheckCircle2, 
  FileText, 
  Send, 
  Share2, 
  CreditCard,
  TrendingDown,
  User,
  AlertCircle
} from 'lucide-react';

interface Props {
  onBack: () => void;
  workerName: string;
}

export default function DebtBook({ onBack, workerName }: Props) {
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'debt-desc' | 'debt-asc' | 'name-asc' | 'recent'>('debt-desc');
  const [selectedCustomer, setSelectedCustomer] = useState<DebtRecord | null>(null);

  // نوافذ منبثقة
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const [showAddDebtModal, setShowAddDebtModal] = useState(false);
  const [debtItemDetails, setDebtItemDetails] = useState('');
  const [debtAmount, setDebtAmount] = useState<number>(0);
  const [debtNote, setDebtNote] = useState('');

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('نقدي');
  const [transferredToPerson, setTransferredToPerson] = useState<TransferRecipient>('عبدالله');
  const [paymentNote, setPaymentNote] = useState('');

  useEffect(() => {
    loadDebts();
    const unsubscribe = subscribeToStore(() => {
      loadDebts();
    });
    return unsubscribe;
  }, []);

  const loadDebts = () => {
    setDebts(getDebts());
    if (selectedCustomer) {
      const refreshed = getDebts().find(d => d.id === selectedCustomer.id);
      if (refreshed) setSelectedCustomer(refreshed);
    }
  };

  const handleSelectCustomer = (customer: DebtRecord) => {
    setSelectedCustomer(customer);
  };

  // إضافة زبون جديد
  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) {
      alert('يرجى كتابة اسم الزبون');
      return;
    }
    const created = await addDebtCustomer(newCustomerName, newCustomerPhone || undefined);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setShowAddCustomerModal(false);
    setSelectedCustomer(created);
  };

  // تسجيل دين جديد للزبون المختار
  const handleSaveDebtEntry = async () => {
    if (!selectedCustomer || debtAmount <= 0) {
      alert('يرجى تحديد المبلغ بشكل صحيح');
      return;
    }
    await addDebtEntry(selectedCustomer.id, {
      itemDetails: debtItemDetails.trim() || 'مشتريات سوبر ماركت عامة',
      amount: debtAmount,
      note: debtNote.trim(),
      workerName,
    });
    setDebtItemDetails('');
    setDebtAmount(0);
    setDebtNote('');
    setShowAddDebtModal(false);
  };

  // سداد دفعة نقدية مع خيار الخصم والمسامحة
  const handleSavePayment = async () => {
    if (!selectedCustomer || (payAmount <= 0 && discountAmount <= 0)) {
      alert('يرجى إدخال مبلغ الدفعة أو الخصم');
      return;
    }
    await payPartialDebt(selectedCustomer.id, {
      payAmount,
      discountAmount,
      paymentMethod,
      transferredToPerson,
      note: paymentNote.trim(),
      workerName,
    });
    setPayAmount(0);
    setDiscountAmount(0);
    setPaymentNote('');
    setShowPaymentModal(false);
  };

  // إرسال كشف الحساب عبر الواتساب
  const handleShareWhatsApp = (customer: DebtRecord) => {
    const encodedText = generateWhatsAppDebtStatement(customer);
    const phone = customer.phone?.replace(/[^0-9]/g, '') || '';
    const url = phone ? `https://wa.me/${phone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
    window.open(url, '_blank');
  };

  // ترتيب وتصفية الزبائن
  const filteredCustomers = debts.filter(d => {
    const nameMatch = d.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const phoneMatch = d.phone && d.phone.includes(searchQuery);
    return nameMatch || phoneMatch;
  }).sort((a, b) => {
    const remA = getCustomerRemainingDebt(a);
    const remB = getCustomerRemainingDebt(b);
    if (sortBy === 'debt-desc') return remB - remA;
    if (sortBy === 'debt-asc') return remA - remB;
    if (sortBy === 'recent') return b.updatedAt - a.updatedAt;
    if (sortBy === 'name-asc') return a.customerName.localeCompare(b.customerName, 'ar');
    return 0;
  });

  const totalAllDebts = debts.reduce((sum, d) => sum + getCustomerRemainingDebt(d), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28 pt-4 px-3 sm:px-6 max-w-4xl mx-auto">
      {/* الرأس */}
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
            <span>دفتر الديون وحسابات الزبائن 📒</span>
          </h1>
          <span className="text-[11px] text-slate-400">متابعة الديون والتحصيلات والمسامحات</span>
        </div>

        <button
          type="button"
          onClick={() => setShowAddCustomerModal(true)}
          className="flex items-center gap-1 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 px-3 py-2 rounded-2xl shadow-lg shadow-emerald-400/20 active-press"
        >
          <UserPlus className="w-4 h-4" />
          <span>زبون جديد</span>
        </button>
      </div>

      {/* بطاقة إجمالي ديون السوبر ماركت في السوق */}
      <div className="glass-panel rounded-3xl p-4 sm:p-5 mb-5 border-amber-500/25 bg-gradient-to-r from-amber-950/20 via-slate-900/80 to-slate-900/80 flex items-center justify-between">
        <div>
          <span className="text-xs text-amber-400 font-semibold block mb-1">
            إجمالي الديون المعلقة في السوق (المتبقي للتحصيل)
          </span>
          <span className="text-2xl sm:text-3xl font-black text-white">
            {formatCurrency(totalAllDebts)}
          </span>
        </div>
        <div className="text-left text-xs text-slate-400">
          <span className="block font-bold text-slate-300 text-sm">{debts.length} زبائن</span>
          <span>مسجلون في الدفتر</span>
        </div>
      </div>

      {/* شريط البحث والفرز */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الزبون أو رقم الهاتف..."
            className="w-full bg-slate-900/90 text-sm text-slate-200 pr-9 pl-3 py-2.5 rounded-2xl border border-slate-800 outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex bg-slate-900/80 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setSortBy('debt-desc')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              sortBy === 'debt-desc' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
            }`}
          >
            أعلى دين
          </button>
          <button
            onClick={() => setSortBy('recent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              sortBy === 'recent' ? 'bg-slate-700 text-white' : 'text-slate-400'
            }`}
          >
            الأحدث
          </button>
          <button
            onClick={() => setSortBy('name-asc')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              sortBy === 'name-asc' ? 'bg-slate-700 text-white' : 'text-slate-400'
            }`}
          >
            أبجدي
          </button>
        </div>
      </div>

      {/* إذا كان هناك زبون محدد للعرض التفصيلي */}
      {selectedCustomer ? (
        <div className="space-y-4 animate-fadeIn">
          {/* بطاقة رأس الزبون المختار */}
          <div className="glass-panel rounded-3xl p-5 border-emerald-500/30 bg-slate-900/90">
            <div className="flex items-start justify-between mb-4">
              <div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold mb-2 flex items-center gap-1"
                >
                  <span>← العودة لقائمة كل الزبائن</span>
                </button>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <span>{selectedCustomer.customerName}</span>
                </h2>
                {selectedCustomer.phone && (
                  <a
                    href={`tel:${selectedCustomer.phone}`}
                    className="text-xs text-slate-400 hover:text-slate-200 mt-1 inline-flex items-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span dir="ltr">{selectedCustomer.phone}</span>
                  </a>
                )}
              </div>

              {/* المبلغ الصافي المطلوب */}
              <div className="text-left">
                <span className="text-xs text-slate-400 block mb-0.5">المتبقي المطلوب</span>
                <span className="text-2xl font-black text-rose-400">
                  {formatCurrency(getCustomerRemainingDebt(selectedCustomer))}
                </span>
              </div>
            </div>

            {/* بطاقات الإحصاءات الثلاث للزبون */}
            <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800 text-center">
              <div>
                <span className="text-[10px] text-slate-400 block">إجمالي المشتريات</span>
                <span className="text-sm font-bold text-white">{formatCurrency(selectedCustomer.totalDebt)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">المسدد نقداً</span>
                <span className="text-sm font-bold text-emerald-400">{formatCurrency(selectedCustomer.totalPaid)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">خصم ومسامحة</span>
                <span className="text-sm font-bold text-amber-400">{formatCurrency(selectedCustomer.totalDiscount)}</span>
              </div>
            </div>

            {/* أزرار الإجراءات للزبون المختار */}
            <div className="grid grid-cols-3 gap-2 pt-3">
              <button
                type="button"
                onClick={() => {
                  setPayAmount(getCustomerRemainingDebt(selectedCustomer));
                  setDiscountAmount(0);
                  setShowPaymentModal(true);
                }}
                className="py-2.5 px-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active-press flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>سداد دفعة</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDebtAmount(0);
                  setDebtItemDetails('');
                  setShowAddDebtModal(true);
                }}
                className="py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 active-press flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>تسجيل دين</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareWhatsApp(selectedCustomer)}
                className="py-2.5 px-3 rounded-2xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] font-bold text-xs border border-[#25D366]/30 active-press flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-4 h-4" />
                <span>واتساب 📱</span>
              </button>
            </div>
          </div>

          {/* سجل كشف الحساب التفصيلي */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              سجل العمليات والدفعات التاريخي:
            </h3>

            {(selectedCustomer.entries || []).length === 0 ? (
              <div className="glass-panel rounded-2xl p-6 text-center text-slate-400 text-xs">
                لا توجد حركات مسجلة لهذا الحساب حالياً
              </div>
            ) : (
              (selectedCustomer.entries || []).map(entry => (
                <div
                  key={entry.id}
                  className={`glass-panel rounded-2xl p-3.5 border transition-all flex items-start justify-between gap-3 ${
                    entry.isPaymentRecord
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${entry.isPaymentRecord ? 'text-emerald-400' : 'text-white'}`}>
                        {entry.isPaymentRecord ? '✅ سداد دفعة نقدية' : '🛒 دين مشتريات'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        ({entry.date} {entry.time && `• ${entry.time}`})
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">
                      {entry.itemDetails}
                    </p>

                    {entry.note && (
                      <p className="text-[11px] text-amber-300/90 font-medium">
                        ملاحظة: {entry.note}
                      </p>
                    )}

                    {entry.workerName && (
                      <span className="text-[10px] text-slate-500 block">
                        المسجل: {entry.workerName}
                      </span>
                    )}
                  </div>

                  <div className="text-left shrink-0">
                    <span className={`text-base font-black ${entry.isPaymentRecord ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {entry.isPaymentRecord ? `-${formatCurrency(entry.amount)}` : `+${formatCurrency(entry.amount)}`}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('هل تريد حذف هذه الحركة بالتحديد وتصحيح الرصيد؟')) {
                          deleteDebtEntry(selectedCustomer.id, entry.id);
                        }
                      }}
                      className="block mt-1 text-slate-600 hover:text-rose-400 text-xs p-1"
                      title="حذف هذا السطر"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* قائمة بطاقات كل الزبائن */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredCustomers.length === 0 ? (
            <div className="col-span-full glass-panel rounded-3xl p-8 text-center text-slate-400">
              <User className="w-12 h-12 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold">لا يوجد زبائن مطابقين للبحث</p>
              <p className="text-xs text-slate-500 mt-1">اضغط على "زبون جديد" لفتح حساب جديد في الدفتر</p>
            </div>
          ) : (
            filteredCustomers.map(customer => {
              const remaining = getCustomerRemainingDebt(customer);
              const isCleared = remaining === 0;

              return (
                <div
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  className="glass-panel rounded-3xl p-4 border border-slate-800/80 hover:border-emerald-500/40 hover:bg-slate-900/90 transition-all cursor-pointer active-press group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {customer.customerName}
                      </h3>
                      {customer.phone ? (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5" dir="ltr">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {customer.phone}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">لا يوجد رقم هاتف</span>
                      )}
                    </div>

                    <div className="text-left">
                      <span className={`text-lg font-black ${isCleared ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isCleared ? 'خالص ✓' : formatCurrency(remaining)}
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        {customer.entries?.length || 0} حركات
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/60 text-xs">
                    <span className="text-slate-400 text-[11px]">
                      مشتريات: {formatCurrency(customer.totalDebt)}
                    </span>
                    <span className="text-emerald-400 font-semibold text-[11px]">
                      سدد: {formatCurrency(customer.totalPaid)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareWhatsApp(customer);
                      }}
                      className="text-[#25D366] hover:underline text-[11px] font-bold"
                    >
                      واتساب ↗
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* نافذة إضافة زبون جديد */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-base font-bold text-white">إضافة زبون جديد للدفتر</h3>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">اسم الزبون *</label>
              <input
                type="text"
                value={newCustomerName}
                onChange={e => setNewCustomerName(e.target.value)}
                placeholder="مثال: أبو عمر، محمد المصري..."
                className="w-full bg-slate-950 text-white px-3 py-2.5 rounded-2xl border border-slate-700 outline-none focus:border-emerald-500 text-sm"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">رقم الهاتف / الواتساب (اختياري)</label>
              <input
                type="tel"
                value={newCustomerPhone}
                onChange={e => setNewCustomerPhone(e.target.value)}
                placeholder="مثال: 0599123456"
                className="w-full bg-slate-950 text-white px-3 py-2.5 rounded-2xl border border-slate-700 outline-none focus:border-emerald-500 text-sm"
                dir="ltr"
              />
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleCreateCustomer}
                className="py-2 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg active-press"
              >
                حفظ الزبون ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تسجيل دين يدوي */}
      {showAddDebtModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-base font-bold text-white">تسجيل دين لـ {selectedCustomer.customerName}</h3>
              <button onClick={() => setShowAddDebtModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">المبلغ المطلوب ₪ *</label>
              <input
                type="number"
                step="any"
                min="0"
                value={debtAmount === 0 ? '' : debtAmount}
                onChange={e => setDebtAmount(parseFloat(e.target.value) || 0)}
                placeholder="0 ₪"
                className="w-full bg-slate-950 text-rose-400 font-black text-xl text-center py-2.5 rounded-2xl border border-slate-700 outline-none focus:border-rose-500"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">بيان المشتريات</label>
              <input
                type="text"
                value={debtItemDetails}
                onChange={e => setDebtItemDetails(e.target.value)}
                placeholder="مثال: زيت وسكر وشاي، أو ألبان ومعلبات"
                className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl border border-slate-700 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">ملاحظة إضافية</label>
              <input
                type="text"
                value={debtNote}
                onChange={e => setDebtNote(e.target.value)}
                placeholder="مثال: أخذها على الحساب لآخر الشهر"
                className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl border border-slate-700 text-xs"
              />
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
              <button onClick={() => setShowAddDebtModal(false)} className="px-4 py-2 text-xs text-slate-400">إلغاء</button>
              <button
                type="button"
                onClick={handleSaveDebtEntry}
                className="py-2.5 px-6 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-lg active-press"
              >
                تسجيل الدين ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة سداد دفعة نقدية مع خصم ومسامحة */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-base font-bold text-white">تسجيل دفعة من: {selectedCustomer.customerName}</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-2xl text-center border border-slate-800">
              <span className="text-[11px] text-slate-400 block">إجمالي الرصيد المطلوب منه حالياً</span>
              <span className="text-lg font-black text-rose-400">
                {formatCurrency(getCustomerRemainingDebt(selectedCustomer))}
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">المبلغ المدفوع نقداً ₪</label>
              <input
                type="number"
                step="any"
                min="0"
                value={payAmount === 0 ? '' : payAmount}
                onChange={e => setPayAmount(parseFloat(e.target.value) || 0)}
                placeholder="0 ₪"
                className="w-full bg-slate-950 text-emerald-400 font-black text-xl text-center py-2.5 rounded-2xl border border-slate-700 outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                مبلغ الخصم والمسامحة (إن وجد) ₪
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={discountAmount === 0 ? '' : discountAmount}
                onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                placeholder="0 ₪"
                className="w-full bg-slate-950 text-amber-400 font-bold text-base text-center py-2 rounded-xl border border-slate-700 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">طريقة السداد:</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-slate-950 text-white font-semibold px-3 py-2 rounded-xl border border-slate-700 text-xs"
              >
                <option value="نقدي">نقدي</option>
                <option value="بنك فلسطين">بنك فلسطين</option>
                <option value="بال باي">بال باي</option>
                <option value="جوال بي">جوال بي</option>
              </select>
            </div>

            {/* تم التحويل على (عبدالله أو أحمد) */}
            <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                تم التحويل على:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTransferredToPerson('عبدالله')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                    transferredToPerson === 'عبدالله'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/80 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  عبدالله
                </button>
                <button
                  type="button"
                  onClick={() => setTransferredToPerson('أحمد')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                    transferredToPerson === 'أحمد'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/80 shadow-md shadow-blue-500/10'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  أحمد
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">ملاحظة أو بيان السداد</label>
              <input
                type="text"
                value={paymentNote}
                onChange={e => setPaymentNote(e.target.value)}
                placeholder="مثال: دفعة من حساب الشهر"
                className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl border border-slate-700 text-xs"
              />
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
              <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-xs text-slate-400">إلغاء</button>
              <button
                type="button"
                onClick={handleSavePayment}
                className="py-2.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg active-press"
              >
                تأكيد السداد ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
