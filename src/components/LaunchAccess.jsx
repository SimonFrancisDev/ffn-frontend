import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { LockKeyhole, Sparkles, RefreshCw } from 'lucide-react';
import { getApiUrl } from '../Services/apiConfig';
import { captureInvitation, earlyAccessHeaders } from '../Services/earlyAccess';
import './LaunchAccess.css';

const enabled = import.meta.env.VITE_NEW_FEATURE_LAUNCH_ENABLED === 'true';

export default function LaunchAccess({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [retry, setRetry] = useState(0);
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
  }, [retry]);
  if (!enabled) return children;
  const now = status ? status.serverNow + Math.max(0, elapsed - status.received) : 0;
  const open = status && (status.authorized || now >= status.launchAt);
  const protectedPage = /^\/(freedom-plus|freedom-nft|tasks)(\/|$)/.test(location.pathname)
    || new URLSearchParams(location.search).get('program') === 'freedom-plus';
  const remaining = status ? Math.max(0, status.launchAt - now) : 0;
  const seconds = Math.ceil(remaining / 1000);
  const countdown = [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60]
    .map((value) => String(value).padStart(2, '0')).join(':');
  return <>
    {status?.enabled && now < status.bannerUntil && <aside className="ffn-launch-banner" aria-label="Program launch">
      <Sparkles size={20} aria-hidden="true" />
      <strong>{remaining ? 'Freedom-Plus & Freedom NFT' : 'Freedom-Plus & Freedom NFT are live'}</strong>
      {remaining ? <span><time dateTime={new Date(status.launchAt).toISOString()}>{countdown}</time> until launch</span>
        : <Link to="/freedom-plus">Explore the programs</Link>}
    </aside>}
    {protectedPage && !open ? <section className="ffn-launch-access">
      <LockKeyhole size={36} aria-hidden="true" />
      <h1>{error ? 'Launch status unavailable' : status ? 'Opening soon' : 'Checking access'}</h1>
      <p>{error ? 'Please try again.' : status ? `Public access opens ${new Date(status.launchAt).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC. Early access is by invitation.` : 'Please wait.'}</p>
      {error && <button type="button" onClick={() => setRetry((value) => value + 1)}><RefreshCw size={16} /> Retry</button>}
      <Link to="/home">Return home</Link>
    </section> : children}
  </>;
}
