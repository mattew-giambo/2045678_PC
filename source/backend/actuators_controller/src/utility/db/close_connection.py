import mariadb
from fastapi import HTTPException

def close_connection(connection: mariadb.Connection) -> None:
    if connection:
        try:
            connection.close()
        except mariadb.Error:
            raise HTTPException(
                status_code=500,
                detail="An error occurred while closing the database connection."
            )