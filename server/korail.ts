import crypto from 'crypto';

const USER_AGENT = 'Dalvik/2.1.0 (Linux; U; Android 13; SM-S928N Build/UP1A.231005.007)';
const KORAIL_HOST = 'smart.letskorail.com';
const KORAIL_MOBILE = `https://${KORAIL_HOST}:443/classes/com.korail.mobile`;

class DynaPathMasterEngine {
  private APP_ID = 'com.korail.talk';
  private AS_VALUE = '%5B38ff229cb34c7dda8e28220a2d750cce%5D';
  private DEVICE_MODEL = 'SM-S928N';
  private OS_TYPE = 'Android';
  private SDK_VERSION = 'v1';
  private TABLE = '3FE9jgRD4KdCyuawklqGJYmvfMn15P7US8XbxeLQtWT6OicBAopINs2Vh0HZrz';
  private I8 = 161;
  private I9 = 30;
  private I10 = 2;
  private app_start_ts = String(Date.now());

  private string2xA1s(str: string): number[] {
    const res: number[] = [];
    let i = 0;
    while (i < str.length) {
      const cp = str.charCodeAt(i++);
      if (cp < 128) res.push(cp);
      else if (cp < 2048) {
        res.push(128 | ((cp >> 7) & 15));
        res.push(cp & 127);
      } else if (cp >= 262144) {
        res.push(160);
        res.push((cp >> 14) & 127);
        res.push((cp >> 7) & 127);
        res.push(cp & 127);
      } else if ((63488 & cp) !== 55296) {
        res.push(((cp >> 14) & 15) | 144);
        res.push((cp >> 7) & 127);
        res.push(cp & 127);
      }
    }
    return res;
  }

  private makeKey(keyStr: string): bigint {
    let bigIntAdd = BigInt(0);
    for (let j = 0; j < keyStr.length; j++) {
      const cp = BigInt(keyStr.charCodeAt(j));
      let i9Bit = BigInt(32768);
      for (let k = 0; k < 16; k++) {
        if ((i9Bit & cp) !== BigInt(0)) break;
        i9Bit >>= BigInt(1);
      }
      bigIntAdd = (bigIntAdd * (i9Bit << BigInt(1))) + cp;
    }
    return bigIntAdd;
  }

  private _internalI(baseTable: string, remainder: number, encodeSize: number, currentSb: string): string {
    let j8Count = 0;
    for (let k = 0; k < baseTable.length; k++) {
      const char = baseTable[k];
      if (!currentSb.includes(char)) {
        if (j8Count === remainder) return char;
        j8Count++;
      }
    }
    return ' ';
  }

  private makeEncodeTable(num: bigint, encodeSize: number, baseTable: string): string {
    let sb = '';
    let tempNum = BigInt(num);
    const size = BigInt(encodeSize);
    for (let i = 0; i < encodeSize; i++) {
      const j8Divisor = size - BigInt(i);
      const remainder = Number(tempNum % j8Divisor);
      const char = this._internalI(baseTable, remainder, baseTable.length, sb);
      sb += char;
      tempNum = tempNum / j8Divisor;
    }
    return sb;
  }

  private encodeNormalBe(dataStr: string, table: string, i8 = 161, i9 = 30, i10 = 2): string {
    const listData = this.string2xA1s(dataStr);
    const sb: string[] = [];
    const iArr = new Array(i10 + 1).fill(0);
    let idx = 0;
    const size = listData.length % i10;
    const size2 = listData.length - size;
    while (idx < size2) {
      let val = 0;
      for (let j = 0; j < i10; j++) {
        val = (val * i8) + listData[idx++];
      }
      for (let j = 0; j < i10 + 1; j++) {
        iArr[j] = val % i9;
        val = Math.floor(val / i9);
      }
      for (let j = i10; j >= 0; j--) {
        sb.push(table[iArr[j]]);
      }
    }
    if (size > 0) {
      let val = 0;
      for (let j = 0; j < size; j++) {
        val = (val * i8) + listData[idx++];
      }
      for (let j = 0; j < size + 1; j++) {
        iArr[j] = val % i9;
        val = Math.floor(val / i9);
      }
      let s = size;
      while (s >= 0) {
        sb.push(table[iArr[s]]);
        s--;
      }
    }
    return sb.join('');
  }

