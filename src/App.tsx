/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import {
  SniperConfig, SniperStatus, LogEntry, ReservedTicket, TargetTrain,
  SniperStartRequest, SniperStatusResponse, KorailSessionResponse,
} from './types/sniper';
import { playSuccessChime } from './utils/sound';
import { apiFetch, postJson } from './utils/api';
import { KorailUser } from './components/KorailLoginCard';

export default function App() {
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
      const res = await apiFetch('/api/sniper/status');
      if (!res.ok) return;
      const data: SniperStatusResponse = await res.json();
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

  // 새로고침 후 서버에 계정 정보가 없으면 (서버 재시작 등) 저장된 로그인 표시를 해제
  useEffect(() => {
    syncServerStatus();
    if (!user || user.isDemo) return;
    (async () => {
      try {
        const res = await apiFetch('/api/korail/session');
        if (!res.ok) return;
        const session: KorailSessionResponse = await res.json();
        if (!session.loggedIn) {
          setUser(null);
          try {
            localStorage.removeItem('ktx_sniper_user');
          } catch (e) {
            // ignore
          }
          addLog('WARN', 'SECURITY', '서버에 저장된 코레일 로그인 정보가 없어 다시 로그인이 필요합니다.');
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

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
  const handleLoginSuccess = (loggedInUser: KorailUser) => {
    setUser(loggedInUser);
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
    if (!user?.isDemo) {
      try {
        await postJson('/api/korail/logout');
      } catch (e) {
        // ignore
      }
    }
    setUser(null);
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

    const payload: SniperStartRequest = {
      departureStation: config.departureStation,
      arrivalStation: config.arrivalStation,
      date: config.date,
      baseTime: config.time,
      passengers: config.passengers,
      targets: config.targets,
      minJitter: config.minJitter,
      maxJitter: config.maxJitter,
      telegramBotToken: config.telegramBotToken,
      telegramChatId: config.telegramChatId,
      isSimulationMode: user?.isDemo ?? false,
    };

    try {
      const res = await postJson('/api/sniper/start', payload);
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
      await postJson('/api/sniper/stop');
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
      const res = await postJson('/api/sniper/mock-trigger', { targetTrain });
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
      <Navbar isRunning={isRunning} status={status} />

      <main className="flex-1">
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
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700">나만의 KTX 취소표 자동 선점 시스템 (개인용)</span>
            <span>&middot;</span>
            <span>Node + React + Telegram</span>
          </div>
          <div>
            <span>코레일 공식 서비스가 아닌 개인용 프로젝트입니다.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
