export interface StationInfo {
  name: string;
  line: string;
  category: 'KTX_MAIN' | 'GYEONGBU' | 'HONAM' | 'JEONLA' | 'GANGNEUNG' | 'GYEONGJEON' | 'JUNGANG' | 'JANGHANG' | 'OTHER';
  isKtx: boolean;
  chosung: string;
}

// 한글 초성 추출 유틸리티
export function getChosung(str: string): string {
  const CHOSUNG = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
    'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
  ];
  let res = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 44032;
    if (code >= 0 && code <= 11171) {
      res += CHOSUNG[Math.floor(code / 588)];
    } else {
      res += str.charAt(i).toLowerCase();
    }
  }
  return res;
}

export const STATION_CATEGORIES = [
  { id: 'ALL', name: '전체' },
  { id: 'KTX_MAIN', name: 'KTX 주요역' },
  { id: 'GYEONGBU', name: '경부·동해선' },
  { id: 'HONAM', name: '호남선' },
  { id: 'JEONLA', name: '전라선' },
  { id: 'GANGNEUNG', name: '강릉·영동선' },
  { id: 'GYEONGJEON', name: '경전선' },
  { id: 'JUNGANG', name: '중앙·중부선' },
  { id: 'JANGHANG', name: '장항·충북선' },
] as const;

export const POPULAR_ROUTES = [
  { dep: '서울', arr: '부산' },
  { dep: '서울', arr: '동대구' },
  { dep: '서울', arr: '대전' },
  { dep: '용산', arr: '광주송정' },
  { dep: '서울', arr: '강릉' },
  { dep: '용산', arr: '여수EXPO' },
  { dep: '서울', arr: '포항' },
  { dep: '서울', arr: '진주' },
  { dep: '용산', arr: '목포' },
  { dep: '수원', arr: '부산' },
  { dep: '청량리', arr: '안동' },
];