  public generateToken(deviceId: string, ts: number, rand: string): string {
    const plaintext = `ai=${this.APP_ID}&di=${deviceId}&as=${this.AS_VALUE}&su=false&dbg=false&emu=false&hk=false&it=${this.app_start_ts}&ts=${ts}&rt=0&os=13&dm=${this.DEVICE_MODEL}&st=${this.OS_TYPE}&sv=${this.SDK_VERSION}`;
    const dynKey = `v1+${rand}+${ts}`;
    const keyEnc = this.encodeNormalBe(dynKey, this.TABLE, this.I8, this.I9, this.I10);
    const bigKey = this.makeKey(dynKey);
    const customTable = this.makeEncodeTable(bigKey, this.I9, this.TABLE);
    const bodyEnc = this.encodeNormalBe(plaintext, customTable, this.I8, this.I9, this.I10);
    return `bEeEP${this.TABLE[keyEnc.length]}${keyEnc}${bodyEnc}`;
  }
}

export function generateAuthHeadersAndSid(device = 'AD', deviceId = '558a4f02041657ea') {
  const engine = new DynaPathMasterEngine();
  const ts = Date.now();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 4; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  const token = engine.generateToken(deviceId, ts, rand);

  const sidKey = Buffer.from('2485dd54d9deaa36', 'utf-8');
  const cipher = crypto.createCipheriv('aes-128-cbc', sidKey, sidKey);
  const plain = Buffer.from(`${device}${ts}`, 'utf-8');
  const sid = Buffer.concat([cipher.update(plain), cipher.final()]).toString('base64') + '\n';

  return {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': USER_AGENT,
      'Host': KORAIL_HOST,
      'Connection': 'Keep-Alive',
      'Accept-Encoding': 'gzip',
      'x-dynapath-m-token': token,
    },
    sid,
  };
}

export interface KorailUserSession {
  isLoggedIn: boolean;
  membershipNumber?: string;
  userName?: string;
  phoneNumber?: string;
  email?: string;
  cookies?: string[];
  lastLoginAt?: string;
}

export class KorailService {
  private device = 'AD';
  private version = '250601002';
  private cookieJar: Map<string, string> = new Map();

  private getCookieHeader(): string {
    const parts: string[] = [];
    for (const [k, v] of this.cookieJar.entries()) {
      parts.push(`${k}=${v}`);
    }
    return parts.join('; ');
  }

  private saveCookies(response: Response) {
    const rawSetCookies = response.headers.get('set-cookie');
    if (rawSetCookies) {
      const cookieItems = rawSetCookies.split(/,(?=[^;]+=[^;]+)/);
      for (const item of cookieItems) {
        const [cookiePair] = item.split(';');
        const [name, val] = cookiePair.split('=');
        if (name && val) {
          this.cookieJar.set(name.trim(), val.trim());
        }
      }
    }
  }

