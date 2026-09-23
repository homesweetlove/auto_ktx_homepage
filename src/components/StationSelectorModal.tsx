import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Check, Train, MapPin, Sparkles } from 'lucide-react';
import {
  ALL_STATIONS,
  STATION_CATEGORIES,
  searchStations,
  StationInfo,
} from '../data/korailStations';

interface StationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: '출발역 선택' | '도착역 선택';
  currentStation: string;
  oppositeStation: string;
  onSelectStation: (stationName: string) => void;
}

export function StationSelectorModal({
  isOpen,
  onClose,
  title,
  currentStation,
  oppositeStation,
  onSelectStation,
}: StationSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('KTX_MAIN');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      // Auto focus search input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredStations = searchStations(searchQuery, searchQuery.trim() ? 'ALL' : selectedCategory);
  const isCustomMatch = searchQuery.trim() && !ALL_STATIONS.some((s) => s.name === searchQuery.trim());

  const handleSelect = (name: string) => {
    onSelectStation(name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{title}</h3>
              <p className="text-xs text-slate-500">
                전국 모든 코레일 역(KTX, ITX, 새마을, 무궁화호)을 검색하거나 노선별로 선택하세요.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar with Chosung support */}
        <div className="p-4 border-b border-slate-100 bg-white space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="역 이름 또는 초성 검색 (예: 부산, ㅂㅅ, 동대구, ㄷㄷㄱ, 강릉, ㄱㄹ)"
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-blue-600 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>
              💡 <strong>초성 검색 가능</strong>: 'ㅂㅅ' 입력 시 '부산', 'ㅇㅅ' 입력 시 '용산/울산/오송/여수EXPO' 검색
            </span>
            <span className="font-semibold text-blue-600">
              검색결과: {filteredStations.length}개 역
            </span>
          </div>

          {/* Category Tabs (shown when not actively searching) */}
          {!searchQuery.trim() && (
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-none pt-1">
              {STATION_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Station Grid / List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 max-h-[50vh]">
          {/* Direct Custom Station Fallback Button if user types something specific */}
          {isCustomMatch && (
            <div className="mb-3 p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 text-xs text-blue-900">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  입력하신 <strong>'{searchQuery.trim()}'</strong>역을 직접 지정하시겠습니까?
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSelect(searchQuery.trim())}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shrink-0 shadow-xs"
              >
                '{searchQuery.trim()}' 선택
              </button>
            </div>
          )}

          {filteredStations.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Train className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-60" />
              <p className="text-sm font-semibold text-slate-700">검색된 역이 없습니다.</p>
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => handleSelect(searchQuery.trim())}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-xs"
                >
                  '{searchQuery.trim()}' 역으로 직접 적용하기
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {filteredStations.map((station) => {
                const isSelected = station.name === currentStation;
                const isOpposite = station.name === oppositeStation;

                return (
                  <button
                    key={`${station.category}-${station.name}`}
                    type="button"
                    onClick={() => handleSelect(station.name)}
                    className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-600 text-blue-950 ring-2 ring-blue-600/20'
                        : isOpposite
                        ? 'bg-slate-50/70 border-slate-200 text-slate-400 opacity-60'
                        : 'bg-white border-slate-200 text-slate-800 hover:border-blue-300 hover:bg-blue-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                        {station.name}
                      </span>
                      {isSelected ? (
                        <Check className="w-4 h-4 text-blue-600 shrink-0" />
                      ) : station.isKtx ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-700">
                          KTX
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span className="truncate">{station.line}</span>
                      {isOpposite && (
                        <span className="text-[10px] text-amber-600 font-semibold shrink-0">
                          (현재 반대편 역)
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500">
          <span>
            현재 선택: <strong className="text-slate-800">{currentStation}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
