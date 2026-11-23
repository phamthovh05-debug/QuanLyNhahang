import { useEffect, useState } from 'react';
import { ImagePlusIcon, UploadIcon, XIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Field, inputClass } from '../ui/Field';
import { useApp } from '../../contexts/AppContext';
import type { Dish, DishCategory } from '../../types';

const CATEGORIES: DishCategory[] = ['Món chính', 'Khai vị', 'Hải sản', 'Thịt', 'Rau', 'Đồ uống'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

export function DishFormModal({
  open,
  dish,
  onClose
}: {open: boolean;dish: Dish | null;onClose: () => void;}) {
  const { saveDish, ingredients } = useApp();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<DishCategory>('Món chính');
  const [image, setImage] = useState('');
  const [imageError, setImageError] = useState('');
  const [readyMade, setReadyMade] = useState(false);
  const [stockIngredientId, setStockIngredientId] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(dish?.name ?? '');
    setPrice(dish ? String(dish.price) : '');
    setCategory(dish?.category ?? 'Món chính');
    setImage(dish?.image ?? '');
    setImageError('');
    setReadyMade(!!dish?.readyMade);
    setStockIngredientId(dish?.stockIngredientId ?? '');
  }, [open, dish]);

  const valid = name.trim() && Number(price) > 0 && (!readyMade || !!stockIngredientId);

  const uploadImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError('Vui lòng chọn tệp hình ảnh.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError('Ảnh không được vượt quá 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setImageError('Không thể tải ảnh đã chọn.');
        return;
      }
      const source = new Image();
      source.onload = () => {
        const scale = Math.min(1, 1200 / Math.max(source.width, source.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(source.width * scale);
        canvas.height = Math.round(source.height * scale);
        const context = canvas.getContext('2d');
        if (!context) {
          setImageError('Không thể xử lý tệp hình ảnh.');
          return;
        }
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        setImage(canvas.toDataURL('image/jpeg', 0.82));
        setImageError('');
      };
      source.onerror = () => setImageError('Không thể đọc tệp hình ảnh.');
      source.src = reader.result;
    };
    reader.onerror = () => setImageError('Không thể đọc tệp hình ảnh.');
    reader.readAsDataURL(file);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={dish ? `Sửa món — ${dish.name}` : 'Thêm món mới'}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button
            disabled={!valid}
            onClick={() => {
              saveDish({
                id: dish?.id ?? `DISH-${Date.now().toString(36)}`,
                recipe: readyMade ? [] : dish?.recipe ?? [],
                stockIngredientId: readyMade ? stockIngredientId : undefined,
                special: dish?.special,
                specialReason: dish?.specialReason,
                specialCampaignId: dish?.specialCampaignId,
                specialPrice: dish?.specialPrice,
                specialQuantity: dish?.specialQuantity,
                specialRemaining: dish?.specialRemaining,
                name: name.trim(),
                price: Number(price),
                category,
                image,
                readyMade
              });
              onClose();
            }}>
            Lưu
          </Button>
        </>
      }>
      <div className="space-y-5">
        <Field label="Tên món">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Bò nướng lá lốt" className={inputClass} autoFocus />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Giá bán (VNĐ)">
            <input type="number" min={0} value={price} onChange={(event) => setPrice(event.target.value)} placeholder="150000" className={inputClass} />
          </Field>
          <Field label="Danh mục">
            <select value={category} onChange={(event) => setCategory(event.target.value as DishCategory)} className={inputClass}>
              {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Luồng xử lý</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { value: false, title: 'Cần chế biến', detail: 'Gửi xuống màn hình bếp' },
              { value: true, title: 'Món có sẵn', detail: 'Chuyển thẳng đến thu ngân' }
            ].map((option) => (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => setReadyMade(option.value)}
                className={`rounded-xl border p-4 text-left transition ${
                  readyMade === option.value
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                    : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
                }`}>
                <p className="text-sm font-semibold text-slate-900">{option.title}</p>
                <p className="mt-1 text-xs text-slate-500">{option.detail}</p>
              </button>
            ))}
          </div>
        </div>

        {readyMade && (
          <Field label="Mã sản phẩm quản lý tồn kho">
            <select value={stockIngredientId} onChange={(event) => setStockIngredientId(event.target.value)} className={inputClass}>
              <option value="">Chọn sản phẩm trong danh mục kho</option>
              {ingredients.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.code ?? ingredient.id} · {ingredient.name} ({ingredient.unit})</option>)}
            </select>
            <span className="mt-1 block text-xs text-slate-500">Sản phẩm sẽ được xuất kho khi thu ngân xác nhận hoàn thành.</span>
          </Field>
        )}

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Hình ảnh món ăn</p>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="flex min-h-36 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
              {image
                ? <img src={image} alt="Xem trước món ăn" className="h-48 w-full object-cover" />
                : <div className="flex flex-col items-center gap-2 text-slate-400">
                    <ImagePlusIcon className="h-8 w-8" />
                    <span className="text-xs">Chưa chọn hình ảnh</span>
                  </div>}
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-col">
              <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700">
                <UploadIcon className="h-4 w-4" />
                Tải ảnh lên
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    uploadImage(event.target.files?.[0]);
                    event.currentTarget.value = '';
                  }} />
              </label>
              {image && (
                <Button type="button" variant="secondary" onClick={() => {
                  setImage('');
                  setImageError('');
                }}>
                  <XIcon className="h-4 w-4" />
                  Xóa ảnh
                </Button>
              )}
            </div>
          </div>
          <span className="mt-2 block text-xs text-slate-500">Chọn tệp JPG, PNG hoặc ảnh khác (tối đa 2 MB).</span>
          {imageError && <span role="alert" className="mt-2 block text-sm text-red-600">{imageError}</span>}
        </div>
      </div>
    </Modal>
  );
}
