from cryptography.fernet import Fernet
from os import getenv

key = getenv("EINVOICE_SECRET_KEY")
if not key:
    raise RuntimeError("EINVOICE_SECRET_KEY not set")

fernet = Fernet(key)

def encrypt_password(password: str) -> bytes:
    return fernet.encrypt(password.encode())

def decrypt_password(token: bytes) -> str:
    return fernet.decrypt(token).decode()
