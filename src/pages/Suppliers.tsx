
import {
  MapPinIcon,
  PhoneIcon,
  SearchIcon,
  PencilIcon,
  Trash2Icon,
  PlusIcon,
  XIcon,
  PackageIcon,
  FileTextIcon,
  Building2Icon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from 'lucide-react';

import { useMemo, useState } from 'react';
import { Card, PageHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useApp } from '../contexts/AppContext';
import { formatVnd } from '../utils/format';
import type { Supplier } from '../types';

type SupplierForm = {
  code: string;
  name: string;
  taxCode: string;
  phone: string;
  email: string;
  address: string;
};

export function Suppliers() {
  const { suppliers, batches, ingredientOf, saveSupplier, deleteSupplier } = useApp();

  const [keyword, setKeyword] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [toast, setToast] = useState('');
  const [toastIsError, setToastIsError] = useState(false);

  const [form, setForm] = useState<SupplierForm>({
    code: '',
    name: '',
    taxCode: '',
    phone: '',
    email: '',
    address: '',
  });

  const filteredSuppliers = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return suppliers.filter((supplier) =>
      supplier.name.toLowerCase().includes(search) ||
      supplier.phone.includes(search) ||
      supplier.code.toLowerCase().includes(search)
    );
  }, [suppliers, keyword]);

  const getSupplierBatches = (supplierId: string) =>
    batches.filter((batch) => batch.supplierId === supplierId);

  const showToast = (message: string, isError = false) => {
    setToast(message);
    setToastIsError(isError);
    window.setTimeout(() => setToast(''), 3000);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);

    setForm({
      code: supplier.code ?? supplier.id,
      name: supplier.name ?? '',
      taxCode: supplier.taxCode ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      address: supplier.address ?? '',
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!editingSupplier) return;
    const error = saveSupplier({ ...editingSupplier, ...form });
    if (error) {
      showToast(error, true);
      return;
    }

    setEditingSupplier(null);
    showToast(editingSupplier.id
      ? 'Cập nhật nhà cung cấp thành công'
      : 'Thêm nhà cung cấp thành công'
    );
  };

  const handleDelete = () => {
    if (!deletingSupplier) return;

    const error = deleteSupplier(deletingSupplier.id);
    if (error) {
      showToast(error, true);
      return;
    }

    setDeletingSupplier(null);
    setSelectedSupplier(null);
    showToast('Đã ngừng hoạt động nhà cung cấp');
  };

  return (
    <div className="space-y-6 px-6 py-6">
      <PageHeader
        title="Nhà cung cấp"
        subtitle="Quản lý thông tin và lịch sử cung ứng hàng hóa"
        action={
          <button
            onClick={() => openEdit({
              id: '',
              code: '',
              name: '',
              phone: '',
              isActive: true
            })}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4" />
            Thêm nhà cung cấp
          </button>
        }
      />

      {/* Tìm kiếm */}
      <Card className="p-4">
        <div className="relative max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo tên hoặc số điện thoại..."
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </Card>

      {/* Danh sách nhà cung cấp */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredSuppliers.map((supplier) => {
          const lots = getSupplierBatches(supplier.id);

          const value = lots.reduce(
            (sum, batch) =>
              sum + batch.initialQuantity * batch.unitCost,
            0
          );

          const items = [
            ...new Set(
              lots.map((batch) =>
                ingredientOf(batch.ingredientId).name
              ),
            ),
          ];

          return (
            <div
              key={supplier.id}
              onClick={() => setSelectedSupplier(supplier)}
              className="h-full cursor-pointer"
            >
            <Card className="flex h-full flex-col p-5 transition hover:border-blue-200 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <button
                  onClick={() => setSelectedSupplier(supplier)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <Building2Icon className="h-5 w-5 shrink-0 text-blue-600" />
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {supplier.name}
                    </p>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    Mã NCC: {supplier.code}
                  </p>
                </button>

                <div className="flex shrink-0 items-center gap-1">
                  <Badge tone={supplier.isActive ? 'green' : 'slate'}>
                    {supplier.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                  </Badge>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      openEdit(supplier);
                    }}
                    title="Chỉnh sửa"
                    className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>

                  {supplier.isActive && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeletingSupplier(supplier);
                      }}
                      title="Ngừng hoạt động nhà cung cấp"
                      className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <PhoneIcon className="h-3.5 w-3.5" />
                  {supplier.phone || 'Chưa cập nhật'}
                </p>

                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <FileTextIcon className="h-3.5 w-3.5" />
                  MST: {supplier.taxCode || 'Chưa cập nhật'}
                </p>

                <p className="flex items-start gap-2 text-xs text-slate-500">
                  <MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {supplier.address || 'Chưa cập nhật'}
                </p>
              </div>

              <div className="my-4 border-t border-slate-100" />

              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Số lô đã nhập</dt>
                  <dd className="font-medium text-slate-900">{lots.length}</dd>
                </div>

                <div className="flex justify-between">
                  <dt className="text-slate-500">Tổng giá trị nhập</dt>
                  <dd className="font-semibold text-blue-700">
                    {formatVnd(value)}
                  </dd>
                </div>
              </dl>

              <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                {items.slice(0, 3).map((item) => (
                  <Badge key={item} tone="slate">
                    {item}
                  </Badge>
                ))}

                {items.length > 3 && (
                  <Badge tone="slate">+{items.length - 3}</Badge>
                )}
              </div>
            </Card>
            </div>
          );
        })}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center">
          <Building2Icon className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            Không tìm thấy nhà cung cấp
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Thử tìm bằng tên hoặc số điện thoại khác.
          </p>
        </div>
      )}

      {/* Chi tiết nhà cung cấp */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white p-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Chi tiết nhà cung cấp
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedSupplier.name}
                </p>
              </div>

              <button
                onClick={() => setSelectedSupplier(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Detail label="Mã nhà cung cấp" value={selectedSupplier.code} />
                <Detail label="Tên nhà cung cấp" value={selectedSupplier.name} />
                <Detail label="Mã số thuế" value={selectedSupplier.taxCode} />
                <Detail label="Số điện thoại" value={selectedSupplier.phone} />
                <Detail label="Email" value={selectedSupplier.email} />
                <Detail label="Địa chỉ" value={selectedSupplier.address} />
              </div>

              <div className="border-t pt-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <PackageIcon className="h-4 w-4 text-blue-600" />
                  Lịch sử lô hàng
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="p-3">Nguyên liệu</th>
                        <th className="p-3">Số lượng ban đầu</th>
                        <th className="p-3">Đơn giá</th>
                        <th className="p-3">Giá trị</th>
                      </tr>
                    </thead>

                    <tbody>
                      {getSupplierBatches(selectedSupplier.id).map((batch) => (
                        <tr key={batch.id} className="border-b">
                          <td className="p-3 font-medium text-slate-800">
                            {ingredientOf(batch.ingredientId).name}
                          </td>
                          <td className="p-3">{batch.initialQuantity}</td>
                          <td className="p-3">
                            {formatVnd(batch.unitCost)}
                          </td>
                          <td className="p-3 font-medium">
                            {formatVnd(batch.initialQuantity * batch.unitCost)}
                          </td>
                        </tr>
                      ))}

                      {getSupplierBatches(selectedSupplier.id).length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-slate-400">
                            Chưa có lô hàng nào.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    openEdit(selectedSupplier);
                    setSelectedSupplier(null);
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Chỉnh sửa thông tin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup chỉnh sửa */}
      {editingSupplier && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
          <form
            onSubmit={handleUpdate}
            className="w-full max-w-lg rounded-xl bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b p-5">
              <h2 className="text-lg font-semibold">
                {editingSupplier.id ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp'}
              </h2>
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <FormField
                label="Mã nhà cung cấp"
                value={form.code}
                onChange={(value) => setForm({ ...form, code: value })}
                required
              />

              <FormField
                label="Tên nhà cung cấp"
                value={form.name}
                onChange={(value) => setForm({ ...form, name: value })}
                required
              />

              <FormField
                label="Mã số thuế"
                value={form.taxCode}
                onChange={(value) => setForm({ ...form, taxCode: value })}
              />

              <FormField
                label="Số điện thoại"
                value={form.phone}
                onChange={(value) => setForm({ ...form, phone: value })}
                required
              />

              <FormField
                label="Email"
                value={form.email}
                onChange={(value) => setForm({ ...form, email: value })}
              />

              <FormField
                label="Địa chỉ"
                value={form.address}
                onChange={(value) => setForm({ ...form, address: value })}
              />
            </div>

            <div className="flex justify-end gap-2 border-t p-5">
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Hủy
              </button>

              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Lưu
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Popup xác nhận xóa */}
      {deletingSupplier && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-50 p-3">
                <AlertTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">
                  Ngừng hoạt động nhà cung cấp
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Bạn có chắc chắn muốn xóa nhà cung cấp này?
                </p>
              </div>
            </div>

            <div className="my-5 rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-semibold">{deletingSupplier.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                Mã NCC: {deletingSupplier.code}
              </p>
            </div>

            <p className="text-xs leading-5 text-slate-500">
              Thông tin nhà cung cấp đã phát sinh giao dịch cần được bảo toàn
              trong lịch sử phiếu nhập hàng.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeletingSupplier(null)}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Hủy
              </button>

              <button
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Ngừng hoạt động
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thông báo thành công */}
      {toast && (
        <div className={`fixed right-5 top-5 z-[100] flex items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-lg ${toastIsError ? 'border-red-200' : 'border-green-200'}`}>
          {toastIsError
            ? <AlertTriangleIcon className="h-5 w-5 text-red-600" />
            : <CheckCircleIcon className="h-5 w-5 text-green-600" />}
          <p className="text-sm font-medium text-slate-800">{toast}</p>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-800">
        {value || 'Chưa cập nhật'}
      </p>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  disabled,
  required,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <input
        value={value}
        disabled={disabled}
        required={required}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </div>
  );
}
