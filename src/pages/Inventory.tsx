import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangleIcon,
  BoxesIcon,
  ChevronRightIcon,
  PackagePlusIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TimerIcon,
  WalletIcon } from
'lucide-react';
import { Card, CardHeader, PageHeader } from '../components/ui/Card';
import { Badge, StateBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Field, inputClass } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../contexts/AppContext';
import { formatQty, formatVnd } from '../utils/format';
import {
  availableQty,
  batchState,
  countdownLabel,
  fefoBatches } from
'../utils/inventory';
import type { Ingredient, IngredientGroup, Unit } from '../types';

const PRODUCT_GROUPS: IngredientGroup[] = ['Thịt', 'Hải sản', 'Rau củ', 'Gia vị', 'Đồ uống', 'Đồ khô'];
const PRODUCT_UNITS: Unit[] = ['kg', 'g', 'lít', 'ml', 'lon', 'quả', 'chai', 'gói', 'hộp', 'thùng'];

const nextProductCode = (ingredients: Ingredient[]) => {
  const usedCodes = new Set(ingredients.flatMap(item => [item.code, item.id]).filter((code): code is string => !!code).map(code => code.toUpperCase()));
  let sequence = 1;
  let code = `SP-${String(sequence).padStart(4, '0')}`;
  while (usedCodes.has(code)) {
    sequence += 1;
    code = `SP-${String(sequence).padStart(4, '0')}`;
  }
  return code;
};

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return <>{children}<span className="ml-1 text-red-600" aria-hidden="true">*</span></>;
}

