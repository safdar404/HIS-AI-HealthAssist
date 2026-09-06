import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyPatientIdButtonProps {
  id?: string;
  value: string;
  label?: string;
  tooltipText?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}

export const CopyPatientIdButton: React.FC<CopyPatientIdButtonProps> = ({
  id,
  value,
  label,
  tooltipText = 'Copy identifier to clipboard',
  className = '',
  size = 'xs',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback for older browsers / sandboxes
        const el = document.createElement('textarea');
        el.value = value;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy to clipboard', err);
    }
  };

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-1',
    sm: 'px-2 py-1 text-xs gap-1.5',
    md: 'px-3 py-1.5 text-xs gap-2',
  }[size];

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  }[size];

  return (
    <button
      id={id || `btn-copy-${value.replace(/[^a-zA-Z0-9_-]/g, '')}`}
      onClick={handleCopy}
      type="button"
      className={`inline-flex items-center rounded-md font-mono font-medium transition-all cursor-pointer select-none ${
        copied
          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200'
      } ${sizeClasses} ${className}`}
      title={copied ? 'Copied to clipboard!' : tooltipText}
      aria-label={`Copy ${value}`}
    >
      {copied ? (
        <>
          <Check className={`${iconSizes} text-emerald-600`} />
          <span className="text-[10px] font-bold text-emerald-700">Copied</span>
        </>
      ) : (
        <>
          <Copy className={`${iconSizes} text-slate-500 hover:text-slate-800`} />
          {label && <span>{label}</span>}
        </>
      )}
    </button>
  );
};
