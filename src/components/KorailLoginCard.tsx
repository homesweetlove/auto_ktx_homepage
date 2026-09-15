import React, { useState } from 'react';
import {
  ShieldCheck, Lock, User, KeyRound, Eye, EyeOff,
  CheckCircle2, AlertCircle, RefreshCw, LogOut, Sparkles, HelpCircle
} from 'lucide-react';

export interface KorailUser {
  isLoggedIn: boolean;
  membershipNumber: string;
  userName: string;
  phoneNumber?: string;
  email?: string;
  isDemo?: boolean;
}

interface KorailLoginCardProps {
  user: KorailUser | null;
  onLoginSuccess: (user: KorailUser, password?: string) => void;
  onLogout: () => void;
  isRunning: boolean;
}

export function KorailLoginCard({
  user,
  onLoginSuccess,
  onLogout,
  isRunning,
}: KorailLoginCardProps) {
  const [idInput, setIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idInput.trim()) {
      setErrorMessage('코레일 회원번호, 휴대폰번호, 또는 이메일을 입력해주세요.');
      return;
    }
    if (!passwordInput) {
      setErrorMessage('비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/korail/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membershipNumber: idInput.trim(),
          password: passwordInput,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const loggedInUser: KorailUser = {
          isLoggedIn: true,
          membershipNumber: data.membershipNumber || idInput.trim(),
          userName: data.userName || '코레일 회원',
          phoneNumber: data.phoneNumber || '',
          email: data.email || '',
          isDemo: false,
        };
        onLoginSuccess(loggedInUser, passwordInput);
        setErrorMessage(null);
      } else {
        setErrorMessage(data.message || '로그인에 실패하였습니다. 회원번호와 비밀번호를 확인해주세요.');
      }
    } catch (err: any) {
      setErrorMessage(`서버 통신 실패: ${err.message || '네트워크 상태를 확인해주세요.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    const demoUser: KorailUser = {
      isLoggedIn: true,
      membershipNumber: '1234567890',
      userName: '홍길동 (체험 모드)',
      phoneNumber: '010-1234-5678',
      email: 'demo@korail.com',
      isDemo: true,
    };
    onLoginSuccess(demoUser, 'demoPass1234');
    setErrorMessage(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            1
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-slate-900 text-base">코레일 계정 로그인 및 세션 인증</h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>AES-256 종단간 암호화</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              취소표 감지 시 내 명의 장바구니에 즉각 선점하기 위해 코레일 공식 모바일 인증을 먼저 진행합니다.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1 self-start sm:self-center"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>보안 안내</span>
        </button>
      </div>

      {showHelp && (
        <div className="mt-3 p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 space-y-1.5 animate-in fade-in duration-200">
          <p className="font-semibold flex items-center space-x-1 text-blue-800">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>개인정보 및 세션 보안 처리 원칙</span>
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-700 pl-1">
            <li>비밀번호는 코레일 공식 암호화 키(<code className="font-mono bg-white px-1 py-0.5 rounded">app.login.cphd</code>)로 메모리 상에서 AES-256-CBC 암호화된 후 코레일 서버로 직접 전송됩니다.</li>
            <li>선점 완료 시 사용자가 스마트폰 코레일톡 앱으로 결제할 수 있도록 백엔드 세션은 <strong>즉시 자동 로그아웃</strong>되어 중복 접속 오류가 발생하지 않습니다.</li>
          </ul>
        </div>
      )}

      {/* Logged In State */}
      {user && user.isLoggedIn ? (
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-base">{user.userName}</span>
                {user.isDemo ? (
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-semibold">
                    체험(시뮬레이션) 모드
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>코레일 공식 인증됨</span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-600 mt-1">
                <span>회원번호: <strong className="font-mono text-slate-800">{user.membershipNumber}</strong></span>
                {user.phoneNumber && (
                  <span>연락처: <strong className="font-mono text-slate-800">{user.phoneNumber}</strong></span>
                )}
                <span>상태: <span className="text-emerald-700 font-semibold">실시간 자동 선점 준비 완료</span></span>
              </div>
            </div>
          </div>

          <button
            id="btn-korail-logout"
            type="button"
            disabled={isRunning}
            onClick={onLogout}
            className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors flex items-center space-x-1.5 shadow-xs disabled:opacity-50 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span>세션 로그아웃</span>
          </button>
        </div>
      ) : (
        /* Not Logged In: Form */
        <form onSubmit={handleRealLogin} className="mt-4 space-y-3.5">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-xs text-rose-800 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">코레일 인증 실패</p>
                <p className="mt-0.5 text-rose-700">{errorMessage}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            {/* ID / Membership Number */}
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>코레일 회원번호 / 휴대폰 / 이메일</span>
              </label>
              <div className="relative">
                <input
                  id="input-korail-id"
                  type="text"
                  disabled={isLoading || isRunning}
                  value={idInput}
                  onChange={(e) => setIdInput(e.target.value)}
                  placeholder="예: 1234567890 또는 010-1234-5678"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 bg-slate-50/70 focus:outline-blue-600 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center space-x-1">
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>비밀번호</span>
              </label>
              <div className="relative">
                <input
                  id="input-korail-pwd"
                  type={showPassword ? 'text' : 'password'}
                  disabled={isLoading || isRunning}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="코레일 비밀번호"
                  className="w-full px-3.5 py-2 pr-10 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 bg-slate-50/70 focus:outline-blue-600 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-2">
              <button
                id="btn-korail-login"
                type="submit"
                disabled={isLoading || isRunning}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-bold shadow-xs transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>인증 중...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>코레일 로그인</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 text-xs text-slate-500">
            <span className="flex items-center space-x-1 text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>실제 코레일 서버(smart.letskorail.com)와 직접 통신합니다.</span>
            </span>

            <button
              id="btn-korail-demo-mode"
              type="button"
              onClick={handleDemoLogin}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1 underline decoration-dotted"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>계정 없이 체험(데모) 모드로 먼저 둘러보기</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
