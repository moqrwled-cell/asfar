import React, { useState, useEffect } from 'react';
import { 
  getUISettings, 
  updateUISettings, 
  getSyncStatus, 
  fetchFromSupabase, 
  exportBackupJSON, 
  importBackupJSON, 
  getDepartments, 
  addDepartment 
} from '../store';
import { 
  ArrowLeft, 
  Settings, 
  RefreshCw, 
  Download, 
  Upload, 
  Sliders, 
  Type, 
  Layers, 
  LogOut, 
  Database, 
  Plus, 
  CheckCircle2, 
  ShieldAlert,
  ShoppingBag
} from 'lucide-react';
import { UISettings, Department } from '../types';

interface Props {
  onBack: () => void;
  workerName: string;
  onLogout: () => void;
}

export default function SettingsBook({ onBack, workerName, onLogout }: Props) {
  const [uiSettings, setUiSettings] = useState<UISettings>(getUISettings());
  const [syncStatus, setSyncStatus] = useState(getSyncStatus());
  const [departments, setDepartments] = useState<Department[]>(getDepartments());

  // إضافة قسم جديد
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptProfitRate, setDeptProfitRate] = useState<number>(18);

  const [syncLoading, setSyncLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleUpdate = (updates: Partial<UISettings>) => {
    updateUISettings(updates);
    setUiSettings(getUISettings());
    // تطبيق الفئة على وسم html أو body
    if (updates.fontSize) {
      document.documentElement.setAttribute('data-font-size', updates.fontSize);
    }
  };

  const handleManualSync = async () => {
    setSyncLoading(true);
    await fetchFromSupabase();
    setSyncStatus(getSyncStatus());
    setSyncLoading(false);
    setSuccessMsg('تمت المزامنة بنجاح مع Supabase ✓');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleExportBackup = () => {
    const jsonStr = exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `سوبر_ماركت_مقداد_نسخة_احتياطية_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        if (confirm('هل تريد استيراد هذه النسخة ودمجها مع البيانات الحالية؟')) {
          const ok = await importBackupJSON(content);
          if (ok) {
            alert('تم استيراد النسخة الاحتياطية بنجاح!');
            setDepartments(getDepartments());
          } else {
            alert('حدث خطأ أثناء قراءة ملف النسخة الاحتياطية.');
          }
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSaveDepartment = async () => {
    if (!deptName.trim()) {
      alert('يرجى إدخال اسم القسم');
      return;
    }
    await addDepartment(deptName.trim(), deptProfitRate);
    setDeptName('');
    setDeptProfitRate(18);
    setShowAddDeptModal(false);
    setDepartments(getDepartments());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28 pt-4 px-3 sm:px-6 max-w-4xl mx-auto space-y-6">
      {/* الرأس */}
      <div className="flex items-center justify-between">
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
            <Settings className="w-5 h-5 text-emerald-400" />
            <span>الإعدادات والمزامنة</span>
          </h1>
          <span className="text-[11px] text-slate-400">تخصيص الواجهة وقاعدة البيانات والنسخ الاحتياطي</span>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2 rounded-2xl border border-rose-500/20 active-press"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>خروج</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* بطاقة حالة المزامنة مع Supabase */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">قاعدة البيانات السحابية (Supabase)</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400 font-semibold">متصل ومتزامن لحظياً Realtime</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={syncLoading}
            className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-1.5 active-press"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{syncLoading ? 'جاري المزامنة...' : 'مزامنة يدوية'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
          ⚡ <strong>نظام الحفظ المزدوج (Offline-First):</strong> يتم حفظ كل عملية فوراً في جهازك (0 تأخير) وتُزامن سحابياً مع Supabase بدون أي فقدان للبيانات حتى لو انقطع اتصال الإنترنت في السوبر ماركت.
        </p>
      </div>

      {/* تحكم أبعاد الواجهة والخطوط (UI Controls) كما كان في كفي روما */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span>تخصيص الواجهة والخطوط (خاص بجهازك)</span>
        </h3>

        {/* حجم الخط */}
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-2 flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5" />
            <span>حجم الخط والقراءة:</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'small', label: 'صغير' },
              { id: 'normal', label: 'متوسط (افتراضي)' },
              { id: 'large', label: 'كبير (واضح)' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleUpdate({ fontSize: item.id as any })}
                className={`py-2.5 rounded-2xl text-xs font-bold border transition-all ${
                  uiSettings.fontSize === item.id
                    ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* كثافة المسافات */}
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>كثافة الخانات والمسافات:</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'compact', label: 'مضغوط' },
              { id: 'normal', label: 'عادي' },
              { id: 'spacious', label: 'واسع ومريح' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleUpdate({ rowDensity: item.id as any })}
                className={`py-2.5 rounded-2xl text-xs font-bold border transition-all ${
                  uiSettings.rowDensity === item.id
                    ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* إدارة أقسام السوبر ماركت الافتراضية */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">أقسام السوبر ماركت المسجلة ({departments.length})</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowAddDeptModal(true)}
            className="py-1.5 px-3 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1 active-press"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة قسم جديد</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {departments.map(dept => (
            <span
              key={dept.id}
              className="inline-flex items-center gap-1.5 text-xs bg-slate-900 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-800"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.color || '#10b981' }} />
              <span className="font-semibold text-white">{dept.name}</span>
              <span className="text-[10px] text-slate-500">({dept.profitRate || 18}%)</span>
            </span>
          ))}
        </div>
      </div>

      {/* النسخ الاحتياطي اليدوي (JSON Export / Import) */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Download className="w-4 h-4 text-blue-400" />
          <span>النسخ الاحتياطي والأمان (ملف خارجي)</span>
        </h3>
        <p className="text-xs text-slate-400">
          يمكنك في أي وقت تنزيل نسخة كاملة من بيانات المحل كملف أمان على جهازك أو استعادتها في ثوانٍ.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex-1 py-3 px-4 rounded-2xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-bold flex items-center justify-center gap-2 active-press"
          >
            <Download className="w-4 h-4" />
            <span>تنزيل نسخة احتياطية (JSON)</span>
          </button>

          <label className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer active-press">
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>استيراد واستعادة نسخة (JSON)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* نافذة إضافة قسم جديد */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-base font-bold text-white">إضافة قسم سوبر ماركت جديد</h3>
              <button onClick={() => setShowAddDeptModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">اسم القسم *</label>
              <input
                type="text"
                value={deptName}
                onChange={e => setDeptName(e.target.value)}
                placeholder="مثال: حبوب وبقوليات، مثلجات..."
                className="w-full bg-slate-950 text-white px-3 py-2.5 rounded-2xl border border-slate-700 text-sm outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                هامش الربح التقديري للقسم % (لحساب الأرباح)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={deptProfitRate}
                onChange={e => setDeptProfitRate(parseInt(e.target.value) || 18)}
                className="w-full bg-slate-950 text-emerald-400 font-bold px-3 py-2 rounded-xl border border-slate-700 text-sm outline-none text-center"
              />
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
              <button onClick={() => setShowAddDeptModal(false)} className="px-4 py-2 text-xs text-slate-400">إلغاء</button>
              <button
                type="button"
                onClick={handleSaveDepartment}
                className="py-2.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg active-press"
              >
                إضافة القسم ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
