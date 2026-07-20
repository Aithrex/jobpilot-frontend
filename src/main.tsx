import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './fonts.css';
import './index.css';

// Datadog RUM is ~50KB gzip and not needed for first paint: load it at idle
// so it stays out of the critical bundle. Early requests simply skip trace
// headers until the SDK is up.
const bootRum = () => import('./lib/datadogRum').then((m) => m.initDatadogRum());
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => bootRum(), { timeout: 4000 });
} else {
  setTimeout(bootRum, 1500);
}

// Force initial theme check on load to prevent flicker
const root = document.documentElement;
const storedTheme = localStorage.getItem('theme') || 'system';

if (storedTheme === 'dark' || 
    (storedTheme === 'system' && 
     window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  root.classList.add('dark');
} else {
  root.classList.remove('dark');
}

createRoot(document.getElementById('root')!).render(<App />);
