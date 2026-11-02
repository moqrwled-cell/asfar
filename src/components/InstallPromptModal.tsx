import React, { useState, useEffect } from 'react';
import { ShoppingBag, Download, Share, PlusSquare, X, Smartphone, Zap, CheckCircle2 } from 'lucide-react';

export default function InstallPromptModal() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. التحقق مما إذا كان التطبيق مثبتاً ويعمل بوضع Standalone بالفعل
    const isRunningStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    setIsStandalone(isRunningStandalone);
    if (isRunningStandalone) return;

    // 2. التحقق من أجهزة iOS (iPhone / iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. التقاط حدث التثبيت لمتصفحات Chrome / Edge / Android
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // إظهار النافذة مباشرة عند أول فتح إذا لم يتم تثبيته بعد
      const dismissedThisSession = sessionStorage.getItem('pwa_prompt_dismissed');
      if (!dismissedThisSession) {
        setIsOpen(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // للأجهزة الأخرى أو iOS، إذا لم يتم التثبيت ولم يتم الإغلاق في هذه الجلسة، نظهر الطلب بعد ثانية واحدة
    const timer = setTimeout(() => {
      const dismissedThisSession = sessionStorage.getItem('pwa_prompt_dismissed');
      if (!dismissedThisSession && !isRunningStandalone) {
        setIsOpen(true);
      }
    }, 800);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsOpen(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      // إبقاء النافذة مفتوحة لتوجيه المستخدم لخطوات Safari
    } else {
      // للمتصفحات التي تحتاج تثبيت عبر القائمة
      alert('لتثبيت التطبيق: افتح قائمة المتصفح (⋮ أو ⋯) واختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"');
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    setIsOpen(false);
  };

  if (!isOpen || isStandalone) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden">
        {/* شريط علوي ملون */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500" />

        {/* رأس النافذة */}
        <div className="flex items-start justify-between pt-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                تثبيت تطبيق سوبر ماركت مقداد 📲
              </h3>
              <p className="text-xs text-emerald-400 font-semibold">
                تطبيق ويب قابل للتثبيت على هاتفك / حاسوبك
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* مميزات التثبيت السريع */}
        <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
            <span><strong>سرعة فائقة:</strong> يفتح فوراً من الشاشة الرئيسية بدون شريط المتصفح.</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />
            <span><strong>جاهز للاستخدام اليومي:</strong> في السوبر ماركت بضغطة واحدة.</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span><strong>مزامنة سحابية:</strong> يعمل بسلاسة حتى لو كان الاتصال بطيئاً.</span>
          </div>
        </div>

        {/* تعليمات خاصة بـ iOS Safari (iPhone / iPad) */}
        {isIOS ? (
          <div className="bg-blue-500/10 border border-blue-500/30 p-3.5 rounded-2xl text-xs space-y-2 text-blue-200">
            <span className="font-bold block text-white">خطوات التثبيت على آيفون (Safari):</span>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 font-bold flex items-center justify-center shrink-0">1</span>
              <span>اضغط على أيقونة المشاركة <Share className="w-3.5 h-3.5 inline mx-1 text-blue-400" /> في أسفل الشاشة.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 font-bold flex items-center justify-center shrink-0">2</span>
              <span>اختر <strong>"إضافة إلى الصفحة الرئيسية"</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-blue-400" />.</span>
            </div>
          </div>
        ) : (
          /* زر التثبيت المباشر لأندرويد والكمبيوتر */
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 active-press"
          >
            <Download className="w-5 h-5" />
            <span>تثبيت التطبيق الآن على جهازك 📲</span>
          </button>
        )}

        {/* زر المتابعة في المتصفح */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            المتابعة في المتصفح (لاحقاً)
          </button>
        </div>
      </div>
    </div>
  );
}
