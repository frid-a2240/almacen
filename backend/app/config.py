from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # Base de datos
    DATABASE_URL: str

    # App
    APP_NAME: str = "ALMACEN ISP"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # Uploads
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 15

    # CORS
    CORS_ORIGINS: str = ""

    # Auth (sesión de larga duración: el usuario no se desloguea solo, solo
    # con el botón "Cerrar sesión" — ver JWT_EXPIRE_DAYS)
    JWT_SECRET: str = "cambia-esto-en-produccion-por-una-clave-larga-y-aleatoria"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 3650

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
