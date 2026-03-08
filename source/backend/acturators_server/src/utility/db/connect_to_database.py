import mariadb
from fastapi import HTTPException
from src.config.constants import HOST_DB, PORT_DB, USER_DB, DATABASE_NAME_DB, USER_PASSWORD_DB

def connect_to_database() -> mariadb.Connection:
    try:
        connection: mariadb.Connection = mariadb.connect(
            host=HOST_DB,
            port=PORT_DB,
            user=USER_DB,
            password=USER_PASSWORD_DB,
            database=DATABASE_NAME_DB
        )
    except mariadb.Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while connecting to the database: {e}"
        )