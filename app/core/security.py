import os
from cryptography.fernet import Fernet

# 고정 마스터 키 (또는 환경변수 FERNET_KEY)
_KEY = os.getenv("FERNET_KEY")
if not _KEY:
    _KEY = Fernet.generate_key().decode()

_fernet = Fernet(_KEY.encode())

def encrypt_credential(plain_text: str) -> str:
    """민감 계정 비밀번호 암호화"""
    return _fernet.encrypt(plain_text.encode()).decode()

def decrypt_credential(cipher_text: str) -> str:
    """메모리 내 복호화"""
    return _fernet.decrypt(cipher_text.encode()).decode()
