import React, { useState, useEffect } from 'react';
import { Expense } from '../types';
import { 
  getExpensesByDate, 
  addExpense, 
  deleteExpense, 
  getTodayDate, 
  formatCurrency, 
  subscribeToStore 
} from '../store';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  DollarSign, 
  Calendar, 
  Clock, 
  FileText, 
  Receipt,
  TrendingDown
} from 'lucide-react';

interface Props {
  onBack: () => void;
  workerName: string;
}

const CATEGORIES: Expense['category'][] = [
  'بضاعة كاش',
  'كهرباء ومياه',
  'فواتير',
  'عمال ورواتب',
  'إيجار',
  'صيانة',
  'متفرقات',
];

export default function ExpensesBook({ onBack, workerName }: Props) {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // نموذج إضافة مصروف
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<Expense['category']>('بضاعة كاش');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToStore(() => {
      loadData();
    });
    return unsubscribe;
  }, [selectedDate]);

  const loadData = () => {
    setExpenses(getExpensesByDate(selectedDate));
  };

  const handleSaveExpense = async () => {
    if (!title.trim() || amount <= 0) {
      alert('يرجى كتابة بيان المصروف والمبلغ');
      return;
    }

    await addExpense({
      title: title.trim(),
      amount,
      category,
      workerName,
      notes: notes.trim(),
      date: selectedDate,
    });

    setTitle('');
    setAmount(0);
    setNotes('');
    setShowAddModal(false);
    loadData();
  };

  const dayTotalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

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
            <Receipt className="w-5 h-5 text-rose-400" />
            <span>المصاريف اليومية</span>
          </h1>
          <span className="text-[11px] text-slate-400">فواتير وبضاعة ونثريات السوبر ماركت</span>
        </div>

        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="text-xs bg-slate-900/90 text-rose-400 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-800 outline-none focus:border-rose-500 cursor-pointer"
        />
      </div>

      {/* بطاقة إجمالي مصاريف اليوم وزر الإضافة */}
      <div className="glass-panel rounded-3xl p-5 mb-5 border-rose-500/20 bg-gradient-to-r from-rose-950/20 via-slate-900/80 to-slate-900/80 flex items-center justify-between">
        <div>
          <span className="text-xs text-rose-400 font-semibold block mb-1">
            إجمالي مصاريف اليوم ({selectedDate})
          </span>
          <span className="text-2xl sm:text-3xl font-black text-white">
            {formatCurrency(dayTotalExpenses)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="py-3 px-5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-500/25 active-press flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>تسجيل مصروف</span>
        </button>
      </div>

      {/* قائمة المصاريف لهذا اليوم */}
      <div className="space-y-3">
        {expenses.length === 0 ? (
          <div className="glass-panel rounded-3xl p-8 text-center text-slate-400">
            <Receipt className="w-12 h-12 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold">لا توجد مصاريف مسجلة لهذا اليوم</p>
            <p className="text-xs text-slate-500 mt-1">اضغط على "تسجيل مصروف" لإضافة فواتير أو بضاعة كاش</p>
          </div>
        ) : (
          expenses.map(expense => (
            <div
              key={expense.id}
              className="glass-panel rounded-2xl p-4 border border-slate-800/80 flex items-start justify-between gap-3 hover:border-slate-700 transition-all"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{expense.title}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-rose-300 border border-slate-700">
                    {expense.category}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{expense.time}</span>
                  <span>•</span>
                  <span>بواسطة: {expense.workerName}</span>
                </div>

                {expense.notes && (
                  <p className="text-xs text-slate-400 mt-1">
                    ملاحظة: {expense.notes}
                  </p>
                )}
              </div>

              <div className="text-left shrink-0">
                <span className="text-lg font-black text-rose-400 block">
                  -{formatCurrency(expense.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('حذف هذا المصروف؟')) {
                      deleteExpense(expense.id);
                    }
                  }}
                  className="mt-1 text-slate-600 hover:text-rose-400 p-1"
                  title="حذف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* نافذة تسجيل مصروف جديد */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-base font-bold text-white">تسجيل مصروف جديد</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">المبلغ المطلوب ₪ *</label>
              <input
                type="number"
                step="any"
                min="0"
                value={amount === 0 ? '' : amount}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0 ₪"
                className="w-full bg-slate-950 text-rose-400 font-black text-xl text-center py-2.5 rounded-2xl border border-slate-700 outline-none focus:border-rose-500"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">بيان المصروف *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="مثال: كرتونة شيبس كاش، فاتورة كهرباء، كاز..."
                className="w-full bg-slate-950 text-white px-3 py-2.5 rounded-xl border border-slate-700 text-sm outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">التصنيف:</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all ${
                      category === cat
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">ملاحظة إضافية</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="اختياري..."
                className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl border border-slate-700 text-xs"
              />
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-xs text-slate-400">إلغاء</button>
              <button
                type="button"
                onClick={handleSaveExpense}
                className="py-2.5 px-6 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-lg active-press"
              >
                تأكيد وحفظ المصروف ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
