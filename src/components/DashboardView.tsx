import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Square, RefreshCw, Zap, Bell, Shield, Clock, Train,
  CheckCircle2, AlertTriangle, Terminal as TerminalIcon,
  ChevronRight, ArrowRight, Download, Volume2, Sparkles,
  Search, Check, Trash2, Calendar, Users, Filter, Send, ExternalLink,
  MapPin, ChevronDown
} from 'lucide-react';
import {
  SniperConfig, SniperStatus, LogEntry, ReservedTicket,
  TrainScheduleItem, TargetTrain
} from '../types/sniper';
import { generateTrainSchedules } from '../data/mockSchedules';
import { playSuccessChime } from '../utils/sound';
import { KorailLoginCard, KorailUser } from './KorailLoginCard';
import { StationSelectorModal } from './StationSelectorModal';
import { POPULAR_ROUTES, ALL_STATIONS } from '../data/korailStations';

interface DashboardViewProps {
  isRunning: boolean;
  status: SniperStatus;
  onStart: (config: SniperConfig) => void;
  onStop: () => void;
  onTriggerMockSuccess: (targetTrain?: TargetTrain) => void;
  logs: LogEntry[];
  reservedTicket: ReservedTicket | null;
  pollCount: number;
  lastLatencyMs: number;
  currentJitter: number;
  user: KorailUser | null;
  onLoginSuccess: (user: KorailUser, password?: string) => void;
  onLogout: () => void;
}

