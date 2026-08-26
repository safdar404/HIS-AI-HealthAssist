import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isReconnecting: boolean;
  latencyMs: number | null;
  lastChecked: Date;
  quality: 'EXCELLENT' | 'GOOD' | 'POOR' | 'OFFLINE';
  retryConnection: () => Promise<boolean>;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(32);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [quality, setQuality] = useState<'EXCELLENT' | 'GOOD' | 'POOR' | 'OFFLINE'>('EXCELLENT');

  const pingServer = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setQuality('OFFLINE');
      setLatencyMs(null);
      setLastChecked(new Date());
      return false;
    }

    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const roundTrip = Math.round(performance.now() - startTime);
        setIsOnline(true);
        setLatencyMs(roundTrip);
        setLastChecked(new Date());

        if (roundTrip < 80) {
          setQuality('EXCELLENT');
        } else if (roundTrip < 250) {
          setQuality('GOOD');
        } else {
          setQuality('POOR');
        }
        return true;
      } else {
        setIsOnline(false);
        setQuality('OFFLINE');
        setLatencyMs(null);
        setLastChecked(new Date());
        return false;
      }
    } catch {
      // Fallback: If fetch fails (or aborted) but navigator is online, try checking navigator
      const onlineState = typeof navigator !== 'undefined' ? navigator.onLine : false;
      setIsOnline(onlineState);
      setQuality(onlineState ? 'POOR' : 'OFFLINE');
      setLatencyMs(onlineState ? 450 : null);
      setLastChecked(new Date());
      return onlineState;
    }
  }, []);

  const retryConnection = useCallback(async (): Promise<boolean> => {
    setIsReconnecting(true);
    try {
      return await pingServer();
    } finally {
      setIsReconnecting(false);
    }
  }, [pingServer]);

  useEffect(() => {
    const handleOnline = () => {
      pingServer();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setQuality('OFFLINE');
      setLatencyMs(null);
      setLastChecked(new Date());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial ping
    pingServer();

    // Heartbeat every 15 seconds
    const interval = setInterval(() => {
      pingServer();
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [pingServer]);

  return {
    isOnline,
    isReconnecting,
    latencyMs,
    lastChecked,
    quality,
    retryConnection,
  };
}
