from enum import IntEnum
from typing import Optional
from dataclasses import dataclass
from sqlmodel import Field, SQLModel


class Files(SQLModel, table=True):
    file_id: int | None = Field(index=True, primary_key=True)
    post_id: int = Field(index=True)
    url: str
    created_at: int | None = Field(index=True)
    
    
