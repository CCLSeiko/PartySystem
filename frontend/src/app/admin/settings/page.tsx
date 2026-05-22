'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { SystemSettings } from '@/types';
import { Card, LoadingSpinner } from '@/components/ui';
import { Save, Plus, X, AlertCircle, CheckCircle } from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newPurpose, setNewPurpose] = useState('');

  // Form state
  const [minAmount, setMinAmount] = useState(0);
  const [purposes, setPurposes] = useState<string[]>([]);
  const [retryLimit, setRetryLimit] = useState(0);
  const [autoPause, setAutoPause] = useState(0);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const data = await api.adminGetSettings();
      setSettings(data);
      setMinAmount(data.min_donation_amount);
      setPurposes(data.donation_purposes);
      setRetryLimit(data.subscription_retry_limit);
      setAutoPause(data.auto_pause_after_failures);
    } catch (err: any) {
      setError(err.message || '無法載入設定');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const input: Partial<SystemSettings> = {
        min_donation_amount: minAmount,
        donation_purposes: purposes,
        subscription_retry_limit: retryLimit,
        auto_pause_after_failures: autoPause,
      };
      await api.adminUpdateSettings(input);
      setSuccess('設定已成功更新');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || '更新設定失敗');
    } finally {
      setSaving(false);
    }
  }

  function addPurpose() {
    const trimmed = newPurpose.trim();
    if (trimmed && !purposes.includes(trimmed)) {
      setPurposes([...purposes, trimmed]);
      setNewPurpose('');
    }
  }

  function removePurpose(index: number) {
    setPurposes(purposes.filter((_, i) => i !== index));
  }

  if (loading) return <LoadingSpinner size="lg" />;
  if (!settings) return <div className="text-center text-red-500 py-12">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">系統設定</h1>
      </div>

      {/* Success / Error Messages */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Settings Form */}
      <Card>
        <div className="space-y-6">
          {/* Minimum Donation Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              最低捐款金額
            </label>
            <p className="text-xs text-gray-400 mb-2">設定單筆捐款的最低金額限制</p>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">NT$</span>
              <input
                type="number"
                min={0}
                value={minAmount}
                onChange={(e) => setMinAmount(Number(e.target.value))}
                className="w-full pl-12 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
              />
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Donation Purposes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              捐款用途
            </label>
            <p className="text-xs text-gray-400 mb-2">管理捐款用途選項，可自行新增</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {purposes.map((purpose, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded-full"
                >
                  {purpose}
                  <button
                    onClick={() => removePurpose(i)}
                    className="p-0.5 hover:bg-amber-200 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                value={newPurpose}
                onChange={(e) => setNewPurpose(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPurpose(); } }}
                placeholder="輸入新用途名稱"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
              />
              <button
                onClick={addPurpose}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100"
              >
                <Plus className="w-4 h-4" />
                新增
              </button>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Retry Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                重試次數
              </label>
              <p className="text-xs text-gray-400 mb-2">定期定額扣款失敗後的最大重試次數</p>
              <input
                type="number"
                min={0}
                max={10}
                value={retryLimit}
                onChange={(e) => setRetryLimit(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                自動暫停次數
              </label>
              <p className="text-xs text-gray-400 mb-2">連續失敗超過此次數自動暫停定期定額</p>
              <input
                type="number"
                min={0}
                max={10}
                value={autoPause}
                onChange={(e) => setAutoPause(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          儲存設定
        </button>
      </div>
    </div>
  );
}
