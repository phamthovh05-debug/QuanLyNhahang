import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpenIcon,
  FlameIcon,
  ImageIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon } from
'lucide-react';
import { Card, PageHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DishFormModal } from '../components/dishes/DishFormModal';
import { useApp } from '../contexts/AppContext';
import { formatVnd } from '../utils/format';
import { servingsAvailable } from '../utils/inventory';
import type { Dish } from '../types';

export function Dishes() {
  const { dishes, batches, ingredientOf, deleteDish, dishSold } = useApp();
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<{open: boolean;dish: Dish | null;}>({ open: false, dish: null });
  const [confirm, setConfirm] = useState<Dish | null>(null);

  const rows = dishes.filter((dish) => dish.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="space-y-6 px-6 py-6">
      <PageHeader
        title="Quản lý món ăn"
        subtitle="Quản lý món trên thực đơn"
        action={
          <Button onClick={() => setForm({ open: true, dish: null })}>
            <PlusIcon className="h-4 w-4" />
            Thêm món ăn
          </Button>
        } />

      <Card className="p-4">
        <div className="relative max-w-md">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm món ăn..."
            aria-label="Tìm món ăn"
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((dish) => {
          const cost = dish.recipe.reduce(
            (sum, line) => sum + line.qty * ingredientOf(line.ingredientId).refCost,
            0
          );
          const servings = servingsAvailable(dish, batches);

          return (
            <Card key={dish.id} className="flex h-full flex-col overflow-hidden transition hover:border-blue-200 hover:shadow-md">
              <div className="relative h-48 bg-slate-100">
                {dish.image
                  ? <img src={dish.image} alt={dish.name} className="h-full w-full object-cover" />
                  : <div className="flex h-full items-center justify-center text-slate-300">
                      <ImageIcon className="h-10 w-10" />
                    </div>}
                <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                  <Badge tone="blue">{dish.category}</Badge>
                  {dish.special && <Badge tone="orange"><FlameIcon className="h-3 w-3" />Món đặc biệt</Badge>}
                </div>
                <div className="absolute right-3 top-3">
                  <Badge tone={dish.readyMade ? 'violet' : 'blue'}>
                    {dish.readyMade ? 'Có sẵn' : 'Qua bếp'}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-slate-900">{dish.name}</h2>
                    <p className="mt-1 text-xs text-slate-500">{dish.id}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-blue-700">{formatVnd(dish.price)}</p>
                </div>

                <div className="my-4 border-t border-slate-100" />

                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Giá vốn</dt>
                    <dd className="font-medium text-slate-800">{formatVnd(cost)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Bán hôm nay</dt>
                    <dd className="font-medium text-slate-800">{dishSold[dish.id] ?? 0}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Khả dụng</dt>
                    <dd>
                      <Badge tone={servings > 5 ? 'green' : servings > 0 ? 'amber' : 'red'}>
                        Còn {servings}
                      </Badge>
                    </dd>
                  </div>
                </dl>

                {dish.recipe.length === 0 && !dish.readyMade && (
                  <Link to="/recipes" className="mt-3 text-xs text-red-600 hover:underline">
                    Chưa có công thức
                  </Link>
                )}

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-1">
                    <Link to="/specials">
                      <Button size="sm" variant="ghost" aria-label="Thiết lập món đặc biệt" title="Thiết lập món đặc biệt">
                        <FlameIcon className={`h-4 w-4 ${dish.special ? 'text-orange-500' : ''}`} />
                      </Button>
                    </Link>
                    <Link to="/recipes">
                      <Button size="sm" variant="ghost" aria-label="Công thức" title="Công thức">
                        <BookOpenIcon className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="secondary" onClick={() => setForm({ open: true, dish })} aria-label={`Sửa ${dish.name}`} title="Sửa món">
                      <PencilIcon className="h-3.5 w-3.5" />
                      Sửa
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirm(dish)} aria-label={`Xóa ${dish.name}`} title="Xóa món">
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center">
          <ImageIcon className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">Không tìm thấy món ăn</p>
        </div>
      )}

      <DishFormModal open={form.open} dish={form.dish} onClose={() => setForm({ open: false, dish: null })} />
      <ConfirmDialog
        open={!!confirm}
        title="Xóa món ăn"
        message={<>Xóa <strong>{confirm?.name}</strong> khỏi thực đơn? Hóa đơn cũ vẫn giữ nguyên thông tin món.</>}
        confirmLabel="Xóa"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) deleteDish(confirm.id);
          setConfirm(null);
        }} />
    </div>
  );
}
