import { useEffect, useState } from 'react';
import { PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from 'lucide-react';
import { Card, CardHeader, PageHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { formatQty, formatVnd } from '../utils/format';
import { availableQty } from '../utils/inventory';
import type { RecipeItem } from '../types';

export function Recipes() {
  const { dishes, ingredients, ingredientOf, batches, saveRecipe } = useApp();
  const { user } = useAuth();
  const canEdit = user?.role === 'Bếp';
  const recipeDishes = dishes.filter((item) => !item.readyMade);
  const [selectedId, setSelectedId] = useState(recipeDishes[0]?.id ?? '');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RecipeItem[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [search, setSearch] = useState('');

  const dish = recipeDishes.find((d) => d.id === selectedId) ?? recipeDishes[0];
  const filteredDishes = recipeDishes.filter((item) =>
    item.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  useEffect(() => {
    setEditing(false);
    setConfirmDelete(false);
    setDraft(dish?.recipe ?? []);
  }, [canEdit, dish?.id, dish?.recipe]);

  if (!dish) return null;

  const recipe = editing ? draft : dish.recipe;
  const cost = recipe.reduce((s, r) => s + r.qty * ingredientOf(r.ingredientId).refCost, 0);
  const unused = ingredients.filter((i) => !draft.some((r) => r.ingredientId === i.id));

  return (
    <div className="px-6 py-6">
      <PageHeader
        title="Quản lý công thức"
        subtitle="Định lượng nguyên liệu cho từng món ăn." />
      

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-4">
          <CardHeader title="Danh sách món ăn" subtitle={`${recipeDishes.length} món`} />
          <div className="border-b border-slate-100 p-4">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm món ăn..."
                aria-label="Tìm món ăn"
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
          <ul className="max-h-[620px] space-y-2 overflow-y-auto p-3 scroll-thin">
            {filteredDishes.map((d) =>
            <li key={d.id}>
                <button
                onClick={() => setSelectedId(d.id)}
                className={`flex w-full items-center gap-3 rounded-xl border border-l-4 px-3 py-3 text-left transition-colors duration-150 ease-out ${
                dish.id === d.id
                  ? 'border-blue-200 border-l-brand-700 bg-brand-50 shadow-sm'
                  : 'border-transparent border-l-transparent hover:border-slate-200 hover:bg-slate-50'}`
                }>
                
                  <img src={d.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{d.name}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="tabular text-sm font-bold text-brand-700">{formatVnd(d.price)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        d.recipe.length ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {d.recipe.length ? `${d.recipe.length} nguyên liệu` : 'Chưa có công thức'}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            )}
            {!filteredDishes.length && (
              <li className="px-3 py-8 text-center text-sm text-slate-500">
                Không tìm thấy món ăn phù hợp.
              </li>
            )}
          </ul>
        </Card>

        <div className="space-y-4 xl:col-span-8">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-bold tracking-tight text-[#172b4d]">{dish.name}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">
                    Giá bán · {formatVnd(dish.price)}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                    Giá vốn · {formatVnd(cost)} / phần
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                  {canEdit && editing && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={unused.length === 0}
                      onClick={() => setDraft((items) => [...items, { ingredientId: unused[0].id, qty: 0.1 }])}>
                      <PlusIcon className="h-3.5 w-3.5" />
                      Thêm nguyên liệu
                    </Button>
                  )}
                  {canEdit && !editing &&
                <>
                  <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                      <PencilIcon className="h-3.5 w-3.5" />
                      {dish.recipe.length ? 'Sửa công thức' : 'Thêm công thức'}
                    </Button>
                  {dish.recipe.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50"
                      aria-label={`Xóa công thức ${dish.name}`}
                      title="Xóa công thức"
                      onClick={() => setConfirmDelete(true)}>
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  )}
                </>
                }
              </div>
            </div>
            
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-600">
                  <th className="px-5 py-3 font-semibold">Nguyên liệu</th>
                  <th className="px-5 py-3 text-right font-semibold">Định lượng / phần</th>
                  <th className="px-5 py-3 text-right font-semibold">Giá vốn</th>
                  <th className="px-5 py-3 text-right font-semibold">Tồn khả dụng</th>
                  {editing && <th className="w-12 px-3 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recipe.map((r, idx) => {
                  const ing = ingredientOf(r.ingredientId);
                  return (
                    <tr key={r.ingredientId} className="transition-colors duration-150 hover:bg-slate-50">
                      <td className="px-5 py-2.5 font-medium text-slate-900">
                        {editing ?
                        <select
                          value={r.ingredientId}
                          onChange={(e) =>
                          setDraft((d) => d.map((x, i) => i === idx ? { ...x, ingredientId: e.target.value } : x))
                          }
                          className="rounded-md border border-slate-300 px-2 py-1 text-sm">
                          
                            {[ing, ...unused].map((o) =>
                          <option key={o.id} value={o.id}>{o.name}</option>
                          )}
                          </select> :

                        ing.name
                        }
                      </td>
                      <td className="tabular px-5 py-2.5 text-right font-semibold text-slate-900">
                        {editing ?
                        <span className="inline-flex items-center gap-1.5">
                            <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={r.qty}
                            onChange={(e) =>
                            setDraft((d) => d.map((x, i) => i === idx ? { ...x, qty: Number(e.target.value) } : x))
                            }
                            className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right text-sm" />
                          
                            <span className="w-8 text-left text-xs text-slate-500">{ing.unit}</span>
                          </span> :

                        formatQty(r.qty, ing.unit)
                        }
                      </td>
                      <td className="tabular px-5 py-2.5 text-right font-medium text-slate-700">{formatVnd(r.qty * ing.refCost)}</td>
                      <td className="tabular px-5 py-2.5 text-right font-semibold text-slate-900">{formatQty(availableQty(batches, ing.id), ing.unit)}</td>
                      {editing &&
                      <td className="px-3">
                          <button
                          onClick={() => setDraft((d) => d.filter((_, i) => i !== idx))}
                          aria-label={`Bỏ ${ing.name}`}
                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                          
                            <Trash2Icon className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      }
                    </tr>);

                })}
                {recipe.length === 0 &&
                <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-500">
                      Món chưa có công thức{canEdit ? ' — chọn “Thêm công thức” để khai báo nguyên liệu.' : '.'}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            </div>
            {editing &&
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => {setDraft(dish.recipe);setEditing(false);}}>
                    Hủy
                  </Button>
                  <Button
                  size="sm"
                  disabled={draft.some((r) => !(r.qty > 0))}
                  onClick={() => {saveRecipe(dish.id, draft);setEditing(false);}}>
                  
                    Lưu
                  </Button>
                </div>
              </div>
            }
          </Card>
        </div>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title="Xóa công thức"
        message={<>Bạn có chắc muốn xóa công thức của món <strong>{dish.name}</strong>? Thao tác này không thể hoàn tác.</>}
        confirmLabel="Xóa công thức"
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          saveRecipe(dish.id, []);
          setDraft([]);
          setEditing(false);
          setConfirmDelete(false);
        }} />
    </div>);

}
