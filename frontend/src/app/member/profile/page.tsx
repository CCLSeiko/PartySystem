'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, LoadingSpinner } from '@/components/ui';
import { User, Mail, Phone, ShieldCheck, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MemberProfilePage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [taxConsent, setTaxConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTax, setSavingTax] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setTaxConsent(user.tax_consent);
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.updateProfile({ name, phone: phone || undefined });
      await refreshUser();
      setMessage({ type: 'success', text: '個人資料已更新' });
      setDirty(false);
    } catch (err: unknown) {
      const apiErr = err as { code?: string; message?: string };
      setMessage({
        type: 'error',
        text: apiErr?.message || '更新失敗，請稍後再試',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTaxConsent = async () => {
    const newValue = !taxConsent;
    setSavingTax(true);
    setMessage(null);
    try {
      await api.updateTaxConsent(newValue);
      setTaxConsent(newValue);
      await refreshUser();
      setMessage({ type: 'success', text: newValue ? '已同意稅務申報' : '已取消稅務申報同意' });
    } catch (err: unknown) {
      const apiErr = err as { code?: string; message?: string };
      setMessage({
        type: 'error',
        text: apiErr?.message || '更新失敗，請稍後再試',
      });
      // revert
      setTaxConsent(!newValue);
    } finally {
      setSavingTax(false);
    }
  };

  if (!user) return <LoadingSpinner />;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <User className="w-6 h-6 text-rose-500" />
          個人設定
        </h1>
        <p className="text-gray-500 mt-1">管理您的個人資料與偏好設定</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-lg text-sm',
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200',
          )}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Profile Info */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-gray-400" />
          基本資料
        </h2>

        {/* Email (read-only) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-500 mb-1.5">
            <Mail className="w-3.5 h-3.5 inline mr-1" />
            Email
          </label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
            {user.email}
          </div>
          <p className="text-xs text-gray-400 mt-1">Email 無法修改</p>
        </div>

        {/* Name (editable) */}
        <div className="mb-4">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-500 mb-1.5"
          >
            <User className="w-3.5 h-3.5 inline mr-1" />
            姓名
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
            placeholder="請輸入姓名"
          />
        </div>

        {/* Phone (editable) */}
        <div className="mb-4">
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-500 mb-1.5"
          >
            <Phone className="w-3.5 h-3.5 inline mr-1" />
            電話
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setDirty(true);
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
            placeholder="請輸入電話號碼"
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSaveProfile}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? '儲存中...' : '儲存變更'}
          </button>
        </div>
      </Card>

      {/* Tax Consent */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-gray-400" />
          稅務設定
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">同意稅務申報</p>
            <p className="text-xs text-gray-400 mt-1">
              同意本機構將您的捐款資料用於年度所得稅申報
            </p>
          </div>
          <button
            onClick={handleToggleTaxConsent}
            disabled={savingTax}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              taxConsent ? 'bg-rose-500' : 'bg-gray-300',
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                taxConsent ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
        </div>
      </Card>

      {/* Identity Number Status */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-gray-400" />
          身分驗證
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">身分證字號</p>
            <p className="text-xs text-gray-400 mt-1">
              用於稅務申報與身分驗證
            </p>
          </div>
          <span
            className={cn(
              'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
              user.has_identity_number
                ? 'text-green-600 bg-green-50 border-green-200'
                : 'text-yellow-600 bg-yellow-50 border-yellow-200',
            )}
          >
            {user.has_identity_number ? '已設定' : '未設定'}
          </span>
        </div>
        {!user.has_identity_number && (
          <p className="text-xs text-gray-400 mt-3">
            設定身分證字號後可享有完整稅務申報功能
          </p>
        )}
      </Card>
    </div>
  );
}
