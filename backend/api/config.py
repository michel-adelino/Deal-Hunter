from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str
    redis_url: str

    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    anthropic_api_key: str
    keepa_api_key: str = ""
    serpapi_key: str = ""
    bestbuy_api_key: str = ""
    walmart_api_key: str = ""
    couponfollow_api_key: str = ""

    sendgrid_api_key: str = ""
    sendgrid_from_email: str = "noreply@dealhunter.local"

    scraperapi_key: str = ""
    proxy_list: str = ""

    plaid_client_id: str = ""
    plaid_secret: str = ""
    plaid_env: str = "sandbox"

    environment: str = "development"
    log_level: str = "INFO"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
