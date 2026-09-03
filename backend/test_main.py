import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import Base, get_db
import models
from main import app

TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    m1 = models.FamilyMember(name="Алексей", role="Отец", avatar_color="#3b82f6")
    m2 = models.FamilyMember(name="Елена", role="Мать", avatar_color="#ec4899")
    db.add_all([m1, m2])
    
    acc1 = models.Account(name="Карта 1", account_type="Дебетовая карта", initial_balance=50000.0, current_balance=50000.0)
    acc2 = models.Account(name="Карта 2", account_type="Накопительный счет", initial_balance=10000.0, current_balance=10000.0)
    db.add_all([acc1, acc2])

    cat_exp = models.Category(name="Продукты", cat_type="expense", icon="cart", color="#ef4444")
    cat_inc = models.Category(name="Зарплата", cat_type="income", icon="briefcase", color="#10b981")
    db.add_all([cat_exp, cat_inc])

    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_members_crud():
    # List members
    res = client.get("/api/members")
    assert res.status_code == 200
    members = res.json()
    assert len(members) == 2

    # Create new member
    res = client.post("/api/members", json={"name": "Максим", "role": "Сын", "avatar_color": "#10b981"})
    assert res.status_code == 200
    new_mem = res.json()
    assert new_mem["name"] == "Максим"
    assert new_mem["id"] is not None

    # Update member
    res = client.put(f"/api/members/{new_mem['id']}", json={"role": "Студент"})
    assert res.status_code == 200
    assert res.json()["role"] == "Студент"

    # Delete member
    del_res = client.delete(f"/api/members/{new_mem['id']}")
    assert del_res.status_code == 200

def test_accounts_crud():
    res = client.get("/api/accounts")
    assert res.status_code == 200
    assert len(res.json()) == 2

    # Create account
    res = client.post("/api/accounts", json={
        "name": "Наличные",
        "account_type": "Наличные",
        "currency": "RUB",
        "initial_balance": 5000.0,
        "color": "#8b5cf6"
    })
    assert res.status_code == 200
    acc = res.json()
    assert acc["current_balance"] == 5000.0

def test_transactions_flow_and_analytics():
    accounts = client.get("/api/accounts").json()
    acc1_id = accounts[0]["id"]
    acc2_id = accounts[1]["id"]
    categories = client.get("/api/categories").json()
    cat_exp_id = next(c["id"] for c in categories if c["cat_type"] == "expense")
    cat_inc_id = next(c["id"] for c in categories if c["cat_type"] == "income")
    members = client.get("/api/members").json()
    mem_id = members[0]["id"]

    # 1. Income transaction: +40,000 to acc1
    tx_inc = client.post("/api/transactions", json={
        "trans_type": "income",
        "amount": 40000.0,
        "date": "2026-09-01",
        "account_id": acc1_id,
        "category_id": cat_inc_id,
        "member_id": mem_id,
        "description": "Аванс"
    }).json()
    assert tx_inc["amount"] == 40000.0

    # Acc1 balance should now be 50,000 + 40,000 = 90,000
    accs = client.get("/api/accounts").json()
    acc1 = next(a for a in accs if a["id"] == acc1_id)
    assert acc1["current_balance"] == 90000.0

    # 2. Transfer: 15,000 from acc1 to acc2
    tx_transfer = client.post("/api/transactions", json={
        "trans_type": "transfer",
        "amount": 15000.0,
        "date": "2026-09-02",
        "account_id": acc1_id,
        "to_account_id": acc2_id,
        "description": "Пополнение вклада"
    }).json()
    assert tx_transfer["trans_type"] == "transfer"

    accs = client.get("/api/accounts").json()
    acc1 = next(a for a in accs if a["id"] == acc1_id)
    acc2 = next(a for a in accs if a["id"] == acc2_id)
    assert acc1["current_balance"] == 75000.0
    assert acc2["current_balance"] == 25000.0

    # 3. Expense: 5,000 from acc1
    tx_exp = client.post("/api/transactions", json={
        "trans_type": "expense",
        "amount": 5000.0,
        "date": "2026-09-03",
        "account_id": acc1_id,
        "category_id": cat_exp_id,
        "member_id": mem_id,
        "description": "Супермаркет"
    }).json()

    # 4. Check Analytics Summary
    summary = client.get("/api/analytics/summary?month=2026-09").json()
    assert summary["total_income"] == 40000.0
    assert summary["total_expense"] == 5000.0
    assert summary["net_savings"] == 35000.0
    assert summary["total_balance"] == 95000.0 # 70000 + 25000

    # 5. Check Category and Member analytics
    cat_stats = client.get("/api/analytics/categories?month=2026-09").json()
    assert len(cat_stats) == 1
    assert cat_stats[0]["amount"] == 5000.0

    mem_stats = client.get("/api/analytics/members?month=2026-09").json()
    assert len(mem_stats) == 1
    assert mem_stats[0]["amount"] == 5000.0

    # 6. Delete Expense and verify balance reverted
    del_res = client.delete(f"/api/transactions/{tx_exp['id']}")
    assert del_res.status_code == 200

    accs = client.get("/api/accounts").json()
    acc1 = next(a for a in accs if a["id"] == acc1_id)
    assert acc1["current_balance"] == 75000.0 # Reverted back from 70,000 to 75,000

def test_goals_crud_and_completion():
    # Create goal
    g_res = client.post("/api/goals", json={
        "title": "Отпуск",
        "target_amount": 100000.0,
        "current_amount": 50000.0,
        "target_date": "2026-12-01",
        "color": "#3b82f6"
    })
    assert g_res.status_code == 200
    goal = g_res.json()
    assert goal["progress_percentage"] == 50.0
    assert not goal["is_completed"]

    # Top up goal to target
    up_res = client.put(f"/api/goals/{goal['id']}", json={
        "current_amount": 100000.0
    })
    assert up_res.status_code == 200
    up_goal = up_res.json()
    assert up_goal["progress_percentage"] == 100.0
    assert up_goal["is_completed"] is True
