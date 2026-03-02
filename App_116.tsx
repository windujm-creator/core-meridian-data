/**
 * App.tsx — ZERØ MERIDIAN 2026 push116
 * push116: Fix routing — AISignals wired to actual component (/ai-signals→/aisignals)
 *          All path mismatches between ZMSidebar nav and App routes resolved.
 *          push115: Security/SmartMoney/Sentiment wired to actual components
 * push107: OfflineIndicator added — in-app offline/reconnected banner.
 * push78: PWAInstallProvider added — wraps entire app so Topbar + PWAInstallPrompt
 *         share one install prompt context (no duplicate event listeners).
 * push23: ThemeProvider (next-themes)
 * - React.memo + displayName ✓
 * - rgba() only ✓
 * - QueryClient optimized ✓
 */

import { memo, lazy, Suspense } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CryptoProvider } from '@/contexts/CryptoContext';
import { PWAInstallProvider } from '@/contexts/PWAInstallContext';
import { useCryptoData } from '@/hooks/useCryptoData';
import Skeleton from '@/components/shared/Skeleton';
import OfflineIndicator from '@/components/shared/OfflineIndicator';
import {
  Landmark,
  Coins, Gem, DollarSign, Bot,
  Map, Image, Bitcoin, Vote,
  Wrench, Timer,
} from 'lucide-react';

// ─── Lazy Pages ───────────────────────────────────────────────────────────────

const Portal        = lazy(() => import('./pages/Portal'));
const Dashboard     = lazy(() => import('./pages/Dashboard'));
const Markets       = lazy(() => import('./pages/Markets'));
const OrderBook     = lazy(() => import('./pages/OrderBook'));
const Derivatives   = lazy(() => import('./pages/Derivatives'));
const Alerts        = lazy(() => import('./pages/Alerts'));
const Watchlist     = lazy(() => import('./pages/Watchlist'));
const Converter     = lazy(() => import('./pages/Converter'));
const Defi          = lazy(() => import('./pages/Defi'));
const PageStub      = lazy(() => import('./components/shared/PageStub'));
const OnChain       = lazy(() => import('./pages/OnChain'));
const Intelligence  = lazy(() => import('./pages/Intelligence'));
const Charts        = lazy(() => import('./pages/Charts'));
const Fundamentals  = lazy(() => import('./pages/Fundamentals'));
const Portfolio     = lazy(() => import('./pages/Portfolio'));
const Networks      = lazy(() => import('./pages/Networks'));
const Tokens        = lazy(() => import('./pages/Tokens'));
const Security      = lazy(() => import('./pages/Security'));
const SmartMoney    = lazy(() => import('./pages/SmartMoney'));
const Sentiment     = lazy(() => import('./pages/Sentiment'));
const AISignals     = lazy(() => import('./pages/AISignals'));
const NotFound      = lazy(() => import('./pages/NotFound'));
import AppShell     from './components/layout/AppShell';

// ─── QueryClient ──────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            30_000,
      gcTime:               5 * 60 * 1000,
      retry:                1,
      refetchOnWindowFocus: false,
      refetchOnReconnect:   true,
    },
  },
});

// ─── Fallback ─────────────────────────────────────────────────────────────────

const PageFallback = memo(() => (
  <div style={{ padding: '20px' }}>
    <Skeleton.Page />
  </div>
));
PageFallback.displayName = 'PageFallback';

// ─── DataLoaderShell ─────────────────────────────────────────────────────────

const DataLoaderShell = memo(() => {
  useCryptoData();
  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/markets"       element={<Markets />} />
          <Route path="/orderbook"     element={<OrderBook />} />
          <Route path="/derivatives"   element={<Derivatives />} />
          <Route path="/alerts"        element={<Alerts />} />
          <Route path="/watchlist"     element={<Watchlist />} />
          <Route path="/converter"     element={<Converter />} />
          <Route path="/defi"          element={<Defi />} />
          <Route path="/intelligence"  element={<Intelligence />} />
          <Route path="/charts"        element={<Charts />} />
          <Route path="/fundamentals"  element={<Fundamentals />} />
          <Route path="/networks"      element={<Networks />} />
          <Route path="/onchain"       element={<OnChain />} />
          <Route path="/tokens"        element={<Tokens />} />
          <Route path="/security"      element={<Security />} />
          <Route path="/smartmoney"    element={<SmartMoney />} />
          <Route path="/sentiment"     element={<Sentiment />} />
          <Route path="/bridges"       element={<PageStub title="Bridge Monitor"          description="Cross-chain bridge volume, security scores, and TVL tracking."                    icon={Landmark} />} />
          <Route path="/lending"       element={<PageStub title="Lending Deep Dive"       description="Supply/borrow APY across Aave, Compound, Morpho with liquidation risk."         icon={Coins} />} />
          <Route path="/staking"       element={<PageStub title="Staking & Yield"         description="ETH staking comparison, restaking, liquid staking peg health."                   icon={Gem} />} />
          <Route path="/stablecoins"   element={<PageStub title="Stablecoin Center"       description="Supply tracking, peg health, dominance, and yield rates."                        icon={DollarSign} />} />
          <Route path="/aisignals"     element={<AISignals />} />
          <Route path="/ai-research"   element={<PageStub title="AI Research"             description="AI-generated market reports, macro analysis, narrative tracking."                icon={Bot} />} />
          <Route path="/ecosystem"     element={<PageStub title="Ecosystem Map"           description="Interactive force graph of protocol relationships and funding."                  icon={Map} />} />
          <Route path="/nft"           element={<PageStub title="NFT Intelligence"        description="Top collections, wash trading detection, whale tracker."                         icon={Image} />} />
          <Route path="/ordinals"      element={<PageStub title="Ordinals & BRC-20"       description="Inscription activity, BRC-20 tokens, rare sat tracking."                        icon={Bitcoin} />} />
          <Route path="/governance"    element={<PageStub title="Governance"              description="Active proposals, voting power, treasury balances."                              icon={Vote} />} />
          <Route path="/portfolio"     element={<Portfolio />} />
          <Route path="/productivity"  element={<PageStub title="Productivity Suite"      description="Tasks, notes, Pomodoro timer, trade journal, market calendar."                  icon={Timer} />} />
          <Route path="/devtools"      element={<PageStub title="Developer Tools"         description="JSON formatter, Base64, regex tester, hash generator, JWT decoder."             icon={Wrench} />} />
          <Route path="*"              element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
});
DataLoaderShell.displayName = 'DataLoaderShell';

// ─── App ──────────────────────────────────────────────────────────────────────

const App = memo(() => (
  <ThemeProvider
    attribute="class"
    defaultTheme="dark"
    enableSystem={false}
    disableTransitionOnChange={false}
  >
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CryptoProvider>
          {/* PWAInstallProvider — push78: wraps app so Topbar + Banner share one context */}
          <PWAInstallProvider>
            <Toaster />
            <Sonner />
            {/* push107: Global offline/reconnected indicator */}
            <OfflineIndicator />
            <BrowserRouter>
              <Suspense fallback={null}>
                <Routes>
                  <Route path="/"  element={<Portal />} />
                  <Route path="/*" element={<DataLoaderShell />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </PWAInstallProvider>
        </CryptoProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
));
App.displayName = 'App';

export default App;
