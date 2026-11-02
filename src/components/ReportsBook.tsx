import React, { useState, useEffect } from 'react';
import { 
  getAllOrders, 
  getAllExpenses, 
  getAllManualIncomes, 
  getDebts, 
  getDepartments, 
  getProfitSummary, 
  getTodayDate, 
  formatCurrency, 
  subscribeToStore 
} from '../store';
import { DailyOrder, Expense, ManualIncome, Department } from '../types';
import { 
  ArrowLeft, 
  Printer, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Receipt, 
  Users, 
  Lock, 
  PieChart, 
  BarChart3,
  Award,
  Sparkles
} from 'lucide-react';

interface Props {
  onBack: () => void;
  workerName: string;
}

export default function ReportsBook({ onBack, workerName }: Props) {
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [allOrders, setAllOrders] = useState<DailyOrder[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    loadData();
    return subscribeToStore(loadData);
  }, []);

  const loadData = () => {
    setAllOrders(getAllOrders());
    setAllExpenses(getAllExpenses());
    setDepartments(getDepartments());
  };

  // --- تصفية وحسابات التقرير اليومي ---
  const dayOrders = allOrders.filter(o => o.date === selectedDate);
  const dayExpenses = allExpenses.filter(e => e.date === selectedDate);

  const dayTotalSales = dayOrders.reduce((sum, o) => {
    return sum + (o.items || []).reduce((s, i) => s + (Number(i.price) * Number(i.quantity)), 0);
  }, 0);

  const dayPaidSales = dayOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
  const dayDebtSales = dayOrders.filter(o => !o.isPaid).reduce((sum, o) => sum + (o.totalAmount - (o.paidAmount || 0)), 0);
  const dayTotalExp = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

  // حساب الأرباح المقدرة لهذا اليوم
  const startOfDayMs = new Date(selectedDate + 'T00:00:00').getTime();
  const endOfDayMs = new Date(selectedDate + 'T23:59:59').getTime();
  const dayProfit = getProfitSummary(startOfDayMs, endOfDayMs);

  // مبيعات أقسام السوبر ماركت لهذا اليوم
  const dayDeptSales: Record<string, number> = {};
  dayOrders.forEach(o => {
    (o.items || []).forEach(i => {
      dayDeptSales[i.department] = (dayDeptSales[i.department] || 0) + (Number(i.price) * Number(i.quantity));
    });
  });
  const sortedDayDepts = Object.entries(dayDeptSales).sort((a, b) => b[1] - a[1]);

  // --- تصفية وحسابات التقرير الشهري ---
  const monthOrders = allOrders.filter(o => o.date.startsWith(selectedMonth));
  const monthExpenses = allExpenses.filter(e => e.date.startsWith(selectedMonth));

  const [yearStr, mStr] = selectedMonth.split('-');
  const startOfMonthMs = new Date(parseInt(yearStr), parseInt(mStr) - 1, 1).getTime();
  const endOfMonthMs = new Date(parseInt(yearStr), parseInt(mStr), 0, 23, 59, 59).getTime();
  const monthProfit = getProfitSummary(startOfMonthMs, endOfMonthMs);

  // مبيعات أقسام السوبر ماركت للشهر
  const monthDeptSales: Record<string, number> = {};
  monthOrders.forEach(o => {
    (o.items || []).forEach(i => {
      monthDeptSales[i.department] = (monthDeptSales[i.department] || 0) + (Number(i.price) * Number(i.quantity));
    });
  });
  const sortedMonthDepts = Object.entries(monthDeptSales).sort((a, b) => b[1] - a[1]);

  // أكثر الزبائن شراءً في الشهر
  const customerMonthlyTotals: Record<string, number> = {};
  monthOrders.forEach(o => {
    if (o.customerName && o.customerName !== 'زبون كاش' && o.customerName !== 'زبون عام (كاش)') {
      customerMonthlyTotals[o.customerName] = (customerMonthlyTotals[o.customerName] || 0) + o.totalAmount;
    }
  });
  const topCustomers = Object.entries(customerMonthlyTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28 pt-4 px-3 sm:px-6 max-w-4xl mx-auto">
      {/* الرأس */}
      <div className="flex items-center justify-between mb-5 print:hidden">
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
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <span>التقارير اليومية والشهرية</span>
          </h1>
          <span className="text-[11px] text-slate-400">سوبر ماركت مقداد • تقفيل ومؤشرات الأرباح</span>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-2xl border border-slate-700 active-press"
        >
          <Printer className="w-4 h-4 text-emerald-400" />
          <span>طباعة</span>
        </button>
      </div>

      {/* التبديل بين التقرير اليومي والشهري */}
      <div className="flex justify-center mb-5 print:hidden">
        <div className="inline-flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setReportType('daily')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              reportType === 'daily'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            تقرير اليومية وتقفيل الوردية
          </button>
          <button
            type="button"
            onClick={() => setReportType('monthly')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              reportType === 'monthly'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            التقرير الشهري الشامل
          </button>
        </div>
      </div>

      {/* ===================== 1. تقرير اليومية (Daily Closing) ===================== */}
      {reportType === 'daily' && (
        <div className="space-y-5 animate-fadeIn">
          {/* محدد اليوم */}
          <div className="flex items-center justify-between glass-panel rounded-2xl p-3 border border-slate-800">
            <span className="text-xs font-bold text-slate-300">اختر تاريخ اليومية:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="text-xs bg-slate-950 text-emerald-400 font-bold px-3 py-1.5 rounded-xl border border-slate-700 outline-none"
            />
          </div>

          {/* لوحة نتائج اليوم المالية */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-panel rounded-2xl p-4 text-center border-emerald-500/30">
              <span className="text-[11px] text-slate-400 block mb-1">إجمالي المبيعات</span>
              <span className="text-xl font-black text-white">{formatCurrency(dayTotalSales)}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">{dayOrders.length} طلبات</span>
            </div>

            <div className="glass-panel rounded-2xl p-4 text-center border-blue-500/30">
              <span className="text-[11px] text-slate-400 block mb-1">المحصل نقداً</span>
              <span className="text-xl font-black text-blue-400">{formatCurrency(dayPaidSales)}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">في الصندوق</span>
            </div>

            <div className="glass-panel rounded-2xl p-4 text-center border-rose-500/30">
              <span className="text-[11px] text-slate-400 block mb-1">مصاريف اليوم</span>
              <span className="text-xl font-black text-rose-400">-{formatCurrency(dayTotalExp)}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">{dayExpenses.length} فواتير</span>
            </div>

            <div className="glass-panel rounded-2xl p-4 text-center border-amber-500/30 bg-emerald-950/20">
              <span className="text-[11px] text-emerald-300 block mb-1">صافي الأرباح المقدرة</span>
              <span className="text-xl font-black text-emerald-400">{formatCurrency(dayProfit.netProfit)}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">هامش {dayProfit.profitMarginPercent.toFixed(1)}%</span>
            </div>
          </div>

          {/* ترتيب أقسام السوبر ماركت بحسب المبيعات لليوم */}
          <div className="glass-panel rounded-3xl p-5 border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-400" />
              <span>مبيعات أقسام السوبر ماركت لهذا اليوم:</span>
            </h3>

            {sortedDayDepts.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">لا توجد مبيعات مسجلة لهذا التاريخ</p>
            ) : (
              <div className="space-y-2">
                {sortedDayDepts.map(([deptName, total]) => {
                  const percent = dayTotalSales > 0 ? (total / dayTotalSales) * 100 : 0;
                  return (
                    <div key={deptName} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-200">{deptName}</span>
                        <span className="text-emerald-400">{formatCurrency(total)} ({percent.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== 2. التقرير الشهري الشامل (Monthly Report) ===================== */}
      {reportType === 'monthly' && (
        <div className="space-y-5 animate-fadeIn">
          {/* محدد الشهر */}
          <div className="flex items-center justify-between glass-panel rounded-2xl p-3 border border-slate-800">
            <span className="text-xs font-bold text-slate-300">اختر الشهر المراد تحليله:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="text-xs bg-slate-950 text-emerald-400 font-bold px-3 py-1.5 rounded-xl border border-slate-700 outline-none"
            />
          </div>

          {/* لوحة المؤشرات الشهرية الكبرى */}
          <div className="glass-panel rounded-3xl p-6 border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-slate-900/90 text-center">
            <span className="text-xs font-bold text-emerald-400 block mb-1">
              صافي أرباح سوبر ماركت مقداد لشهر {selectedMonth}
            </span>
            <div className="text-3xl sm:text-4xl font-black text-white my-2">
              {formatCurrency(monthProfit.netProfit)}
            </div>
            <p className="text-xs text-slate-400">
              إجمالي مبيعات: {formatCurrency(monthProfit.totalSales)} • إجمالي مصاريف: {formatCurrency(monthProfit.totalExpenses)}
            </p>
          </div>

          {/* تفاصيل المبيعات والأقسام لهذا الشهر */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* أقسام السوبر ماركت الأكثر مبيعاً */}
            <div className="glass-panel rounded-3xl p-5 border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>أكثر الأقسام مبيعاً في الشهر:</span>
              </h3>
              <div className="space-y-2.5">
                {sortedMonthDepts.slice(0, 6).map(([deptName, total], idx) => (
                  <div key={deptName} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/60 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] font-bold flex items-center justify-center text-slate-400">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-200">{deptName}</span>
                    </div>
                    <span className="font-bold text-emerald-400">{formatCurrency(total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* كبار الزبائن في الشهر */}
            <div className="glass-panel rounded-3xl p-5 border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>أكثر الزبائن شراءً في الشهر:</span>
              </h3>
              <div className="space-y-2.5">
                {topCustomers.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">لا توجد حسابات مسجلة لهذا الشهر</p>
                ) : (
                  topCustomers.map(([custName, total], idx) => (
                    <div key={custName} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/60 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-200">{custName}</span>
                      </div>
                      <span className="font-bold text-blue-400">{formatCurrency(total)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
