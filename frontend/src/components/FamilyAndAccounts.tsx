import React, { useState } from 'react';
import { 
  Users, UserPlus, CreditCard, Plus, Trash2, Edit2, 
  Wallet, ShieldCheck, CheckCircle2, DollarSign, X
} from 'lucide-react';
import { Account, FamilyMember } from '../types';
import { formatMoney } from '../utils';

interface Props {
  members: FamilyMember[];
  accounts: Account[];
  onRefresh: () => void;
}

export const FamilyAndAccounts: React.FC<Props> = ({ members, accounts, onRefresh }) => {
  // Member modal state
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('Член семьи');
  const [memberColor, setMemberColor] = useState('#3b82f6');

  // Account modal state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState('Дебетовая карта');
  const [accountBalance, setAccountBalance] = useState('');
  const [accountColor, setAccountColor] = useState('#10b981');

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) return;

    await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: memberName.trim(),
        role: memberRole,
        avatar_color: memberColor
      })
    });

    setMemberName('');
    setShowMemberModal(false);
    onRefresh();
  };

  const handleDeleteMember = async (id: number) => {
    if (!confirm('Удалить члена семьи? Все связанные операции останутся без привязки.')) return;
    await fetch(`/api/members/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) return;

    await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: accountName.trim(),
        account_type: accountType,
        currency: 'RUB',
        initial_balance: parseFloat(accountBalance) || 0,
        color: accountColor
      })
    });

    setAccountName('');
    setAccountBalance('');
    setShowAccountModal(false);
    onRefresh();
  };

  const handleDeleteAccount = async (id: number) => {
    if (!confirm('Удалить счет? Это приведет к удалению всех операций по этому счету.')) return;
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Family Members Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Члены семьи
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Управляйте семейным составом, чтобы детально видеть доходы и траты каждого
            </p>
          </div>
          <button
            onClick={() => setShowMemberModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-md shadow-indigo-500/10 transition"
          >
            <UserPlus className="w-4 h-4" />
            Добавить члена семьи
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {members.map(member => (
            <div 
              key={member.id}
              className="p-5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 hover:shadow-md transition group flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm"
                  style={{ backgroundColor: member.avatar_color }}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-white">{member.name}</h4>
                  <span className="inline-block mt-0.5 px-2.5 py-0.5 text-xs rounded-full font-medium bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {member.role}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDeleteMember(member.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30"
                title="Удалить"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Accounts & Wallets Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Семейные счета и кошельки
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Карты, наличные, накопительные и инвестиционные счета
            </p>
          </div>
          <button
            onClick={() => setShowAccountModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-md shadow-emerald-500/10 transition"
          >
            <Plus className="w-4 h-4" />
            Добавить счет
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {accounts.map(account => (
            <div 
              key={account.id}
              className="p-5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 hover:shadow-md transition relative group overflow-hidden"
            >
              <div 
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: account.color }}
              />
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    {account.account_type}
                  </span>
                  <h4 className="font-bold text-slate-800 dark:text-white text-base mt-1">
                    {account.name}
                  </h4>
                </div>
                <button
                  onClick={() => handleDeleteAccount(account.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30"
                  title="Удалить счет"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-baseline justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Баланс:</span>
                <span className={`text-xl font-extrabold ${account.current_balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                  {formatMoney(account.current_balance)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                Новый член семьи
              </h3>
              <button onClick={() => setShowMemberModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Имя *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Мария"
                  value={memberName}
                  onChange={e => setMemberName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Роль в семье
                </label>
                <select
                  value={memberRole}
                  onChange={e => setMemberRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Отец">Отец</option>
                  <option value="Мать">Мать</option>
                  <option value="Сын">Сын</option>
                  <option value="Дочь">Дочь</option>
                  <option value="Бабушка">Бабушка</option>
                  <option value="Дедушка">Дедушка</option>
                  <option value="Член семьи">Член семьи</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Цвет аватара
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={memberColor}
                    onChange={e => setMemberColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                  />
                  <span className="text-sm font-mono text-slate-500">{memberColor}</span>
                </div>
              </div>
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Новый счет / кошелек
              </h3>
              <button onClick={() => setShowAccountModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddAccount} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Название счета *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Карта Тинькофф Black"
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Тип счета
                </label>
                <select
                  value={accountType}
                  onChange={e => setAccountType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Дебетовая карта">Дебетовая карта</option>
                  <option value="Кредитная карта">Кредитная карта</option>
                  <option value="Наличные">Наличные</option>
                  <option value="Накопительный счет">Накопительный счет</option>
                  <option value="Вклад / Депозит">Вклад / Депозит</option>
                  <option value="Инвестиционный счет">Инвестиционный счет</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Начальный баланс (₽)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={accountBalance}
                  onChange={e => setAccountBalance(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Цветовая метка
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={accountColor}
                    onChange={e => setAccountColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                  />
                  <span className="text-sm font-mono text-slate-500">{accountColor}</span>
                </div>
              </div>
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  Создать счет
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