export const RAW_STATIONS: Array<{ name: string; line: string; category: StationInfo['category']; isKtx: boolean }> = [
  // KTX 주요 정차역
  { name: '서울', line: '경부·강릉선', category: 'KTX_MAIN', isKtx: true },
  { name: '용산', line: '호남·전라선', category: 'KTX_MAIN', isKtx: true },
  { name: '영등포', line: '경부선', category: 'KTX_MAIN', isKtx: true },
  { name: '광명', line: '경부·호남고속', category: 'KTX_MAIN', isKtx: true },
  { name: '수원', line: '경부선', category: 'KTX_MAIN', isKtx: true },
  { name: '천안아산', line: '경부·호남고속', category: 'KTX_MAIN', isKtx: true },
  { name: '오송', line: '경부·호남고속', category: 'KTX_MAIN', isKtx: true },
  { name: '대전', line: '경부고속', category: 'KTX_MAIN', isKtx: true },
  { name: '서대전', line: '호남선', category: 'KTX_MAIN', isKtx: true },
  { name: '김천구미', line: '경부고속', category: 'KTX_MAIN', isKtx: true },
  { name: '서대구', line: '경부고속', category: 'KTX_MAIN', isKtx: true },
  { name: '동대구', line: '경부고속', category: 'KTX_MAIN', isKtx: true },
  { name: '포항', line: '동해선', category: 'KTX_MAIN', isKtx: true },
  { name: '경주', line: '경부고속(구 신경주)', category: 'KTX_MAIN', isKtx: true },
  { name: '신경주', line: '경부고속', category: 'KTX_MAIN', isKtx: true },
  { name: '울산', line: '경부고속', category: 'KTX_MAIN', isKtx: true },
  { name: '밀양', line: '경부선', category: 'KTX_MAIN', isKtx: true },
  { name: '구포', line: '경부선', category: 'KTX_MAIN', isKtx: true },
  { name: '부산', line: '경부선', category: 'KTX_MAIN', isKtx: true },
  { name: '공주', line: '호남고속', category: 'KTX_MAIN', isKtx: true },
  { name: '익산', line: '호남·전라선', category: 'KTX_MAIN', isKtx: true },
  { name: '정읍', line: '호남고속', category: 'KTX_MAIN', isKtx: true },
  { name: '광주송정', line: '호남고속', category: 'KTX_MAIN', isKtx: true },
  { name: '나주', line: '호남고속', category: 'KTX_MAIN', isKtx: true },
  { name: '목포', line: '호남고속', category: 'KTX_MAIN', isKtx: true },
  { name: '전주', line: '전라선', category: 'KTX_MAIN', isKtx: true },
  { name: '남원', line: '전라선', category: 'KTX_MAIN', isKtx: true },
  { name: '곡성', line: '전라선', category: 'KTX_MAIN', isKtx: true },
  { name: '구례구', line: '전라선', category: 'KTX_MAIN', isKtx: true },
  { name: '순천', line: '전라·경전선', category: 'KTX_MAIN', isKtx: true },
  { name: '여천', line: '전라선', category: 'KTX_MAIN', isKtx: true },
  { name: '여수EXPO', line: '전라선', category: 'KTX_MAIN', isKtx: true },
  { name: '청량리', line: '강릉·중앙선', category: 'KTX_MAIN', isKtx: true },
  { name: '상봉', line: '강릉·중앙선', category: 'KTX_MAIN', isKtx: true },
  { name: '양평', line: '강릉·중앙선', category: 'KTX_MAIN', isKtx: true },
  { name: '서원주', line: '강릉·중앙선', category: 'KTX_MAIN', isKtx: true },
  { name: '만종', line: '강릉선', category: 'KTX_MAIN', isKtx: true },
  { name: '횡성', line: '강릉선', category: 'KTX_MAIN', isKtx: true },
  { name: '둔내', line: '강릉선', category: 'KTX_MAIN', isKtx: true },
  { name: '평창', line: '강릉선', category: 'KTX_MAIN', isKtx: true },
  { name: '진부(오대산)', line: '강릉선', category: 'KTX_MAIN', isKtx: true },
  { name: '강릉', line: '강릉선', category: 'KTX_MAIN', isKtx: true },
  { name: '정동진', line: '영동선', category: 'KTX_MAIN', isKtx: true },
  { name: '묵호', line: '동해선', category: 'KTX_MAIN', isKtx: true },
  { name: '동해', line: '동해선', category: 'KTX_MAIN', isKtx: true },
  { name: '진영', line: '경전선', category: 'KTX_MAIN', isKtx: true },
  { name: '창원중앙', line: '경전선', category: 'KTX_MAIN', isKtx: true },
  { name: '창원', line: '경전선', category: 'KTX_MAIN', isKtx: true },
  { name: '마산', line: '경전선', category: 'KTX_MAIN', isKtx: true },
  { name: '진주', line: '경전선', category: 'KTX_MAIN', isKtx: true },
  { name: '안동', line: '중앙선', category: 'KTX_MAIN', isKtx: true },

  // 경부선 / 동해선 일반 및 KTX 역
  { name: '안양', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '평택', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '성환', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '천안', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '조치원', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '부강', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '신탄진', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '옥천', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '이원', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '지탄', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '심천', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '영동', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '황간', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '추풍령', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '김천', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '구미', line: '경부선', category: 'GYEONGBU', isKtx: true },
  { name: '사곡', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '약목', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '왜관', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '신동', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '대구', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '경산', line: '경부선', category: 'GYEONGBU', isKtx: true },
  { name: '남성현', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '청도', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '상동', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '삼랑진', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '원동', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '물금', line: '경부선', category: 'GYEONGBU', isKtx: true },
  { name: '화명', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '사상', line: '경부선', category: 'GYEONGBU', isKtx: false },
  { name: '신해운대', line: '동해선', category: 'GYEONGBU', isKtx: false },
  { name: '센텀', line: '동해선', category: 'GYEONGBU', isKtx: false },
  { name: '기장', line: '동해선', category: 'GYEONGBU', isKtx: false },
  { name: '부전', line: '동해·경전선', category: 'GYEONGBU', isKtx: false },
  { name: '태화강', line: '동해선', category: 'GYEONGBU', isKtx: false },
  { name: '북울산', line: '동해선', category: 'GYEONGBU', isKtx: false },
  { name: '남창', line: '동해선', category: 'GYEONGBU', isKtx: false },
  { name: '안강', line: '동해선', category: 'GYEONGBU', isKtx: false },

  // 호남선 역
  { name: '계룡', line: '호남선', category: 'HONAM', isKtx: true },
  { name: '연산', line: '호남선', category: 'HONAM', isKtx: false },
  { name: '논산', line: '호남선', category: 'HONAM', isKtx: true },
  { name: '강경', line: '호남선', category: 'HONAM', isKtx: false },
  { name: '함열', line: '호남선', category: 'HONAM', isKtx: false },
  { name: '김제', line: '호남선', category: 'HONAM', isKtx: true },
  { name: '신태인', line: '호남선', category: 'HONAM', isKtx: false },
  { name: '백양사', line: '호남선', category: 'HONAM', isKtx: false },
  { name: '장성', line: '호남선', category: 'HONAM', isKtx: true },
  { name: '극락강', line: '광주선', category: 'HONAM', isKtx: false },
  { name: '광주', line: '광주선', category: 'HONAM', isKtx: false },
  { name: '노안', line: '호남선', category: 'HONAM', isKtx: false },
  { name: '다시', line: '호남선', category: 'HONAM', isKtx: false },
  { name: '함평', line: '호남선', category: 'HONAM', isKtx: false },
  { name: '무안', line: '호남선', category: 'HONAM', isKtx: false },
  { name: '몽탄', line: '호남선', category: 'HONAM', isKtx: false },
  { name: '일로', line: '호남선', category: 'HONAM', isKtx: false },
  { name: '임성리', line: '호남선', category: 'HONAM', isKtx: false },

  // 전라선 역
  { name: '삼례', line: '전라선', category: 'JEONLA', isKtx: false },
  { name: '임실', line: '전라선', category: 'JEONLA', isKtx: false },
  { name: '오수', line: '전라선', category: 'JEONLA', isKtx: false },
  { name: '압록', line: '전라선', category: 'JEONLA', isKtx: false },

  // 강릉선 / 영동선 / 태백선
  { name: '덕소', line: '중앙·강릉선', category: 'GANGNEUNG', isKtx: true },
  { name: '용문', line: '중앙선', category: 'GANGNEUNG', isKtx: false },
  { name: '지평', line: '중앙선', category: 'GANGNEUNG', isKtx: false },
  { name: '양동', line: '중앙선', category: 'GANGNEUNG', isKtx: false },
  { name: '원주', line: '중앙선', category: 'GANGNEUNG', isKtx: true },
  { name: '안인', line: '영동선', category: 'GANGNEUNG', isKtx: false },
  { name: '옥계', line: '영동선', category: 'GANGNEUNG', isKtx: false },
  { name: '망상', line: '영동선', category: 'GANGNEUNG', isKtx: false },
  { name: '삼척해변', line: '삼척선', category: 'GANGNEUNG', isKtx: false },
  { name: '신기', line: '영동선', category: 'GANGNEUNG', isKtx: false },
  { name: '도계', line: '영동선', category: 'GANGNEUNG', isKtx: false },
  { name: '동백산', line: '영동선', category: 'GANGNEUNG', isKtx: false },
  { name: '철암', line: '영동선', category: 'GANGNEUNG', isKtx: false },
  { name: '석포', line: '영동선', category: 'GANGNEUNG', isKtx: false },
  { name: '승부', line: '영동선', category: 'GANGNEUNG', isKtx: false },
  { name: '분천', line: '영동선', category: 'GANGNEUNG', isKtx: false },
  { name: '춘양', line: '영동선', category: 'GANGNEUNG', isKtx: false },
  { name: '봉화', line: '영동선', category: 'GANGNEUNG', isKtx: false },
  { name: '영월', line: '태백선', category: 'GANGNEUNG', isKtx: false },
  { name: '예미', line: '태백선', category: 'GANGNEUNG', isKtx: false },
  { name: '민둥산', line: '태백선', category: 'GANGNEUNG', isKtx: false },
  { name: '사북', line: '태백선', category: 'GANGNEUNG', isKtx: false },
  { name: '고한', line: '태백선', category: 'GANGNEUNG', isKtx: false },
  { name: '태백', line: '태백선', category: 'GANGNEUNG', isKtx: false },

  // 경전선
  { name: '낙동강', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '한림정', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '진례', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '중리', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '함안', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '군북', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '반성', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '완사', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '북천', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '횡천', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '하동', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '진상', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '옥곡', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '광양', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '벌교', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '조성', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '예당', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '득량', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '보성', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '명봉', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '이양', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '능주', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '화순', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '효천', line: '경전선', category: 'GYEONGJEON', isKtx: false },
  { name: '서광주', line: '경전선', category: 'GYEONGJEON', isKtx: false },

  // 중앙선 / 중부내륙선
  { name: '제천', line: '중앙·충북선', category: 'JUNGANG', isKtx: true },
  { name: '단양', line: '중앙선', category: 'JUNGANG', isKtx: true },
  { name: '풍기', line: '중앙선', category: 'JUNGANG', isKtx: true },
  { name: '영주', line: '중앙·영동선', category: 'JUNGANG', isKtx: true },
  { name: '의성', line: '중앙선', category: 'JUNGANG', isKtx: false },
  { name: '탑리', line: '중앙선', category: 'JUNGANG', isKtx: false },
  { name: '화본', line: '중앙선', category: 'JUNGANG', isKtx: false },
  { name: '신녕', line: '중앙선', category: 'JUNGANG', isKtx: false },
  { name: '북영천', line: '중앙선', category: 'JUNGANG', isKtx: false },
  { name: '영천', line: '중앙·대구선', category: 'JUNGANG', isKtx: false },
  { name: '아화', line: '중앙선', category: 'JUNGANG', isKtx: false },
  { name: '부발', line: '중부내륙선', category: 'JUNGANG', isKtx: true },
  { name: '가남', line: '중부내륙선', category: 'JUNGANG', isKtx: true },
  { name: '감곡장호원', line: '중부내륙선', category: 'JUNGANG', isKtx: true },
  { name: '앙성온천', line: '중부내륙선', category: 'JUNGANG', isKtx: true },
  { name: '충주', line: '중부내륙·충북선', category: 'JUNGANG', isKtx: true },
  { name: '살미', line: '중부내륙선', category: 'JUNGANG', isKtx: true },
  { name: '수안보온천', line: '중부내륙선', category: 'JUNGANG', isKtx: true },
  { name: '연풍', line: '중부내륙선', category: 'JUNGANG', isKtx: true },
  { name: '문경', line: '중부내륙선', category: 'JUNGANG', isKtx: true },

  // 장항선 / 충북선
  { name: '아산', line: '장항선', category: 'JANGHANG', isKtx: true },
  { name: '온양온천', line: '장항선', category: 'JANGHANG', isKtx: false },
  { name: '신창', line: '장항선', category: 'JANGHANG', isKtx: false },
  { name: '도고온천', line: '장항선', category: 'JANGHANG', isKtx: false },
  { name: '신례원', line: '장항선', category: 'JANGHANG', isKtx: false },
  { name: '예산', line: '장항선', category: 'JANGHANG', isKtx: false },
  { name: '삽교', line: '장항선', category: 'JANGHANG', isKtx: false },
  { name: '홍성', line: '장항선', category: 'JANGHANG', isKtx: false },
  { name: '광천', line: '장항선', category: 'JANGHANG', isKtx: false },
  { name: '청소', line: '장항선', category: 'JANGHANG', isKtx: false },
  { name: '대천', line: '장항선', category: 'JANGHANG', isKtx: false },
  { name: '웅천', line: '장항선', category: 'JANGHANG', isKtx: false },
  { name: '판교', line: '장항선', category: 'JANGHANG', isKtx: false },
  { name: '서천', line: '장항선', category: 'JANGHANG', isKtx: false },
  { name: '장항', line: '장항선', category: 'JANGHANG', isKtx: false },
  { name: '군산', line: '장항선', category: 'JANGHANG', isKtx: false },
  { name: '대야', line: '장항선', category: 'JANGHANG', isKtx: false },
  { name: '청주', line: '충북선', category: 'JANGHANG', isKtx: false },
  { name: '오근장', line: '충북선', category: 'JANGHANG', isKtx: false },
  { name: '청주공항', line: '충북선', category: 'JANGHANG', isKtx: false },
  { name: '증평', line: '충북선', category: 'JANGHANG', isKtx: false },
  { name: '음성', line: '충북선', category: 'JANGHANG', isKtx: false },
  { name: '주덕', line: '충북선', category: 'JANGHANG', isKtx: false },
  { name: '삼탄', line: '충북선', category: 'JANGHANG', isKtx: false },
  { name: '봉양', line: '중앙·충북선', category: 'JANGHANG', isKtx: false },
];

