import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ReceiptText, PieChart, Users, 
  PlusCircle, Moon, Sun, RefreshCw, ChevronDown, Wallet,
  LogIn, LogOut, User as UserIcon
} from 'lucide-react';
import { 
  Account, Category, FamilyMember, Transaction, 
  Budget, Goal, SummaryStats, CategoryExpenseStat, 
  MemberExpenseStat, MonthlyTrendStat, User 
} from './types';
import { DashboardOverview } from './components/DashboardOverview';
import { TransactionsView } from './components/TransactionsView';
import { BudgetsAndGoals } from './components/BudgetsAndGoals';
import { FamilyAndAccounts } from './components/FamilyAndAccounts';
import { TransactionModal } from './components/TransactionModal';
import { AuthModal } from './components/AuthModal';
import { IOS6LockScreen } from './components/IOS6LockScreen';
import { SettingsSheet } from './components/SettingsSheet';
import { Lock, Menu } from 'lucide-react';
import { apiFetch, getApiBaseUrl, setApiBaseUrl, DEFAULT_REMOTE_URL } from './api';

export function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'budgets' | 'family'>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [currentMonth, setCurrentMonth] = useState<string>('2026-09');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // App Theme Style: 'modern' or 'ios6'
  const [appStyle, setAppStyle] = useState<'ios6' | 'modern'>(() => {
    return (localStorage.getItem('family_budget_style') as 'ios6' | 'modern') || 'ios6';
  });

  // App Lock State (PIN / Biometrics Touch ID)
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    return localStorage.getItem('family_budget_locked') !== 'false';
  });
  const [savedPin, setSavedPin] = useState<string>(() => {
    return localStorage.getItem('family_budget_pin') || '1234';
  });

  // Current User / Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // App Data States
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  // Analytics States
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryExpenseStat[]>([]);
  const [memberStats, setMemberStats] = useState<MemberExpenseStat[]>([]);
  const [trends, setTrends] = useState<MonthlyTrendStat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load saved session
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse saved user', e);
      }
    }
  }, []);

  // Toggle dark mode class on root
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setCurrentUser(null);
    setToken(null);
  };

  const handleLoginSuccess = (user: User, authToken: string) => {
    setCurrentUser(user);
    setToken(authToken);
    fetchAllData();
  };

  const getAuthHeaders = () => {
    const headers: Record<string, string> = {};
    const curToken = token || localStorage.getItem('auth_token');
    if (curToken) {
      headers['Authorization'] = `Bearer ${curToken}`;
    }
    return headers;
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [
        membersRes,
        accountsRes,
        categoriesRes,
        txsRes,
        budgetsRes,
        goalsRes,
        summaryRes,
        catStatsRes,
        memStatsRes,
        trendsRes
      ] = await Promise.all([
        apiFetch('/api/members').then(r => r.json()),
        apiFetch('/api/accounts').then(r => r.json()),
        apiFetch('/api/categories').then(r => r.json()),
        apiFetch(`/api/transactions?month=${currentMonth}`).then(r => r.json()),
        apiFetch(`/api/budgets?month=${currentMonth}`).then(r => r.json()),
        apiFetch('/api/goals').then(r => r.json()),
        apiFetch(`/api/analytics/summary?month=${currentMonth}`).then(r => r.json()),
        apiFetch(`/api/analytics/categories?month=${currentMonth}`).then(r => r.json()),
        apiFetch(`/api/analytics/members?month=${currentMonth}`).then(r => r.json()),
        apiFetch('/api/analytics/monthly-trends?months_count=6').then(r => r.json())
      ]);

      setMembers(membersRes || []);
      setAccounts(accountsRes || []);
      setCategories(categoriesRes || []);
      setTransactions(txsRes || []);
      setBudgets(budgetsRes || []);
      setGoals(goalsRes || []);
      setSummary(summaryRes || null);
      setCategoryStats(catStatsRes || []);
      setMemberStats(memStatsRes || []);
      setTrends(trendsRes || []);
    } catch (e) {
      console.error('Failed to fetch data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [currentMonth]);

  return (
    <div className={`min-h-screen transition-colors duration-200 ${appStyle === 'ios6' ? 'ios6-stripes text-slate-900 pb-16' : 'bg-slate-50 dark:bg-slate-900 pb-12'} pt-[env(safe-area-inset-top,0px)]`}>
      
      {/* Top Navigation Bar */}
      <header className={`sticky top-0 z-40 ${appStyle === 'ios6' ? 'ios6-navbar text-white' : 'bg-white/80 dark:bg-slate-850/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800'}`}>
        {/* Strictly single row: fits any screen width (from 320px to 4K) */}
        <div className="max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-8 h-12 sm:h-14 flex items-center justify-between gap-1.5 sm:gap-3">
          
          {/* Logo & App Name */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 ${appStyle === 'ios6' ? 'bg-gradient-to-b from-blue-400 via-blue-600 to-blue-800 border border-white/60 shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_1px_#ffffff]' : 'bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-md shadow-indigo-500/20'}`}>
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow" />
            </div>
            <div className="min-w-0">
              <h1 className={`font-extrabold tracking-tight leading-tight text-xs sm:text-base md:text-lg truncate ${appStyle === 'ios6' ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-slate-900 dark:text-white'}`}>
                Семейный Бюджет
              </h1>
              <p className={`hidden md:block text-[10px] font-medium leading-none ${appStyle === 'ios6' ? 'text-blue-100/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]' : 'text-slate-400'}`}>
                iOS 6 Edition
              </p>
            </div>
          </div>

          {/* Right: Controls & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Month select: compact */}
            <input
              type="month"
              value={currentMonth}
              onChange={e => setCurrentMonth(e.target.value)}
              className={`text-xs font-semibold px-1.5 sm:px-2 py-1 rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer ${
                appStyle === 'ios6' 
                  ? 'bg-black/30 text-white border-white/30 shadow-inner' 
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white'
              }`}
              style={{ width: '100px' }}
            />

            {/* Quick Add Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1 text-xs font-bold rounded-lg transition-all active:scale-95 shrink-0 ${
                appStyle === 'ios6' 
                  ? 'ios6-btn-green text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Операция</span>
            </button>

            {/* Desktop Direct Quick Actions (hidden on mobile, visible on desktop >= lg) */}
            <div className="hidden lg:flex items-center gap-2 pl-1 border-l border-white/20 dark:border-slate-700">
              {/* Lock button */}
              <button
                onClick={() => {
                  setIsLocked(true);
                  localStorage.setItem('family_budget_locked', 'true');
                }}
                title="Заблокировать экран (PIN / Touch ID)"
                className={`p-1.5 rounded-lg text-xs font-bold transition ${appStyle === 'ios6' ? 'ios6-btn-silver text-slate-800' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
              >
                <Lock className="w-3.5 h-3.5" />
              </button>

              {/* Download APK button */}
              <a
                href="/download/FamilyBudget_iOS6.apk"
                download="FamilyBudget_iOS6.apk"
                title="Скачать APK для Android"
                className="flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-lg border transition shadow-sm ios6-btn-green"
              >
                <span>📲 APK</span>
              </a>

              {/* Style toggle */}
              <button
                onClick={() => {
                  const nextStyle = appStyle === 'ios6' ? 'modern' : 'ios6';
                  setAppStyle(nextStyle);
                  localStorage.setItem('family_budget_style', nextStyle);
                }}
                className="px-2 py-1 text-xs font-bold rounded-lg border transition shadow-sm ios6-btn-silver"
              >
                {appStyle === 'ios6' ? 'iOS 6' : 'Modern'}
              </button>

              {/* Dark mode */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${appStyle === 'ios6' ? 'ios6-btn-silver text-slate-800' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
              >
                {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
              </button>

              {/* Refresh */}
              <button
                onClick={fetchAllData}
                title="Обновить данные"
                className={`p-1.5 rounded-lg text-xs font-bold transition ${appStyle === 'ios6' ? 'ios6-btn-silver text-slate-800' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {/* User Profile Avatar / Login on desktop */}
              {currentUser ? (
                <div 
                  onClick={() => setIsSettingsOpen(true)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm cursor-pointer border border-white/40 shrink-0 ml-1"
                  style={{ backgroundColor: currentUser.avatar_color || '#3b82f6' }}
                  title={`${currentUser.full_name} (${currentUser.role || 'Член семьи'})`}
                >
                  {currentUser.full_name.charAt(0).toUpperCase()}
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 ml-1 ${
                    appStyle === 'ios6' ? 'ios6-btn-blue text-white' : 'border border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Войти</span>
                </button>
              )}
            </div>

            {/* Menu / Settings Button (opens SettingsSheet) */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Параметры и управление"
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition shrink-0 ${
                appStyle === 'ios6' ? 'ios6-btn-silver text-slate-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Menu className="w-4 h-4 text-slate-800 dark:text-white" />
              <span className="text-xs font-semibold">Опции</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation row: horizontally scrollable with no visible scrollbar */}
        <div className={`max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 flex space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-1 ${
          appStyle === 'ios6' ? 'bg-[#51647d] border-t border-[#3e4f66] shadow-inner' : 'border-t border-slate-100 dark:border-slate-800/60'
        }`}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 py-1 px-2.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-all rounded-lg shrink-0 ${
              appStyle === 'ios6'
                ? activeTab === 'dashboard'
                  ? 'ios6-btn-blue text-white font-bold shadow'
                  : 'text-slate-200 hover:text-white'
                : activeTab === 'dashboard'
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Сводка
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-1.5 py-1 px-2.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-all rounded-lg shrink-0 ${
              appStyle === 'ios6'
                ? activeTab === 'transactions'
                  ? 'ios6-btn-blue text-white font-bold shadow'
                  : 'text-slate-200 hover:text-white'
                : activeTab === 'transactions'
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <ReceiptText className="w-3.5 h-3.5" />
            Операции ({transactions.length})
          </button>

          <button
            onClick={() => setActiveTab('budgets')}
            className={`flex items-center gap-1.5 py-1 px-2.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-all rounded-lg shrink-0 ${
              appStyle === 'ios6'
                ? activeTab === 'budgets'
                  ? 'ios6-btn-blue text-white font-bold shadow'
                  : 'text-slate-200 hover:text-white'
                : activeTab === 'budgets'
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            Бюджеты и Цели ({budgets.length + goals.length})
          </button>

          <button
            onClick={() => setActiveTab('family')}
            className={`flex items-center gap-1.5 py-1 px-2.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-all rounded-lg shrink-0 ${
              appStyle === 'ios6'
                ? activeTab === 'family'
                  ? 'ios6-btn-blue text-white font-bold shadow'
                  : 'text-slate-200 hover:text-white'
                : activeTab === 'family'
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Семья и Счета ({members.length})
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            summary={summary}
            categoryStats={categoryStats}
            memberStats={memberStats}
            trends={trends}
            accounts={accounts}
            recentTransactions={transactions.slice(0, 5)}
            budgets={budgets}
            goals={goals}
            currentMonth={currentMonth}
            onOpenNewTransaction={() => setIsModalOpen(true)}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            members={members}
            onRefresh={fetchAllData}
            onOpenNewModal={() => setIsModalOpen(true)}
          />
        )}

        {activeTab === 'budgets' && (
          <BudgetsAndGoals
            budgets={budgets}
            goals={goals}
            categories={categories}
            members={members}
            currentMonth={currentMonth}
            onRefresh={fetchAllData}
          />
        )}

        {activeTab === 'family' && (
          <FamilyAndAccounts
            members={members}
            accounts={accounts}
            onRefresh={fetchAllData}
          />
        )}
      </main>

      {/* Modal for adding transaction */}
      <TransactionModal
        accounts={accounts}
        categories={categories}
        members={members}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAllData}
      />

      {/* Modal for login and registration */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Settings & Options Sheet (S25 Ultra / Mobile & Desktop) */}
      <SettingsSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        appStyle={appStyle}
        onToggleStyle={() => {
          const nextStyle = appStyle === 'ios6' ? 'modern' : 'ios6';
          setAppStyle(nextStyle);
          localStorage.setItem('family_budget_style', nextStyle);
        }}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onLockScreen={() => {
          setIsLocked(true);
          localStorage.setItem('family_budget_locked', 'true');
        }}
        onRefreshData={fetchAllData}
        isLoading={loading}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* iOS 6 Lock Screen (PIN & Touch ID) */}
      {isLocked && (
        <IOS6LockScreen
          savedPin={savedPin}
          onSetPin={(newPin) => setSavedPin(newPin)}
          onUnlock={() => {
            setIsLocked(false);
            localStorage.setItem('family_budget_locked', 'false');
          }}
        />
      )}
    </div>
  );
}

export default App;
