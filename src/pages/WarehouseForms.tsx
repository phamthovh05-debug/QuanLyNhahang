import { useMemo, useState } from 'react';
import { Card, CardHeader, PageHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, inputClass } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { formatDateTime, formatQty, formatVnd } from '../utils/format';
import { availableQty } from '../utils/inventory';
import type { Unit } from '../types';

type Line={ingredientId:string;unit:Unit;quantity:number;unitCost:number;supplierId?:string};
type RequestDraft={lines:Line[];reason:string;note:string};
const money=(r:{lines:Line[]})=>r.lines.reduce((s,l)=>s+l.quantity*l.unitCost,0);
export function PurchaseRequests(){
 const {ingredients,suppliers,purchaseRequests,createPurchaseRequest,userName}=useApp(); const {user}=useAuth(); const [prefill]=useState<RequestDraft|null>(()=>{try{return JSON.parse(localStorage.getItem('bepkho.purchaseRequestDraft')||'null') as RequestDraft|null}catch{return null}}); const [lines,setLines]=useState<Line[]>(()=>prefill?.lines?.length?prefill.lines:[{ingredientId:ingredients[0]?.id??'',unit:ingredients[0]?.unit??'kg',quantity:1,unitCost:ingredients[0]?.refCost??0,supplierId:suppliers[0]?.id}]); const [requestSupplierId,setRequestSupplierId]=useState(prefill?.lines?.find(line=>line.supplierId)?.supplierId??suppliers[0]?.id??''); const [reason,setReason]=useState(prefill?.reason??''); const [note,setNote]=useState(prefill?.note??''); const [error,setError]=useState(''); const [query,setQuery]=useState(''); const [detail,setDetail]=useState<string|null>(null);
 const total=useMemo(()=>lines.reduce((s,l)=>s+l.quantity*l.unitCost,0),[lines]); const list=purchaseRequests.filter(r=>`${r.id} ${r.requester}`.toLowerCase().includes(query.toLowerCase()));
 const submit=()=>{const err=createPurchaseRequest({lines:lines.map(line=>({...line,supplierId:requestSupplierId})),reason,note});if(err){setError(err);return;}localStorage.removeItem('bepkho.purchaseRequestDraft');setError('');setReason('');setNote('');setLines([{ingredientId:ingredients[0]?.id??'',unit:ingredients[0]?.unit??'kg',quantity:1,unitCost:ingredients[0]?.refCost??0,supplierId:suppliers[0]?.id}]);};
 return <div className="px-6 py-6"><PageHeader title="Đề nghị nhập kho" action={<Button variant="secondary" onClick={()=>window.print()}>In trang</Button>}/>
 <Card className="mb-5 p-5 print-form"><div className="mb-4 text-center"><h2 className="text-xl font-bold">PHIẾU ĐỀ NGHỊ NHẬP KHO</h2><p className="mt-1 text-right text-sm">Ngày: {new Date().toLocaleDateString('vi-VN')}</p></div><p className="mb-4"><u><strong>Kính gửi:</strong></u> <strong>PHÒNG KẾ TOÁN</strong></p><div className="space-y-2 text-sm"><p>* Nhà cung cấp: <select className="rounded border px-2 py-1 no-print" value={requestSupplierId} onChange={event=>{setRequestSupplierId(event.target.value);setLines(lines.map(line=>({...line,supplierId:event.target.value})));}}>{suppliers.map(supplier=><option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select><span className="print-only">{suppliers.find(supplier=>supplier.id===requestSupplierId)?.name}</span></p><p>* Nội dung: <input className="border-b border-dotted border-slate-500 outline-none" value={reason} onChange={e=>setReason(e.target.value)} required/></p><p>* Nhân viên: {userName}</p><p>* Thuộc bộ phận: Kho</p><p>* Hàng hóa cần nhập kho:</p></div>
 <div className="overflow-x-auto"><table className="request-form-table w-full min-w-[700px] border-collapse text-sm"><thead><tr><th>STT</th><th>TÊN HÀNG HÓA</th><th>ĐƠN VỊ TÍNH</th><th>SỐ LƯỢNG</th><th>ĐƠN GIÁ</th><th>THÀNH TIỀN</th></tr></thead><tbody>{lines.map((line,index)=><tr key={index}><td>{index+1}</td><td><select className="w-full bg-transparent no-print" value={line.ingredientId} onChange={event=>{const selected=ingredients.find(item=>item.id===event.target.value);setLines(lines.map((item,row)=>row===index?{...item,ingredientId:event.target.value,unit:selected?.unit??item.unit,unitCost:selected?.refCost??0}:item));}}>{ingredients.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select><span className="print-only">{ingredients.find(item=>item.id===line.ingredientId)?.name}</span></td><td className="text-center">{line.unit}</td><td><input className="w-full text-right" type="number" min="0.001" step="0.001" value={line.quantity} onChange={event=>setLines(lines.map((item,row)=>row===index?{...item,quantity:Number(event.target.value)}:item))}/></td><td><input className="w-full text-right" type="number" min="0" value={line.unitCost} onChange={event=>setLines(lines.map((item,row)=>row===index?{...item,unitCost:Number(event.target.value)}:item))}/></td><td className="text-right">{formatVnd(line.quantity*line.unitCost)}</td></tr>)}</tbody><tfoot><tr><td colSpan={5}><strong>Tổng</strong></td><td className="text-right"><strong>{formatVnd(total)}</strong></td></tr></tfoot></table></div><div className="mt-3 flex justify-between no-print"><Button variant="secondary" onClick={()=>setLines([...lines,{ingredientId:ingredients[0]?.id??'',unit:ingredients[0]?.unit??'kg',quantity:1,unitCost:ingredients[0]?.refCost??0,supplierId:suppliers[0]?.id}])}>Thêm dòng hàng</Button><span className="self-center text-sm text-slate-500">Đơn vị lấy tự động theo danh mục nguyên liệu.</span></div><p className="mt-4 text-sm">Ghi chú: <input className="w-3/4 border-b border-dotted" value={note} onChange={e=>setNote(e.target.value)}/></p>{error&&<p className="mt-3 text-sm text-red-600 no-print">{error}</p>}<div className="mt-4 flex justify-end no-print"><Button onClick={submit}>Gửi đề nghị</Button></div><div className="mt-8 grid grid-cols-2 text-center text-sm"><div>Người lập phiếu<div className="h-16"/>({user?.name})</div><div>Phòng kế toán<div className="h-16"/>(Ký, họ tên)</div></div></Card>
 <Card><div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><h2 className="font-semibold">Theo dõi đề nghị nhập kho</h2><p className="text-xs text-slate-500">Lịch sử và trạng thái xử lý</p></div><input className={inputClass+' max-w-xs'} placeholder="Tìm mã phiếu / nhân viên" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="overflow-x-auto"><table className="w-full min-w-[750px] text-sm"><thead><tr className="border-b text-left text-xs text-slate-500"><th className="p-3">Mã phiếu / ngày</th><th>Người lập</th><th>Bộ phận</th><th>Tổng tiền</th><th>Trạng thái</th><th/></tr></thead><tbody>{list.map(r=><tr className="border-b" key={r.id}><td className="p-3">{r.id}<div>{formatDateTime(r.requestedAt)}</div></td><td>{r.requester}</td><td>{r.department}</td><td>{formatVnd(money(r))}</td><td><Badge tone={r.status==='REJECTED'?'red':r.status==='COMPLETED'?'green':'amber'}>{r.status==='PENDING'?'Chờ duyệt':r.status==='MANAGER_APPROVED'?'Chờ kế toán xử lý':r.status==='ACCOUNTING_PENDING'?'Chờ kế toán xử lý':r.status==='COMPLETED'?'Đã hoàn tất':r.status==='REJECTED'?'Từ chối':r.status}</Badge></td><td><Button size="sm" variant="secondary" onClick={()=>setDetail(detail===r.id?null:r.id)}>Chi tiết</Button></td></tr>)}{!list.length&&<tr><td colSpan={6} className="p-8 text-center text-slate-400">Chưa có phiếu.</td></tr>}</tbody></table></div>{detail&&(()=>{const r=list.find(x=>x.id===detail);return r?<div className="border-t p-4"><h3 className="font-semibold">{r.id} · {r.reason}</h3><p className="mb-3 text-sm">{r.note}</p>{r.lines.map((l,i)=><p className="text-sm" key={i}>{ingredients.find(x=>x.id===l.ingredientId)?.name}: {l.quantity} × {formatVnd(l.unitCost)} = {formatVnd(l.quantity*l.unitCost)}</p>)}<p className="mt-2 font-bold">Tổng: {formatVnd(money(r))}</p>{r.history.map((h,i)=><p className="mt-2 text-xs text-slate-500" key={i}>{h.action} · {h.actor} · {formatDateTime(h.at)} {h.reason}</p>)}</div>:null})()}</Card></div>
}

type StocktakeDraftLine = { ingredientId: string; countedQty: string };

export function Stocktake() {
  const { ingredients, batches, stocktakes, createStocktake, saveStocktakeDraft, userName } = useApp();
  const [lines, setLines] = useState<StocktakeDraftLine[]>(() => ingredients[0] ? [{ ingredientId: ingredients[0].id, countedQty: '' }] : []);
  const [draftId, setDraftId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const totalAmount = lines.reduce((sum, line) => {
    const ingredient = ingredients.find(item => item.id === line.ingredientId);
    return sum + Number(line.countedQty || 0) * (ingredient?.refCost ?? 0);
  }, 0);

  const validate = (requireExplanation = false) => {
    if (!lines.length || lines.some(line => !ingredients.some(item => item.id === line.ingredientId))) {
      setError('Vui lòng chọn ít nhất một hàng hóa trong danh mục.');
      return false;
    }
    if (lines.some(line => line.countedQty.trim() === '' || !Number.isFinite(Number(line.countedQty)) || Number(line.countedQty) < 0)) {
      setError('Vui lòng nhập số lượng kiểm kê hợp lệ cho từng hàng hóa.');
      return false;
    }
    if (requireExplanation && !note.trim()) {
      setError('Vui lòng nhập lý do giải trình kết quả kiểm kê.');
      return false;
    }
    return true;
  };
  const payload = () => ({
    lines: lines.map(line => ({
      ingredientId: line.ingredientId,
      bookQty: availableQty(batches, line.ingredientId),
      countedQty: Number(line.countedQty)
    })),
    note
  });
  const addLine = () => {
    const ingredient = ingredients.find(item => !lines.some(line => line.ingredientId === item.id));
    if (!ingredient) {
      setError('Đã chọn hết hàng hóa trong danh mục.');
      return;
    }
    setLines(current => [...current, { ingredientId: ingredient.id, countedQty: '' }]);
    setError('');
  };
  const submit = () => {
    if (!validate(true)) return;
    const result = createStocktake(payload());
    if (result) {
      setError(result);
      return;
    }
    setError('');
    setLines(ingredients[0] ? [{ ingredientId: ingredients[0].id, countedQty: '' }] : []);
    setDraftId('');
    setNote('');
  };
  const saveDraft = () => {
    if (!validate()) return;
    const id = saveStocktakeDraft(payload(), draftId || undefined);
    if (!id) {
      setError('Không thể lưu nháp kiểm kê.');
      return;
    }
    setDraftId(id);
    setError('');
  };

  return <div className="px-6 py-6">
    <PageHeader
      title="Biên bản kiểm kê kho"
      action={<Button variant="secondary" onClick={() => window.print()}>Xem trước / In</Button>}
    />
    <Card className="mb-5 p-5 print-form">
      <div className="grid grid-cols-3 text-sm font-semibold">
        <div>Đơn vị: Nhà hàng Sen Vàng</div><div />
        <div className="text-right">Mẫu số 05 - VT<br /><em className="font-normal">(Ban hành theo Thông tư số 133/2014/TT-BTC ngày 26/8/2016 của Bộ Tài chính)</em></div>
      </div>
      <div className="mt-8">Bộ phận: Kho · Thủ kho: {userName}</div>
      <h2 className="my-8 text-center text-lg font-bold uppercase">BIÊN BẢN KIỂM KÊ HÀNG HÓA</h2>
      <p className="mb-5">Thời điểm kiểm kê: {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}, ngày {new Date().toLocaleDateString('vi-VN')}</p>
      <div className="overflow-x-auto">
        <table className="stocktake-form-table w-full min-w-[620px] border-collapse text-sm">
          <thead><tr><th>STT</th><th>TÊN HÀNG HÓA</th><th>SỐ LƯỢNG</th><th>THÀNH TIỀN</th><th className="no-print" /></tr></thead>
          <tbody>
            {lines.map((line, index) => {
              const ingredient = ingredients.find(item => item.id === line.ingredientId);
              if (!ingredient) return null;
              return <tr key={`${line.ingredientId}-${index}`}>
                <td>{index + 1}</td>
                <td>
                  <select
                    className={`${inputClass} max-w-40 no-print`}
                    aria-label={`Tên hàng hóa dòng ${index + 1}`}
                    value={line.ingredientId}
                    onChange={event => {
                      setLines(current => current.map((item, row) => row === index ? { ...item, ingredientId: event.target.value, countedQty: '' } : item));
                      setError('');
                    }}>
                    {ingredients.map(item => <option
                      key={item.id}
                      value={item.id}
                      disabled={item.id !== line.ingredientId && lines.some((other, row) => row !== index && other.ingredientId === item.id)}>
                      {item.name}
                    </option>)}
                  </select>
                  <span className="print-only">{ingredient.name}</span>
                </td>
                <td>
                  <input
                    className={`${inputClass} max-w-36`}
                    aria-label={`Số lượng ${ingredient.name}`}
                    type="number"
                    min="0"
                    step="0.001"
                    value={line.countedQty}
                    onChange={event => {
                      setLines(current => current.map((item, row) => row === index ? { ...item, countedQty: event.target.value } : item));
                      setError('');
                    }}
                  />
                  <span className="print-only">{line.countedQty || '—'}</span>
                </td>
                <td className="text-right">{formatVnd(Number(line.countedQty || 0) * ingredient.refCost)}</td>
                <td className="no-print">
                  <Button size="sm" variant="ghost" aria-label={`Xóa ${ingredient.name}`} onClick={() => {
                    setLines(current => current.filter((_, row) => row !== index));
                    setError('');
                  }}>Xóa</Button>
                </td>
              </tr>;
            })}
            {!lines.length && <tr><td colSpan={5} className="py-8 text-center text-slate-500">Chưa có hàng hóa trong biên bản.</td></tr>}
            <tr><td colSpan={3}><strong>Tổng thành tiền</strong></td><td className="text-right font-bold">{formatVnd(totalAmount)}</td><td className="no-print" /></tr>
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 no-print">
        <Button size="sm" variant="secondary" disabled={lines.length >= ingredients.length} onClick={addLine}>Thêm hàng hóa</Button>
      </div>
      <Field label={<>Lý do giải trình <span className="text-red-600">*</span></>}><textarea className={`${inputClass} mt-2 min-h-20`} value={note} onChange={event => setNote(event.target.value)} required /></Field>
      {error && <p role="alert" className="mt-3 text-sm text-red-600 no-print">{error}</p>}
      <div className="mt-4 flex gap-2 no-print">
        <Button variant="secondary" onClick={saveDraft}>Lưu nháp</Button>
        <Button onClick={submit}>Gửi biên bản cho quản lý</Button>
      </div>
      <p className="mt-5 text-right">Ngày .... tháng .... năm ....</p>
      <div className="mt-2 grid grid-cols-2 gap-6 text-sm md:grid-cols-4">
        {['Giám đốc', 'Kế toán trưởng', 'Thủ kho', 'Trưởng ban kiểm kê'].map(role => <div key={role}><strong>{role}</strong><div className="h-20" /><em>(Ký, họ tên)</em></div>)}
      </div>
    </Card>
    <Card className="p-4 no-print">
      <h2 className="mb-3 font-semibold">Lịch sử biên bản</h2>
      {stocktakes.map(record => {
        const rejection = record.history.slice().reverse().find(event => event.action === 'Quản lý từ chối phiếu kiểm kê kho');
        return <div className="border-b py-2 text-sm" key={record.id}>
          <strong>{record.id}</strong> · {formatDateTime(record.createdAt)} · {record.createdBy} · <Badge tone={record.status === 'DRAFT' ? 'slate' : record.status === 'PENDING_MANAGER' ? 'amber' : record.status === 'REVIEWED' ? 'green' : 'red'}>{record.status === 'DRAFT' ? 'Bản nháp' : record.status === 'PENDING_MANAGER' ? 'Chờ quản lý duyệt' : record.status === 'REVIEWED' ? 'Đã phê duyệt' : 'Bị từ chối'}</Badge>
          {record.status === 'DRAFT' && <Button size="sm" variant="secondary" onClick={() => {
            setDraftId(record.id);
            setLines(record.lines.map(line => ({ ingredientId: line.ingredientId, countedQty: String(line.countedQty) })));
            setNote(record.note);
            setError('');
          }}>Mở nháp</Button>}
          {rejection?.note && <p className="mt-1 text-red-700">Lý do từ chối: {rejection.note}</p>}
        </div>;
      })}
      {!stocktakes.length && <p className="text-sm text-slate-400">Chưa có biên bản kiểm kê.</p>}
    </Card>
  </div>;
}

export function ManagerStocktakeReview() {
  const { stocktakes, ingredients, approveStocktake, rejectStocktake } = useApp();
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [rejecting, setRejecting] = useState<ReturnType<typeof useApp>['stocktakes'][number] | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');
  const pending = stocktakes.filter(record => record.status === 'PENDING_MANAGER');
  const resolved = stocktakes.filter(record => record.status === 'REVIEWED' || record.status === 'REJECTED');

  const approve = (id: string) => {
    const error = approveStocktake(id);
    if (error) {
      setFeedback({ type: 'error', message: error });
      return;
    }
    setFeedback({ type: 'success', message: `Đã duyệt phiếu kiểm kê ${id}.` });
  };
  const submitRejection = () => {
    if (!rejecting) return;
    const error = rejectStocktake(rejecting.id, rejectionReason);
    if (error) {
      setRejectionError(error);
      return;
    }
    setFeedback({ type: 'success', message: `Đã từ chối phiếu kiểm kê ${rejecting.id}.` });
    setRejecting(null);
    setRejectionReason('');
    setRejectionError('');
  };
  const renderRecord = (record: typeof stocktakes[number], canApprove: boolean) => {
    const rejection = record.history.slice().reverse().find(event => event.action === 'Quản lý từ chối phiếu kiểm kê kho');
    return <Card className="overflow-hidden" key={record.id}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="font-bold text-slate-900">{record.id}</h3>
          <p className="mt-1 text-xs text-slate-500">Lập bởi {record.createdBy} · {formatDateTime(record.createdAt)}</p>
        </div>
        {canApprove
          ? <div className="flex flex-wrap gap-2"><Button variant="danger" onClick={() => { setRejecting(record); setRejectionReason(''); setRejectionError(''); }}>Từ chối</Button><Button onClick={() => approve(record.id)}>Phê duyệt kết quả kiểm kê</Button></div>
          : <Badge tone={record.status === 'REJECTED' ? 'red' : 'green'}>{record.status === 'REJECTED' ? 'Đã từ chối' : 'Đã phê duyệt'}</Badge>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr><th className="px-5 py-3">STT</th><th className="px-5 py-3">Tên nguyên liệu</th><th className="px-5 py-3 text-right">Tồn kho theo sổ sách</th><th className="px-5 py-3 text-right">Số lượng thực tế</th><th className="px-5 py-3 text-right">Chênh lệch</th><th className="px-5 py-3 text-right">Thành tiền</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {record.lines.map((line, index) => {
              const ingredient = ingredients.find(item => item.id === line.ingredientId);
              const bookQty = line.bookQty ?? 0;
              const variance = line.countedQty - bookQty;
              return <tr key={`${line.ingredientId}-${index}`}>
                <td className="px-5 py-3">{index + 1}</td>
                <td className="px-5 py-3 font-medium">{ingredient?.name ?? line.ingredientId}</td>
                <td className="px-5 py-3 text-right">{ingredient ? formatQty(bookQty, ingredient.unit) : bookQty}</td>
                <td className="px-5 py-3 text-right">{ingredient ? formatQty(line.countedQty, ingredient.unit) : line.countedQty}</td>
                <td className={`px-5 py-3 text-right font-semibold ${variance === 0 ? 'text-emerald-700' : 'text-red-700'}`}>{variance > 0 ? '+' : ''}{ingredient ? formatQty(variance, ingredient.unit) : variance}</td>
                <td className="px-5 py-3 text-right font-semibold">{formatVnd(line.countedQty * (ingredient?.refCost ?? 0))}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-100 px-5 py-3 text-sm">
        <strong>Lý do giải trình của nhân viên kho:</strong>
        <p className="mt-1 whitespace-pre-wrap text-slate-600">{record.note?.trim() || 'Nhân viên kho chưa nhập lý do giải trình.'}</p>
      </div>
      {rejection?.note && <p className="border-t border-red-100 bg-red-50 px-5 py-3 text-sm text-red-800">Lý do từ chối: {rejection.note}</p>}
    </Card>;
  };

  return <div className="px-6 py-6">
    <PageHeader title="Duyệt kết quả kiểm kê kho" subtitle="Quản lý kiểm tra số lượng, chênh lệch và lý do giải trình trước khi phê duyệt." />
    {feedback && <p role={feedback.type === 'error' ? 'alert' : 'status'} className={`mb-4 rounded-xl px-4 py-3 text-sm ${feedback.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>{feedback.message}</p>}
    <section className="mb-6 space-y-4">
      <CardHeader title={`Chờ duyệt (${pending.length})`} />
      {pending.length ? pending.map(record => renderRecord(record, true)) : <Card className="px-5 py-10 text-center text-sm text-slate-500">Không có phiếu kiểm kê nào đang chờ duyệt.</Card>}
    </section>
    <section className="space-y-4">
      <CardHeader title={`Lịch sử đã xử lý (${resolved.length})`} />
      {resolved.length ? resolved.map(record => renderRecord(record, false)) : <Card className="px-5 py-10 text-center text-sm text-slate-500">Chưa có phiếu kiểm kê được xử lý.</Card>}
    </section>
    <Modal open={!!rejecting} onClose={() => { setRejecting(null); setRejectionReason(''); setRejectionError(''); }} title={rejecting ? `Từ chối phiếu ${rejecting.id}` : ''} description="Vui lòng nhập lý do để nhân viên kho biết nội dung cần khắc phục." footer={<><Button variant="secondary" onClick={() => { setRejecting(null); setRejectionReason(''); setRejectionError(''); }}>Hủy</Button><Button variant="danger" disabled={!rejectionReason.trim()} onClick={submitRejection}>Xác nhận từ chối</Button></>}>
      <Field label="Lý do từ chối"><textarea className={`${inputClass} min-h-24`} value={rejectionReason} onChange={event => setRejectionReason(event.target.value)} required /></Field>
      {rejectionError && <p role="alert" className="mt-3 text-sm text-red-700">{rejectionError}</p>}
    </Modal>
  </div>;
}
