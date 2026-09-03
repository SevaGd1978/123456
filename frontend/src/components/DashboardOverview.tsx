import React from 'react';
import { 
  ArrowDownRight, ArrowUpRight, Wallet, PiggyBank, 
  TrendingUp, Users, Calendar, AlertCircle, PlusCircle, CreditCard
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  SummaryStats, CategoryExpenseStat, MemberExpenseStat, 
  MonthlyTrendStat, Account, Transaction, Budget, Goal 
} from '../types';
import { formatMoney } from '../utils';

interface Props {
  summary: SummaryStats | null;
  categoryStats: CategoryExpenseStat[];
  memberStats: MemberExpenseStat[];
  trends: MonthlyTrendStat[];
  accounts: Account[];
  recentTransactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  currentMonth: string;
  onOpenNewTransaction: () => void;
}

export const DashboardOverview: React.FC<Props> = ({
  summary,
  categoryStats,
  memberStats,
  trends,
  accounts,
  recentTransactions,
  budgets,
  goals,
  currentMonth,
  onOpenNewTransaction
}) => {
  const overBudgets = budgets.filter(b => b.spent_amount > b.limit_amount);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alert banner if any budget exceeded */}
      {overBudgets.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-4 flex items-center justify-between text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="text-sm">
              Внимание: в этом месяце превышен лимит расходов в {overBudgets.length} {overBudgets.length === 1 ? 'категории' : 'категориях'} ({overBudgets.map(b => b.category_name).join(', ')})!
            </span>
          </div>
        </div>
      )}

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Balance */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold tracking-wider text-slate-400">Общий капитал семьи</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {formatMoney(summary?.total_balance || 0)}
            </h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              На {accounts.length} счетах
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Month Income */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold tracking-wider text-slate-400">Доходы за месяц</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              +{formatMoney(summary?.total_income || 0)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              За {currentMonth}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        {/* Month Expenses */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold tracking-wider text-slate-400">Расходы за месяц</p>
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              -{formatMoney(summary?.total_expense || 0)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              За {currentMonth}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>

        {/* Net Savings */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold tracking-wider text-slate-400">Чистая дельта (Сбережения)</p>
            <h3 className={`text-2xl font-black mt-1 ${(summary?.net_savings || 0) >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {(summary?.net_savings || 0) >= 0 ? '+' : ''}{formatMoney(summary?.net_savings || 0)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Норма сбережений: {summary?.savings_rate || 0}%
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <PiggyBank className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Middle Row: Charts & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Trend Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-lg">
                Динамика доходов и расходов
              </h3>
              <p className="text-xs text-slate-400">Сравнение по месяцам</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={val => `${val / 1000}k`} />
                <Tooltip 
                  formatter={(val: any) => [`${formatMoney(Number(val))}`, '']}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Legend />
                <Bar dataKey="income" name="Доход" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Расход" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses by Category (1 col) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1">
              Расходы по категориям
            </h3>
            <p className="text-xs text-slate-400 mb-3">За текущий месяц</p>
            
            {categoryStats.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                Нет данных о расходах
              </div>
            ) : (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryStats}
                      dataKey="amount"
                      nameKey="category_name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {categoryStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any) => [`${formatMoney(Number(val))}`, '']}
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="mt-3 space-y-2 max-h-36 overflow-y-auto pr-1">
            {categoryStats.slice(0, 4).map(c => (
              <div key={c.category_id || c.category_name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[120px]">{c.category_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 dark:text-white">{formatMoney(c.amount)}</span>
                  <span className="text-slate-400">({c.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Family Members Breakdown & Accounts & Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Expenses by Member */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700/80 shadow-sm">
          <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Траты членов семьи
          </h3>
          <p className="text-xs text-slate-400 mb-4">Кто сколько потратил в {currentMonth}</p>

          <div className="space-y-4">
            {memberStats.map(m => (
              <div key={m.member_id || m.member_name} className="space-y-1.5">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: m.avatar_color }} 
                    />
                    {m.member_name}
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {formatMoney(m.amount)} <span className="text-xs font-normal text-slate-400">({m.percentage}%)</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ width: `${m.percentage}%`, backgroundColor: m.avatar_color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Accounts Overview */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700/80 shadow-sm">
          <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2 mb-1">
            <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Счета и балансы
          </h3>
          <p className="text-xs text-slate-400 mb-4">Текущие остатки</p>

          <div className="space-y-3">
            {accounts.map(acc => (
              <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-8 rounded-full" style={{ backgroundColor: acc.color }} />
                  <div>
                    <h5 className="font-semibold text-sm text-slate-800 dark:text-white">{acc.name}</h5>
                    <p className="text-[11px] text-slate-400">{acc.account_type}</p>
                  </div>
                </div>
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {formatMoney(acc.current_balance)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Goals Mini */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700/80 shadow-sm">
          <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2 mb-1">
            <PiggyBank className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Прогресс целей
          </h3>
          <p className="text-xs text-slate-400 mb-4">Накопления и копилки семьи</p>

          <div className="space-y-4">
            {goals.map(g => (
              <div key={g.id} className="space-y-1.5">
                <div className="flex justify-between items-baseline text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[160px]">{g.title}</span>
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                    {formatMoney(g.current_amount)} / {formatMoney(g.target_amount)}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-purple-600 transition-all duration-500"
                    style={{ width: `${Math.min(g.progress_percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
