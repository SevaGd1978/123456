import React from 'react';
import { 
  X, Download, Lock, Palette, Moon, Sun, RefreshCw, 
  User as UserIcon, LogIn, LogOut, CheckCircle2, ShieldCheck,
  Smartphone
} from 'lucide-react';
import { User } from '../types';
import { getApiBaseUrl } from '../api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  appStyle: 'ios6' | 'modern';
  onToggleStyle: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLockScreen: () => void;
  onRefreshData: () => void;
  isLoading: boolean;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const SettingsSheet: React.FC<Props> = ({
  isOpen,
  onClose,
  appStyle,
  onToggleStyle,
  darkMode,
  onToggleDarkMode,
  onLockScreen,
  onRefreshData,
  isLoading,
  currentUser,
  onOpenAuth,
  onLogout
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div 
        className={`w-full max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl border transition-all ${
          appStyle === 'ios6' 
            ? 'ios6-linen border-slate-600 text-white shadow-[0_-4px_20px_rgba(0,0,0,0.7)]' 
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white'
        }`}
      >
        {/* Header */}
        <div className={`px-5 py-3.5 flex items-center justify-between border-b ${
          appStyle === 'ios6' ? 'ios6-navbar text-white border-[#2d3642]' : 'border-slate-100 dark:border-slate-700'
        }`}>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base tracking-tight">
              Параметры и управление
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              appStyle === 'ios6' ? 'ios6-btn-silver text-xs px-3 py-1 font-bold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            {appStyle === 'ios6' ? 'Готово' : <X className="w-5 h-5" />}
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 sm:p-5 space-y-3 max-h-[80vh] overflow-y-auto">
          
          {/* User Profile Card */}
          <div className={`p-3.5 rounded-xl border ${
            appStyle === 'ios6' 
              ? 'bg-black/40 border-white/20' 
              : 'bg-slate-50 dark:bg-slate-750 border-slate-200 dark:border-slate-700'
          }`}>
            {currentUser ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow"
                    style={{ backgroundColor: currentUser.avatar_color || '#3b82f6' }}
                  >
                    {currentUser.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm leading-tight">{currentUser.full_name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{currentUser.role || 'Член семьи'} • {currentUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => { onLogout(); onClose(); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Выйти
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm">Учетная запись</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Вход или регистрация в семье</p>
                </div>
                <button
                  onClick={() => { onOpenAuth(); onClose(); }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    appStyle === 'ios6' ? 'ios6-btn-blue' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Войти
                </button>
              </div>
            )}
          </div>

          {/* Download APK option */}
          <a
            href="/download/FamilyBudget_iOS6.apk"
            download="FamilyBudget_iOS6.apk"
            className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition ${
              appStyle === 'ios6' ? 'ios6-btn-green' : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5" />
              <div className="text-left">
                <p className="font-bold text-sm">Скачать APK для Android</p>
                <p className="text-[11px] opacity-90">Samsung S25 Ultra • Android 17 • 4.5 МБ</p>
              </div>
            </div>
            <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full">APK</span>
          </a>

          {/* Lock Screen */}
          <button
            onClick={() => { onLockScreen(); onClose(); }}
            className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition text-left ${
              appStyle === 'ios6' ? 'bg-black/40 border-white/20 hover:bg-black/50' : 'bg-slate-50 dark:bg-slate-750 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm">Заблокировать экран</p>
                <p className="text-[11px] text-slate-400">Быстрый вход по PIN (1234) или Touch ID</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-400">Lock ➔</span>
          </button>

          {/* Style Switcher: iOS 6 vs Modern */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
            appStyle === 'ios6' ? 'bg-black/40 border-white/20' : 'bg-slate-50 dark:bg-slate-750 border-slate-200 dark:border-slate-700'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm">Стиль интерфейса</p>
                <p className="text-[11px] text-slate-400">
                  {appStyle === 'ios6' ? 'Скевоморфизм iOS 6' : 'Современный Flat Design'}
                </p>
              </div>
            </div>
            <button
              onClick={onToggleStyle}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                appStyle === 'ios6' ? 'ios6-btn-silver' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white'
              }`}
            >
              {appStyle === 'ios6' ? 'Сменить на Modern' : 'Включить iOS 6'}
            </button>
          </div>

          {/* Theme Switcher: Dark vs Light */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
            appStyle === 'ios6' ? 'bg-black/40 border-white/20' : 'bg-slate-50 dark:bg-slate-750 border-slate-200 dark:border-slate-700'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <div>
                <p className="font-bold text-sm">Цветовая тема</p>
                <p className="text-[11px] text-slate-400">{darkMode ? 'Темная тема включена' : 'Светлая тема'}</p>
              </div>
            </div>
            <button
              onClick={onToggleDarkMode}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                appStyle === 'ios6' ? 'ios6-btn-silver' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white'
              }`}
            >
              {darkMode ? '☀️ Светлая' : '🌙 Темная'}
            </button>
          </div>

          {/* Refresh Data */}
          <button
            onClick={() => { onRefreshData(); onClose(); }}
            className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition text-left ${
              appStyle === 'ios6' ? 'bg-black/40 border-white/20 hover:bg-black/50' : 'bg-slate-50 dark:bg-slate-750 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <p className="font-bold text-sm">Обновить данные</p>
                <p className="text-[11px] text-slate-400">Синхронизация с облачным сервером</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Онлайн</span>
            </div>
          </button>

        </div>

        {/* Footer info */}
        <div className={`px-5 py-3 border-t text-center text-[11px] text-slate-400 ${
          appStyle === 'ios6' ? 'border-[#2d3642] bg-black/50' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
        }`}>
          Семейный Бюджет v1.0 • Адаптировано под Samsung Galaxy S25 Ultra
        </div>
      </div>
    </div>
  );
};
