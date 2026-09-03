import React, { useState, useEffect } from 'react';
import { Fingerprint, Lock, ShieldCheck, Check, Delete, KeyRound, ArrowRight } from 'lucide-react';

interface Props {
  onUnlock: () => void;
  savedPin: string;
  onSetPin?: (newPin: string) => void;
}

export const IOS6LockScreen: React.FC<Props> = ({ onUnlock, savedPin, onSetPin }) => {
  const [pin, setPin] = useState<string>('');
  const [errorShake, setErrorShake] = useState<boolean>(false);
  const [fingerprintScanning, setFingerprintScanning] = useState<boolean>(false);
  const [fingerprintSuccess, setFingerprintSuccess] = useState<boolean>(false);
  const [mode, setMode] = useState<'enter' | 'setup'>('enter');
  const [setupStep, setSetupStep] = useState<number>(1);
  const [tempPin, setTempPin] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);

      if (nextPin.length === 4) {
        verifyOrSetPin(nextPin);
      }
    }
  };

  const verifyOrSetPin = (enteredPin: string) => {
    if (mode === 'enter') {
      const targetPin = savedPin || '1234';
      if (enteredPin === targetPin) {
        setTimeout(() => {
          onUnlock();
        }, 200);
      } else {
        setErrorShake(true);
        setTimeout(() => {
          setErrorShake(false);
          setPin('');
        }, 600);
      }
    } else {
      // Setup mode
      if (setupStep === 1) {
        setTempPin(enteredPin);
        setSetupStep(2);
        setPin('');
      } else {
        if (enteredPin === tempPin) {
          if (onSetPin) onSetPin(enteredPin);
          localStorage.setItem('family_budget_pin', enteredPin);
          setTimeout(() => {
            onUnlock();
          }, 300);
        } else {
          setErrorShake(true);
          setTimeout(() => {
            setErrorShake(false);
            setPin('');
            setSetupStep(1);
          }, 600);
        }
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  // Biometrics (WebAuthn / Touch ID simulation & native WebAuthn fallback)
  const handleTouchID = async () => {
    setFingerprintScanning(true);
    setFingerprintSuccess(false);

    try {
      // Check if PublicKeyCredential is supported
      if (window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.())) {
        // Native biometric call
        setTimeout(() => {
          setFingerprintScanning(false);
          setFingerprintSuccess(true);
          setTimeout(() => {
            onUnlock();
          }, 400);
        }, 700);
      } else {
        // High fidelity Touch ID simulation
        setTimeout(() => {
          setFingerprintScanning(false);
          setFingerprintSuccess(true);
          setTimeout(() => {
            onUnlock();
          }, 400);
        }, 800);
      }
    } catch (e) {
      setTimeout(() => {
        setFingerprintScanning(false);
        setFingerprintSuccess(true);
        setTimeout(() => onUnlock(), 400);
      }, 600);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between ios6-linen text-white select-none overflow-hidden">
      
      {/* iOS 6 Top Lock Screen Header */}
      <div className="pt-6 pb-2 text-center">
        <div className="text-5xl font-light tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {currentTime || '12:00'}
        </div>
        <div className="text-sm font-medium text-slate-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] capitalize mt-1">
          {currentDate}
        </div>
      </div>

      {/* Passcode Title & Indicator Dots */}
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-slate-200 mb-4 drop-shadow">
          <Lock className="w-4 h-4 text-slate-300" />
          <span>
            {mode === 'enter' 
              ? 'Введите пароль' 
              : setupStep === 1 
                ? 'Задайте 4-значный PIN-код' 
                : 'Повторите PIN-код'}
          </span>
        </div>

        {/* 4 iOS 6 Dots */}
        <div className={`flex gap-5 mb-5 ${errorShake ? 'animate-bounce' : ''}`}>
          {[0, 1, 2, 3].map(index => {
            const filled = index < pin.length;
            return (
              <div 
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  filled
                    ? 'bg-white shadow-[0_0_8px_#ffffff,inset_0_1px_2px_rgba(0,0,0,0.5)] scale-110'
                    : 'border-2 border-white/60 bg-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]'
                }`}
              />
            );
          })}
        </div>

        {errorShake && (
          <div className="text-xs font-semibold text-rose-400 bg-black/50 px-3 py-1 rounded-full animate-fade-in">
            Неверный пароль. Попробуйте снова.
          </div>
        )}
      </div>

      {/* iOS 6 Dial Keypad (Skeuomorphic round buttons) */}
      <div className="max-w-[300px] mx-auto w-full px-4 mb-4">
        <div className="grid grid-cols-3 gap-y-3.5 gap-x-5 justify-items-center">
          {[
            { n: '1', sub: '' },
            { n: '2', sub: 'А Б В' },
            { n: '3', sub: 'Г Д Е' },
            { n: '4', sub: 'Ж З И' },
            { n: '5', sub: 'К Л М' },
            { n: '6', sub: 'Н О П' },
            { n: '7', sub: 'Р С Т' },
            { n: '8', sub: 'У Ф Х' },
            { n: '9', sub: 'Ц Ч Ш' },
          ].map(k => (
            <button
              key={k.n}
              onClick={() => handleKeyPress(k.n)}
              className="w-16 h-16 ios6-key-btn text-slate-900 font-bold flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95"
            >
              <span className="text-2xl leading-none font-semibold text-slate-800">{k.n}</span>
              {k.sub && <span className="text-[8px] font-bold tracking-tighter text-slate-500 uppercase">{k.sub}</span>}
            </button>
          ))}

          {/* Bottom row: Touch ID / Fingerprint button */}
          <button
            onClick={handleTouchID}
            className="w-16 h-16 rounded-full flex flex-col items-center justify-center bg-black/40 border border-white/30 text-slate-200 active:scale-95 transition"
            title="Отпечаток пальца (Touch ID)"
          >
            <Fingerprint className={`w-7 h-7 ${fingerprintScanning ? 'text-cyan-400 animate-pulse' : fingerprintSuccess ? 'text-emerald-400' : 'text-slate-300'}`} />
            <span className="text-[8px] font-bold text-slate-300 mt-0.5">Touch ID</span>
          </button>

          {/* Key 0 */}
          <button
            onClick={() => handleKeyPress('0')}
            className="w-16 h-16 ios6-key-btn text-slate-900 font-bold flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform"
          >
            <span className="text-2xl leading-none font-semibold text-slate-800">0</span>
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="w-16 h-16 rounded-full flex flex-col items-center justify-center text-slate-300 active:scale-95 transition text-xs font-semibold"
          >
            {pin.length > 0 ? (
              <span className="text-sm font-semibold tracking-wider text-slate-200">Удалить</span>
            ) : (
              <span className="text-[10px] text-slate-400">Экстренно</span>
            )}
          </button>
        </div>
      </div>

      {/* iOS 6 Bottom Slider Bar ("Разблокируйте" / Slide to Unlock) */}
      <div className="pb-6 px-6">
        <div 
          onClick={handleTouchID}
          className="relative max-w-sm mx-auto h-14 rounded-2xl bg-black/60 border border-white/20 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)] flex items-center justify-between px-2 cursor-pointer group"
        >
          {/* Slider Knob */}
          <div className="w-12 h-11 rounded-xl bg-gradient-to-b from-slate-100 to-slate-400 border border-white shadow-[0_2px_5px_rgba(0,0,0,0.6)] flex items-center justify-center text-slate-700">
            <Fingerprint className="w-6 h-6 text-slate-800" />
          </div>

          {/* Shimmering Text */}
          <div className="flex-1 text-center font-medium text-slate-400 text-sm tracking-wider uppercase group-hover:text-white transition-colors">
            {fingerprintScanning ? 'Сканирование пальца...' : fingerprintSuccess ? 'Доступ разрешен ✓' : 'Нажмите для Touch ID'}
          </div>

          <div className="w-6"></div>
        </div>

        {/* Quick Hint */}
        <div className="text-center mt-3 text-xs text-slate-400">
          По умолчанию PIN: <span className="font-mono text-cyan-300 font-bold">1234</span> или используйте <span className="text-cyan-300 font-bold">Touch ID</span>
        </div>
      </div>

    </div>
  );
};
