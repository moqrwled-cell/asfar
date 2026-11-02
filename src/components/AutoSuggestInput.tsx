import React, { useState, useRef, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  onSelect?: (value: string) => void;
  autoFocus?: boolean;
}

export default function AutoSuggestInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className = '',
  onSelect,
  autoFocus = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // تصفية الاقتراحات حسب النص المكتوب
  const filtered = value.trim()
    ? suggestions.filter(s => s.toLowerCase().includes(value.trim().toLowerCase()) && s.toLowerCase() !== value.trim().toLowerCase())
    : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={className}
        autoFocus={autoFocus}
      />

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 shadow-2xl p-1.5 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 px-3 py-1">
            زبائن مسجلون سابقاً:
          </div>
          {filtered.slice(0, 8).map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onChange(s);
                if (onSelect) onSelect(s);
                setIsOpen(false);
              }}
              className="w-full text-right px-3 py-2 text-sm text-slate-200 hover:text-white hover:bg-emerald-500/20 active:bg-emerald-500/30 rounded-xl transition-all flex items-center justify-between"
            >
              <span>{s}</span>
              <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">اختيار</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
