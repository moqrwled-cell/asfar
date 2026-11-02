import React, { useState } from 'react';
import { WORKERS } from '../store';
import { ShoppingBag, Lock, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';

interface Props {
  onLogin: (workerName: string) => void;
}

export default function Login({ onLogin }: Props) {
  const [selectedWorker, setSelectedWorker] = useState<string>(WORKERS[0].name);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      setErrorMsg('');

      // فحص تلقائي عند إدخال 4 أرقام
      if (newPin.length === 4) {
        checkPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
    setErrorMsg('');
  };

  const handleClear = () => {
    setPin('');
    setError(false);
    setErrorMsg('');
  };

  const checkPin = (pinToCheck: string) => {
    const worker = WORKERS.find(w => w.name === selectedWorker);
    if (worker && worker.pin === pinToCheck) {
      onLogin(worker.name);
    } else {
      setError(true);
      setErrorMsg('كلمة المرور غير صحيحة!');
      // اهتزاز خفيف وإعادة تعيين
      setTimeout(() => {
        setPin('');
      }, 600);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col justify-center items-center p-4">
      {/* رأس الصفحة والشعار */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 p-0.5 shadow-2xl shadow-emerald-500/20 mb-4 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-emerald-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
          سوبر ماركت مقداد
        </h1>
        <p className="text-sm text-slate-400">
          نظام إدارة المبيعات، الصندوق، والديون
        </p>
      </div>

      {/* لوحة تسجيل الدخول الزجاجية */}
      <div className="w-full max-w-sm glass-panel rounded-3xl p-6 shadow-2xl border border-slate-800/80">
        <div className="text-center mb-5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            اختر المستخدم (المدير)
          </span>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {WORKERS.map(w => {
              const isSelected = selectedWorker === w.name;
              return (
                <button
                  key={w.name}
                  type="button"
                  onClick={() => {
                    setSelectedWorker(w.name);
                    setPin('');
                    setError(false);
                  }}
                  className={`py-3.5 px-3 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 active-press ${
                    isSelected
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-102 font-bold'
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <UserCheck className={`w-5 h-5 mb-1 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  <span className="text-sm">{w.name}</span>
                  <span className="text-[11px] opacity-80 mt-0.5 text-emerald-200">المدير</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* مؤشر النقاط لرمز المرور */}
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  error
                    ? 'bg-rose-500 scale-110'
                    : pin.length > i
                    ? 'bg-emerald-400 scale-110 shadow-md shadow-emerald-400/50'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            ))}
          </div>

          {errorMsg ? (
            <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errorMsg}</span>
            </div>
          ) : (
            <p className="text-xs text-slate-500">أدخل كلمة المرور المكونة من 4 أرقام</p>
          )}
        </div>

        {/* لوحة المفاتيح الرقمية (Apple Style Keypad) */}
        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-600/90 text-xl font-bold text-white transition-all active-press flex items-center justify-center border border-slate-700/40"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-800 active:bg-slate-700 text-xs font-semibold text-slate-400 transition-all active-press flex items-center justify-center border border-slate-700/30"
          >
            مسح
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-600/90 text-xl font-bold text-white transition-all active-press flex items-center justify-center border border-slate-700/40"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-800 active:bg-slate-700 text-sm font-semibold text-rose-400 transition-all active-press flex items-center justify-center border border-slate-700/30"
          >
            ⌫
          </button>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-slate-600">
        سوبر ماركت مقداد © {new Date().getFullYear()} • نظام إدارة متكامل
      </div>
    </div>
  );
}
