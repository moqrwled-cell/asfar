import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import DailyBook from './components/DailyBook';
import DebtBook from './components/DebtBook';
import ExpensesBook from './components/ExpensesBook';
import CashRegister from './components/CashRegister';
import ReportsBook from './components/ReportsBook';
import SettingsBook from './components/SettingsBook';
import { 
  getDailyOrdersByDate, 
  getExpensesByDate, 
  getDebts, 
  getCashDrawerSummary, 
  getOrderTotal, 
  getOrderRemainingAmount, 
  getCustomerRemainingDebt, 
  getTodayDate, 
  formatCurrency, 
  subscribeToStore, 
  initSupabaseRealtime, 
  transferPreviousUnpaidToDebts,
  getSyncStatus 
} from './store';
import { 
  ShoppingBag, 
  Coins, 
  Receipt, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut, 
  Plus, 
  ArrowRight, 
  Sparkles
} from 'lucide-react';

type Page = 'home' | 'daily' | 'debts' | 'expenses' | 'register' | 'reports' | 'settings';

export default function App() {
  const [workerName, setWorkerName] = useState<string | null>(() => {
    return localStorage.getItem('meqdad_logged_in_worker');
  });

  const [page, setPage] = useState<Page>('home');
  const [todayOrdersCount, setTodayOrdersCount] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [totalDebtsRemaining, setTotalDebtsRemaining] = useState(0);
  const [netCashInDrawer, setNetCashInDrawer] = useState(0);

  const [logoClicks, setLogoClicks] = useState(0);
  const [transferredInfo, setTransferredInfo] = useState<{ count: number; total: number } | null>(null);

  useEffect(() => {
    // تشغيل المزامنة اللحظية مع Supabase
    initSupabaseRealtime();

    // تشغيل النقل التلقائي للطلبات غير المدفوعة من الأيام السابقة
    transferPreviousUnpaidToDebts().then(info => {
      if (info.transferredCount > 0) {
        setTransferredInfo({ count: info.transferredCount, total: info.totalAmount });
      }
    });

    loadOverviewStats();
    const unsubscribe = subscribeToStore(() => {
      loadOverviewStats();
    });

    // معالجة زر الرجوع في المتصفح
    const handlePopState = (e: PopStateEvent) => {
      const statePage = (e.state?.page as Page) || 'home';
      setPage(statePage);
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const loadOverviewStats = () => {
    const today = getTodayDate();
    const orders = getDailyOrdersByDate(today);
    setTodayOrdersCount(orders.length);
    setTodaySales(orders.reduce((sum, o) => sum + getOrderTotal(o), 0));

    const exps = getExpensesByDate(today);
    setTodayExpenses(exps.reduce((sum, e) => sum + e.amount, 0));

    const allDebts = getDebts();
    setTotalDebtsRemaining(allDebts.reduce((sum, d) => sum + getCustomerRemainingDebt(d), 0));

    const drawer = getCashDrawerSummary(today);
    setNetCashInDrawer(drawer.netCashInDrawer);
  };

  const navigateTo = (newPage: Page) => {
    if (newPage !== 'home') {
      window.history.pushState({ page: newPage }, '');
    }
    setPage(newPage);
  };

  const handleBackToHome = () => {
    setPage('home');
  };

  const handleLogin = (name: string) => {
    localStorage.setItem('meqdad_logged_in_worker', name);
    setWorkerName(name);
  };

  const handleLogout = () => {
    localStorage.removeItem('meqdad_logged_in_worker');
    setWorkerName(null);
    setPage('home');
  };

  // حركة سرية عند الضغط على الشعار 3 مرات لفتح التقارير مباشرة للمدير
  const handleLogoTap = () => {
    if (logoClicks >= 2) {
      setLogoClicks(0);
      navigateTo('reports');
    } else {
      setLogoClicks(c => c + 1);
      setTimeout(() => setLogoClicks(0), 1500);
    }
  };

  if (!workerName) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* عرض الصفحة المحددة */}
      <div className="flex-1">
        {page === 'daily' && <DailyBook onBack={handleBackToHome} workerName={workerName} />}
        {page === 'debts' && <DebtBook onBack={handleBackToHome} workerName={workerName} />}
        {page === 'expenses' && <ExpensesBook onBack={handleBackToHome} workerName={workerName} />}
        {page === 'register' && <CashRegister onBack={handleBackToHome} workerName={workerName} />}
        {page === 'reports' && <ReportsBook onBack={handleBackToHome} workerName={workerName} />}
        {page === 'settings' && <SettingsBook onBack={handleBackToHome} workerName={workerName} onLogout={handleLogout} />}

        {page === 'home' && (
          <div className="pb-28 pt-4 px-3 sm:px-6 max-w-4xl mx-auto space-y-5 animate-fadeIn">
            {/* رأس الصفحة الفاخر بتصميم Apple */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleLogoTap}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 active-press"
                  title="انقر 3 مرات للتقارير السريعة"
                >
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-emerald-400" />
                  </div>
                </button>
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>سوبر ماركت مقداد</span>
                  </h1>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="text-emerald-400 font-bold">مرحباً {workerName} 👋</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      سحابي Supabase
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigateTo('settings')}
                  className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 active-press"
                  title="الإعدادات"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 active-press"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* شريط الإشعار بترحيل الديون التلقائي */}
            {transferredInfo && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/20 via-slate-900 to-transparent border border-purple-500/40 text-purple-200 text-xs sm:text-sm flex items-center justify-between animate-fadeIn">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>
                    تم ترحيل <strong>{transferredInfo.count}</strong> طلبات سابقة غير مدفوعة لدفتر الديون بقيمة <strong>{formatCurrency(transferredInfo.total)}</strong>
                  </span>
                </div>
                <button onClick={() => setTransferredInfo(null)} className="text-purple-400 hover:text-white text-xs px-2 py-1">
                  إغلاق ✕
                </button>
              </div>
            )}

            {/* بطاقة الكاش الفعلي في الدرج (أهم بطاقة للكاشير لحظة بلحظة) */}
            <div 
              onClick={() => navigateTo('register')}
              className="glass-panel rounded-3xl p-5 sm:p-6 border-emerald-500/30 bg-gradient-to-br from-emerald-950/25 via-slate-900/90 to-slate-900/90 cursor-pointer hover:border-emerald-500/50 transition-all active-press group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-1">
                    <Coins className="w-4 h-4" />
                    <span>الكاش الفعلي في درج الصندوق الآن</span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white tracking-tight my-1 group-hover:scale-102 transition-transform">
                    {formatCurrency(netCashInDrawer)}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    مبيعات كاش ({formatCurrency(todaySales)}) • مصاريف ({formatCurrency(todayExpenses)})
                  </p>
                </div>

                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:translate-x-[-4px] transition-transform">
                  <ArrowRight className="w-5 h-5 rotate-180" />
                </div>
              </div>
            </div>

            {/* بطاقات الوصول السريع للأقسام الأربعة الرئيسية */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* 1. الدفتر اليومي */}
              <div
                onClick={() => navigateTo('daily')}
                className="glass-panel rounded-3xl p-4 sm:p-5 border-emerald-500/25 hover:border-emerald-500/60 bg-slate-900/80 cursor-pointer transition-all active-press group"
              >
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-0.5">الدفتر اليومي</h3>
                <p className="text-xs text-slate-400 mb-2">تسجيل مبيعات وأقسام السوبر ماركت</p>
                <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-slate-800">
                  <span className="text-emerald-400">{todayOrdersCount} طلبات اليوم</span>
                  <span className="text-white">{formatCurrency(todaySales)}</span>
                </div>
              </div>

              {/* 2. دفتر الديون */}
              <div
                onClick={() => navigateTo('debts')}
                className="glass-panel rounded-3xl p-4 sm:p-5 border-amber-500/25 hover:border-amber-500/60 bg-slate-900/80 cursor-pointer transition-all active-press group"
              >
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-0.5">دفتر الديون</h3>
                <p className="text-xs text-slate-400 mb-2">حسابات الزبائن وسداد الدفعات</p>
                <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-slate-800">
                  <span className="text-amber-400">ديون معلقة:</span>
                  <span className="text-rose-400">{formatCurrency(totalDebtsRemaining)}</span>
                </div>
              </div>

              {/* 3. المصاريف اليومية */}
              <div
                onClick={() => navigateTo('expenses')}
                className="glass-panel rounded-3xl p-4 sm:p-5 border-rose-500/25 hover:border-rose-500/60 bg-slate-900/80 cursor-pointer transition-all active-press group"
              >
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3 group-hover:scale-110 transition-transform">
                  <Receipt className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-0.5">المصاريف</h3>
                <p className="text-xs text-slate-400 mb-2">فواتير وبضاعة كاش ومستلزمات</p>
                <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-slate-800">
                  <span className="text-rose-400">مصاريف اليوم:</span>
                  <span className="text-white">{formatCurrency(todayExpenses)}</span>
                </div>
              </div>

              {/* 4. التقارير والأرباح */}
              <div
                onClick={() => navigateTo('reports')}
                className="glass-panel rounded-3xl p-4 sm:p-5 border-blue-500/25 hover:border-blue-500/60 bg-slate-900/80 cursor-pointer transition-all active-press group"
              >
                <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-0.5">التقارير والأرباح</h3>
                <p className="text-xs text-slate-400 mb-2">تقفيل اليومية والتقرير الشهري</p>
                <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-slate-800">
                  <span className="text-blue-400">مباشر وعلني</span>
                  <span className="text-emerald-400">عرض الأرباح والتقفيل ↗</span>
                </div>
              </div>
            </div>

            {/* زر تسجيل بيع فوري كبير في أسفل الصفحة الرئيسية */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigateTo('daily')}
                className="w-full py-4 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base shadow-2xl shadow-emerald-500/30 flex items-center justify-center gap-2 active-press"
              >
                <Plus className="w-5 h-5 stroke-[3]" />
                <span>فتح الدفتر اليومي وتسجيل طلب جديد (+)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* شريط التنقل السفلي الفاخر (Apple Frosted Tab Bar) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/85 backdrop-blur-2xl border-t border-slate-800/80 py-2.5 px-4 flex justify-around items-center max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => navigateTo('home')}
          className={`flex flex-col items-center gap-1 transition-all ${
            page === 'home' ? 'text-emerald-400 scale-105 font-bold' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px]">الرئيسية</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('daily')}
          className={`flex flex-col items-center gap-1 transition-all ${
            page === 'daily' ? 'text-emerald-400 scale-105 font-bold' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Coins className="w-5 h-5" />
          <span className="text-[10px]">اليومي</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('debts')}
          className={`flex flex-col items-center gap-1 transition-all ${
            page === 'debts' ? 'text-emerald-400 scale-105 font-bold' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px]">الديون</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('register')}
          className={`flex flex-col items-center gap-1 transition-all ${
            page === 'register' ? 'text-emerald-400 scale-105 font-bold' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px]">الصندوق</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('reports')}
          className={`flex flex-col items-center gap-1 transition-all ${
            page === 'reports' ? 'text-emerald-400 scale-105 font-bold' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px]">التقارير</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('settings')}
          className={`flex flex-col items-center gap-1 transition-all ${
            page === 'settings' ? 'text-emerald-400 scale-105 font-bold' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px]">الإعدادات</span>
        </button>
      </div>
    </div>
  );
}
