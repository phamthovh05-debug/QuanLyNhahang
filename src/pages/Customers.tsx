import { useMemo, useState } from 'react';
import {
  MapPinIcon,
  MailIcon,
  PhoneIcon,
  SearchIcon,
  PencilIcon,
  Trash2Icon,
  PlusIcon,
  UsersIcon,
  ReceiptTextIcon,
  XIcon
} from 'lucide-react';
import { Card, PageHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Field, inputClass } from '../components/ui/Field';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../contexts/AppContext';
import { formatDateTime, formatVnd } from '../utils/format';
import type { Customer } from '../types';

type CustomerDraft = {
  name: string;
  phone: string;
  email: string;
  address: string;
  customerType: 'VIP' | 'Thường';
};

const emptyDraft: CustomerDraft = {
  name: '',
  phone: '',
  email: '',
  address: '',
  customerType: 'Thường'
};
const phoneKey = (value: string) => value.replace(/\D/g, '');

export function Customers() {
  const { customers, orders, saveCustomer, deleteCustomer } = useApp();
  const [keyword, setKeyword] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<CustomerDraft>(emptyDraft);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const customerOrders = (customer: Customer) =>
    orders
      .filter((order) => phoneKey(order.customerPhone ?? '') === phoneKey(customer.phone))
      .sort((a, b) => (b.paidAt ?? b.createdAt).localeCompare(a.paidAt ?? a.createdAt));

  const filteredCustomers = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    return customers
      .filter((customer) =>
        [customer.name, customer.phone, customer.email ?? '', customer.address ?? '']
          .join(' ')
          .toLowerCase()
          .includes(search)
      )
      .map((customer) => {
        const bills = orders.filter(
          (order) => phoneKey(order.customerPhone ?? '') === phoneKey(customer.phone)
        );
        const lastVisit = bills
          .map((order) => order.paidAt ?? order.createdAt)
          .sort((a, b) => b.localeCompare(a))[0];
        return {
          ...customer,
          billCount: bills.length,
          total: bills.reduce((sum, order) => sum + order.total, 0),
          lastVisit
        };
      });
  }, [customers, orders, keyword]);

  const openAdd = () => {
    setEditingCustomer(null);
    setDraft(emptyDraft);
    setError('');
    setFormOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setDraft({
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? '',
      address: customer.address ?? '',
      customerType: customer.customerType ?? 'Thường'
    });
    setError('');
    setFormOpen(true);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = saveCustomer({
      ...draft,
      id: editingCustomer?.id,
      createdAt: editingCustomer?.createdAt
    });
    if (result) {
      setError(result);
      return;
    }

    setFormOpen(false);
    setEditingCustomer(null);
    setDraft(emptyDraft);
    setError('');
  };

  const handleDelete = () => {
    if (!deletingCustomer) return;
    const result = deleteCustomer(deletingCustomer.id);
    if (result) {
      setNotice(result);
      return;
    }
    if (selectedCustomer?.id === deletingCustomer.id) setSelectedCustomer(null);
    setDeletingCustomer(null);
    setNotice('');
  };

  return (
    <div className="space-y-6 px-6 py-6">
      <PageHeader
        title="Khách hàng"
        subtitle="Quản lý hồ sơ và theo dõi lịch sử giao dịch của khách hàng."
        action={
          <Button onClick={openAdd}>
            <PlusIcon className="h-4 w-4" />
            Thêm khách hàng
          </Button>
        }
      />

      <Card className="p-4">
        <div className="relative max-w-md">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm theo tên, số điện thoại hoặc email..."
            aria-label="Tìm khách hàng"
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredCustomers.map((customer) => (
          <div
            key={customer.id}
            onClick={() => setSelectedCustomer(customer)}
            className="h-full cursor-pointer"
          >
            <Card className="flex h-full flex-col p-5 transition hover:border-blue-200 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <button
                  onClick={() => setSelectedCustomer(customer)}
                  className="flex min-w-0 flex-1 items-start gap-2 text-left"
                >
                  <UsersIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {customer.name}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Mã khách hàng: {customer.id}
                    </span>
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge tone={customer.customerType === 'VIP' ? 'violet' : 'blue'}>
                    {customer.customerType ?? 'Thường'}
                  </Badge>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      openEdit(customer);
                    }}
                    aria-label={`Sửa ${customer.name}`}
                    title="Sửa khách hàng"
                    className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setNotice('');
                      setDeletingCustomer(customer);
                    }}
                    aria-label={`Xóa ${customer.name}`}
                    title="Xóa khách hàng"
                    className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <PhoneIcon className="h-3.5 w-3.5" />
                  {customer.phone}
                </p>
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <MailIcon className="h-3.5 w-3.5" />
                  {customer.email || 'Chưa cập nhật email'}
                </p>
                <p className="flex items-start gap-2 text-xs text-slate-500">
                  <MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {customer.address || 'Chưa cập nhật địa chỉ'}
                </p>
              </div>

              <div className="my-4 border-t border-slate-100" />

              <dl className="space-y-2 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Số bill</dt>
                  <dd className="font-medium text-slate-900">{customer.billCount}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Tổng mua</dt>
                  <dd className="font-semibold text-blue-700">{formatVnd(customer.total)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Lần đến gần nhất</dt>
                  <dd className="text-right font-medium text-slate-800">
                    {customer.lastVisit ? formatDateTime(customer.lastVisit) : 'Chưa có giao dịch'}
                  </dd>
                </div>
              </dl>
            </Card>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center">
          <UsersIcon className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">Không tìm thấy khách hàng</p>
          <p className="mt-1 text-xs text-slate-500">
            {customers.length
              ? 'Thử tìm theo tên, số điện thoại hoặc email khác.'
              : 'Thêm khách hàng mới để bắt đầu quản lý hồ sơ.'}
          </p>
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setError('');
        }}
        title={editingCustomer ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng'}
        description="Thông tin liên hệ được dùng để tra cứu lịch sử giao dịch."
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Hủy
            </Button>
            <Button form="customer-form" type="submit">
              Lưu
            </Button>
          </>
        }
      >
        <form id="customer-form" onSubmit={submit} className="space-y-4">
          <Field label="Tên khách hàng *">
            <input
              className={inputClass}
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Họ tên khách hàng"
              required
            />
          </Field>
          <Field label="Số điện thoại *">
            <input
              className={inputClass}
              value={draft.phone}
              onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
              placeholder="Số điện thoại liên hệ"
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email">
              <input
                className={inputClass}
                type="email"
                value={draft.email}
                onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                placeholder="Không bắt buộc"
              />
            </Field>
            <Field label="Loại khách hàng">
              <select
                className={inputClass}
                value={draft.customerType}
                onChange={(event) =>
                  setDraft({ ...draft, customerType: event.target.value as CustomerDraft['customerType'] })
                }
              >
                <option value="Thường">Thường</option>
                <option value="VIP">VIP</option>
              </select>
            </Field>
          </div>
          <Field label="Địa chỉ">
            <input
              className={inputClass}
              value={draft.address}
              onChange={(event) => setDraft({ ...draft, address: event.target.value })}
              placeholder="Không bắt buộc"
            />
          </Field>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </form>
      </Modal>

      <Modal
        open={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title="Chi tiết khách hàng"
        description={selectedCustomer?.name}
        width="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedCustomer(null)}>
              Đóng
            </Button>
            {selectedCustomer && (
              <Button
                onClick={() => {
                  openEdit(selectedCustomer);
                  setSelectedCustomer(null);
                }}
              >
                <PencilIcon className="h-4 w-4" />
                Chỉnh sửa thông tin
              </Button>
            )}
          </>
        }
      >
        {selectedCustomer && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <CustomerDetail label="Mã khách hàng" value={selectedCustomer.id} />
              <CustomerDetail label="Loại khách hàng" value={selectedCustomer.customerType ?? 'Thường'} />
              <CustomerDetail label="Số điện thoại" value={selectedCustomer.phone} />
              <CustomerDetail label="Email" value={selectedCustomer.email} />
              <CustomerDetail label="Địa chỉ" value={selectedCustomer.address} />
              <CustomerDetail label="Ngày tạo hồ sơ" value={formatDateTime(selectedCustomer.createdAt)} />
            </div>

            <div className="border-t pt-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ReceiptTextIcon className="h-4 w-4 text-blue-600" />
                Lịch sử giao dịch
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="p-3">Mã bill</th>
                      <th className="p-3">Thời gian</th>
                      <th className="p-3">Trạng thái</th>
                      <th className="p-3 text-right">Tổng tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerOrders(selectedCustomer).map((order) => (
                      <tr key={order.id} className="border-b">
                        <td className="p-3 font-medium text-slate-800">{order.id}</td>
                        <td className="p-3">{formatDateTime(order.paidAt ?? order.createdAt)}</td>
                        <td className="p-3">
                          <Badge tone={order.status === 'PAID' ? 'green' : 'amber'}>
                            {order.status === 'PAID' ? 'Đã thanh toán' : 'Đang mở'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-medium">{formatVnd(order.total)}</td>
                      </tr>
                    ))}
                    {customerOrders(selectedCustomer).length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400">
                          Chưa có giao dịch nào.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deletingCustomer}
        title="Xóa khách hàng"
        message={
          <>
            Bạn có chắc muốn xóa hồ sơ khách hàng <strong>{deletingCustomer?.name}</strong>?
            Các hóa đơn đã phát sinh vẫn được giữ nguyên.
          </>
        }
        confirmLabel="Xóa khách hàng"
        onClose={() => setDeletingCustomer(null)}
        onConfirm={handleDelete}
      />

      {notice && (
        <div role="alert" className="fixed right-5 top-5 z-[100] flex items-center gap-3 rounded-lg border border-red-200 bg-white px-4 py-3 shadow-lg">
          <span className="text-sm font-medium text-red-700">{notice}</span>
          <button
            onClick={() => setNotice('')}
            aria-label="Đóng thông báo"
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function CustomerDetail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-800">
        {value || 'Chưa cập nhật'}
      </p>
    </div>
  );
}