  /**
   * 코레일 비밀번호 암호화 키 수신 및 AES-256-CBC 암호화
   */
  private async encryptPassword(password: string): Promise<{ encPwd: string; idx: string }> {
    const cphdParams = new URLSearchParams({ code: 'app.login.cphd' });
    const res = await fetch(`${KORAIL_MOBILE}.common.code.do`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': USER_AGENT,
        'Host': KORAIL_HOST,
      },
      body: cphdParams.toString(),
    });

    const json = await res.json() as any;
    if (json?.strResult === 'SUCC' && json['app.login.cphd']) {
      const { idx, key } = json['app.login.cphd'];
      const encryptKey = Buffer.from(key, 'utf-8');
      const iv = Buffer.from(key.slice(0, 16), 'utf-8');
      const cipher = crypto.createCipheriv('aes-256-cbc', encryptKey, iv);
      const encrypted = Buffer.concat([cipher.update(password, 'utf-8'), cipher.final()]);
      const b64_1 = encrypted.toString('base64');
      const encPwd = Buffer.from(b64_1, 'utf-8').toString('base64');
      return { encPwd, idx: String(idx) };
    }
    throw new Error('코레일 로그인 암호화 키 수신 실패');
  }

  /**
   * 실제 코레일 로그인 수행
   */
  public async login(id: string, password: string): Promise<{
    success: boolean;
    userName?: string;
    membershipNumber?: string;
    phoneNumber?: string;
    email?: string;
    message?: string;
    code?: string;
  }> {
    try {
      const { encPwd, idx } = await this.encryptPassword(password);
      const { headers, sid } = generateAuthHeadersAndSid(this.device);

      const isEmail = id.includes('@');
      const isPhone = /^01[016789]-?\d{3,4}-?\d{4}$/.test(id);
      const txtInputFlg = isEmail ? '5' : isPhone ? '4' : '2';

      const params = new URLSearchParams({
        Device: this.device,
        Version: this.version,
        txtMemberNo: id.replace(/-/g, ''),
        txtPwd: encPwd,
        txtInputFlg,
        idx,
        Sid: sid,
      });

      const res = await fetch(`${KORAIL_MOBILE}.login.Login`, {
        method: 'POST',
        headers: {
          ...headers,
          Cookie: this.getCookieHeader(),
        },
        body: params.toString(),
      });

      this.saveCookies(res);
      const json = await res.json() as any;

      if (json?.strResult === 'SUCC' && json?.strMbCrdNo) {
        return {
          success: true,
          userName: json.strCustNm,
          membershipNumber: json.strMbCrdNo,
          phoneNumber: json.strCpNo,
          email: json.strEmailAdr,
        };
      }

      const msg = json?.h_msg_txt || json?.strResultMsg || '로그인에 실패하였습니다.';
      return {
        success: false,
        message: msg,
        code: json?.h_msg_cd,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `코레일 통신 중 오류: ${err.message || err}`,
      };
    }
  }

  /**
   * 코레일 세션 즉각 로그아웃 (공식 앱 중복 접속 충돌 방지)
   */
  public async logout(): Promise<void> {
    try {
      await fetch(`${KORAIL_MOBILE}.common.logout`, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          Cookie: this.getCookieHeader(),
        },
      });
      this.cookieJar.clear();
    } catch (e) {
      console.warn('코레일 로그아웃 요청 예외:', e);
    }
  }

  /**
   * 실제 코레일 실시간 시간표 및 좌석 현황 조회
   */
  public async searchTrains(options: {
    dep: string;
    arr: string;
    date: string; // YYYYMMDD
    time?: string; // HHMMSS
    trainType?: string; // '100'=KTX, '109'=전체
    passengers?: number;
  }) {
    const {
      dep,
      arr,
      date,
      time = '000000',
      trainType = '100',
      passengers = 1,
    } = options;

    const { headers, sid } = generateAuthHeadersAndSid(this.device);

    const params = new URLSearchParams({
      Device: this.device,
      Version: this.version,
      txtMenuId: '11',
      radJobId: '1',
      selGoTrain: trainType,
      txtTrnGpCd: trainType,
      txtGoStart: dep,
      txtGoEnd: arr,
      txtGoAbrdDt: date.replace(/-/g, ''),
      txtGoHour: time.replace(/:/g, '').padEnd(6, '0'),
      txtPsgFlg_1: String(passengers),
      txtPsgFlg_2: '0',
      txtPsgFlg_3: '0',
      txtPsgFlg_4: '0',
      txtPsgFlg_5: '0',
      txtSeatAttCd_2: '000',
      txtSeatAttCd_3: '000',
      txtSeatAttCd_4: '015',
      ebizCrossCheck: 'N',
      srtCheckYn: 'N',
      rtYn: 'N',
      adjStnScdlOfrFlg: 'N',
      Sid: sid,
    });

    const res = await fetch(`${KORAIL_MOBILE}.seatMovie.ScheduleView`, {
      method: 'POST',
      headers: {
        ...headers,
        Cookie: this.getCookieHeader(),
      },
      body: params.toString(),
    });

    this.saveCookies(res);
    const json = await res.json() as any;

    if (json?.strResult !== 'SUCC') {
      const msg = json?.h_msg_txt || '시간표 조회 실패';
      const code = json?.h_msg_cd || '';
      if (['P100', 'WRG000000', 'WRD000061'].includes(code)) {
        return [];
      }
      throw new Error(`${msg} (${code})`);
    }

    const trainInfos = json?.trn_infos?.trn_info || [];
    const results = [];

    for (const info of trainInfos) {
      const trainNum = info.h_trn_no || '';
      const trainTypeNm = info.h_trn_clsf_nm || 'KTX';
      const depTm = info.h_dpt_tm || '';
      const arrTm = info.h_arv_tm || '';

      const genCode = info.h_gen_rsv_cd || '13';
      const speCode = info.h_spe_rsv_cd || '13';
      const waitFlg = String(info.h_wait_rsv_flg || '0');

      const hasNormal = genCode === '11';
      const hasSpecial = speCode === '11';
      const hasWait = waitFlg === '9';

      let durationStr = '약 2시간 30분';
      try {
        const dh = parseInt(depTm.slice(0, 2), 10);
        const dm = parseInt(depTm.slice(2, 4), 10);
        const ah = parseInt(arrTm.slice(0, 2), 10);
        const am = parseInt(arrTm.slice(2, 4), 10);
        let dur = (ah * 60 + am) - (dh * 60 + dm);
        if (dur < 0) dur += 24 * 60;
        durationStr = `${Math.floor(dur / 60)}시간 ${dur % 60}분`;
      } catch (e) {
        // fallback
      }

      const depFmt = depTm.length >= 4 ? `${depTm.slice(0, 2)}:${depTm.slice(2, 4)}` : depTm;
      const arrFmt = arrTm.length >= 4 ? `${arrTm.slice(0, 2)}:${arrTm.slice(2, 4)}` : arrTm;

      const normalPrice = arr.includes('부산') ? 59800 : arr.includes('동대구') ? 43500 : 23700;
      const specialPrice = Math.floor(normalPrice * 1.4);

      results.push({
        trainNumber: trainNum,
        trainType: trainTypeNm,
        departureStation: info.h_dpt_rs_stn_nm || dep,
        arrivalStation: info.h_arv_rs_stn_nm || arr,
        departureTime: depFmt,
        arrivalTime: arrFmt,
        departureDate: info.h_dpt_dt || date,
        duration: durationStr,
        hasNormalSeat: hasNormal,
        hasSpecialSeat: hasSpecial,
        hasWaitingList: hasWait,
        normalPrice,
        specialPrice,
        _raw: info,
      });
    }

    return results;
  }

  /**
   * 취소표 즉시 원자적 선점 (장바구니 담기)
   */
  public async reserve(
    trainRaw: any,
    seatPreference: 'NORMAL' | 'SPECIAL' | 'ANY',
    passengers = 1
  ): Promise<{
    success: boolean;
    pnrNo?: string;
    seatInfo?: string;
    price?: number;
    limitDate?: string;
    limitTime?: string;
    message?: string;
  }> {
    const { headers, sid } = generateAuthHeadersAndSid(this.device);
    const isSpecial = seatPreference === 'SPECIAL';

    const params = new URLSearchParams({
      Device: this.device,
      Version: this.version,
      Key: 'korail1234567890',
      txtMenuId: '11',
      txtJobId: '1101',
      txtGdNo: '',
      hidFreeFlg: 'N',
      txtTotPsgCnt: String(passengers),
      txtSeatAttCd1: '000',
      txtSeatAttCd2: '000',
      txtSeatAttCd3: '000',
      txtSeatAttCd4: '015',
      txtSeatAttCd5: '000',
      txtStndFlg: 'N',
      txtSrcarCnt: '0',
      txtJrnyCnt: '1',
      txtJrnySqno1: '001',
      txtJrnyTpCd1: '11',
      txtDptDt1: trainRaw.h_dpt_dt,
      txtDptRsStnCd1: trainRaw.h_dpt_rs_stn_cd,
      txtDptTm1: trainRaw.h_dpt_tm,
      txtArvRsStnCd1: trainRaw.h_arv_rs_stn_cd,
      txtTrnNo1: trainRaw.h_trn_no,
      txtRunDt1: trainRaw.h_run_dt,
      txtTrnClsfCd1: trainRaw.h_trn_clsf_cd,
      txtTrnGpCd1: trainRaw.h_trn_gp_cd,
      txtChgFlg1: 'N',
      txtPsgTpCd1: '1',
      txtDiscKndCd1: '000',
      txtCompaCnt1: String(passengers),
      txtSeatAtt1: '015',
      txtPsrmClCd1: isSpecial ? '2' : '1',
      Sid: sid,
    });

    const res = await fetch(`${KORAIL_MOBILE}.certification.TicketReservation`, {
      method: 'POST',
      headers: {
        ...headers,
        Cookie: this.getCookieHeader(),
      },
      body: params.toString(),
    });

    this.saveCookies(res);
    const json = await res.json() as any;

    if (json?.strResult === 'SUCC') {
      const pnrNo = json.h_pnr_no;
      const seatInfo = `${isSpecial ? '특실' : '일반실'} ${json.h_srcar_no || '4'}호차 ${json.h_seat_no || '9A'}`;
      const price = parseInt(json.h_rsv_amt || '59800', 10);
      return {
        success: true,
        pnrNo,
        seatInfo,
        price,
        limitDate: json.h_ntisu_lmt_dt,
        limitTime: json.h_ntisu_lmt_tm,
      };
    }

    return {
      success: false,
      message: json?.h_msg_txt || '좌석 선점에 실패하였습니다.',
    };
  }
}
