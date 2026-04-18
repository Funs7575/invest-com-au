"use client";

import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  id: string;
}

export function Input({
  label,
  hint,
  error,
  id,
  className = "",
  ...props
}: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
          {label}
          {props.required && (
            <span className="text-red-500 ml-1" aria-hidden="true">*</span>
          )}
        </label>
      )}
      <input
        id={id}
        className={`
          w-full px-4 py-3 text-sm text-slate-900 bg-white border rounded-xl
          placeholder:text-slate-500 transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400
          disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
          ${error
            ? "border-red-400 bg-red-50 focus:ring-red-400 focus:border-red-400"
            : "border-slate-200 hover:border-slate-300"
          }
          ${className}
        `}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
        {...props}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-600 flex items-center gap-1" role="alert">
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