export function Inventory() {
  const { ingredients, batches, saveIngredient } = useApp();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>('ING-BO');
  const [productDraft, setProductDraft] = useState<Ingredient | null>(null);
  const [productError, setProductError] = useState<string | null>(null);

  const rows = ingredients.
  map((ing) => {
    const avail = availableQty(batches, ing.id);
    const lots = fefoBatches(batches, ing.id);
    const value = lots.reduce((s, b) => s + b.quantity * b.unitCost, 0);
    return { ing, avail, lots, value, low: avail < ing.minStock };
  }).
  filter(
    (r) =>
    r.ing.name.toLowerCase().includes(query.toLowerCase()) ||
    (r.ing.code ?? r.ing.id).toLowerCase().includes(query.toLowerCase()) ||
    r.lots.some((l) =>
    `${l.id} ${l.barcode}`.toLowerCase().includes(query.toLowerCase())
    )
  );

  const lowRows = rows.filter((r) => r.low);
  const inventoryValue = rows.reduce((total, row) => total + row.value, 0);
  const expiringLots = batches.filter((batch) => batchState(batch) === 'NEAR_EXPIRY').length;

  return (
    <div className="px-6 py-6">
      <PageHeader
        title="Tồn kho"
        action={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => {setProductError(null);setProductDraft({ id: '', code: nextProductCode(ingredients), name: '', unit: 'kg', group: 'Thịt', minStock: 0, refCost: 0 });}}>
            <PlusIcon className="h-4 w-4" /> Thêm sản phẩm
          </Button>
          <Link to="/warehouse/requests"><Button><PackagePlusIcon className="h-4 w-4" /> Đề nghị nhập kho</Button></Link>
        </div>
        } />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="!rounded-xl !shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-200 border-l-4 border-l-blue-800 !bg-blue-100/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Mặt hàng đang quản lý</p>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-800">
              <BoxesIcon className="h-5 w-5" />
            </span>
          </div>
          <p className="tabular mt-3 text-2xl font-bold text-blue-900">{rows.length}</p>
          <p className="mt-2 inline-flex rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium text-slate-600">Theo danh mục nguyên liệu</p>
        </Card>
        <Card className="!rounded-xl !shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-200 border-l-4 border-l-emerald-500 !bg-emerald-100/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Giá trị tồn khả dụng</p>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <WalletIcon className="h-5 w-5" />
            </span>
          </div>
          <p className="tabular mt-3 text-2xl font-bold text-emerald-900">{formatVnd(inventoryValue)}</p>
          <p className="mt-2 inline-flex rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium text-slate-600">Theo các lô còn khả dụng</p>
        </Card>
        <Card className={`!rounded-xl !shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-200 border-l-4 p-4 ${lowRows.length ? 'border-l-orange-500 !bg-orange-100/70' : 'border-l-emerald-500 !bg-emerald-100/70'}`}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Dưới mức tồn tối thiểu</p>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${lowRows.length ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>
              <AlertTriangleIcon className="h-5 w-5" />
            </span>
          </div>
          <p className={`tabular mt-3 text-2xl font-bold ${lowRows.length ? 'text-orange-900' : 'text-emerald-900'}`}>{lowRows.length}</p>
          <p className="mt-2 inline-flex rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium text-slate-600">Cần theo dõi và lập đề nghị nhập</p>
        </Card>
        <Card className={`!rounded-xl !shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-200 border-l-4 p-4 ${expiringLots ? 'border-l-violet-500 !bg-violet-100/70' : 'border-l-emerald-500 !bg-emerald-100/70'}`}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Lô sắp hết hạn</p>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${expiringLots ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>
              <TimerIcon className="h-5 w-5" />
            </span>
          </div>
          <p className={`tabular mt-3 text-2xl font-bold ${expiringLots ? 'text-violet-900' : 'text-emerald-900'}`}>{expiringLots}</p>
          <p className="mt-2 inline-flex rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium text-slate-600">Theo dõi tại mục hạn sử dụng</p>
        </Card>
      </div>

      {lowRows.length > 0 &&
      <Card className="mb-4 border-2 border-orange-300 !bg-orange-100">
          <div className="flex items-center gap-3 px-5 py-4">
            <AlertTriangleIcon className="h-6 w-6 shrink-0 text-orange-700" />
            <div>
              <p className="text-base font-bold text-orange-950">
                Cần nhập thêm {lowRows.length} mặt hàng
              </p>
            </div>
          </div>
        </Card>
      }

      <Card>
        <CardHeader
          title="Danh mục sản phẩm & tồn kho"
          action={
          <div className="relative w-full sm:w-72">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm mã sản phẩm, tên, mã lô hoặc barcode"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100" />
            
            </div>
          } />
        
        <div className="overflow-x-auto scroll-thin">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-5 py-2.5 font-medium">Sản phẩm / mã sản phẩm</th>
              <th className="px-5 py-2.5 font-medium">Nhóm</th>
              <th className="px-5 py-2.5 text-right font-medium">Tồn khả dụng</th>
              <th className="px-5 py-2.5 text-right font-medium">Tồn tối thiểu</th>
              <th className="px-5 py-2.5 text-right font-medium">Giá trị tồn</th>
              <th className="px-5 py-2.5 font-medium">Lô gần hết hạn nhất</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ ing, avail, lots, value, low }) => {
              const first = lots[0];
              const expanded = open === ing.id;
              return (
                <React.Fragment key={ing.id}>
                  <tr
                    className="cursor-pointer transition-colors duration-150 ease-out hover:bg-slate-50"
                    onClick={() => setOpen(expanded ? null : ing.id)}>
                    
                    <td className="px-5 py-3 font-medium text-slate-900">
                      <span className="block">{ing.name}</span>
                      <span className="mt-0.5 block font-mono text-[11px] font-medium text-slate-400">{ing.code ?? ing.id}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{ing.group}</td>
                    <td className="tabular px-5 py-3 text-right font-semibold text-slate-900">
                      {formatQty(avail, ing.unit)}
                    </td>
                    <td className="tabular px-5 py-3 text-right text-slate-500">
                      {formatQty(ing.minStock, ing.unit)}
                    </td>
                    <td className="tabular px-5 py-3 text-right text-slate-700">
                      {formatVnd(value)}
                    </td>
                    <td className="px-5 py-3">
                      {first ?
                      <span className="text-slate-600">
                          {first.id} ·{' '}
                          <span className="text-slate-400">
                            {countdownLabel(first.expiryDate)}
                          </span>
                        </span> :

                      <Badge tone="red">Hết hàng</Badge>
                      }
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {low && <Badge tone="orange">Sắp hết</Badge>}
                        <button aria-label={`Sửa ${ing.name}`} onClick={(event) => {event.stopPropagation();setProductError(null);setProductDraft({...ing, code: ing.code ?? ing.id});}} className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-700"><PencilIcon className="h-4 w-4" /></button>
                        <ChevronRightIcon
                          className={`h-4 w-4 text-slate-400 transition-transform duration-150 ease-out ${expanded ? 'rotate-90' : ''}`} />
                        
                      </div>
                    </td>
                  </tr>
                  <AnimatePresence initial={false}>
                    {expanded &&
                    <tr>
                        <td colSpan={7} className="bg-slate-50 p-0">
                          <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{
                            duration: 0.2,
                            ease: [0.23, 1, 0.32, 1]
                          }}
                          className="overflow-hidden">
                          
                            <div className="px-5 py-4">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Chi tiết lô — thứ tự xuất kho FEFO
                              </p>
                              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                <table className="w-full text-xs">
                                  <thead className="bg-slate-50 text-left text-slate-500">
                                    <tr>
                                      <th className="px-3 py-2 font-medium">#</th>
                                      <th className="px-3 py-2 font-medium">Mã lô</th>
                                      <th className="px-3 py-2 text-right font-medium">Số lượng</th>
                                      <th className="px-3 py-2 font-medium">Hạn sử dụng</th>
                                      <th className="px-3 py-2 text-right font-medium">Giá nhập</th>
                                      <th className="px-3 py-2 font-medium">Trạng thái</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {lots.map((b, i) =>
                                  <tr key={b.id}>
                                        <td className="px-3 py-2 text-slate-400">
                                          {i + 1}
                                        </td>
                                        <td className="px-3 py-2 font-medium text-slate-800">
                                          {b.id}
                                        </td>
                                        <td className="tabular px-3 py-2 text-right">
                                          {formatQty(b.quantity, ing.unit)}
                                        </td>
                                        <td className="px-3 py-2">
                                          {countdownLabel(b.expiryDate)}
                                        </td>
                                        <td className="tabular px-3 py-2 text-right">
                                          {formatVnd(b.unitCost)}/{ing.unit}
                                        </td>
                                        <td className="px-3 py-2">
                                          <StateBadge state={batchState(b)} />
                                        </td>
                                      </tr>
                                  )}
                                    {lots.length === 0 &&
                                  <tr>
                                        <td
                                      colSpan={6}
                                      className="px-3 py-4 text-center text-slate-500">
                                      
                                          Không còn lô khả dụng — cần nhập thêm
                                        </td>
                                      </tr>
                                  }
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    }
                  </AnimatePresence>
                </React.Fragment>);

            })}
          </tbody>
        </table>
        </div>
      </Card>
      <Modal
        open={!!productDraft}
        onClose={() => setProductDraft(null)}
        title={productDraft?.id ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm'}
        description="Mã sản phẩm là duy nhất; mã lô vẫn được quản lý riêng theo từng lần nhập."
        footer={(
          <>
            <Button variant="secondary" onClick={() => setProductDraft(null)}>Đóng</Button>
            <Button onClick={() => {
              if (!productDraft) return;
              const code = (productDraft.code ?? '').trim();
              const id = productDraft.id || `ING-${code}`;
              const error = saveIngredient({...productDraft, id, code});
              setProductError(error);
              if (!error) setProductDraft(null);
            }}>Lưu</Button>
          </>
        )}
      >
        {productDraft && (
          <div className="space-y-4">
            <Field label={<RequiredLabel>Mã sản phẩm</RequiredLabel>}>
              <input required readOnly value={productDraft.code ?? ''} className={`${inputClass} bg-slate-50 text-slate-500`} />
            </Field>
            <Field label={<RequiredLabel>Tên sản phẩm</RequiredLabel>}>
              <input required value={productDraft.name} onChange={(event) => setProductDraft({...productDraft, name: event.target.value})} className={inputClass} placeholder="Tên nguyên liệu hoặc sản phẩm" />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={<RequiredLabel>Nhóm sản phẩm</RequiredLabel>}>
                <select value={productDraft.group} onChange={(event) => setProductDraft({...productDraft, group: event.target.value as IngredientGroup})} className={inputClass}>
                  {PRODUCT_GROUPS.map((group) => <option key={group}>{group}</option>)}
                </select>
              </Field>
              <Field label={<RequiredLabel>Đơn vị tồn kho</RequiredLabel>}>
                <select value={productDraft.unit} onChange={(event) => setProductDraft({...productDraft, unit: event.target.value as Unit})} className={inputClass}>
                  {PRODUCT_UNITS.map((unit) => <option key={unit}>{unit}</option>)}
                </select>
              </Field>
              <Field label={<RequiredLabel>Tồn tối thiểu</RequiredLabel>}>
                <input required type="number" min="0" step="0.001" value={productDraft.minStock} onChange={(event) => setProductDraft({...productDraft, minStock: Number(event.target.value)})} className={inputClass} />
              </Field>
              <Field label={<RequiredLabel>Giá vốn tham chiếu</RequiredLabel>}>
                <input required type="number" min="0" step="100" value={productDraft.refCost} onChange={(event) => setProductDraft({...productDraft, refCost: Number(event.target.value)})} className={inputClass} />
              </Field>
            </div>
            {productError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{productError}</p>}
          </div>
        )}
      </Modal>
    </div>);

}
