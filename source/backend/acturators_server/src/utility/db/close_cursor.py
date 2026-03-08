import mariadb
from fastapi import HTTPException

def close_cursor(cursor: mariadb.Cursor) -> None:
    if cursor:
        try:
            cursor.close()
        except mariadb.Error:
            raise HTTPException(
                status_code=500,
                detail="An error occurred while closing the database cursor."
            )