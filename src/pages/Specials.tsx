import { useState } from 'react';
import { FlameIcon, TimerIcon } from 'lucide-react';
import { Card, CardHeader, PageHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Field, inputClass } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../contexts/AppContext';
import { batchState, countdownLabel, daysLeft, servingsAvailable } from '../utils/inventory';

interface SpecialDraft {
  dishId: string;
  reason: string;
  price: string;
  quantity: string;
}

export function Specials() {
  const { batches, dishes, ingredientOf, configureSpecial, endSpecial } = useApp();
  const [draft, setDraft] = useState<SpecialDraft | null>(null);
  const [error, setError] = useState('');

  const priority = batches.
  filter((b) => batchState(b) === 'NEAR_EXPIRY' && b.quantity > 0).
  sort((a, b) => +new Date(a.expiryDate) - +new Date(b.expiryDate));

  const specials = dishes.filter((d) => d.special);

  return (
    <div className="px-6 py-6">
      <PageHeader
        title="Món đặc biệt" />
      

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card>
            <CardHeader title="Nguyên liệu" />
            
            {priority.length === 0 &&
            <p className="px-5 py-10 text-center text-sm text-slate-500">
                Không có nguyên liệu nào cần ưu tiên. Kho đang ở trạng thái tốt.
              </p>
            }
            <ul className="divide-y divide-slate-100">
              {priority.map((b) => {
                const ing = ingredientOf(b.ingredientId);
                const options = dishes.filter((d) =>
                !d.readyMade && d.recipe.length > 0 && d.recipe.some((r) => r.ingredientId === ing.id)
                );
                return (
                  <li key={b.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                        <TimerIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-slate-900">
                          {ing.name}
                        </p>
                      </div>
                      <Badge tone={daysLeft(b.expiryDate) <= 1 ? 'red' : 'amber'}>
                        {countdownLabel(b.expiryDate)}
                      </Badge>
                    </div>

                    <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-700">
                      MÓN ĐỀ XUẤT
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {options.map((d) => {
                        return (
                          <div
                            key={d.id}
                            className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${
                              d.special ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-white'
                            }`}>
                            <img src={d.image} alt="" className="h-9 w-9 rounded-md object-cover" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900">{d.name}</p>
                            </div>
                            <Button
                              size="sm"
                              variant={d.special ? 'secondary' : 'primary'}
                              onClick={() => {
                                setError('');
                                setDraft({
                                  dishId: d.id,
                                  reason: `Ưu tiên tiêu thụ ${ing.name} — lô ${b.id}`,
                                  price: String(d.specialPrice ?? d.price),
                                  quantity: d.specialRemaining === undefined ? '' : String(d.specialRemaining)
                                });
                              }}>
                              {d.special ? 'Điều chỉnh' : 'Thiết lập'}
                            </Button>
                          </div>
                        );

                      })}
                    </div>
                  </li>);

              })}
            </ul>
          </Card>
        </div>

        <div className="xl:col-span-5">
          <Card>
            <CardHeader title="🔥 Món đặc biệt hôm nay" />
            
            {specials.length === 0 ?
            <p className="px-5 py-10 text-center text-sm text-slate-500">
                Chưa có món đặc biệt nào.
              </p> :

            <ul className="divide-y divide-slate-100">
                {specials.map((d) =>
              <li key={d.id} className="flex items-center gap-3 px-5 py-4">
                    <img
                  src={d.image}
                  alt=""
                  className="h-14 w-14 rounded-lg object-cover" />
                
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                        <FlameIcon className="h-4 w-4 text-orange-500" />
                        {d.name}
                      </p>
                    </div>
                    <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => endSpecial(d.id)}>
                  
                      Gỡ khỏi menu
                    </Button>
                  </li>
              )}
              </ul>
            }
          </Card>
        </div>
      </div>
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title="Thiết lập món đặc biệt"
        description="Chọn giá bán và số phần được phục vụ trong đợt này."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDraft(null)}>Hủy</Button>
            <Button
              disabled={!draft || Number(draft.price) <= 0 || !Number.isInteger(Number(draft.quantity)) || Number(draft.quantity) <= 0}
              onClick={() => {
                if (!draft) return;
                const result = configureSpecial(draft.dishId, {
                  reason: draft.reason,
                  price: Number(draft.price),
                  quantity: Number(draft.quantity)
                });
                if (result) {
                  setError(result);
                  return;
                }
                setDraft(null);
              }}>
              Đưa lên menu Order
            </Button>
          </>
        }>
        {draft && (() => {
          const dish = dishes.find((item) => item.id === draft.dishId);
          if (!dish) return <p role="alert" className="text-sm text-red-600">Không tìm thấy món đã chọn.</p>;
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <img src={dish.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                <div>
                  <p className="font-semibold text-slate-900">{dish.name}</p>
                  <p className="text-xs text-slate-500">
                    Tồn hiện tại có thể phục vụ {servingsAvailable(dish, batches)} phần
                  </p>
                </div>
              </div>
              <Field label="Giá bán món đặc biệt (VNĐ)">
                <input
                  type="number"
                  min="1"
                  value={draft.price}
                  onChange={(event) => setDraft({ ...draft, price: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Số lượng phục vụ tối đa (phần)">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={draft.quantity}
                  onChange={(event) => setDraft({ ...draft, quantity: event.target.value })}
                  className={inputClass}
                />
              </Field>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            </div>
          );
        })()}
      </Modal>
    </div>);

}
