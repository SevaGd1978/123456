from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from datetime import datetime
import os

from database import engine, Base, get_db
import models
import schemas
from crud_helpers import init_default_data, apply_transaction_to_balance

# Create DB tables
Base.metadata.create_all(bind=engine)

# Seed default data
with next(get_db()) as db_session:
    init_default_data(db_session)

app = FastAPI(
    title="Family Budget API",
    description="Расширенное управление семейным бюджетом: доходы, расходы, счета, члены семьи, лимиты и цели",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Члены семьи (Family Members) -----------------
@app.get("/api/members", response_model=List[schemas.FamilyMemberResponse])
def get_family_members(db: Session = Depends(get_db)):
    return db.query(models.FamilyMember).all()

@app.post("/api/members", response_model=schemas.FamilyMemberResponse)
def create_family_member(member: schemas.FamilyMemberCreate, db: Session = Depends(get_db)):
    db_member = models.FamilyMember(**member.model_dump())
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member

@app.put("/api/members/{member_id}", response_model=schemas.FamilyMemberResponse)
def update_family_member(member_id: int, update: schemas.FamilyMemberUpdate, db: Session = Depends(get_db)):
    db_member = db.query(models.FamilyMember).filter(models.FamilyMember.id == member_id).first()
    if not db_member:
        raise HTTPException(status_code=404, detail="Член семьи не найден")
    for key, val in update.model_dump(exclude_unset=True).items():
        setattr(db_member, key, val)
    db.commit()
    db.refresh(db_member)
    return db_member

@app.delete("/api/members/{member_id}")
def delete_family_member(member_id: int, db: Session = Depends(get_db)):
    db_member = db.query(models.FamilyMember).filter(models.FamilyMember.id == member_id).first()
    if not db_member:
        raise HTTPException(status_code=404, detail="Член семьи не найден")
    db.delete(db_member)
    db.commit()
    return {"status": "ok", "message": "Член семьи удален"}

# ----------------- Счета (Accounts) -----------------
@app.get("/api/accounts", response_model=List[schemas.AccountResponse])
def get_accounts(db: Session = Depends(get_db)):
    return db.query(models.Account).all()

@app.post("/api/accounts", response_model=schemas.AccountResponse)
def create_account(account: schemas.AccountCreate, db: Session = Depends(get_db)):
    db_account = models.Account(
        **account.model_dump(),
        current_balance=account.initial_balance
    )
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account

@app.put("/api/accounts/{account_id}", response_model=schemas.AccountResponse)
def update_account(account_id: int, update: schemas.AccountUpdate, db: Session = Depends(get_db)):
    db_account = db.query(models.Account).filter(models.Account.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Счет не найден")
    for key, val in update.model_dump(exclude_unset=True).items():
        setattr(db_account, key, val)
    db.commit()
    db.refresh(db_account)
    return db_account

@app.delete("/api/accounts/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db)):
    db_account = db.query(models.Account).filter(models.Account.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Счет не найден")
    db.delete(db_account)
    db.commit()
    return {"status": "ok", "message": "Счет удален"}

# ----------------- Категории (Categories) -----------------
@app.get("/api/categories", response_model=List[schemas.CategoryResponse])
def get_categories(cat_type: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Category)
    if cat_type:
        query = query.filter(models.Category.cat_type == cat_type)
    return query.all()

@app.post("/api/categories", response_model=schemas.CategoryResponse)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db)):
    db_cat = models.Category(**category.model_dump())
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@app.put("/api/categories/{category_id}", response_model=schemas.CategoryResponse)
def update_category(category_id: int, update: schemas.CategoryUpdate, db: Session = Depends(get_db)):
    db_cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    for key, val in update.model_dump(exclude_unset=True).items():
        setattr(db_cat, key, val)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@app.delete("/api/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    db_cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    db.delete(db_cat)
    db.commit()
    return {"status": "ok", "message": "Категория удалена"}

# ----------------- Операции / Транзакции (Transactions) -----------------
def format_transaction_response(tx: models.Transaction) -> schemas.TransactionResponse:
    res = schemas.TransactionResponse.model_validate(tx)
    res.account_name = tx.account.name if tx.account else None
    res.to_account_name = tx.to_account.name if tx.to_account else None
    res.category_name = tx.category.name if tx.category else None
    res.category_color = tx.category.color if tx.category else None
    res.member_name = tx.member.name if tx.member else None
    res.member_avatar_color = tx.member.avatar_color if tx.member else None
    return res

@app.get("/api/transactions", response_model=List[schemas.TransactionResponse])
def get_transactions(
    month: Optional[str] = None, # YYYY-MM
    trans_type: Optional[str] = None,
    account_id: Optional[int] = None,
    category_id: Optional[int] = None,
    member_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(models.Transaction)
    if month:
        query = query.filter(models.Transaction.date.startswith(month))
    if trans_type:
        query = query.filter(models.Transaction.trans_type == trans_type)
    if account_id:
        query = query.filter(
            (models.Transaction.account_id == account_id) | (models.Transaction.to_account_id == account_id)
        )
    if category_id:
        query = query.filter(models.Transaction.category_id == category_id)
    if member_id:
        query = query.filter(models.Transaction.member_id == member_id)

    txs = query.order_by(models.Transaction.date.desc(), models.Transaction.id.desc()).limit(limit).all()
    return [format_transaction_response(t) for t in txs]

@app.post("/api/transactions", response_model=schemas.TransactionResponse)
def create_transaction(tx_in: schemas.TransactionCreate, db: Session = Depends(get_db)):
    account = db.query(models.Account).filter(models.Account.id == tx_in.account_id).first()
    if not account:
        raise HTTPException(status_code=400, detail="Счет списания не существует")

    if tx_in.trans_type == "transfer":
        if not tx_in.to_account_id:
            raise HTTPException(status_code=400, detail="Для перевода укажите счет зачисления")
        if tx_in.account_id == tx_in.to_account_id:
            raise HTTPException(status_code=400, detail="Счет списания и зачисления должны различаться")
        to_account = db.query(models.Account).filter(models.Account.id == tx_in.to_account_id).first()
        if not to_account:
            raise HTTPException(status_code=400, detail="Счет зачисления не существует")

    db_tx = models.Transaction(**tx_in.model_dump())
    db.add(db_tx)
    apply_transaction_to_balance(db, db_tx, revert=False)
    db.commit()
    db.refresh(db_tx)
    return format_transaction_response(db_tx)

@app.delete("/api/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    db_tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not db_tx:
        raise HTTPException(status_code=404, detail="Операция не найдена")

    # Revert balance effect
    apply_transaction_to_balance(db, db_tx, revert=True)
    db.delete(db_tx)
    db.commit()
    return {"status": "ok", "message": "Операция удалена"}

# ----------------- Бюджеты и лимиты (Budgets) -----------------
@app.get("/api/budgets", response_model=List[schemas.BudgetResponse])
def get_budgets(month: str = Query(..., description="YYYY-MM"), db: Session = Depends(get_db)):
    budgets = db.query(models.Budget).filter(models.Budget.month == month).all()
    res = []
    for b in budgets:
        # Calculate spent for category in this month
        spent = db.query(func.coalesce(func.sum(models.Transaction.amount), 0.0))\
            .filter(
                models.Transaction.category_id == b.category_id,
                models.Transaction.trans_type == "expense",
                models.Transaction.date.startswith(month)
            ).scalar()

        item = schemas.BudgetResponse.model_validate(b)
        item.category_name = b.category.name if b.category else "Категория"
        item.category_color = b.category.color if b.category else "#6b7280"
        item.spent_amount = float(spent)
        item.remaining_amount = float(b.limit_amount - spent)
        item.progress_percentage = round((spent / b.limit_amount * 100) if b.limit_amount > 0 else 0, 1)
        res.append(item)
    return res

@app.post("/api/budgets", response_model=schemas.BudgetResponse)
def set_or_update_budget(b_in: schemas.BudgetCreate, db: Session = Depends(get_db)):
    # Check if budget already exists for category & month
    existing = db.query(models.Budget).filter(
        models.Budget.category_id == b_in.category_id,
        models.Budget.month == b_in.month
    ).first()

    if existing:
        existing.limit_amount = b_in.limit_amount
        db.commit()
        db.refresh(existing)
        db_b = existing
    else:
        db_b = models.Budget(**b_in.model_dump())
        db.add(db_b)
        db.commit()
        db.refresh(db_b)

    spent = db.query(func.coalesce(func.sum(models.Transaction.amount), 0.0))\
        .filter(
            models.Transaction.category_id == db_b.category_id,
            models.Transaction.trans_type == "expense",
            models.Transaction.date.startswith(db_b.month)
        ).scalar()

    item = schemas.BudgetResponse.model_validate(db_b)
    item.category_name = db_b.category.name if db_b.category else "Категория"
    item.category_color = db_b.category.color if db_b.category else "#6b7280"
    item.spent_amount = float(spent)
    item.remaining_amount = float(db_b.limit_amount - spent)
    item.progress_percentage = round((spent / db_b.limit_amount * 100) if db_b.limit_amount > 0 else 0, 1)
    return item

@app.delete("/api/budgets/{budget_id}")
def delete_budget(budget_id: int, db: Session = Depends(get_db)):
    b = db.query(models.Budget).filter(models.Budget.id == budget_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Бюджет не найден")
    db.delete(b)
    db.commit()
    return {"status": "ok", "message": "Бюджет удален"}

# ----------------- Финансовые цели (Goals) -----------------
@app.get("/api/goals", response_model=List[schemas.GoalResponse])
def get_goals(db: Session = Depends(get_db)):
    goals = db.query(models.Goal).all()
    res = []
    for g in goals:
        item = schemas.GoalResponse.model_validate(g)
        item.member_name = g.member.name if g.member else "Вся семья"
        item.progress_percentage = round((g.current_amount / g.target_amount * 100) if g.target_amount > 0 else 0, 1)
        res.append(item)
    return res

@app.post("/api/goals", response_model=schemas.GoalResponse)
def create_goal(goal_in: schemas.GoalCreate, db: Session = Depends(get_db)):
    db_g = models.Goal(**goal_in.model_dump())
    db.add(db_g)
    db.commit()
    db.refresh(db_g)
    item = schemas.GoalResponse.model_validate(db_g)
    item.member_name = db_g.member.name if db_g.member else "Вся семья"
    item.progress_percentage = round((db_g.current_amount / db_g.target_amount * 100) if db_g.target_amount > 0 else 0, 1)
    return item

@app.put("/api/goals/{goal_id}", response_model=schemas.GoalResponse)
def update_goal(goal_id: int, update: schemas.GoalUpdate, db: Session = Depends(get_db)):
    db_g = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not db_g:
        raise HTTPException(status_code=404, detail="Цель не найдена")
    for key, val in update.model_dump(exclude_unset=True).items():
        setattr(db_g, key, val)
    if db_g.current_amount >= db_g.target_amount:
        db_g.is_completed = True
    db.commit()
    db.refresh(db_g)
    item = schemas.GoalResponse.model_validate(db_g)
    item.member_name = db_g.member.name if db_g.member else "Вся семья"
    item.progress_percentage = round((db_g.current_amount / db_g.target_amount * 100) if db_g.target_amount > 0 else 0, 1)
    return item

@app.delete("/api/goals/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    db_g = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not db_g:
        raise HTTPException(status_code=404, detail="Цель не найдена")
    db.delete(db_g)
    db.commit()
    return {"status": "ok", "message": "Цель удалена"}

# ----------------- Аналитика и Сводка (Analytics) -----------------
@app.get("/api/analytics/summary", response_model=schemas.SummaryStats)
def get_summary_stats(month: Optional[str] = None, db: Session = Depends(get_db)):
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")

    # Income
    income = db.query(func.coalesce(func.sum(models.Transaction.amount), 0.0))\
        .filter(
            models.Transaction.trans_type == "income",
            models.Transaction.date.startswith(month)
        ).scalar()

    # Expense
    expense = db.query(func.coalesce(func.sum(models.Transaction.amount), 0.0))\
        .filter(
            models.Transaction.trans_type == "expense",
            models.Transaction.date.startswith(month)
        ).scalar()

    # Total balance across accounts
    total_balance = db.query(func.coalesce(func.sum(models.Account.current_balance), 0.0)).scalar()

    net_savings = float(income - expense)
    savings_rate = round((net_savings / income * 100) if income > 0 else 0, 1)

    return schemas.SummaryStats(
        total_income=float(income),
        total_expense=float(expense),
        net_savings=net_savings,
        savings_rate=savings_rate,
        total_balance=float(total_balance)
    )

@app.get("/api/analytics/categories", response_model=List[schemas.CategoryExpenseStat])
def get_category_expense_stats(month: Optional[str] = None, db: Session = Depends(get_db)):
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")

    total_expense = db.query(func.coalesce(func.sum(models.Transaction.amount), 0.0))\
        .filter(
            models.Transaction.trans_type == "expense",
            models.Transaction.date.startswith(month)
        ).scalar()

    rows = db.query(
        models.Transaction.category_id,
        models.Category.name,
        models.Category.color,
        func.sum(models.Transaction.amount).label("amount")
    ).outerjoin(models.Category, models.Transaction.category_id == models.Category.id)\
     .filter(
         models.Transaction.trans_type == "expense",
         models.Transaction.date.startswith(month)
     ).group_by(models.Transaction.category_id, models.Category.name, models.Category.color)\
      .order_by(func.sum(models.Transaction.amount).desc()).all()

    res = []
    for cat_id, cat_name, color, amount in rows:
        name = cat_name if cat_name else "Без категории"
        c_color = color if color else "#9ca3af"
        pct = round((amount / total_expense * 100) if total_expense > 0 else 0, 1)
        res.append(schemas.CategoryExpenseStat(
            category_id=cat_id,
            category_name=name,
            color=c_color,
            amount=float(amount),
            percentage=pct
        ))
    return res

@app.get("/api/analytics/members", response_model=List[schemas.MemberExpenseStat])
def get_member_expense_stats(month: Optional[str] = None, db: Session = Depends(get_db)):
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")

    total_expense = db.query(func.coalesce(func.sum(models.Transaction.amount), 0.0))\
        .filter(
            models.Transaction.trans_type == "expense",
            models.Transaction.date.startswith(month)
        ).scalar()

    rows = db.query(
        models.Transaction.member_id,
        models.FamilyMember.name,
        models.FamilyMember.avatar_color,
        func.sum(models.Transaction.amount).label("amount")
    ).outerjoin(models.FamilyMember, models.Transaction.member_id == models.FamilyMember.id)\
     .filter(
         models.Transaction.trans_type == "expense",
         models.Transaction.date.startswith(month)
     ).group_by(models.Transaction.member_id, models.FamilyMember.name, models.FamilyMember.avatar_color)\
      .order_by(func.sum(models.Transaction.amount).desc()).all()

    res = []
    for m_id, m_name, avatar_color, amount in rows:
        name = m_name if m_name else "Общие расходы"
        color = avatar_color if avatar_color else "#64748b"
        pct = round((amount / total_expense * 100) if total_expense > 0 else 0, 1)
        res.append(schemas.MemberExpenseStat(
            member_id=m_id,
            member_name=name,
            avatar_color=color,
            amount=float(amount),
            percentage=pct
        ))
    return res

@app.get("/api/analytics/monthly-trends", response_model=List[schemas.MonthlyTrendStat])
def get_monthly_trends(months_count: int = 6, db: Session = Depends(get_db)):
    # Group transactions by substring(date, 1, 7)
    month_expr = func.substr(models.Transaction.date, 1, 7)
    rows = db.query(
        month_expr.label("month"),
        models.Transaction.trans_type,
        func.sum(models.Transaction.amount).label("amount")
    ).filter(models.Transaction.trans_type.in_(["income", "expense"]))\
     .group_by(month_expr, models.Transaction.trans_type)\
     .order_by(month_expr.asc()).all()

    data_by_month = {}
    for m, t_type, amt in rows:
        if m not in data_by_month:
            data_by_month[m] = {"income": 0.0, "expense": 0.0}
        if t_type == "income":
            data_by_month[m]["income"] = float(amt)
        elif t_type == "expense":
            data_by_month[m]["expense"] = float(amt)

    # Sort and take last N months
    sorted_months = sorted(data_by_month.keys())[-months_count:]
    res = []
    for m in sorted_months:
        inc = data_by_month[m]["income"]
        exp = data_by_month[m]["expense"]
        res.append(schemas.MonthlyTrendStat(
            month=m,
            income=inc,
            expense=exp,
            savings=inc - exp
        ))
    return res

# ----------------- Раздача статики фронтенда (Production / Amvera) -----------------
FRONTEND_DIST = os.getenv("FRONTEND_DIST", "/workspace/frontend/dist")
if os.path.isdir(FRONTEND_DIST):
    # Mount assets directory if it exists
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Don't catch API endpoints
        if full_path.startswith("api/") or full_path == "api" or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="Not Found")
        
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Fallback to index.html for SPA routing
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Frontend build index.html not found")

