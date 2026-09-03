export interface User {
  id: number;
  email: string;
  full_name: string;
  family_member_id?: number | null;
  role?: string | null;
  avatar_color?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FamilyMember {
  id: number;
  name: string;
  role: string;
  avatar_color: string;
  created_at: string;
}

export interface Account {
  id: number;
  name: string;
  account_type: string;
  currency: string;
  initial_balance: number;
  current_balance: number;
  color: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  cat_type: 'income' | 'expense';
  icon: string;
  color: string;
  created_at: string;
}

export interface Transaction {
  id: number;
  trans_type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: string;
  account_id: number;
  to_account_id?: number | null;
  category_id?: number | null;
  member_id?: number | null;
  description?: string | null;
  is_planned: boolean;
  created_at: string;
  account_name?: string | null;
  to_account_name?: string | null;
  category_name?: string | null;
  member_name?: string | null;
  category_color?: string | null;
  member_avatar_color?: string | null;
}

export interface Budget {
  id: number;
  category_id: number;
  month: string;
  limit_amount: number;
  created_at: string;
  category_name?: string | null;
  category_color?: string | null;
  spent_amount: number;
  remaining_amount: number;
  progress_percentage: number;
}

export interface Goal {
  id: number;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date?: string | null;
  member_id?: number | null;
  color: string;
  is_completed: boolean;
  created_at: string;
  member_name?: string | null;
  progress_percentage: number;
}

export interface SummaryStats {
  total_income: number;
  total_expense: number;
  net_savings: number;
  savings_rate: number;
  total_balance: number;
}

export interface CategoryExpenseStat {
  category_id: number | null;
  category_name: string;
  color: string;
  amount: number;
  percentage: number;
}

export interface MemberExpenseStat {
  member_id: number | null;
  member_name: string;
  avatar_color: string;
  amount: number;
  percentage: number;
}

export interface MonthlyTrendStat {
  month: string;
  income: number;
  expense: number;
  savings: number;
}
