import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getApiUrl } from '../Services/apiConfig';
import { captureInvitation, earlyAccessHeaders } from '../Services/earlyAccess';
import './LaunchAccess.css';

const enabled = import.meta.env.VITE_NEW_FEATURE_LAUNCH_ENABLED === 'true';

export default function LaunchAccess({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    captureInvitation();
    let cancelled = false;
    let pending = false;
    let controller;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(getApiUrl('/api/launch'), {
          headers: earlyAccessHeaders(), signal: controller.signal, cache: 'no-store',
        });
        if (!response.ok) throw new Error('Launch status unavailable');
        const result = await response.json();
        if (typeof result.authorized !== 'boolean' || !Number.isFinite(result.serverNow)) throw new Error('Invalid launch status');
        if (!cancelled) { setStatus({ ...result, received: performance.now() }); setError(false); }
      } catch { if (!cancelled) setError(true); }
      finally { clearTimeout(timeout); pending = false; }
    };
    refresh();
    const interval = setInterval(refresh, 30000);
    const tick = setInterval(() => setElapsed(performance.now()), 1000);
    return () => { cancelled = true; controller?.abort(); clearInterval(interval); clearInterval(tick); };
  }, []);
  if (!enabled) return children;
  const now = status ? status.serverNow + Math.max(0, elapsed - status.received) : 0;
  const open = status && (status.authorized || now >= status.launchAt);
  const protectedPage = /^\/(freedom-plus|freedom-nft|tasks)(\/|$)/.test(location.pathname)
    || new URLSearchParams(location.search).get('program') === 'freedom-plus';
  if (protectedPage && !status && !error) return null;
  if (protectedPage && (error || !open)) return <Navigate to="/home" replace />;
  return children;
}
