"""BCrypt-совместимый хешер для миграции с C# (BCrypt.Net-Next).

BCrypt.Net в C# использовал rounds=12, что даёт префикс $2a$12$.
Этот хешер хранит и читает «голые» BCrypt-строки без Django-префикса,
чтобы существующие пользователи могли логиниться без сброса пароля.
"""
import bcrypt
from django.contrib.auth.hashers import BasePasswordHasher
from django.utils.crypto import constant_time_compare


class BCryptNetHasher(BasePasswordHasher):
    algorithm = "bcrypt_net"
    rounds = 12

    def salt(self) -> str:
        return bcrypt.gensalt(self.rounds).decode("ascii")

    def encode(self, password: str, salt: str) -> str:
        if not isinstance(password, str) or not password:
            raise ValueError("password must be a non-empty string")
        hashed = bcrypt.hashpw(password.encode("utf-8"), salt.encode("ascii"))
        return hashed.decode("ascii")

    def verify(self, password: str, encoded: str) -> bool:
        if not encoded:
            return False
        try:
            return bcrypt.checkpw(password.encode("utf-8"), encoded.encode("ascii"))
        except (ValueError, TypeError):
            return False

    def safe_summary(self, encoded: str) -> dict:
        return {
            "algorithm": self.algorithm,
            "hash": encoded[:7] + "***",
        }

    def must_update(self, encoded: str) -> bool:
        return False

    def harden_runtime(self, password: str, encoded: str) -> None:
        return

    def decode(self, encoded: str) -> dict:
        return {
            "algorithm": self.algorithm,
            "hash": encoded,
        }

    def identify(self, encoded: str) -> bool:
        if not encoded:
            return False
        return encoded.startswith(("$2a$", "$2b$", "$2y$"))


def _patch_check_password():
    """Django identify_hasher ищет hasher по префиксу `name$`, но BCrypt
    хранит «голую» строку. Патчим identify_hasher, чтобы он сразу выдавал
    наш BCryptNetHasher для строк, начинающихся с $2x$.
    """
    from django.contrib.auth import hashers as dj_hashers

    original_identify = dj_hashers.identify_hasher

    def identify_hasher(encoded):
        if isinstance(encoded, str) and encoded.startswith(("$2a$", "$2b$", "$2y$")):
            return BCryptNetHasher()
        return original_identify(encoded)

    dj_hashers.identify_hasher = identify_hasher


_patch_check_password()


__all__ = ["BCryptNetHasher", "constant_time_compare"]
