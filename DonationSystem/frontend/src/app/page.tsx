import Link from 'next/link';
import { Heart, Shield, Repeat, FileText, ChevronRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="bg-gradient-to-b from-rose-50 to-white">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 py-20 md:py-32">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-rose-100 text-rose-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            ✨ 讓愛心更簡單
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            每一次捐款<br /><span className="text-rose-600">都值得被記錄</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            安全、透明、便利的線上捐款平台。支援信用卡付款、郵政劃撥與現金捐款。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/donate"
              className="inline-flex items-center gap-2 bg-rose-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
            >
              立即捐款 <ChevronRight className="w-5 h-5" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold border border-gray-200 hover:border-rose-200 hover:text-rose-600 transition-all"
            >
              註冊會員
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: '❤️', title: '多元捐款方式', desc: '信用卡線上付款、郵政劃撥單下載、現場現金捐款登記' },
            { icon: '🔄', title: '定期定額捐款', desc: '每月/每季/每年自動扣款，隨時暫停或調整' },
            { icon: '📄', title: '捐款收據與節稅', desc: '正式收據，同意後自動上傳國稅局' },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{f.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-t border-gray-100 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-14">捐款流程</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', title: '選擇方式' },
              { step: '02', title: '輸入金額' },
              { step: '03', title: '完成付款' },
              { step: '04', title: '取得收據' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-rose-600 font-bold text-lg">{item.step}</span>
                </div>
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-rose-600 py-16">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-white mb-4">用行動改變世界</h2>
          <p className="text-rose-100 mb-8">每一份心意，都是改變的力量</p>
          <Link href="/donate" className="inline-flex items-center gap-2 bg-white text-rose-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-rose-50 transition-all">
            開始捐款 <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-12 text-center text-sm">
        © 2026 DonationSystem
      </footer>
    </div>
  );
}
