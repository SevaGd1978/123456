from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List
from datetime import datetime

# --- User & Auth Schemas ---
class UserRegister(BaseModel):
    email: str
    password: str = Field(..., min_length=4)
    full_name: str
    role: str = "Член семьи"
    avatar_color: str = "#3b82f6"

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    family_member_id: Optional[int] = None
    role: Optional[str] = None
    avatar_color: Optional[str] = None
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- FamilyMember Schemas ---
class FamilyMemberBase(BaseModel):
    name: str
    role: str = "Член семьи"
    avatar_color: str = "#3b82f6"

class FamilyMemberCreate(FamilyMemberBase):
    pass

class FamilyMemberUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    avatar_color: Optional[str] = None

class FamilyMemberResponse(FamilyMemberBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Account Schemas ---
class AccountBase(BaseModel):
    name: str
    account_type: str = "Дебетовая карта"
    currency: str = "RUB"
    initial_balance: float = 0.0
    color: str = "#10b981"

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    account_type: Optional[str] = None
    currency: Optional[str] = None
    initial_balance: Optional[float] = None
    current_balance: Optional[float] = None
    color: Optional[str] = None

class AccountResponse(AccountBase):
    id: int
    current_balance: float
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Category Schemas ---
class CategoryBase(BaseModel):
    name: str
    cat_type: str # "income" or "expense"
    icon: str = "tag"
    color: str = "#6b7280"

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    cat_type: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Transaction Schemas ---
class TransactionBase(BaseModel):
    trans_type: str # "income", "expense", "transfer"
    amount: float = Field(..., gt=0)
    date: str # YYYY-MM-DD
    account_id: int
    to_account_id: Optional[int] = None
    category_id: Optional[int] = None
    member_id: Optional[int] = None
    description: Optional[str] = None
    is_planned: bool = False

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    trans_type: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    date: Optional[str] = None
    account_id: Optional[int] = None
    to_account_id: Optional[int] = None
    category_id: Optional[int] = None
    member_id: Optional[int] = None
    description: Optional[str] = None
    is_planned: Optional[bool] = None

class TransactionResponse(TransactionBase):
    id: int
    created_at: datetime
    account_name: Optional[str] = None
    to_account_name: Optional[str] = None
    category_name: Optional[str] = None
    member_name: Optional[str] = None
    category_color: Optional[str] = None
    member_avatar_color: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# --- Budget Schemas ---
class BudgetBase(BaseModel):
    category_id: int
    month: str # YYYY-MM
    limit_amount: float = Field(..., ge=0)

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    limit_amount: float = Field(..., ge=0)

class BudgetResponse(BudgetBase):
    id: int
    created_at: datetime
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    spent_amount: float = 0.0
    remaining_amount: float = 0.0
    progress_percentage: float = 0.0

    model_config = ConfigDict(from_attributes=True)

# --- Goal Schemas ---
class GoalBase(BaseModel):
    title: str
    target_amount: float = Field(..., gt=0)
    current_amount: float = Field(0.0, ge=0)
    target_date: Optional[str] = None
    member_id: Optional[int] = None
    color: str = "#8b5cf6"
    is_completed: bool = False

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    target_amount: Optional[float] = Field(None, gt=0)
    current_amount: Optional[float] = Field(None, ge=0)
    target_date: Optional[str] = None
    member_id: Optional[int] = None
    color: Optional[str] = None
    is_completed: Optional[bool] = None

class GoalResponse(GoalBase):
    id: int
    created_at: datetime
    member_name: Optional[str] = None
    progress_percentage: float = 0.0

    model_config = ConfigDict(from_attributes=True)

# --- Analytics Schemas ---
class SummaryStats(BaseModel):
    total_income: float
    total_expense: float
    net_savings: float
    savings_rate: float
    total_balance: float

class CategoryExpenseStat(BaseModel):
    category_id: Optional[int]
    category_name: str
    color: str
    amount: float
    percentage: float

class MemberExpenseStat(BaseModel):
    member_id: Optional[int]
    member_name: str
    avatar_color: str
    amount: float
    percentage: float

class MonthlyTrendStat(BaseModel):
    month: str
    income: float
    expense: float
    savings: float
