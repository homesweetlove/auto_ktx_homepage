import base64
import json
import logging
import re
import requests
import time
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad

from app.core.dynapath import generate_auth_headers_and_sid

logger = logging.getLogger("ktx_sniper.korail_client")

EMAIL_REGEX = re.compile(r"[^@]+@[^@]+\.[^@]+")
PHONE_NUMBER_REGEX = re.compile(r"(\d{3})-(\d{3,4})-(\d{4})")

KORAIL_HOST = "smart.letskorail.com"
KORAIL_MOBILE = f"https://{KORAIL_HOST}:443/classes/com.korail.mobile"

API_ENDPOINTS = {
    "login": f"{KORAIL_MOBILE}.login.Login",
    "logout": f"{KORAIL_MOBILE}.common.logout",
    "search_schedule": f"{KORAIL_MOBILE}.seatMovie.ScheduleView",
    "reserve": f"{KORAIL_MOBILE}.certification.TicketReservation",
    "cancel": f"{KORAIL_MOBILE}.reservationCancel.ReservationCancelChk",
    "code": f"{KORAIL_MOBILE}.common.code.do",
}

class KorailClient:
    """
    코레일 스마트 모바일 API 클라이언트 (DynaPath Anti-Bot 및 세션 관리 내장)
    """
    def __init__(self, device="AD", version="250601002"):
        self.device = device
        self.version = version
        self.session = requests.Session()
        self.is_logged_in = False
        self.user_name = None
        self.membership_number = None
        self.phone_number = None
        self.email = None
        self.key = "korail1234567890"
        self._idx = None

    def _encrypt_password(self, password: str) -> str:
        url = API_ENDPOINTS["code"]
        data = {"code": "app.login.cphd"}
        r = self.session.post(url, data=data, timeout=8)
        j = r.json()
        if j.get("strResult") == "SUCC" and j.get("app.login.cphd"):
            self._idx = j["app.login.cphd"]["idx"]
            key_raw = j["app.login.cphd"]["key"]
            encrypt_key = key_raw.encode("utf-8")
            iv = key_raw[:16].encode("utf-8")
            cipher = AES.new(encrypt_key, AES.MODE_CBC, iv)
            padded = pad(password.encode("utf-8"), AES.block_size)
            return base64.b64encode(base64.b64encode(cipher.encrypt(padded))).decode("utf-8")
        raise RuntimeError("비밀번호 암호화 키 수신 실패")

    def login(self, korail_id: str, password: str) -> dict:
        """
        코레일 회원 로그인 (멤버십번호, 전화번호, 이메일 대응)
        """
        txt_input_flg = "5" if EMAIL_REGEX.match(korail_id) else "4" if PHONE_NUMBER_REGEX.match(korail_id) else "2"
        enc_pwd = self._encrypt_password(password)

        headers, sid = generate_auth_headers_and_sid(self.device)
        data = {
            "Device": self.device,
            "Version": self.version,
            "txtMemberNo": korail_id,
            "txtPwd": enc_pwd,
            "txtInputFlg": txt_input_flg,
            "idx": self._idx,
            "Sid": sid
        }

        r = self.session.post(API_ENDPOINTS["login"], data=data, headers=headers, timeout=10)
        res = r.json()
        if res.get("strResult") == "SUCC" and res.get("strMbCrdNo"):
            self.membership_number = res.get("strMbCrdNo")
            self.user_name = res.get("strCustNm")
            self.phone_number = res.get("strCpNo")
            self.email = res.get("strEmailAdr")
            self.is_logged_in = True
            logger.info(f"코레일 로그인 성공: {self.user_name} ({self.membership_number})")
            return {
                "success": True,
                "userName": self.user_name,
                "membershipNumber": self.membership_number,
                "phoneNumber": self.phone_number,
                "email": self.email
            }
        else:
            msg = res.get("h_msg_txt") or res.get("strResultMsg") or "로그인에 실패했습니다."
            code = res.get("h_msg_cd", "")
            logger.warning(f"로그인 실패: {msg} ({code})")
            return {
                "success": False,
                "message": msg,
                "code": code
            }

    def logout(self):
        """
        백엔드 세션 즉각 로그아웃 (공식 코레일톡 앱 접속 시 중복 로그인 튕김 방지)
        """
        try:
            self.session.get(API_ENDPOINTS["logout"], timeout=5)
        except Exception as e:
            logger.warning(f"로그아웃 호출 중 예외: {e}")
        finally:
            self.is_logged_in = False
            logger.info("코레일 세션 정상 로그아웃 완료")

    def search_trains(
        self,
        dep: str,
        arr: str,
        date: str,
        time_str: str = "000000",
        train_type: str = "100", # 100=KTX, 109=전체
        passengers: int = 1
    ) -> list:
        """
        실시간 열차 시간표 및 좌석 현황 조회
        """
        headers, sid = generate_auth_headers_and_sid(self.device)
        data = {
            "Device": self.device,
            "Version": self.version,
            "txtMenuId": "11",
            "radJobId": "1",
            "selGoTrain": train_type,
            "txtTrnGpCd": train_type,
            "txtGoStart": dep,
            "txtGoEnd": arr,
            "txtGoAbrdDt": date,
            "txtGoHour": time_str,
            "txtPsgFlg_1": passengers,
            "txtPsgFlg_2": 0,
            "txtPsgFlg_3": 0,
            "txtPsgFlg_4": 0,
            "txtPsgFlg_5": 0,
            "txtSeatAttCd_2": "000",
            "txtSeatAttCd_3": "000",
            "txtSeatAttCd_4": "015",
            "ebizCrossCheck": "N",
            "srtCheckYn": "N",
            "rtYn": "N",
            "adjStnScdlOfrFlg": "N",
            "Sid": sid
        }

        r = self.session.post(API_ENDPOINTS["search_schedule"], params=data, headers=headers, timeout=10)
        res = r.json()
        if res.get("strResult") != "SUCC":
            msg = res.get("h_msg_txt", "시간표 조회 실패")
            code = res.get("h_msg_cd", "")
            logger.warning(f"시간표 조회 오류: {msg} ({code})")
            if code in ("P100", "WRG000000", "WRD000061"):
                return []
            raise RuntimeError(f"{msg} ({code})")

        train_infos = res.get("trn_infos", {}).get("trn_info", [])
        results = []
        for info in train_infos:
            train_num = info.get("h_trn_no")
            train_type_nm = info.get("h_trn_clsf_nm", "KTX")
            dep_tm = info.get("h_dpt_tm", "")
            arr_tm = info.get("h_arv_tm", "")
            
            gen_code = info.get("h_gen_rsv_cd", "13")
            spe_code = info.get("h_spe_rsv_cd", "13")
            wait_flg = str(info.get("h_wait_rsv_flg", "0"))

            # 11: 예약가능, 13: 매진
            has_normal = (gen_code == "11")
            has_special = (spe_code == "11")
            has_wait = (wait_flg == "9")

            # Duration calculation
            try:
                dh = int(dep_tm[:2])
                dm = int(dep_tm[2:4])
                ah = int(arr_tm[:2])
                am = int(arr_tm[2:4])
                dur = (ah * 60 + am) - (dh * 60 + dm)
                if dur < 0:
                    dur += 24 * 60
                duration_str = f"{dur // 60}시간 {dur % 60}분"
            except Exception:
                duration_str = "약 2시간 30분"

            dep_fmt = f"{dep_tm[:2]}:{dep_tm[2:4]}" if len(dep_tm) >= 4 else dep_tm
            arr_fmt = f"{arr_tm[:2]}:{arr_tm[2:4]}" if len(arr_tm) >= 4 else arr_tm

            # Pricing estimation based on route / type
            normal_price = 59800 if "부산" in arr else 43500 if "동대구" in arr else 23700
            special_price = int(normal_price * 1.4)

            results.append({
                "trainNumber": train_num,
                "trainType": train_type_nm,
                "departureStation": info.get("h_dpt_rs_stn_nm", dep),
                "arrivalStation": info.get("h_arv_rs_stn_nm", arr),
                "departureTime": dep_fmt,
                "arrivalTime": arr_fmt,
                "departureDate": info.get("h_dpt_dt", date),
                "duration": duration_str,
                "hasNormalSeat": has_normal,
                "hasSpecialSeat": has_special,
                "hasWaitingList": has_wait,
                "normalPrice": normal_price,
                "specialPrice": special_price,
                # Keep raw data for reservation call
                "_raw": info
            })

        return results

    def reserve(self, train_raw: dict, seat_preference: str = "NORMAL", passengers: int = 1) -> dict:
        """
        좌석 즉시 선점 (장바구니 담기)
        """
        headers, sid = generate_auth_headers_and_sid(self.device)
        is_special = (seat_preference == "SPECIAL")

        data = {
            "Device": self.device,
            "Version": self.version,
            "Key": self.key,
            "txtMenuId": "11",
            "txtJobId": "1101",
            "txtGdNo": "",
            "hidFreeFlg": "N",
            "txtTotPsgCnt": passengers,
            "txtSeatAttCd1": "000",
            "txtSeatAttCd2": "000",
            "txtSeatAttCd3": "000",
            "txtSeatAttCd4": "015",
            "txtSeatAttCd5": "000",
            "txtStndFlg": "N",
            "txtSrcarCnt": "0",
            "txtJrnyCnt": "1",
            "txtJrnySqno1": "001",
            "txtJrnyTpCd1": "11",
            "txtDptDt1": train_raw.get("h_dpt_dt"),
            "txtDptRsStnCd1": train_raw.get("h_dpt_rs_stn_cd"),
            "txtDptTm1": train_raw.get("h_dpt_tm"),
            "txtArvRsStnCd1": train_raw.get("h_arv_rs_stn_cd"),
            "txtTrnNo1": train_raw.get("h_trn_no"),
            "txtRunDt1": train_raw.get("h_run_dt"),
            "txtTrnClsfCd1": train_raw.get("h_trn_clsf_cd"),
            "txtTrnGpCd1": train_raw.get("h_trn_gp_cd"),
            "txtChgFlg1": "N",
            "txtPsgTpCd1": "1", # 성인
            "txtDiscKndCd1": "000",
            "txtCompaCnt1": passengers,
            "txtSeatAtt1": "015",
            "txtPsrmClCd1": "2" if is_special else "1", # 1: 일반, 2: 특실
            "Sid": sid
        }

        r = self.session.post(API_ENDPOINTS["reserve"], data=data, headers=headers, timeout=12)
        res = r.json()
        logger.info(f"선점 응답: {res.get('strResult')}")

        if res.get("strResult") == "SUCC":
            pnr_no = res.get("h_pnr_no")
            seat_info = f"{'특실' if is_special else '일반실'} {res.get('h_srcar_no', '4')}호차 {res.get('h_seat_no', '9A')}"
            price = int(res.get("h_rsv_amt", 59800))
            limit_dt = res.get("h_ntisu_lmt_dt", "")
            limit_tm = res.get("h_ntisu_lmt_tm", "")
            return {
                "success": True,
                "pnrNo": pnr_no,
                "seatInfo": seat_info,
                "price": price,
                "limitDate": limit_dt,
                "limitTime": limit_tm,
                "raw": res
            }
        else:
            return {
                "success": False,
                "message": res.get("h_msg_txt") or "선점에 실패했습니다.",
                "code": res.get("h_msg_cd")
            }
