import base64
import random
import string
import time
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad

USER_AGENT = "Dalvik/2.1.0 (Linux; U; Android 13; SM-S928N Build/UP1A.231005.007)"
DEFAULT_HEADERS = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "User-Agent": USER_AGENT,
    "Host": "smart.letskorail.com",
    "Connection": "Keep-Alive",
    "Accept-Encoding": "gzip",
}

class DynaPathMasterEngine:
    APP_ID = "com.korail.talk"
    AS_VALUE = "%5B38ff229cb34c7dda8e28220a2d750cce%5D"
    DEVICE_MODEL = "SM-S928N"
    OS_TYPE = "Android"
    SDK_VERSION = "v1"

    def __init__(self):
        self.TABLE = "3FE9jgRD4KdCyuawklqGJYmvfMn15P7US8XbxeLQtWT6OicBAopINs2Vh0HZrz"
        self.I8, self.I9, self.I10 = 161, 30, 2
        self.app_start_ts = str(int(time.time() * 1000))

    def string2xA1s(self, data_str: str):
        result = []
        i = 0
        while i < len(data_str):
            cp = ord(data_str[i])
            i += 1
            if cp < 128:
                result.append(cp)
            elif cp < 2048:
                result.append(128 | ((cp >> 7) & 15))
                result.append(cp & 127)
            elif cp >= 262144:
                result.append(160)
                result.append((cp >> 14) & 127)
                result.append((cp >> 7) & 127)
                result.append(cp & 127)
            elif (63488 & cp) != 55296:
                result.append(((cp >> 14) & 15) | 144)
                result.append((cp >> 7) & 127)
                result.append(cp & 127)
        return result

    def make_key(self, key_str: str):
        big_int_add = 0
        for char in key_str:
            cp = ord(char)
            i9_bit = 32768
            for _ in range(16):
                if (i9_bit & cp) != 0:
                    break
                i9_bit >>= 1
            big_int_add = (big_int_add * (i9_bit << 1)) + cp
        return big_int_add

    def _internal_i(self, base_table, remainder, encode_size, current_sb):
        j8_count = 0
        for k in range(len(base_table)):
            char = base_table[k]
            if char not in current_sb:
                if j8_count == remainder:
                    return char
                j8_count += 1
        return " "

    def make_encode_table(self, num, encode_size, base_table):
        sb = ""
        temp_num = num
        for i in range(encode_size):
            j8_divisor = encode_size - i
            remainder = temp_num % j8_divisor
            char = self._internal_i(base_table, remainder, len(base_table), sb)
            sb += char
            temp_num //= j8_divisor
        return sb

    def encode_normal_be(self, data_str, table, i8=161, i9=30, i10=2):
        list_data = self.string2xA1s(data_str)
        sb, i_arr = [], [0] * (i10 + 1)
        idx, size = 0, len(list_data) % i10
        size2 = len(list_data) - size
        while idx < size2:
            val = 0
            for _ in range(i10):
                val = (val * i8) + list_data[idx]
                idx += 1
            for i in range(i10 + 1):
                i_arr[i] = val % i9
                val //= i9
            for i in range(i10, -1, -1):
                sb.append(table[i_arr[i]])
        if size > 0:
            val = 0
            for _ in range(size):
                val = (val * i8) + list_data[idx]
                idx += 1
            for i in range(size + 1):
                i_arr[i] = val % i9
                val //= i9
            while size >= 0:
                sb.append(table[i_arr[size]])
                size -= 1
        return "".join(sb)

    def generate_token(self, device_id: str, ts: int, rand: str) -> str:
        plaintext = (
            f"ai={self.APP_ID}&di={device_id}&as={self.AS_VALUE}&"
            f"su=false&dbg=false&emu=false&hk=false&it={self.app_start_ts}&"
            f"ts={ts}&rt=0&os=13&dm={self.DEVICE_MODEL}&st={self.OS_TYPE}&sv={self.SDK_VERSION}"
        )
        dyn_key = f"v1+{rand}+{ts}"
        key_enc = self.encode_normal_be(dyn_key, self.TABLE, self.I8, self.I9, self.I10)
        big_key = self.make_key(dyn_key)
        custom_table = self.make_encode_table(big_key, self.I9, self.TABLE)
        body_enc = self.encode_normal_be(plaintext, custom_table, self.I8, self.I9, self.I10)
        return f"bEeEP{self.TABLE[len(key_enc)]}{key_enc}{body_enc}"


def generate_auth_headers_and_sid(device="AD", device_id="558a4f02041657ea"):
    """
    Korail 최신 WAF/Anti-Bot 통과용 Dynapath 토큰 및 Sid 생성
    """
    engine = DynaPathMasterEngine()
    ts = int(time.time() * 1000)
    rand = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    token = engine.generate_token(device_id, ts, rand)

    sid_key = b"2485dd54d9deaa36"
    plaintext = (f"{device}{ts}").encode("utf-8")
    cipher = AES.new(sid_key, AES.MODE_CBC, iv=sid_key)
    sid = base64.b64encode(cipher.encrypt(pad(plaintext, 16))).decode("utf-8") + "\n"

    headers = dict(DEFAULT_HEADERS)
    headers["x-dynapath-m-token"] = token
    return headers, sid