// Unique processed stations
const seen = new Set<string>();
export const ALL_STATIONS: StationInfo[] = [];

for (const s of RAW_STATIONS) {
  if (!seen.has(s.name)) {
    seen.add(s.name);
    ALL_STATIONS.push({
      name: s.name,
      line: s.line,
      category: s.category,
      isKtx: s.isKtx,
      chosung: getChosung(s.name),
    });
  }
}

// Search helper function
export function searchStations(query: string, categoryFilter: string = 'ALL'): StationInfo[] {
  const cleanQ = query.trim().toLowerCase();
  const qChosung = getChosung(cleanQ);

  return ALL_STATIONS.filter((station) => {
    // Category check
    if (categoryFilter !== 'ALL') {
      if (categoryFilter === 'KTX_MAIN') {
        if (!station.isKtx) return false;
      } else if (station.category !== categoryFilter) {
        return false;
      }
    }

    if (!cleanQ) return true;

    // Name match
    if (station.name.toLowerCase().includes(cleanQ)) return true;
    // Chosung match (e.g. ㅂㅅ -> 부산)
    if (station.chosung.includes(cleanQ) || station.chosung.includes(qChosung)) return true;
    // Line match
    if (station.line.toLowerCase().includes(cleanQ)) return true;

    return false;
  });
}