export function DashboardView({
  isRunning,
  status,
  onStart,
  onStop,
  onTriggerMockSuccess,
  logs,
  reservedTicket,
  pollCount,
  lastLatencyMs,
  currentJitter,
  user,
  onLoginSuccess,
  onLogout,
}: DashboardViewProps) {
  // Query inputs
  const [departureStation, setDepartureStation] = useState('서울');
  const [arrivalStation, setArrivalStation] = useState('부산');
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2); // default to 2 days ahead
    return d.toISOString().slice(0, 10).replace(/-/g, '');
  });
  const [baseTime, setBaseTime] = useState('080000');
  const [passengers, setPassengers] = useState(1);

  // Station modal state
  const [stationModalTarget, setStationModalTarget] = useState<'DEP' | 'ARR' | null>(null);

  // Schedules state
  const [schedules, setSchedules] = useState<TrainScheduleItem[]>(() =>
    generateTrainSchedules('서울', '부산', date, '080000')
  );
  const [isSearching, setIsSearching] = useState(false);
  const [isRealData, setIsRealData] = useState(false);

  // Target list (selected trains and seats)
  const [targets, setTargets] = useState<TargetTrain[]>([
    {
      trainNumber: '015',
      trainType: 'KTX',
      departureTime: '07:50',
      arrivalTime: '10:26',
      seatPreference: 'NORMAL',
    },
    {
      trainNumber: '017',
      trainType: 'KTX',
      departureTime: '07:58',
      arrivalTime: '10:46',
      seatPreference: 'ANY',
    },
  ]);

  // Jitter & Telegram
  const [minJitter, setMinJitter] = useState(1.3);
  const [maxJitter, setMaxJitter] = useState(2.2);
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramTestStatus, setTelegramTestStatus] = useState<string | null>(null);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);

  // UI state
  const [deadlineSeconds, setDeadlineSeconds] = useState<number>(600);
  const [logFilter, setLogFilter] = useState<'ALL' | 'SUCCESS' | 'KORAIL' | 'TELEGRAM'>('ALL');
  const [trainTypeFilter, setTrainTypeFilter] = useState<'ALL' | 'KTX' | 'KTX-산천' | 'KTX-청룡'>('ALL');
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Initial load: Fetch real Korail schedule
  useEffect(() => {
    fetchRealSchedules(departureStation, arrivalStation, date, baseTime, passengers);
  }, []);

  // 10-Minute Golden Time Countdown
  useEffect(() => {
    if (!reservedTicket) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(reservedTicket.paymentDeadline).getTime();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      setDeadlineSeconds(diff);
      if (diff <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [reservedTicket]);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Fetch real schedules from backend API
  const fetchRealSchedules = async (
    dep: string,
    arr: string,
    queryDate: string,
    queryTime: string,
    psgCount: number
  ) => {
    setIsSearching(true);
    try {
      const res = await fetch('/api/korail/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departureStation: dep,
          arrivalStation: arr,
          date: queryDate,
          time: queryTime,
          passengers: psgCount,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.schedules) && data.schedules.length > 0) {
        const mapped: TrainScheduleItem[] = data.schedules.map((s: any) => ({
          trainNumber: s.trainNumber,
          trainType: s.trainType,
          departureTime: s.departureTime,
          arrivalTime: s.arrivalTime,
          duration: s.duration,
          departureStation: s.departureStation,
          arrivalStation: s.arrivalStation,
          generalSeatStatus: s.hasNormalSeat ? 'AVAILABLE' : 'SOLD_OUT',
          specialSeatStatus: s.hasSpecialSeat ? 'AVAILABLE' : 'SOLD_OUT',
          generalPrice: s.normalPrice || 59800,
          specialPrice: s.specialPrice || 83700,
        }));
        setSchedules(mapped);
        setIsRealData(true);

        if (mapped.length >= 2) {
          setTargets([
            {
              trainNumber: mapped[0].trainNumber,
              trainType: mapped[0].trainType,
              departureTime: mapped[0].departureTime,
              arrivalTime: mapped[0].arrivalTime,
              seatPreference: 'NORMAL',
            },
            {
              trainNumber: mapped[1].trainNumber,
              trainType: mapped[1].trainType,
              departureTime: mapped[1].departureTime,
              arrivalTime: mapped[1].arrivalTime,
              seatPreference: 'ANY',
            },
          ]);
        }
      } else {
        // Fallback to generator
        const fallback = generateTrainSchedules(dep, arr, queryDate, queryTime);
        setSchedules(fallback);
        setIsRealData(false);
      }
    } catch (e) {
      console.warn('실시간 시간표 조회 예외, 모의 데이터 사용:', e);
      const fallback = generateTrainSchedules(dep, arr, queryDate, queryTime);
      setSchedules(fallback);
      setIsRealData(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSchedules = () => {
    fetchRealSchedules(departureStation, arrivalStation, date, baseTime, passengers);
  };

  const handleStationSwap = () => {
    const temp = departureStation;
    setDepartureStation(arrivalStation);
    setArrivalStation(temp);
    fetchRealSchedules(arrivalStation, temp, date, baseTime, passengers);
  };

  const handleStationModalSelect = (stationName: string) => {
    if (stationModalTarget === 'DEP') {
      setDepartureStation(stationName);
      fetchRealSchedules(stationName, arrivalStation, date, baseTime, passengers);
    } else if (stationModalTarget === 'ARR') {
      setArrivalStation(stationName);
      fetchRealSchedules(departureStation, stationName, date, baseTime, passengers);
    }
  };

  // Toggle seat selection for a specific train
  const handleToggleSeat = (train: TrainScheduleItem, seat: 'NORMAL' | 'SPECIAL' | 'ANY') => {
    if (isRunning) return;

    setTargets((prev) => {
      const existing = prev.find((t) => t.trainNumber === train.trainNumber);
      if (existing) {
        if (existing.seatPreference === seat) {
          return prev.filter((t) => t.trainNumber !== train.trainNumber);
        } else {
          return prev.map((t) =>
            t.trainNumber === train.trainNumber ? { ...t, seatPreference: seat } : t
          );
        }
      } else {
        return [
          ...prev,
          {
            trainNumber: train.trainNumber,
            trainType: train.trainType,
            departureTime: train.departureTime,
            arrivalTime: train.arrivalTime,
            seatPreference: seat,
          },
        ];
      }
    });
  };

  const isTargetSelected = (trainNumber: string, seat: 'NORMAL' | 'SPECIAL' | 'ANY') => {
    const found = targets.find((t) => t.trainNumber === trainNumber);
    if (!found) return false;
    return found.seatPreference === seat;
  };

  const getTargetForTrain = (trainNumber: string) => {
    return targets.find((t) => t.trainNumber === trainNumber);
  };

  // Test Telegram Alert
  const handleTestTelegram = async () => {
    if (!telegramToken || !telegramChatId) {
      setTelegramTestStatus('토큰과 Chat ID를 모두 입력해주세요.');
      return;
    }
    setIsTestingTelegram(true);
    setTelegramTestStatus(null);
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramToken,
          chatId: telegramChatId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTelegramTestStatus('✅ 텔레그램 메시지가 성공적으로 전송되었습니다!');
      } else {
        setTelegramTestStatus(`❌ 전송 실패: ${data.message}`);
      }
    } catch (e: any) {
      setTelegramTestStatus(`❌ 오류: ${e.message}`);
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleStartSniper = () => {
    if (!user || !user.isLoggedIn) {
      alert('1단계에서 코레일 계정 로그인 또는 [체험 모드]를 먼저 완료해주세요.');
      const el = document.getElementById('input-korail-id');
      if (el) el.focus();
      return;
    }

    if (targets.length === 0) {
      alert('최소 1개 이상의 열차에서 [일반실] 또는 [특실]을 선택해주세요.');
      return;
    }

    const config: SniperConfig = {
      departureStation,
      arrivalStation,
      date,
      time: baseTime,
      passengers,
      targets,
      minJitter,
      maxJitter,
      membershipNumber: user.membershipNumber,
      password: '',
      telegramBotToken: telegramToken,
      telegramChatId: telegramChatId,
      stopOnSuccess: true,
      autoLogoutOnSuccess: true,
    };

    onStart(config);
  };

  const filteredSchedules = schedules.filter((s) => {
    if (trainTypeFilter === 'ALL') return true;
    return s.trainType.includes(trainTypeFilter);
  });

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredLogs = logs.filter((l) => {
    if (logFilter === 'ALL') return true;
    if (logFilter === 'SUCCESS') return l.level === 'SUCCESS';
    if (logFilter === 'KORAIL') return l.tag === 'KORAIL';
    if (logFilter === 'TELEGRAM') return l.tag === 'TELEGRAM';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Station Selector Modal */}
      <StationSelectorModal
        isOpen={stationModalTarget !== null}
        onClose={() => setStationModalTarget(null)}
        title={stationModalTarget === 'DEP' ? '출발역 선택' : '도착역 선택'}
        currentStation={stationModalTarget === 'DEP' ? departureStation : arrivalStation}
        oppositeStation={stationModalTarget === 'DEP' ? arrivalStation : departureStation}
        onSelectStation={handleStationModalSelect}
      />

      {/* 10-Minute Golden Time Banner on Success */}
      {status === 'SUCCESS' && reservedTicket && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white p-5 rounded-2xl shadow-xl border border-emerald-400/30 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-lg">🎉 선택 열차 취소표 선점 성공!</span>
                  <span className="px-2 py-0.5 rounded bg-white/30 text-xs font-semibold">
                    {reservedTicket.trainType} {reservedTicket.trainNumber} ({reservedTicket.seatType})
                  </span>
                </div>
                <p className="text-emerald-100 text-sm mt-0.5">
                  {reservedTicket.departureStation} ({reservedTicket.departureTime}) → {reservedTicket.arrivalStation} ({reservedTicket.arrivalTime}) | 좌석: {reservedTicket.seatInfo}
                </p>
              </div>
            </div>

            {/* Countdown Box */}
            <div className="flex items-center space-x-4 bg-black/30 px-4 py-2.5 rounded-xl border border-white/10 shrink-0">
              <div className="text-right">
                <p className="text-[11px] text-emerald-200 font-semibold uppercase tracking-wider">10분 결제 마감</p>
                <div className="flex items-center space-x-1 font-mono text-2xl font-black text-amber-300">
                  <Clock className="w-5 h-5 text-amber-300 animate-spin" />
                  <span>{formatCountdown(deadlineSeconds)}</span>
                </div>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <button
                type="button"
                onClick={() => playSuccessChime()}
                className="px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors flex items-center space-x-1"
                title="알림음 재생"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>알림음</span>
              </button>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/20 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-100">
            <span className="flex items-center space-x-1.5">
              <Shield className="w-4 h-4 text-emerald-300" />
              <span><strong>공식 앱 결제 안내:</strong> 스마트폰 코레일톡 동시 접속 충돌을 방지하기 위해 백엔드 세션은 즉시 자동 로그아웃되었습니다. 지금 코레일톡 [장바구니]에서 결제하세요.</span>
            </span>
            <span className="bg-white/20 px-2.5 py-1 rounded text-white font-mono font-semibold">
              예약번호: {reservedTicket.reservationNumber} | {reservedTicket.totalPrice.toLocaleString()}원
            </span>
          </div>
        </div>
      )}

      {/* STEP 1: Korail Account Login First */}
      <KorailLoginCard
        user={user}
        onLoginSuccess={onLoginSuccess}
        onLogout={onLogout}
        isRunning={isRunning}
      />

      {/* STEP 2: Live Korail Train Schedule Search & Selection with All Stations Picker */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              2
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-slate-900 text-base">전국 역 운행 시간표 조회</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                  전국 {ALL_STATIONS.length}개 전 역 지원
                </span>
                {isRealData ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>실제 코레일 공식 API 연동</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                    모의 시간표 모드
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                출발역과 도착역을 클릭하여 전국 모든 역(KTX, ITX, 새마을, 무궁화호)을 검색하거나 직접 입력할 수 있습니다.
              </p>
            </div>
          </div>

          {/* Quick Route Selector & All Stations Explorer */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              disabled={isRunning}
              onClick={() => setStationModalTarget('DEP')}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-2xs"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>전국 모든 역 탐색 ({ALL_STATIONS.length}개)</span>
            </button>
          </div>
        </div>

        {/* Popular Route Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs text-slate-600">
          <span className="text-slate-400 font-semibold shrink-0 mr-1 flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>추천 노선:</span>
          </span>
          {POPULAR_ROUTES.map((route) => {
            const isMatch = departureStation === route.dep && arrivalStation === route.arr;
            return (
              <button
                key={`${route.dep}-${route.arr}`}
                type="button"
                disabled={isRunning}
                onClick={() => {
                  setDepartureStation(route.dep);
                  setArrivalStation(route.arr);
                  fetchRealSchedules(route.dep, route.arr, date, baseTime, passengers);
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors ${
                  isMatch
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {route.dep} ↔ {route.arr}
              </button>
            );
          })}
        </div>

        {/* Search Controls Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-end">
          {/* Departure Station Card */}
          <div className="md:col-span-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>출발역</span>
              </label>
              <button
                type="button"
                disabled={isRunning}
                onClick={() => setStationModalTarget('DEP')}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
              >
                모든 역 보기
              </button>
            </div>
            <div className="relative flex items-center">
              <input
                id="input-dep-station"
                type="text"
                value={departureStation}
                disabled={isRunning}
                onChange={(e) => setDepartureStation(e.target.value)}
                className="w-full px-3.5 py-2.5 pr-9 border border-slate-200 rounded-xl text-base font-bold text-slate-900 bg-slate-50/70 focus:outline-blue-600 focus:bg-white"
              />
              <button
                type="button"
                disabled={isRunning}
                onClick={() => setStationModalTarget('DEP')}
                className="absolute right-2 p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                title="출발역 검색창 열기"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Swap Button & Arrival Station Card */}
          <div className="md:col-span-3 relative">
            <button
              id="btn-swap-stations"
              type="button"
              onClick={handleStationSwap}
              disabled={isRunning}
              className="hidden md:flex absolute -left-4 top-8 z-10 w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-100 items-center justify-center text-slate-600 shadow-xs transition-colors"
              title="출발역과 도착역 맞바꾸기"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>도착역</span>
              </label>
              <button
                type="button"
                disabled={isRunning}
                onClick={() => setStationModalTarget('ARR')}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800"
              >
                모든 역 보기
              </button>
            </div>
            <div className="relative flex items-center">
              <input
                id="input-arr-station"
                type="text"
                value={arrivalStation}
                disabled={isRunning}
                onChange={(e) => setArrivalStation(e.target.value)}
                className="w-full px-3.5 py-2.5 pr-9 border border-slate-200 rounded-xl text-base font-bold text-slate-900 bg-slate-50/70 focus:outline-emerald-600 focus:bg-white"
              />
              <button
                type="button"
                disabled={isRunning}
                onClick={() => setStationModalTarget('ARR')}
                className="absolute right-2 p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100"
                title="도착역 검색창 열기"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Date */}
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-600 block mb-1">출발일자 (YYYYMMDD)</label>
            <div className="relative">
              <input
                id="input-date"
                type="text"
                value={date}
                disabled={isRunning}
                onChange={(e) => setDate(e.target.value)}
                placeholder="예: 20260909"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 bg-slate-50/70 focus:outline-blue-600"
              />
            </div>
          </div>

          {/* Departure Time */}
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-600 block mb-1">출발 기준 시간</label>
            <select
              id="select-base-time"
              value={baseTime}
              disabled={isRunning}
              onChange={(e) => setBaseTime(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 bg-slate-50/70 focus:outline-blue-600"
            >
              <option value="060000">06:00 이후</option>
              <option value="070000">07:00 이후</option>
              <option value="080000">08:00 이후</option>
              <option value="090000">09:00 이후</option>
              <option value="110000">11:00 이후</option>
              <option value="130000">13:00 이후</option>
              <option value="150000">15:00 이후</option>
              <option value="170000">17:00 이후</option>
              <option value="190000">19:00 이후</option>
              <option value="210000">21:00 이후</option>
            </select>
          </div>

          {/* Search Button */}
          <div className="md:col-span-2">
            <button
              id="btn-search-schedules"
              type="button"
              onClick={handleSearchSchedules}
              disabled={isSearching || isRunning}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-xs transition-colors disabled:opacity-60"
            >
              <Search className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`} />
              <span>{isSearching ? '조회 중...' : '시간표 조회'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* High Readability Train Schedule Table & Target Selection */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header / Filter Bar */}
        <div className="p-4 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 text-base">열차별 좌석 선점 타겟 지정</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                  총 {filteredSchedules.length}편 운행 ({departureStation} ➔ {arrivalStation})
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                탑승을 희망하는 열차의 <strong>[일반실]</strong>, <strong>[특실]</strong>, 또는 <strong>[둘 다 상관없음]</strong> 버튼을 눌러 모니터링 타겟으로 추가하세요.
              </p>
            </div>
          </div>

          {/* Train Type Filter */}
          <div className="flex items-center space-x-1.5 self-end sm:self-auto">
            <span className="text-xs text-slate-400 font-medium">열차 필터:</span>
            {(['ALL', 'KTX', 'KTX-산천', 'KTX-청룡'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTrainTypeFilter(type)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  trainTypeFilter === type
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {type === 'ALL' ? '전체' : type}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule List */}
        <div className="divide-y divide-slate-100">
          {filteredSchedules.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Train className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-60" />
              <p className="text-sm font-semibold text-slate-700">해당 구간에 조회된 직통 열차가 없습니다.</p>
              <p className="text-xs text-slate-400 mt-1">출발역, 도착역, 또는 출발일자/시간을 다시 확인해주세요.</p>
            </div>
          ) : (
            filteredSchedules.map((train) => {
              const target = getTargetForTrain(train.trainNumber);
              const isTargeted = !!target;

              return (
                <div
                  key={train.trainNumber}
                  className={`p-4 sm:px-6 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    isTargeted ? 'bg-blue-50/50' : 'hover:bg-slate-50/70'
                  }`}
                >
                  {/* Train Info Column */}
                  <div className="flex items-start sm:items-center space-x-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      train.trainType.includes('산천')
                        ? 'bg-purple-100 text-purple-700'
                        : train.trainType.includes('청룡')
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      <Train className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-sm">{train.trainType}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-xs font-bold text-slate-700">
                          {train.trainNumber}호
                        </span>
                        <span className="text-xs text-slate-400 font-medium">({train.duration})</span>
                      </div>

                      <div className="flex items-center space-x-2 mt-1">
                        <span className="font-mono text-base font-black text-slate-900">{train.departureTime}</span>
                        <span className="text-xs text-slate-500 font-medium">{train.departureStation}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-base font-black text-slate-900">{train.arrivalTime}</span>
                        <span className="text-xs text-slate-500 font-medium">{train.arrivalStation}</span>
                      </div>
                    </div>
                  </div>

                  {/* Seat Selector Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* General Seat Button */}
                    <button
                      id={`btn-target-normal-${train.trainNumber}`}
                      type="button"
                      disabled={isRunning}
                      onClick={() => handleToggleSeat(train, 'NORMAL')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center space-x-1.5 ${
                        isTargetSelected(train.trainNumber, 'NORMAL')
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>일반실</span>
                      <span className="text-[10px] opacity-80">({train.generalPrice.toLocaleString()}원)</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        train.generalSeatStatus === 'AVAILABLE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-700'
                      }`}>
                        {train.generalSeatStatus === 'AVAILABLE' ? '예약가능' : '매진'}
                      </span>
                    </button>

                    {/* Special Seat Button */}
                    <button
                      id={`btn-target-special-${train.trainNumber}`}
                      type="button"
                      disabled={isRunning}
                      onClick={() => handleToggleSeat(train, 'SPECIAL')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center space-x-1.5 ${
                        isTargetSelected(train.trainNumber, 'SPECIAL')
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>특실</span>
                      <span className="text-[10px] opacity-80">({train.specialPrice.toLocaleString()}원)</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        train.specialSeatStatus === 'AVAILABLE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-700'
                      }`}>
                        {train.specialSeatStatus === 'AVAILABLE' ? '예약가능' : '매진'}
                      </span>
                    </button>

                    {/* Any Seat Button */}
                    <button
                      id={`btn-target-any-${train.trainNumber}`}
                      type="button"
                      disabled={isRunning}
                      onClick={() => handleToggleSeat(train, 'ANY')}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                        isTargetSelected(train.trainNumber, 'ANY')
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isTargetSelected(train.trainNumber, 'ANY') ? '✓ 일반/특실 모두 감시' : '둘 다 상관없음'}
                    </button>

                    {/* Status Indicator if targeted */}
                    {isTargeted && (
                      <div className="flex items-center space-x-1 text-blue-700 text-xs font-bold pl-1">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        <span>
                          {target.seatPreference === 'NORMAL'
                            ? '일반실 타겟'
                            : target.seatPreference === 'SPECIAL'
                            ? '특실 타겟'
                            : '일반/특실 모두 타겟'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* STEP 3: Selected Targets Summary Bar & Anti-Ban Jitter & Engine Launch */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              3
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-white">자동 선점 타겟 요약 및 안티 차단 엔진 가동</h3>
                <span className="px-2 py-0.5 rounded bg-blue-500/30 text-blue-300 font-mono text-xs font-bold border border-blue-400/30">
                  {targets.length}편 열차 지정됨
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                지정한 열차들 중 단 1개라도 취소표가 나오는 즉시 번개처럼 선점(장바구니 담기)하고 스마트폰으로 알림을 보냅니다.
              </p>
            </div>
          </div>

          {targets.length > 0 && !isRunning && (
            <button
              type="button"
              onClick={() => setTargets([])}
              className="text-xs text-slate-400 hover:text-red-400 flex items-center space-x-1 transition-colors self-end md:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>전체 선택 해제</span>
            </button>
          )}
        </div>

        {/* Selected Targets Chips */}
        {targets.length === 0 ? (
          <div className="py-4 text-center text-slate-400 text-xs">
            <AlertTriangle className="w-6 h-6 mx-auto mb-1.5 text-amber-400 opacity-80" />
            <p className="font-semibold text-slate-300">선택된 타겟 열차가 없습니다.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">상단 시간표 목록에서 탑승하고 싶은 열차의 [일반실] 또는 [특실] 버튼을 클릭하세요.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {targets.map((t) => (
              <div
                key={t.trainNumber}
                className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl flex items-center space-x-2 text-xs"
              >
                <span className="font-mono font-bold text-blue-400">{t.trainType} {t.trainNumber}호</span>
                <span className="text-slate-400">({t.departureTime} 출발)</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    t.seatPreference === 'NORMAL'
                      ? 'bg-blue-900/60 text-blue-300'
                      : t.seatPreference === 'SPECIAL'
                      ? 'bg-purple-900/60 text-purple-300'
                      : 'bg-emerald-900/60 text-emerald-300'
                  }`}
                >
                  {t.seatPreference === 'NORMAL' ? '일반실' : t.seatPreference === 'SPECIAL' ? '특실' : '일반/특실'}
                </span>
                {!isRunning && (
                  <button
                    type="button"
                    onClick={() => setTargets(targets.filter((item) => item.trainNumber !== t.trainNumber))}
                    className="text-slate-400 hover:text-red-400 ml-1"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Jitter & Telegram Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {/* Anti-blocking Jitter */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-semibold flex items-center space-x-1.5">
                <Shield className="w-4 h-4 text-blue-400" />
                <span>안티 차단 가변 지터 (Jitter)</span>
              </span>
              <span className="font-mono text-blue-400 font-bold">{minJitter}초 ~ {maxJitter}초</span>
            </div>
            <p className="text-[11px] text-slate-400">코레일 WAF 차단을 방지하기 위해 정형화된 간격 대신 인간다운 무작위 지연을 부여합니다.</p>
            <div className="flex items-center gap-3 pt-1">
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                disabled={isRunning}
                value={minJitter}
                onChange={(e) => setMinJitter(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          </div>

          {/* Telegram Notification Setup */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-semibold flex items-center space-x-1.5">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>텔레그램 긴급 푸시 알림 (선택)</span>
              </span>
              {telegramToken && telegramChatId && (
                <span className="text-[10px] text-emerald-400 font-bold">연동 준비 완료</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="봇 토큰 (Bot Token)"
                disabled={isRunning}
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus:outline-blue-500"
              />
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="Chat ID"
                  disabled={isRunning}
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus:outline-blue-500"
                />
                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={isTestingTelegram || !telegramToken || !telegramChatId}
                  className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white rounded-lg text-[11px] font-semibold flex items-center space-x-1 shrink-0"
                  title="텔레그램 테스트 메시지 발송"
                >
                  <Send className="w-3 h-3" />
                  <span>{isTestingTelegram ? '...' : '테스트'}</span>
                </button>
              </div>
            </div>
            {telegramTestStatus && (
              <p className="text-[11px] font-semibold text-slate-300">{telegramTestStatus}</p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          {!isRunning ? (
            <button
              id="btn-start-targeted-sniper"
              type="button"
              onClick={handleStartSniper}
              disabled={targets.length === 0}
              className="flex-1 w-full py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-md transition-all active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>선택한 {targets.length}편 열차 실시간 자동 선점 시작</span>
            </button>
          ) : (
            <button
              id="btn-stop-sniper"
              type="button"
              onClick={onStop}
              className="flex-1 w-full py-3 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-md transition-all active:scale-[0.98]"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>스나이퍼 감시 안전 종료 (세션 로그아웃)</span>
            </button>
          )}

          {/* Quick Mock Trigger Button */}
          <button
            id="btn-mock-trigger"
            type="button"
            onClick={() => onTriggerMockSuccess()}
            className="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
            title="취소표가 발생했을 때의 10분 골든타임 결제 카운트다운과 푸시 알림 파이프라인을 즉시 테스트합니다."
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>모의 선점 즉시 테스트</span>
          </button>
        </div>
      </div>

      {/* Real-time Polling Console & Terminal Logs */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div className="flex items-center space-x-2">
              <TerminalIcon className="w-4 h-4 text-slate-400" />
              <span className="font-mono text-xs font-bold text-slate-200">실시간 스나이퍼 관제 콘솔</span>
            </div>
            {isRunning && (
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[11px] font-mono font-bold">
                탐색 #{pollCount}회 | 응답 {lastLatencyMs}ms | 지터 {currentJitter}s
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1">
            {(['ALL', 'SUCCESS', 'KORAIL', 'TELEGRAM'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setLogFilter(cat)}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                  logFilter === cat
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat === 'ALL' ? '전체 로그' : cat === 'SUCCESS' ? '선점 성공' : cat}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={logContainerRef}
          className="h-64 p-4 overflow-y-auto font-mono text-xs space-y-1.5 bg-slate-950/80 scrollbar-thin scrollbar-thumb-slate-800"
        >
          {filteredLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-600">
              <span>대기 중... 상단의 [자동 선점 시작] 또는 [모의 선점 즉시 테스트]를 눌러보세요.</span>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start space-x-2 leading-relaxed">
                <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
                <span
                  className={`px-1 rounded text-[10px] font-bold shrink-0 ${
                    log.tag === 'ENGINE'
                      ? 'bg-blue-950 text-blue-400 border border-blue-800/40'
                      : log.tag === 'KORAIL'
                      ? 'bg-purple-950 text-purple-400 border border-purple-800/40'
                      : log.tag === 'TELEGRAM'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800/40'
                      : log.tag === 'SECURITY'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {log.tag}
                </span>
                <span
                  className={`flex-1 break-all ${
                    log.level === 'SUCCESS'
                      ? 'text-emerald-400 font-bold'
                      : log.level === 'WARN'
                      ? 'text-amber-400'
                      : log.level === 'ERROR'
                      ? 'text-rose-400 font-bold'
                      : 'text-slate-300'
                  }`}
                >
                  {log.message}
                </span>
                {log.latencyMs !== undefined && (
                  <span className="text-slate-500 text-[10px] shrink-0 font-sans">
                    {log.latencyMs}ms
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
