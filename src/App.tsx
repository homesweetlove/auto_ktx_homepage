/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { CodeViewer } from './components/CodeViewer';
import { PlanView } from './components/PlanView';
import { AndroidView } from './components/AndroidView';
import { SniperConfig, SniperStatus, LogEntry, ReservedTicket, TargetTrain } from './types/sniper';
import { playSuccessChime } from './utils/sound';
import { KorailUser } from './components/KorailLoginCard';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'code' | 'plan' | 'android'>('dashboard');
  const [status, setStatus] = useState<SniperStatus>('IDLE');
  const [isRunning, setIsRunning] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [lastLatencyMs, setLastLatencyMs] = useState(0);
  const [currentJitter, setCurrentJitter] = useState(1.65);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [reservedTicket, setReservedTicket] = useState<ReservedTicket | null>(null);

  // Korail user authentication state
  const [user, setUser] = useState<KorailUser | null>(() => {
    try {
      const saved = localStorage.getItem('ktx_sniper_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return null;
  });
  const [userPassword, setUserPassword] = useState<string>('');

  const statusPollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (
    level: LogEntry['level'],
    tag: LogEntry['tag'],
    message: string,
    latencyMs?: number
  ) => {
    const now = new Date();
    const timeStr = `${now.toTimeString().split(' ')[0]}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    const newEntry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: timeStr,
      level,
      tag,
      message,
      latencyMs,
    };
    setLogs((prev) => [...prev.slice(-150), newEntry]);
  };

  // Sync state from server /api/sniper/status
  const syncServerStatus = async () => {
    try {
      const res = await fetch('/api/sniper/status');
      const data = await res.json();
      if (data) {
        setStatus(data.status);
        setIsRunning(data.isRunning);
        setPollCount(data.pollCount || 0);
        setLastLatencyMs(data.lastLatencyMs || 0);
        setCurrentJitter(data.currentJitter || 1.65);
        if (Array.isArray(data.logs) && data.logs.length > 0) {
          setLogs(data.logs);
        }
        if (data.reservedTicket && !reservedTicket) {
          setReservedTicket(data.reservedTicket);
          playSuccessChime();
        }
      }
    } catch (e) {
      // Fallback: server may be temporarily busy
    }
  };

  // Polling loop while sniper is active
  useEffect(() => {
    if (isRunning) {
      statusPollTimerRef.current = setInterval(() => {
        syncServerStatus();
      }, 800);
    } else {
      if (statusPollTimerRef.current) {
        clearInterval(statusPollTimerRef.current);
        statusPollTimerRef.current = null;
      }
    }

    return () => {
      if (statusPollTimerRef.current) {
        clearInterval(statusPollTimerRef.current);
        statusPollTimerRef.current = null;
      }
    };
  }, [isRunning]);

  // Login handler
  const handleLoginSuccess = (loggedInUser: KorailUser, password?: string) => {
    setUser(loggedInUser);
    if (password) setUserPassword(password);
    try {
      localStorage.setItem('ktx_sniper_user', JSON.stringify(loggedInUser));
    } catch (e) {
      // ignore
    }
    addLog(
      'SUCCESS',
      'SECURITY',
      `코레일 세션 연동 성공: ${loggedInUser.userName} (${loggedInUser.membershipNumber})`
    );
  };

  // Logout handler
  const handleLogout = async () => {
    if (isRunning) {
      await handleStop();
    }
    setUser(null);
    setUserPassword('');
    try {
      localStorage.removeItem('ktx_sniper_user');
    } catch (e) {
      // ignore
    }
    addLog('WARN', 'SECURITY', '코레일 계정 로그아웃 완료.');
  };

  // Start Monitoring Engine
  const handleStart = async (config: SniperConfig) => {
    if (isRunning) return;

    setIsRunning(true);
    setStatus('LOGGING_IN');
    setPollCount(0);
    setReservedTicket(null);

    const payload = {
      departureStation: config.departureStation,
      arrivalStation: config.arrivalStation,
      date: config.date,
      baseTime: config.time,
      passengers: config.passengers,
      targets: config.targets,
      minJitter: config.minJitter,
      maxJitter: config.maxJitter,
      membershipNumber: user?.membershipNumber || config.membershipNumber,
      password: userPassword || config.password,
      telegramBotToken: config.telegramBotToken,
      telegramChatId: config.telegramChatId,
      isSimulationMode: user?.isDemo ?? false,
    };

    try {
      const res = await fetch('/api/sniper/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        setStatus('ERROR');
        setIsRunning(false);
        addLog('ERROR', 'ENGINE', `스나이퍼 시작 실패: ${data.message}`);
        alert(`스나이퍼 시작 실패: ${data.message}`);
      } else {
        syncServerStatus();
      }
    } catch (err: any) {
      setStatus('ERROR');
      setIsRunning(false);
      addLog('ERROR', 'ENGINE', `서버 요청 오류: ${err.message || err}`);
    }
  };

  // Stop Monitoring Engine
  const handleStop = async () => {
    try {
      await fetch('/api/sniper/stop', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    setIsRunning(false);
    setStatus('STOPPED');
    addLog('WARN', 'ENGINE', '스나이퍼 워커 취소 신호 수신. 안전 종료 완료.');
  };

  // Trigger Mock Reservation Success on a specific target
  const handleTriggerMockSuccess = async (targetTrain?: TargetTrain) => {
    try {
      const res = await fetch('/api/sniper/mock-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTrain }),
      });
      const data = await res.json();
      if (data?.ticket) {
        setReservedTicket(data.ticket);
        setStatus('SUCCESS');
        setIsRunning(false);
        playSuccessChime();
        syncServerStatus();
      }
    } catch (err) {
      console.error('Mock trigger failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isRunning={isRunning}
        status={status}
      />

      <main className="flex-1">
        {activeTab === 'dashboard' && (
          <DashboardView
            isRunning={isRunning}
            status={status}
            onStart={handleStart}
            onStop={handleStop}
            onTriggerMockSuccess={handleTriggerMockSuccess}
            logs={logs}
            reservedTicket={reservedTicket}
            pollCount={pollCount}
            lastLatencyMs={lastLatencyMs}
            currentJitter={currentJitter}
            user={user}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
          />
        )}

        {activeTab === 'code' && <CodeViewer />}

        {activeTab === 'plan' && <PlanView />}

        {activeTab === 'android' && <AndroidView />}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700">나만의 KTX 취소표 자동 선점 시스템 (개인용)</span>
            <span>&middot;</span>
            <span>FastAPI + Node Engine + Korail Mobile API + Telegram</span>
          </div>
          <div>
            <span>본 시스템은 코레일 취소표 실시간 감시 및 10분 골든타임 결제 지원 개인용 자동화 플랫폼입니다.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
