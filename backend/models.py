from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class FamilyMember(Base):
    __tablename__ = "family_members"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False, default="Член семьи") # Отец, Мать, Сын, Дочь и т.д.
    avatar_color = Column(String(20), default="#3b82f6")
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("Transaction", back_populates="member", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="member")

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    account_type = Column(String(50), nullable=False, default="Дебетовая карта") # Наличные, Карта, Накопительный счет, Инвестиции
    currency = Column(String(10), default="RUB")
    initial_balance = Column(Float, default=0.0)
    current_balance = Column(Float, default=0.0)
    color = Column(String(20), default="#10b981")
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions_from = relationship("Transaction", foreign_keys="Transaction.account_id", back_populates="account", cascade="all, delete-orphan")
    transactions_to = relationship("Transaction", foreign_keys="Transaction.to_account_id", back_populates="to_account")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    cat_type = Column(String(20), nullable=False) # "income" или "expense"
    icon = Column(String(50), default="tag")
    color = Column(String(20), default="#6b7280")
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("Transaction", back_populates="category", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="category", cascade="all, delete-orphan")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    trans_type = Column(String(20), nullable=False) # "income", "expense", "transfer"
    amount = Column(Float, nullable=False)
    date = Column(String(10), nullable=False) # YYYY-MM-DD
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    to_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True) # для переводов
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    member_id = Column(Integer, ForeignKey("family_members.id"), nullable=True)
    description = Column(Text, nullable=True)
    is_planned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    account = relationship("Account", foreign_keys=[account_id], back_populates="transactions_from")
    to_account = relationship("Account", foreign_keys=[to_account_id], back_populates="transactions_to")
    category = relationship("Category", back_populates="transactions")
    member = relationship("FamilyMember", back_populates="transactions")

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    month = Column(String(7), nullable=False) # YYYY-MM
    limit_amount = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("Category", back_populates="budgets")

class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.0)
    target_date = Column(String(10), nullable=True) # YYYY-MM-DD
    member_id = Column(Integer, ForeignKey("family_members.id"), nullable=True)
    color = Column(String(20), default="#8b5cf6")
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    member = relationship("FamilyMember", back_populates="goals")
