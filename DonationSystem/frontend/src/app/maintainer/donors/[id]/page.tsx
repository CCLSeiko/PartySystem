'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Card, LoadingSpinner } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  ArrowLeft, Save, Trash2, AlertCircle, CheckCircle2, Loader2,
  User, Mail, Lock, Phone, MapPin, Fingerprint, Calendar, ShieldCheck,
  Plus, CreditCard, Landmark, Building2, Home, Smartphone, FileText,
} from 'lucide-react';

interface Account {
  id: string;
  account_type: string;
  authorized_person?: string;
  donation_amount?: number;
  auth_start_date?: string;
  auth_end_date?: string;
  is_active: boolean;
}

export default function EditDonorPage() {
  const router = useRouter();
  const params = useParams();
  const donorId = (params.id as string) !== 'placeholder'
    ? (params.id as string)
    : (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() || '' : '');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneHome, setPhoneHome] = useState('');
  const [phoneMobile, setPhoneMobile] = useState('');
  const [phoneWork, setPhoneWork] = useState('');
  const [address, setAddress] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [birthday, setBirthday] = useState('');
  const [taxConsent, setTaxConsent] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [resetPwConfirm, setResetPwConfirm] = useState(false);
  const [resetPwReason, setResetPwReason] = useState('');
  const [resetPwResult, setResetPwResult] = useState<{ type: 'success' | 'error'; text: string; tempPassword?: string } | null>(null);

  useEffect(() => {
    if (donorId && donorId !== 'placeholder') {
      loadDonor();
      loadAccounts();
    } else {
      setLoading(false);
    }
  }, [donorId]);

  async function loadDonor() {
    try {
      const data = await api.maintenanceGetDonor(donorId);
      setName(data.name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setPhoneHome((data as any).phone_home || '');
      setPhoneMobile((data as any).phone_mobile || '');
      setPhoneWork((data as any).phone_work || '');
      setAddress(data.address || '');
      setIdentityNumber((data as any).identity_number || '');
      setBirthday((data as any).birthday || '');
      setTaxConsent(data.tax_consent || false);
      setIsActive(data.is_active !== false);
    } catch (err) {
      console.error('Failed to load donor', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAccounts() {
    try {
      const data = await api.maintenanceGetDonorAccounts(donorId);
      setAccounts(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      await api.maintenanceUpdateDonor(donorId, {
        name, email, phone, phone_home: phoneHome, phone_mobile: phoneMobile,
        phone_work: phoneWork, address, identity_number: identityNumber,
        birthday, tax_consent: taxConsent,
      });
      // Toggle active status separately
      if (isActive !== true) {
        await api.adminToggleUserStatus(donorId, isActive);
      }
      setMessage({ type: 'success', text: '捐款人資料已更新' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof ApiError ? err.message : '更新失敗' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await api.maintenanceDeleteDonor(donorId);
      router.push('/maintainer/donors');
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof ApiError ? err.message : '刪除失敗' });
    }
  }

  async function handleResetPassword() {
    setSaving(true);
    setResetPwResult(null);
    try {
      const result = await api.maintenanceResetPassword(donorId, resetPwReason || undefined);
      setResetPwConfirm(false);
      setResetPwResult({
        type: 'success',
        text: `密碼已重設！請將以下臨時密碼提供給捐款人，下次登入時系統會要求修改密碼。`,
        tempPassword: result.temp_password,
      });
    } catch (err) {
      setResetPwResult({ type: 'error', text: err instanceof ApiError ? err.message : '密碼重設失敗' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/maintainer/donors')} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">編輯捐款人</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/maintainer/donors/${donorId}/donations`)}
            className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
          >
            <FileText className="w-4 h-4" /> 捐款歷程
          </button>
          <button onClick={() => setDeleteConfirm(true)} className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
            <Trash2 className="w-4 h-4" /> 刪除
          </button>
          <button onClick={() => setResetPwConfirm(true)} className="flex items-center gap-1 px-3 py-2 text-sm text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100">
            <Lock className="w-4 h-4" /> 重設密碼
          </button>
        </div>
      </div>

      {message && (
        <div className={`flex items-start gap-2 p-3 rounded-xl border ${message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />}
          <p className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>
        </div>
      )}

      {deleteConfirm && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-700 mb-3">確定要刪除此捐款人？此操作無法復原。</p>
          <div className="flex gap-2">
            <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">確認刪除</button>
            <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border rounded-lg">取消</button>
          </div>
        </Card>
      )}

      {resetPwConfirm && (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800 font-medium mb-2">🔑 重設捐款人密碼</p>
          <p className="text-sm text-amber-700 mb-3">系統將產生臨時密碼，請將密碼提供給捐款人。捐款人下次登入時會要求修改密碼。</p>
          <div className="mb-3">
            <label className="block text-xs text-amber-700 mb-1">重設原因（選填）</label>
            <input
              value={resetPwReason}
              onChange={e => setResetPwReason(e.target.value)}
              placeholder="例如：捐款人忘記密碼要求重設"
              className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleResetPassword} disabled={saving} className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              寄送重設信件
            </button>
            <button onClick={() => setResetPwConfirm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border rounded-lg">取消</button>
          </div>
        </Card>
      )}

      {resetPwResult && (
        <div className={`flex items-start gap-2 p-3 rounded-xl border ${resetPwResult.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {resetPwResult.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />}
          <p className={`text-sm ${resetPwResult.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>{resetPwResult.text}</p>
          {resetPwResult.tempPassword && (
            <div className="mt-2 p-2 bg-white rounded-lg border border-green-200">
              <p className="text-xs text-gray-500 mb-1">臨時密碼：</p>
              <code className="text-sm font-mono font-bold text-green-800 select-all">{resetPwResult.tempPassword}</code>
            </div>
          )}
        </div>
      )}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">基本資料</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1"><User className="w-4 h-4 inline mr-1" />姓名</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1"><Mail className="w-4 h-4 inline mr-1" />Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1"><Phone className="w-4 h-4 inline mr-1" />電話（公司）</label>
            <input value={phoneWork} onChange={e => setPhoneWork(e.target.value)} placeholder="公司電話" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1"><Home className="w-4 h-4 inline mr-1" />電話（住家）</label>
            <input value={phoneHome} onChange={e => setPhoneHome(e.target.value)} placeholder="住家電話" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1"><Smartphone className="w-4 h-4 inline mr-1" />電話（行動）</label>
            <input value={phoneMobile} onChange={e => setPhoneMobile(e.target.value)} placeholder="行動電話" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1"><Calendar className="w-4 h-4 inline mr-1" />出生日</label>
            <input value={birthday} onChange={e => setBirthday(e.target.value)} placeholder="YYYYMMDD" maxLength={8} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1"><Fingerprint className="w-4 h-4 inline mr-1" />身分證字號</label>
            <input value={identityNumber} onChange={e => setIdentityNumber(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1"><MapPin className="w-4 h-4 inline mr-1" />地址</label>
            <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={taxConsent} onChange={e => setTaxConsent(e.target.checked)} className="rounded" />
              <span className="text-sm text-gray-700"><ShieldCheck className="w-4 h-4 inline mr-1" />同意稅務申報</span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
              <span className="text-sm text-gray-700">啟用中</span>
            </label>
          </div>
        </div>
        <div className="mt-6">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            儲存變更
          </button>
        </div>
      </Card>

      {/* Donor Accounts */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">授權帳戶</h2>
          <button onClick={() => router.push(`/maintainer/donors/${donorId}/accounts/new`)} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100">
            <Plus className="w-4 h-4" /> 新增帳戶
          </button>
        </div>
        {accounts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">尚無授權帳戶</p>
        ) : (
          <div className="space-y-3">
            {accounts.map(acct => (
              <div key={acct.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-3">
                  {acct.account_type === 'credit_card' ? <CreditCard className="w-5 h-5 text-blue-500" />
                    : acct.account_type === 'postal' ? <Landmark className="w-5 h-5 text-amber-500" />
                    : <Building2 className="w-5 h-5 text-purple-500" />}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{acct.authorized_person || '—'}</p>
                    <p className="text-xs text-gray-500">{acct.account_type} · ${formatCurrency(acct.donation_amount || 0, 'TWD')}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${acct.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {acct.is_active ? '啟用' : '停用'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
