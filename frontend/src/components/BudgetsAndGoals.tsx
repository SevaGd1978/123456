import React, { useState } from 'react';
import { 
  PieChart as PieIcon, AlertTriangle, Plus, Trash2, 
  CheckCircle, Target, TrendingUp, Sparkles, X, ChevronRight 
} from 'lucide-react';
import { Budget, Category, Goal, FamilyMember } from '../types';
import { formatMoney } from '../utils';

interface Props {
  budgets: Budget[];
  goals: Goal[];
  categories: Category[];
  members: FamilyMember[];
  currentMonth: string;
  onRefresh: () => void;
}

export const BudgetsAndGoals: React.FC<Props> = ({
  budgets,
  goals,
  categories,
  members,
  currentMonth,
  onRefresh
}) => {
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetCatId, setBudgetCatId] = useState<number>(0);
  const [budgetLimit, setBudgetLimit] = useState<string>('');

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalCurrentAmount, setGoalCurrentAmount] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [goalMemberId, setGoalMemberId] = useState<number>(0);
  const [goalColor, setGoalColor] = useState('#8b5cf6');

  // Top up goal modal
  const [topUpGoalId, setTopUpGoalId] = useState<number | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<string>('');

  const expenseCategories = categories.filter(c => c.cat_type === 'expense');

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetCatId || !budgetLimit) return;

    await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category_id: budgetCatId,
        month: currentMonth,
        limit_amount: parseFloat(budgetLimit)
      })
    });

    setBudgetCatId(0);
    setBudgetLimit('');
    setShowBudgetModal(false);
    onRefresh();
  };

  const handleDeleteBudget = async (id: number) => {
    if (!confirm('Удалить лимит по этой категории?')) return;
    await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim() || !goalTargetAmount) return;

    await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: goalTitle.trim(),
        target_amount: parseFloat(goalTargetAmount),
        current_amount: parseFloat(goalCurrentAmount) || 0,
        target_date: goalDate || null,
        member_id: goalMemberId > 0 ? goalMemberId : null,
        color: goalColor
      })
    });

    setGoalTitle('');
    setGoalTargetAmount('');
    setGoalCurrentAmount('');
    setShowGoalModal(false);
    onRefresh();
  };

  const handleTopUpGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topUpGoalId || !topUpAmount) return;
    const goal = goals.find(g => g.id === topUpGoalId);
    if (!goal) return;

    const newAmount = goal.current_amount + parseFloat(topUpAmount);

    await fetch(`/api/goals/${topUpGoalId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_amount: newAmount
      })
    });

    setTopUpGoalId(null);
    setTopUpAmount('');
    onRefresh();
  };

  const handleDeleteGoal = async (id: number) => {
    if (!confirm('Удалить финансовую цель?')) return;
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Monthly Category Budgets */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <PieIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Бюджеты по категориям ({currentMonth})
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Устанавливайте лимиты расходов на месяц, чтобы контролировать перерасход
            </p>
          </div>
          <button
            onClick={() => setShowBudgetModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-md shadow-indigo-500/10 transition"
          >
            <Plus className="w-4 h-4" />
            Установить лимит
          </button>
        </div>

        {budgets.length === 0 ? (
          <div className="py-12 text-center">
            <PieIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">На этот месяц пока не установлено лимитов расходов.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {budgets.map(b => {
              const isOver = b.spent_amount > b.limit_amount;
              return (
                <div 
                  key={b.id}
                  className="p-5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 hover:shadow-md transition group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span 
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: b.category_color || '#6366f1' }}
                      />
                      <span className="font-semibold text-slate-800 dark:text-white">
                        {b.category_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOver && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Перерасход
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteBudget(b.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity p-1 rounded hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                      <span>Потрачено: {formatMoney(b.spent_amount)}</span>
                      <span>Лимит: {formatMoney(b.limit_amount)}</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOver ? 'bg-rose-500' : b.progress_percentage > 85 ? 'bg-amber-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${Math.min(b.progress_percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs mt-2">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        {b.progress_percentage}% израсходовано
                      </span>
                      <span className={b.remaining_amount >= 0 ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                        {b.remaining_amount >= 0 ? `Остаток: ${formatMoney(b.remaining_amount)}` : `Превышение: ${formatMoney(Math.abs(b.remaining_amount))}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Financial Goals (Копилки / Цели) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              Семейные финансовые цели и копилки
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Копите на отпуск, ремонт, подушку безопасности или крупные покупки всей семьей
            </p>
          </div>
          <button
            onClick={() => setShowGoalModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium shadow-md shadow-purple-500/10 transition"
          >
            <Plus className="w-4 h-4" />
            Создать цель
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
          {goals.map(goal => {
            const isFinished = goal.current_amount >= goal.target_amount;
            return (
              <div 
                key={goal.id}
                className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 hover:shadow-lg transition relative group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 mb-2">
                        {goal.member_name}
                      </span>
                      <h4 className="font-bold text-slate-800 dark:text-white text-base">
                        {goal.title}
                      </h4>
                      {goal.target_date && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Срок: до {goal.target_date}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity p-1.5 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-lg font-extrabold text-slate-800 dark:text-white">
                        {formatMoney(goal.current_amount)}
                      </span>
                      <span className="text-xs text-slate-400">
                        из {formatMoney(goal.target_amount)}
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFinished ? 'bg-emerald-500' : 'bg-purple-600'
                        }`}
                        style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-1.5 font-medium text-slate-500">
                      <span>{goal.progress_percentage}% накоплено</span>
                      {isFinished && (
                        <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" /> Достигнуто!
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                  <button
                    onClick={() => {
                      setTopUpGoalId(goal.id);
                      setTopUpAmount('');
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-semibold transition flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Пополнить копилку
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Set Budget Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-indigo-600" />
                Лимит на {currentMonth}
              </h3>
              <button onClick={() => setShowBudgetModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveBudget} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Категория расхода *
                </label>
                <select
                  required
                  value={budgetCatId}
                  onChange={e => setBudgetCatId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={0}>-- Выберите категорию --</option>
                  {expenseCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Максимальный лимит в месяц (₽) *
                </label>
                <input
                  type="number"
                  required
                  step="any"
                  placeholder="30000"
                  value={budgetLimit}
                  onChange={e => setBudgetLimit(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Новая финансовая цель
              </h3>
              <button onClick={() => setShowGoalModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGoal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Название цели *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Отпуск в горах"
                  value={goalTitle}
                  onChange={e => setGoalTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Целевая сумма (₽) *
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    placeholder="150000"
                    value={goalTargetAmount}
                    onChange={e => setGoalTargetAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Уже накоплено (₽)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={goalCurrentAmount}
                    onChange={e => setGoalCurrentAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Желаемый срок
                </label>
                <input
                  type="date"
                  value={goalDate}
                  onChange={e => setGoalDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Ответственный / Для кого
                </label>
                <select
                  value={goalMemberId}
                  onChange={e => setGoalMemberId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value={0}>-- Вся семья --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Up Goal Modal */}
      {topUpGoalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" />
                Внести сумму в копилку
              </h3>
              <button onClick={() => setTopUpGoalId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleTopUpGoal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Сумма пополнения (₽) *
                </label>
                <input
                  type="number"
                  required
                  step="any"
                  autoFocus
                  placeholder="5000"
                  value={topUpAmount}
                  onChange={e => setTopUpAmount(e.target.value)}
                  className="w-full text-lg font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setTopUpGoalId(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium text-sm"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm"
                >
                  Пополнить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
