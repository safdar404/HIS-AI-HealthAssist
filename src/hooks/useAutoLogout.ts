import { useState, useEffect, useCallback, useRef } from 'react';

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
const WARNING_BEFORE_LOGOUT_MS = 30 * 1000; // 30 seconds warning

export interface AutoLogoutState {
  isLocked: boolean;
  timeRemainingSeconds: number;
  showWarning: boolean;
  resetTimer: () => void;
  lockNow: () => void;
  unlockSession: () => void;
}

/**
 * Custom hook for HIPAA §164.312(a)(2)(iii) compliant automatic session termination.
 * Automatically locks the clinician interface after 5 minutes of total user inactivity.
 */
export function useAutoLogout(initialLocked: boolean = false): AutoLogoutState {
  const [isLocked, setIsLocked] = useState<boolean>(initialLocked);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(300);
  const [showWarning, setShowWarning] = useState<boolean>(false);

  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setTimeRemainingSeconds(300);
    setShowWarning(false);
  }, []);

  const lockNow = useCallback(() => {
    setIsLocked(true);
    setShowWarning(false);
    sessionStorage.removeItem('cds_biometric_unlocked');
  }, []);

  const unlockSession = useCallback(() => {
    setIsLocked(false);
    resetTimer();
    sessionStorage.setItem('cds_biometric_unlocked', 'true');
    sessionStorage.setItem('cds_biometric_unlocked_time', String(Date.now()));
  }, [resetTimer]);

  useEffect(() => {
    // Activity event listeners across mouse, keyboard, touch, and scroll
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];

    const handleUserActivity = () => {
      if (!isLocked) {
        lastActivityRef.current = Date.now();
      }
    };

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Check timer every second
    timerRef.current = setInterval(() => {
      if (isLocked) return;

      const elapsed = Date.now() - lastActivityRef.current;
      const remainingMs = Math.max(0, INACTIVITY_TIMEOUT_MS - elapsed);
      const remainingSec = Math.ceil(remainingMs / 1000);

      setTimeRemainingSeconds(remainingSec);

      if (remainingMs <= WARNING_BEFORE_LOGOUT_MS && remainingMs > 0) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }

      if (remainingMs <= 0) {
        lockNow();
      }
    }, 1000);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isLocked, lockNow]);

  return {
    isLocked,
    timeRemainingSeconds,
    showWarning,
    resetTimer,
    lockNow,
    unlockSession,
  };
}
