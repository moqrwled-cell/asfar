import React, { useState, useEffect } from 'react';
import { 
  getCashDrawerSummary, 
  addManualIncome, 
  getTodayDate, 
  formatCurrency, 
  subscribeToStore 
} from '../store';
import { 
  ArrowLeft, 
  Coins, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  Receipt, 
  Wallet,
  Sparkles
} from 'lucide-react';
import { PaymentMethod } from '../types';

interface Props {
  onBack: () => void;
  workerName: string;
}

export default function CashRegister({ onBack, workerName }: Props) {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [summary, setSummary] = useState(getCashDrawerSummary(getTodayDate()));

  // إضافة إيراد يدوي (مثل إيداع فكة أو تمويل صندوق)
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [incomeTitle, setIncomeTitle] = useState('');
  const [incomeAmount, setIncomeAmount] = useState<number>(0);
  const [incomeMethod, setIncomeMethod] = useState<PaymentMethod>('نقدي');
  const [incomeNote, setIncomeNote] = useState('');

  // أداة جرد الدرج السريع (Cash Counter)
  const [showCounter, setShowCounter] = useState(false);
  const [counted200, setCounted200] = useState<number>(0);
  const [counted100, setCounted100] = useState<number>(0);
  const [counted50, setCounted50] = useState<number>(0);
  const [counted20, setCounted20] = useState<number>(0);
  const [countedCoins, setCountedCoins] = useState<number>(0);

  useEffect(() => {
    loadSummary();
    const unsubscribe = subscribeToStore(() => {
      loadSummary();
    });
    return unsubscribe;
  }, [selectedDate]);

  const loadSummary = () => {
    setSummary(getCashDrawerSummary(selectedDate));
  };

  const handleSaveIncome = async () => {
    if (!incomeTitle.trim() || incomeAmount <= 0) {
      alert('يرجى إدخال البيان والمبلغ');
      return;
    }

    await addManualIncome({
      title: incomeTitle.trim(),
      amount: incomeAmount,
      paymentMethod: incomeMethod,
      workerName,
      notes: incomeNote.trim(),
      date: selectedDate,
    });

    setIncomeTitle('');
    setIncomeAmount(0);
    setIncomeNote('');
    setShowIncomeModal(false);
    loadSummary();
  };

  const totalCountedCash = (counted200 * 200) + (counted100 * 100) + (counted50 * 50) + (counted20 * 20) + (countedCoins || 0);
  const discrepancy = totalCountedCash - summary.netCashInDrawer;

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
            <Coins className="w-5 h-5 text-emerald-400" />
            <span>الصندوق والدرج النقدي</span>
          </h1>
          <span className="text-[11px] text-slate-400">حساب النقدية الحية في الدرج لحظة بلحظة</span>
        </div>

        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="text-xs bg-slate-900/90 text-emerald-400 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
        />
      </div>

      {/* البطاقة الرئيسية للكاش الفعلي في اليد */}
      <div className="glass-panel rounded-3xl p-6 mb-6 border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-slate-900/90 to-slate-900/90 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
        
        <span className="text-xs font-bold text-emerald-400/90 uppercase tracking-wider block mb-1">
          صافي الكاش الفعلي المتوقع في درج الصندوق الآن
        </span>
        <div className="text-3xl sm:text-4xl font-black text-white tracking-tight my-2">
          {formatCurrency(summary.netCashInDrawer)}
        </div>
        <p className="text-xs text-slate-400">
          (كاش مبيعات + كاش سداد ديون + إيرادات يدوية) - (مصاريف كاش)
        </p>

        <div className="flex justify-center gap-2 mt-4">
          <button
            type="button"
            onClick={() => setShowIncomeModal(true)}
            className="py-2.5 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold active-press flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>إيداع فكة / إيراد يدوي</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCounter(!showCounter)}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold active-press flex items-center gap-1.5"
          >
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>{showCounter ? 'إخفاء الجرد' : 'جرد وعد الكاش'}</span>
          </button>
        </div>
      </div>

      {/* تفصيل حركة الكاش لهذا اليوم */}
      <div className="space-y-3 mb-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          تفصيل الوارد والمنصرف من الدرج:
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* كاش المبيعات */}
          <div className="glass-panel rounded-2xl p-4 border border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block">كاش مبيعات اليومية</span>
                <span className="text-sm font-bold text-white">المستلم نقداً باليد</span>
              </div>
            </div>
            <span className="text-base font-bold text-emerald-400">
              +{formatCurrency(summary.cashSales)}
            </span>
          </div>

          {/* كاش سداد الديون */}
          <div className="glass-panel rounded-2xl p-4 border border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block">كاش سداد الديون</span>
                <span className="text-sm font-bold text-white">تحصيلات ديون اليوم</span>
              </div>
            </div>
            <span className="text-base font-bold text-teal-400">
              +{formatCurrency(summary.todayDebtCashPayments)}
            </span>
          </div>

          {/* إيرادات يدوية كاش */}
          <div className="glass-panel rounded-2xl p-4 border border-blue-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block">إيرادات / فكة إضافية</span>
                <span className="text-sm font-bold text-white">إيداعات الصندوق</span>
              </div>
            </div>
            <span className="text-base font-bold text-blue-400">
              +{formatCurrency(summary.cashIncomes)}
            </span>
          </div>

          {/* مصاريف الدرج كاش */}
          <div className="glass-panel rounded-2xl p-4 border border-rose-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block">مصاريف من الدرج</span>
                <span className="text-sm font-bold text-white">فواتير وبضاعة نقدية</span>
              </div>
            </div>
            <span className="text-base font-bold text-rose-400">
              -{formatCurrency(summary.cashExpenses)}
            </span>
          </div>
        </div>
      </div>

      {/* المبالغ غير النقدية (البنك والمحافظ) مفصولة لمنع العجز اللحظي */}
      <div className="glass-panel rounded-3xl p-4 mb-6 border border-slate-800">
        <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-purple-400" />
          <span>المبالغ الإلكترونية والبنكية (بنك فلسطين / بال باي / جوال بي - خارج الدرج):</span>
        </h4>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">مبيعات بنكية وإلكترونية</span>
            <span className="text-sm font-bold text-purple-300">{formatCurrency(summary.bankSales)}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">سداد ديون إلكتروني وبنكي</span>
            <span className="text-sm font-bold text-purple-300">{formatCurrency(summary.todayDebtBankPayments)}</span>
          </div>
        </div>
      </div>

      {/* أداة جرد الدرج وعد العملات */}
      {showCounter && (
        <div className="glass-panel rounded-3xl p-5 border border-emerald-500/40 bg-slate-900/95 space-y-4 animate-fadeIn mb-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span>جرد الدرج الفعلي (حاسبة الفئات النقدية)</span>
            </h3>
            <button
              onClick={() => {
                setCounted200(0);
                setCounted100(0);
                setCounted50(0);
                setCounted20(0);
                setCountedCoins(0);
              }}
              className="text-xs text-slate-400 hover:text-white"
            >
              تصفير العداد
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 text-center">
              <span className="text-xs font-bold text-slate-300 block mb-1">فئة 200 ₪</span>
              <input
                type="number"
                min="0"
                value={counted200 === 0 ? '' : counted200}
                onChange={e => setCounted200(parseInt(e.target.value) || 0)}
                placeholder="عدد"
                className="w-full bg-slate-900 text-white font-bold text-center py-1.5 rounded-xl border border-slate-700 outline-none text-sm"
              />
              <span className="text-[11px] text-emerald-400 mt-1 block">={counted200 * 200} ₪</span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 text-center">
              <span className="text-xs font-bold text-slate-300 block mb-1">فئة 100 ₪</span>
              <input
                type="number"
                min="0"
                value={counted100 === 0 ? '' : counted100}
                onChange={e => setCounted100(parseInt(e.target.value) || 0)}
                placeholder="عدد"
                className="w-full bg-slate-900 text-white font-bold text-center py-1.5 rounded-xl border border-slate-700 outline-none text-sm"
              />
              <span className="text-[11px] text-emerald-400 mt-1 block">={counted100 * 100} ₪</span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 text-center">
              <span className="text-xs font-bold text-slate-300 block mb-1">فئة 50 ₪</span>
              <input
                type="number"
                min="0"
                value={counted50 === 0 ? '' : counted50}
                onChange={e => setCounted50(parseInt(e.target.value) || 0)}
                placeholder="عدد"
                className="w-full bg-slate-900 text-white font-bold text-center py-1.5 rounded-xl border border-slate-700 outline-none text-sm"
              />
              <span className="text-[11px] text-emerald-400 mt-1 block">={counted50 * 50} ₪</span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 text-center">
              <span className="text-xs font-bold text-slate-300 block mb-1">فئة 20 ₪</span>
              <input
                type="number"
                min="0"
                value={counted20 === 0 ? '' : counted20}
                onChange={e => setCounted20(parseInt(e.target.value) || 0)}
                placeholder="عدد"
                className="w-full bg-slate-900 text-white font-bold text-center py-1.5 rounded-xl border border-slate-700 outline-none text-sm"
              />
              <span className="text-[11px] text-emerald-400 mt-1 block">={counted20 * 20} ₪</span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 text-center col-span-2 sm:col-span-1">
              <span className="text-xs font-bold text-slate-300 block mb-1">فكة وفراطة ₪</span>
              <input
                type="number"
                step="any"
                min="0"
                value={countedCoins === 0 ? '' : countedCoins}
                onChange={e => setCountedCoins(parseFloat(e.target.value) || 0)}
                placeholder="مجموع الفكة"
                className="w-full bg-slate-900 text-white font-bold text-center py-1.5 rounded-xl border border-slate-700 outline-none text-sm"
              />
              <span className="text-[11px] text-emerald-400 mt-1 block">={countedCoins} ₪</span>
            </div>
          </div>

          {/* نتيجة المطابقة */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">إجمالي ما عددته في الدرج:</span>
              <span className="text-xl font-black text-white">{formatCurrency(totalCountedCash)}</span>
            </div>

            <div className="text-left">
              <span className="text-xs text-slate-400 block">حالة المطابقة:</span>
              {discrepancy === 0 ? (
                <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>مطابق 100% بدون أي فرق ✓</span>
                </span>
              ) : discrepancy > 0 ? (
                <span className="text-sm font-bold text-blue-400">
                  زيادة في الدرج: +{formatCurrency(discrepancy)}
                </span>
              ) : (
                <span className="text-sm font-bold text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>عجز في الدرج: {formatCurrency(discrepancy)}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* نافذة إيداع فكة أو إيراد يدوي */}
      {showIncomeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-base font-bold text-white">إيداع فكة أو إيراد بالصندوق</h3>
              <button onClick={() => setShowIncomeModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">المبلغ ₪ *</label>
              <input
                type="number"
                step="any"
                min="0"
                value={incomeAmount === 0 ? '' : incomeAmount}
                onChange={e => setIncomeAmount(parseFloat(e.target.value) || 0)}
                placeholder="0 ₪"
                className="w-full bg-slate-950 text-emerald-400 font-black text-xl text-center py-2.5 rounded-2xl border border-slate-700 outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">طريقة الإيداع</label>
              <select
                value={incomeMethod}
                onChange={e => setIncomeMethod(e.target.value as PaymentMethod)}
                className="w-full bg-slate-950 text-white font-semibold px-3 py-2 rounded-xl border border-slate-700 text-xs"
              >
                <option value="نقدي">نقدي (في الدرج)</option>
                <option value="بنك فلسطين">بنك فلسطين</option>
                <option value="بال باي">بال باي</option>
                <option value="جوال بي">جوال بي</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">البيان *</label>
              <input
                type="text"
                value={incomeTitle}
                onChange={e => setIncomeTitle(e.target.value)}
                placeholder="مثال: فكة صباحية، تمويل إضافي للصندوق..."
                className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl border border-slate-700 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">ملاحظة إضافية</label>
              <input
                type="text"
                value={incomeNote}
                onChange={e => setIncomeNote(e.target.value)}
                placeholder="اختياري..."
                className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl border border-slate-700 text-xs"
              />
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
              <button onClick={() => setShowIncomeModal(false)} className="px-4 py-2 text-xs text-slate-400">إلغاء</button>
              <button
                type="button"
                onClick={handleSaveIncome}
                className="py-2.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg active-press"
              >
                تأكيد الإيداع ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
