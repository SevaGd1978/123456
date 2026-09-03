import React, { useState } from 'react';
import { 
  ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Search, 
  Filter, Trash2, Calendar, User, CreditCard, Tag 
} from 'lucide-react';
import { Transaction, Account, Category, FamilyMember } from '../types';
import { formatMoney } from '../utils';

interface Props {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  members: FamilyMember[];
  onRefresh: () => void;
  onOpenNewModal: () => void;
}

export const TransactionsView: React.FC<Props> = ({
  transactions,
  accounts,
  categories,
  members,
  onRefresh,
  onOpenNewModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<number>(0);
  const [filterMember, setFilterMember] = useState<number>(0);
  const [filterCategory, setFilterCategory] = useState<number>(0);

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту операцию? Баланс счета будет скорректирован.')) return;
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  const filtered = transactions.filter(t => {
    if (filterType !== 'all' && t.trans_type !== filterType) return false;
    if (filterAccount > 0 && t.account_id !== filterAccount && t.to_account_id !== filterAccount) return false;
    if (filterMember > 0 && t.member_id !== filterMember) return false;
    if (filterCategory > 0 && t.category_id !== filterCategory) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const descMatch = t.description?.toLowerCase().includes(q);
      const catMatch = t.category_name?.toLowerCase().includes(q);
      const accMatch = t.account_name?.toLowerCase().includes(q);
      const memMatch = t.member_name?.toLowerCase().includes(q);
      if (!descMatch && !catMatch && !accMatch && !memMatch) return false;
    }
    return true;
  });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/80 p-6 space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            История операций
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Все доходы, расходы и переводы семейного бюджета ({filtered.length} найдено)
          </p>
        </div>
        <button
          onClick={onOpenNewModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-md shadow-indigo-500/10 transition"
        >
          <ArrowDownLeft className="w-4 h-4" />
          Добавить операцию
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative lg:col-span-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Type */}
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Все типы операций</option>
          <option value="expense">Только расходы</option>
          <option value="income">Только доходы</option>
          <option value="transfer">Только переводы</option>
        </select>

        {/* Member */}
        <select
          value={filterMember}
          onChange={e => setFilterMember(Number(e.target.value))}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value={0}>Все члены семьи</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        {/* Account */}
        <select
          value={filterAccount}
          onChange={e => setFilterAccount(Number(e.target.value))}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value={0}>Все счета</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        {/* Category */}
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(Number(e.target.value))}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value={0}>Все категории</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Transactions Table / List */}
      <div className="overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            Операций не найдено
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Дата</th>
                <th className="py-3 px-3">Операция / Описание</th>
                <th className="py-3 px-3">Категория</th>
                <th className="py-3 px-3">Счет</th>
                <th className="py-3 px-3">Член семьи</th>
                <th className="py-3 px-3 text-right">Сумма</th>
                <th className="py-3 px-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-sm">
              {filtered.map(t => {
                const isExpense = t.trans_type === 'expense';
                const isIncome = t.trans_type === 'income';
                const isTransfer = t.trans_type === 'transfer';

                return (
                  <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition group">
                    <td className="py-3.5 px-3 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {t.date}
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isExpense ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30' :
                          isIncome ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' :
                          'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30'
                        }`}>
                          {isExpense && <ArrowDownLeft className="w-4 h-4" />}
                          {isIncome && <ArrowUpRight className="w-4 h-4" />}
                          {isTransfer && <ArrowRightLeft className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 dark:text-white">
                            {t.description || (isTransfer ? `Перевод на ${t.to_account_name}` : t.category_name || 'Без описания')}
                          </p>
                          {isTransfer && (
                            <p className="text-xs text-slate-400">
                              {t.account_name} ➔ {t.to_account_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {t.category_name ? (
                        <span 
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: `${t.category_color}18`,
                            color: t.category_color || '#4b5563'
                          }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.category_color || '#4b5563' }} />
                          {t.category_name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-600 dark:text-slate-300 text-xs font-medium">
                      {t.account_name}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {t.member_name ? (
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
                            style={{ backgroundColor: t.member_avatar_color || '#3b82f6' }}
                          >
                            {t.member_name.charAt(0)}
                          </span>
                          <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                            {t.member_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Вся семья</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap text-right font-bold">
                      <span className={
                        isExpense ? 'text-rose-600 dark:text-rose-400' :
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' :
                        'text-indigo-600 dark:text-indigo-400'
                      }>
                        {isExpense ? '-' : isIncome ? '+' : ''}{formatMoney(t.amount)}
                      </span>
                    </td>

                    <td className="py-3.5 px-2 text-right">
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity p-1.5 rounded"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
