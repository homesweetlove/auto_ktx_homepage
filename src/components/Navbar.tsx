import { Train } from 'lucide-react';

interface NavbarProps {
  isRunning: boolean;
  status: string;
}

export function Navbar({ isRunning, status }: NavbarProps) {
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
              <div className="font-bold text-lg text-slate-900 tracking-tight">KTX 취소표 자동 선점 관제 센터</div>
              <p className="text-xs text-slate-500">취소표 감시 &middot; 결제 기한 알림</p>
            </div>
          </div>

          {/* Engine Status Badge */}
          <div className="flex items-center space-x-2">
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
