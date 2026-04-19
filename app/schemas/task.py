from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None


class TaskUpdate(BaseModel):
    completed: Optional[bool] = None
    title: Optional[str] = None


class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    completed: bool
    created_at: datetime
    owner_id: int

    class Config:
        from_attributes = True


class TaskListOut(BaseModel):
    tasks: list[TaskOut]
    total: int
    page: int
    page_size: int
