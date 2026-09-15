import { Train, Terminal, Code2, MapPin, Smartphone, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'code' | 'plan' | 'android';
  setActiveTab: (tab: 'dashboard' | 'code' | 'plan' | 'android') => void;
  isRunning: boolean;
  status: string;
}

export function Navbar({ activeTab, setActiveTab, isRunning, status }: NavbarProps) {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Train className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">KTX 취소표 자동 선점 관제 센터</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  FastAPI 0.115 Engine
                </span>
              </div>
              <p className="text-xs text-slate-500">24시간 상시 감시 &middot; 10분 골든타임 결제 경보 시스템</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              id="nav-tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>실시간 관제</span>
              {isRunning && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>

            <button
              id="nav-tab-code"
              onClick={() => setActiveTab('code')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'code'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>[Phase 1] 백엔드 코드</span>
              <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] rounded font-mono">11개 파일</span>
            </button>

            <button
              id="nav-tab-plan"
              onClick={() => setActiveTab('plan')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'plan'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>개선된 마스터 플랜</span>
            </button>

            <button
              id="nav-tab-android"
              onClick={() => setActiveTab('android')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'android'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>안드로이드 연동 규격</span>
            </button>
          </nav>

          {/* Engine Status Badge */}
          <div className="hidden lg:flex items-center space-x-2 border-l border-slate-200 pl-4">
            <div className="flex items-center space-x-1.5 text-xs">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isRunning
                    ? 'bg-emerald-500 animate-ping'
                    : status === 'SUCCESS'
                    ? 'bg-blue-500'
                    : 'bg-slate-400'
                }`}
              />
              <span className="font-medium text-slate-700">
                {isRunning ? '엔진 감시 가동 중' : status === 'SUCCESS' ? '선점 성공' : '대기 상태'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
