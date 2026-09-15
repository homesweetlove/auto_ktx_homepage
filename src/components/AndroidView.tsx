import React, { useState } from 'react';
import {
  Smartphone, Code, Copy, Check, Radio, BellRing, ShieldCheck,
  ChevronRight, Layers, ArrowRight
} from 'lucide-react';
import { ANDROID_KOTLIN_CODE } from '../data/androidGuide';

export function AndroidView() {
  const [selectedSnippet, setSelectedSnippet] = useState<'dto' | 'retrofit' | 'viewModel'>('retrofit');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(ANDROID_KOTLIN_CODE[selectedSnippet]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Intro Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
              Phase 4 선행 규격
            </span>
            <h1 className="text-xl font-bold text-slate-900">안드로이드(Kotlin) 클라이언트 연동 규격서</h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            스마트폰은 직접 무거운 폴링을 수행하지 않고 백엔드를 원격 제어하는 '리모컨' 역할만 수행하여 배터리 소모를 0으로 유지합니다.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? '복사 완료' : 'Kotlin 코드 복사'}</span>
        </button>
      </div>

      {/* Architecture Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center space-x-2 text-indigo-600 font-bold text-sm">
            <Radio className="w-4 h-4" />
            <span>경량 원격 리모컨 구조</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            앱이 꺼져도 클라우드 백엔드가 24시간 감시하므로 안드로이드 백그라운드 서비스(Doze 모드) 제약에서 완전히 자유롭습니다.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center space-x-2 text-emerald-600 font-bold text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>EncryptedSharedPreferences</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            코레일 6자리 비밀번호는 Android KeyStore 기반 암호화 저장소에 보관 후 시작 시에만 백엔드로 전송합니다.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center space-x-2 text-amber-600 font-bold text-sm">
            <BellRing className="w-4 h-4" />
            <span>FCM & 텔레그램 듀얼 푸시</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            선점 성공 시 텔레그램과 안드로이드 시스템 고음량 알림 채널(Importance High)로 화면이 꺼져 있어도 즉각 깨웁니다.
          </p>
        </div>
      </div>

      {/* Code Snippet Tabs */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-4 h-4 text-indigo-400" />
            <div className="flex space-x-1">
              <button
                onClick={() => setSelectedSnippet('retrofit')}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                  selectedSnippet === 'retrofit'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                KtxSniperApi.kt (Retrofit2)
              </button>

              <button
                onClick={() => setSelectedSnippet('dto')}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                  selectedSnippet === 'dto'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                SniperModels.kt (Data Classes)
              </button>

              <button
                onClick={() => setSelectedSnippet('viewModel')}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                  selectedSnippet === 'viewModel'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                SniperViewModel.kt (StateFlow)
              </button>
            </div>
          </div>

          <span className="text-[11px] text-slate-400 font-mono">Kotlin 2.0 &middot; Coroutines</span>
        </div>

        <div className="p-4 overflow-y-auto max-h-[500px] font-mono text-xs text-slate-200 leading-relaxed">
          <pre className="overflow-x-auto whitespace-pre">
            <code>{ANDROID_KOTLIN_CODE[selectedSnippet]}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
