import mariadb
from fastapi import HTTPException

def get_cursor(connection: mariadb.Connection) -> mariadb.Cursor:
    try:
        cursor: mariadb.Cursor = connection.cursor()
    except mariadb.Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize the database cursor: {e}"
        )
    return cursor