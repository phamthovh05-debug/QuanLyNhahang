import React from 'react';

export function Card({
  children,
  className = ''



}: {children: React.ReactNode;className?: string;}) {
  return (
    <div
      className={`surface-card rounded-2xl border border-slate-200/80 bg-white shadow-card ${className}`}>
      
      {children}
    </div>);

}

export function CardHeader({
  title,
  titleClassName = '',
  subtitle,
  action



}: {title: string;titleClassName?: string;subtitle?: string;action?: React.ReactNode;}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 className={`text-sm font-bold tracking-tight text-slate-900 ${titleClassName}`}>{title}</h2>
        {subtitle &&
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        }
      </div>
      {action}
    </div>);

}

export function PageHeader({
  title,
  eyebrow,
  subtitle,
  titleClassName = '',
  action



}: {title: string;eyebrow?: string;subtitle?: string;action?: React.ReactNode;titleClassName?: string;}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">{eyebrow}</p>}
        <h1 className={`text-2xl font-bold tracking-tight text-[#172b4d] sm:text-3xl ${titleClassName}`}>
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>);

}
