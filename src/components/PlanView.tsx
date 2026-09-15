import React from 'react';
import {
  CheckCircle2, AlertTriangle, ShieldAlert, Cpu, ArrowRight,
  Clock, Server, Zap, Check, ExternalLink, HelpCircle
} from 'lucide-react';
import { PLAN_COMPARISONS, CRITICAL_RISKS, REVISED_ROADMAP } from '../data/architecturePlan';

export function PlanView() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Header Intro */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 md:p-8 shadow-md">
        <div className="max-w-3xl space-y-3">
          <span className="px-2.5 py-1 rounded-md bg-blue-500/30 text-blue-300 text-xs font-semibold border border-blue-400/30">
            아키텍처 진단 및 개선안
          </span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            코레일 KTX 취소표 선점 시스템: 고도화 마스터 플랜
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            사용자분께서 제시해주신 기본 아키텍처(FastAPI + korail2 + Telegram + Android)는 훌륭한 출발점입니다.
            하지만 실전 환경(코레일톡 방화벽, 세션 충돌, 10분 결제 만료, Android 절전 모드 등)에서 맞닥뜨리는
            치명적 병목들을 해결할 수 있도록 <strong>안정성과 성공률을 극대화한 실전형 아키텍처</strong>로 재설계하였습니다.
          </p>
        </div>
      </div>

      {/* Side-by-Side Comparison: Initial vs Revised */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">1. 기존 계획 vs 개선된 실전 마스터 플랜 비교</h2>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
                <tr>
                  <th className="py-3 px-4 w-1/5">설계 영역</th>
                  <th className="py-3 px-4 w-1/3 text-slate-500">기존 계획</th>
                  <th className="py-3 px-4 w-1/3 text-blue-700 bg-blue-50/50">개선된 마스터 플랜 (권장)</th>
                  <th className="py-3 px-4 w-1/4 text-emerald-700">실전 개선 이점</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PLAN_COMPARISONS.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 text-xs">
                      {item.dimension}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {item.originalPlan}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-blue-900 bg-blue-50/30">
                      <div className="flex items-start space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                        <span>{item.revisedPlan}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-emerald-700">
                      {item.advantage}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4 Critical Failure Points & Solutions */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-bold text-slate-900">2. 실전 실패를 초래하는 4대 위험 요인과 기술적 방어책</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CRITICAL_RISKS.map((risk) => (
            <div
              key={risk.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                    <AlertTriangle className={`w-4 h-4 ${risk.severity === 'CRITICAL' ? 'text-red-500' : 'text-amber-500'}`} />
                    <span>{risk.title}</span>
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      risk.severity === 'CRITICAL'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {risk.severity}
                  </span>
                </div>

                <div className="mt-2.5 p-3 rounded-xl bg-slate-50 text-xs text-slate-600 space-y-1">
                  <span className="font-semibold text-slate-700 block">발생 원인:</span>
                  <p>{risk.cause}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 space-y-1">
                <span className="font-semibold text-blue-800 flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                  <span>기술적 해결책:</span>
                </span>
                <p className="leading-relaxed">{risk.countermeasure}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4-Phase Step-by-Step Roadmap */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">3. 단계별 실행 로드맵 (Phase 1 ~ Phase 4)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {REVISED_ROADMAP.map((item) => (
            <div
              key={item.phase}
              className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 ${
                item.status === 'CURRENT'
                  ? 'bg-blue-50/40 border-blue-300 shadow-sm'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-blue-600">{item.phase}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      item.status === 'CURRENT'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.status === 'CURRENT' ? '현재 구현 완료' : item.period}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
              </div>

              <ul className="space-y-2 text-xs text-slate-600">
                {item.tasks.map((task, tidx) => (
                  <li key={tidx} className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <span>{task}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
                {item.status === 'CURRENT' ? '👉 백엔드 탭에서 소스코드 확인 가능' : '다음 단계 연계'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Server Specs for Cloud Deployment */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base">추천 배포 인프라 (24시간 무중단 가동용)</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Linux Ubuntu 22.04 / 24.04</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80">
            <span className="text-slate-400 block mb-1">인프라 옵션 1 (무료)</span>
            <strong className="text-white text-sm block">Oracle Cloud Free Tier</strong>
            <p className="text-slate-400 text-[11px] mt-1">ARM Ampere 1 vCPU, 1GB RAM으로도 24시간 감시 충분</p>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80">
            <span className="text-slate-400 block mb-1">인프라 옵션 2 (초간편)</span>
            <strong className="text-white text-sm block">AWS Lightsail ($3.5/월)</strong>
            <p className="text-slate-400 text-[11px] mt-1">서울 리전(ap-northeast-2) 선택 시 코레일 서버 지연시간 5ms 이내</p>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80">
            <span className="text-slate-400 block mb-1">인프라 옵션 3 (홈 서버)</span>
            <strong className="text-white text-sm block">Raspberry Pi 4 / 미니 PC</strong>
            <p className="text-slate-400 text-[11px] mt-1">가정용 공유기 포트포워딩(8000) 또는 Cloudflare Tunnels 연동</p>
          </div>
        </div>
      </div>
    </div>
  );
}
