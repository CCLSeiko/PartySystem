'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Card } from '@/components/ui';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  Fingerprint,
  Calendar,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';

export default function NewDonorPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneHome, setPhoneHome] = useState('');
  const [phoneMobile, setPhoneMobile] = useState('');
  const [phoneWork, setPhoneWork] = useState('');
  const [address, setAddress] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [birthday, setBirthday] = useState('');
  const [taxConsent, setTaxConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id: string; name: string; email: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('請填寫捐款人姓名'); return; }
    if (!email.trim()) { setError('請填寫 Email'); return; }

    setError('');
    setLoading(true);
    try {
      const donor = await api.maintenanceCreateDonor({
        name: name.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
        phone: phone.trim() || undefined,
        phone_home: phoneHome.trim() || undefined,
        phone_mobile: phoneMobile.trim() || undefined,
        phone_work: phoneWork.trim() || undefined,
        address: address.trim() || undefined,
        identity_number: identityNumber.trim() || undefined,
        birthday: birthday || undefined,
        tax_consent: taxConsent || undefined,
      });
      setResult(donor);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('新增捐款人失敗，請稍後再試');
      }
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">捐款人已建立</h2>
          <p className="text-gray-500 mb-6">捐款人資料已成功新增</p>

          <Card className="p-4 text-left space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-500">姓名</span>
              <span className="font-medium">{result.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="font-medium">{result.email}</span>
            </div>
          </Card>

          <div className="space-y-3">
            <button
              onClick={() => router.push(`/maintainer/donors/${result.id}`)}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all"
            >
              編輯捐款人資料
            </button>
            <button
              onClick={() => router.push('/maintainer/donors')}
              className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
            >
              返回捐款人列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => router.push('/maintainer/donors')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          返回捐款人列表
        </button>
        <h1 className="text-2xl font-bold text-gray-900">新增捐款人</h1>
        <p className="text-gray-500 text-sm mt-1">建立新的捐款人帳戶</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl border bg-red-50 border-red-200">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <User className="w-4 h-4 inline mr-1" />
              姓名 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="請輸入姓名"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Mail className="w-4 h-4 inline mr-1" />
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="donor@example.com"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Lock className="w-4 h-4 inline mr-1" />
              密碼（選填，用於登入系統）
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="留空則無法登入"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Phone Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Phone className="w-4 h-4 inline mr-1" />
                電話
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="主要電話"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">住家電話</label>
              <input
                type="text"
                value={phoneHome}
                onChange={(e) => setPhoneHome(e.target.value)}
                placeholder="住家電話"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">手機</label>
              <input
                type="text"
                value={phoneMobile}
                onChange={(e) => setPhoneMobile(e.target.value)}
                placeholder="手機號碼"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">公司電話</label>
              <input
                type="text"
                value={phoneWork}
                onChange={(e) => setPhoneWork(e.target.value)}
                placeholder="公司電話"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Calendar className="w-4 h-4 inline mr-1" />
                生日 (YYYYMMDD)
              </label>
              <input
                type="text"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                placeholder="19900101"
                maxLength={8}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Fingerprint className="w-4 h-4 inline mr-1" />
                身分證字號
              </label>
              <input
                type="text"
                value={identityNumber}
                onChange={(e) => setIdentityNumber(e.target.value)}
                placeholder="A123456789"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <MapPin className="w-4 h-4 inline mr-1" />
              地址
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="請輸入地址"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Tax Consent */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
            <input
              type="checkbox"
              id="taxConsent"
              checked={taxConsent}
              onChange={(e) => setTaxConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
            />
            <label htmlFor="taxConsent" className="text-sm text-gray-600">
              <ShieldCheck className="w-4 h-4 inline mr-1 text-emerald-500" />
              同意將捐款資料用於稅務申報用途
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                建立中...
              </>
            ) : (
              '建立捐款人'
            )}
          </button>
        </form>
      </Card>
    </div>
  );
}
