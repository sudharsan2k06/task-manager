from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from app.db import models
from app.api.deps import get_db, get_current_user
from app.schemas.task import TaskCreate, TaskOut, TaskListOut, TaskUpdate

router = APIRouter()


@router.post("/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    new_task = models.Task(title=task.title, description=task.description, owner_id=user.id)
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task


@router.get("/tasks", response_model=TaskListOut)
def get_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    completed: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    query = db.query(models.Task).filter(models.Task.owner_id == user.id)
    if completed is not None:
        query = query.filter(models.Task.completed == completed)

    total = query.count()
    tasks = query.order_by(models.Task.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return TaskListOut(tasks=tasks, total=total, page=page, page_size=page_size)


@router.get("/tasks/{task_id}", response_model=TaskOut)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.owner_id == user.id
    ).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.put("/tasks/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    body: TaskUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.owner_id == user.id
    ).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if body.completed is not None:
        task.completed = body.completed
    if body.title is not None:
        task.title = body.title

    db.commit()
    db.refresh(task)
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_200_OK)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.owner_id == user.id
    ).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}
