from decouple import config

JWT_SECRET_KEY = config("JWT_SECRET_KEY")
DATABASE_URL = config("DATABASE_URL")
DB_POOL_SIZE = config("DB_POOL_SIZE", cast=int, default=5)
DB_MAX_OVERFLOW = config("DB_MAX_OVERFLOW", cast=int, default=10)
DB_POOL_RECYCLE = config("DB_POOL_RECYCLE", cast=int, default=1800)

