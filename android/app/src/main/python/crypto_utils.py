"""API Key encryption. Uses cryptography if available, falls back to base64."""
import os
import base64

_KEY_FILE = os.path.join(os.path.dirname(__file__), "data", ".encryption_key")

try:
    from cryptography.fernet import Fernet as _Fernet
    _HAS_CRYPTO = True
except ImportError:
    _HAS_CRYPTO = False


def _get_or_create_key():
    os.makedirs(os.path.dirname(_KEY_FILE), exist_ok=True)
    if os.path.exists(_KEY_FILE):
        with open(_KEY_FILE, "rb") as f:
            return f.read().strip()
    if _HAS_CRYPTO:
        key = _Fernet.generate_key()
    else:
        key = base64.urlsafe_b64encode(os.urandom(32))
    with open(_KEY_FILE, "wb") as f:
        f.write(key)
    return key


def encrypt(plaintext):
    if not plaintext:
        return ""
    key = _get_or_create_key()
    if _HAS_CRYPTO:
        f = _Fernet(key)
        return f.encrypt(plaintext.encode()).decode()
    else:
        # Simple XOR + base64 obfuscation (better than plaintext)
        data = plaintext.encode()
        result = bytes(d ^ key[i % len(key)] for i, d in enumerate(data))
        return base64.urlsafe_b64encode(result).decode()


def decrypt(ciphertext):
    if not ciphertext:
        return ""
    try:
        key = _get_or_create_key()
        if _HAS_CRYPTO:
            f = _Fernet(key)
            return f.decrypt(ciphertext.encode()).decode()
        else:
            data = base64.urlsafe_b64decode(ciphertext.encode())
            result = bytes(d ^ key[i % len(key)] for i, d in enumerate(data))
            return result.decode()
    except Exception:
        # If decryption fails (e.g., key changed), return empty
        return ""
