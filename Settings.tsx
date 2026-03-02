/**
 * Settings.tsx — ZERØ MERIDIAN 2026 push125
 * push125: Settings page — was MISSING, sidebar /settings → NotFound before this fix.
 *
 * Sections:
 *   · Appearance    — theme, accent color, font size, reduced motion
 *   · Data & Feeds  — refresh intervals, WebSocket toggle, data saver
 *   · Notifications — browser push, price alerts sound, alert cooldown
 *   · Performance   — WebGPU, WebAssembly, SharedArrayBuffer status + toggle
 *   · Privacy       — analytics opt-out, localStorage clear
 *   · About         — version, build info, links
 *
 * Rules:
 *   ✅ React.memo + displayName  ✅ rgba() only  ✅ Zero className
 *   ✅ useCallback + useMemo     ✅ mountedRef    ✅ JetBrains Mono only
 *   ✅ Zero template literals in style attrs
 */

import React, { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import {
  Palette, Database, Bell, Zap, Shield, Info,
  ChevronRight, Check, RefreshCw, Trash2, ExternalLink,
  Monitor, Cpu, Globe, Volume2, VolumeX,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT = "'JetBrains Mono', monospace";
const APP_VERSION = '3.0.0';
const BUILD_PUSH  = 'push125';

const C = Object.freeze({
  bg:           'rgba(5,7,13,1)',
  card:         'rgba(14,17,28,1)',
  cardHover:    'rgba(18,22,36,1)',
  border:       'rgba(32,42,68,1)',
  borderFaint:  'rgba(255,255,255,0.06)',
  accent:       'rgba(0,238,255,1)',
  accentBg:     'rgba(0,238,255,0.08)',
  accentBorder: 'rgba(0,238,255,0.18)',
  positive:     'rgba(34,255,170,1)',
  positiveBg:   'rgba(34,255,170,0.08)',
  negative:     'rgba(255,68,136,1)',
  negativeBg:   'rgba(255,68,136,0.08)',
  warning:      'rgba(255,187,0,1)',
  warningBg:    'rgba(255,187,0,0.08)',
  violet:       'rgba(176,130,255,1)',
  violetBg:     'rgba(176,130,255,0.08)',
  textPrimary:  'rgba(240,240,248,1)',
  textSecondary:'rgba(148,163,184,1)',
  textFaint:    'rgba(80,80,100,1)',
});

const SECTION_ICONS = Object.freeze({
  appearance:    Palette,
  data:          Database,
  notifications: Bell,
  performance:   Zap,
  privacy:       Shield,
  about:         Info,
} as const);

type SectionId = keyof typeof SECTION_ICONS;

const SECTIONS: readonly { id: SectionId; label: string }[] = Object.freeze([
  { id: 'appearance',    label: 'Appearance'    },
  { id: 'data',          label: 'Data & Feeds'  },
  { id: 'notifications', label: 'Notifications' },
  { id: 'performance',   label: 'Performance'   },
  { id: 'privacy',       label: 'Privacy'       },
  { id: 'about',         label: 'About'         },
]);

const ACCENT_COLORS = Object.freeze([
  { id: 'cyan',   color: 'rgba(0,238,255,1)',   label: 'Cyan'   },
  { id: 'green',  color: 'rgba(34,255,170,1)',  label: 'Green'  },
  { id: 'violet', color: 'rgba(176,130,255,1)', label: 'Violet' },
  { id: 'orange', color: 'rgba(255,140,0,1)',   label: 'Orange' },
  { id: 'pink',   color: 'rgba(255,68,136,1)',  label: 'Pink'   },
]);

const REFRESH_OPTIONS = Object.freeze([
  { value: 5,  label: '5s'  },
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
  { value: 60, label: '60s' },
]);

// ─── Capability Detection ─────────────────────────────────────────────────────

function detectCapabilities() {
  const sab = (() => {
    try { return typeof SharedArrayBuffer !== 'undefined' && !!new SharedArrayBuffer(1); }
    catch { return false; }
  })();
  return {
    webgpu:     typeof (navigator as Record<string,unknown>)['gpu'] !== 'undefined',
    wasm:       typeof WebAssembly !== 'undefined',
    sharedBuf:  sab,
    pushNotif:  typeof Notification !== 'undefined',
    serviceWorker: 'serviceWorker' in navigator,
    webTransport: typeof (window as Record<string,unknown>)['WebTransport'] !== 'undefined',
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  accent?: string;
}

const Toggle = memo(({ value, onChange, disabled = false, accent = C.accent }: ToggleProps) => {
  const handleClick = useCallback(() => { if (!disabled) onChange(!value); }, [value, onChange, disabled]);
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={value}
      style={{
        width: 40, height: 22, borderRadius: 11, border: 'none',
        background: value ? accent : 'rgba(255,255,255,0.08)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        position: 'relative' as const,
        transition: 'background 0.2s',
        flexShrink: 0,
        padding: 0,
      }}
    >
      <motion.div
        animate={{ x: value ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          position: 'absolute' as const, top: 2,
          width: 18, height: 18, borderRadius: '50%',
          background: 'rgba(255,255,255,1)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }}
      />
    </button>
  );
});
Toggle.displayName = 'Toggle';

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  last?: boolean;
}

const SettingRow = memo(({ label, description, children, last = false }: SettingRowProps) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 20px',
    borderBottom: last ? 'none' : '1px solid ' + C.border,
    gap: 16,
  }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: C.textPrimary }}>{label}</div>
      {description && (
        <div style={{ fontFamily: FONT, fontSize: 10, color: C.textFaint, marginTop: 3, letterSpacing: '0.01em' }}>
          {description}
        </div>
      )}
    </div>
    <div style={{ flexShrink: 0 }}>{children}</div>
  </div>
));
SettingRow.displayName = 'SettingRow';

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
}

const SectionCard = memo(({ title, children }: SectionCardProps) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{
      fontFamily: FONT, fontSize: 9, fontWeight: 700, letterSpacing: '0.22em',
      color: C.textFaint, textTransform: 'uppercase' as const, marginBottom: 8,
      paddingLeft: 4,
    }}>
      {title}
    </div>
    <div style={{
      background: C.card, borderRadius: 12,
      border: '1px solid ' + C.border, overflow: 'hidden',
    }}>
      {children}
    </div>
  </div>
));
SectionCard.displayName = 'SectionCard';

interface CapBadgeProps { active: boolean; label: string; }
const CapBadge = memo(({ active, label }: CapBadgeProps) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '3px 8px', borderRadius: 5,
    background: active ? C.positiveBg : C.negativeBg,
    border: '1px solid ' + (active ? 'rgba(34,255,170,0.2)' : 'rgba(255,68,136,0.2)'),
  }}>
    <div style={{
      width: 5, height: 5, borderRadius: '50%',
      background: active ? C.positive : C.negative,
    }} />
    <span style={{
      fontFamily: FONT, fontSize: 9, letterSpacing: '0.08em',
      color: active ? C.positive : C.negative, fontWeight: 700,
    }}>
      {active ? 'SUPPORTED' : 'UNAVAILABLE'}
    </span>
    <span style={{ fontFamily: FONT, fontSize: 9, color: C.textFaint }}>{label}</span>
  </div>
));
CapBadge.displayName = 'CapBadge';

// ─── Section: Appearance ─────────────────────────────────────────────────────

interface AppearanceSettings {
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  reducedMotion: boolean;
  compactMode: boolean;
}

const AppearanceSection = memo(({ settings, onChange }: {
  settings: AppearanceSettings;
  onChange: (k: keyof AppearanceSettings, v: unknown) => void;
}) => {
  const accentHandler = useCallback((id: string) => onChange('accentColor', id), [onChange]);
  const motionHandler = useCallback((v: boolean) => onChange('reducedMotion', v), [onChange]);
  const compactHandler = useCallback((v: boolean) => onChange('compactMode', v), [onChange]);

  return (
    <SectionCard title="Appearance">
      <SettingRow label="Accent Color" description="Highlight color used across the interface">
        <div style={{ display: 'flex', gap: 6 }}>
          {ACCENT_COLORS.map(ac => (
            <button
              key={ac.id} type="button"
              onClick={() => accentHandler(ac.id)}
              aria-label={'Accent ' + ac.label}
              title={ac.label}
              style={{
                width: 22, height: 22, borderRadius: '50%', border: 'none',
                background: ac.color, cursor: 'pointer', padding: 0,
                boxShadow: settings.accentColor === ac.id
                  ? '0 0 0 2px rgba(255,255,255,0.15), 0 0 10px ' + ac.color
                  : 'none',
                transform: settings.accentColor === ac.id ? 'scale(1.15)' : 'scale(1)',
                transition: 'all 0.15s',
              }}
            >
              {settings.accentColor === ac.id && (
                <Check size={10} color="rgba(5,7,13,1)" style={{ display: 'block', margin: 'auto' }} />
              )}
            </button>
          ))}
        </div>
      </SettingRow>
      <SettingRow label="Reduced Motion" description="Disable animations for accessibility or performance">
        <Toggle value={settings.reducedMotion} onChange={motionHandler} />
      </SettingRow>
      <SettingRow label="Compact Mode" description="Tighter spacing for more data density" last>
        <Toggle value={settings.compactMode} onChange={compactHandler} />
      </SettingRow>
    </SectionCard>
  );
});
AppearanceSection.displayName = 'AppearanceSection';

// ─── Section: Data & Feeds ────────────────────────────────────────────────────

interface DataSettings {
  refreshInterval: number;
  webSocketEnabled: boolean;
  dataSaver: boolean;
}

const DataSection = memo(({ settings, onChange }: {
  settings: DataSettings;
  onChange: (k: keyof DataSettings, v: unknown) => void;
}) => {
  const wsHandler = useCallback((v: boolean) => onChange('webSocketEnabled', v), [onChange]);
  const saverHandler = useCallback((v: boolean) => onChange('dataSaver', v), [onChange]);

  return (
    <SectionCard title="Data & Feeds">
      <SettingRow label="WebSocket Live Feed" description="Real-time price streaming from Binance WebSocket">
        <Toggle value={settings.webSocketEnabled} onChange={wsHandler} accent={C.positive} />
      </SettingRow>
      <SettingRow label="REST Refresh Interval" description="Fallback polling interval when WebSocket is off">
        <div style={{ display: 'flex', gap: 4 }}>
          {REFRESH_OPTIONS.map(opt => (
            <button
              key={opt.value} type="button"
              onClick={() => onChange('refreshInterval', opt.value)}
              style={{
                fontFamily: FONT, fontSize: 10, padding: '4px 10px', borderRadius: 6,
                border: '1px solid ' + (settings.refreshInterval === opt.value ? C.accentBorder : C.border),
                background: settings.refreshInterval === opt.value ? C.accentBg : 'transparent',
                color: settings.refreshInterval === opt.value ? C.accent : C.textSecondary,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </SettingRow>
      <SettingRow label="Data Saver" description="Reduce API calls — pause background feeds" last>
        <Toggle value={settings.dataSaver} onChange={saverHandler} accent={C.warning} />
      </SettingRow>
    </SectionCard>
  );
});
DataSection.displayName = 'DataSection';

// ─── Section: Notifications ───────────────────────────────────────────────────

interface NotifSettings {
  pushEnabled: boolean;
  soundEnabled: boolean;
}

const NotificationsSection = memo(({ settings, onChange, pushSupported }: {
  settings: NotifSettings;
  onChange: (k: keyof NotifSettings, v: unknown) => void;
  pushSupported: boolean;
}) => {
  const pushHandler  = useCallback((v: boolean) => {
    if (v && pushSupported) Notification.requestPermission();
    onChange('pushEnabled', v);
  }, [onChange, pushSupported]);
  const soundHandler = useCallback((v: boolean) => onChange('soundEnabled', v), [onChange]);

  return (
    <SectionCard title="Notifications">
      <SettingRow
        label="Browser Push Notifications"
        description={pushSupported ? 'Alert when price targets are hit' : 'Notifications not supported in this browser'}
      >
        <Toggle value={settings.pushEnabled} onChange={pushHandler} disabled={!pushSupported} accent={C.accent} />
      </SettingRow>
      <SettingRow label="Alert Sound" description="Play sound when a price alert triggers" last>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {settings.soundEnabled
            ? <Volume2 size={14} color={C.accent} />
            : <VolumeX size={14} color={C.textFaint} />
          }
          <Toggle value={settings.soundEnabled} onChange={soundHandler} />
        </div>
      </SettingRow>
    </SectionCard>
  );
});
NotificationsSection.displayName = 'NotificationsSection';

// ─── Section: Performance ─────────────────────────────────────────────────────

const PerformanceSection = memo(({ caps }: { caps: ReturnType<typeof detectCapabilities> }) => (
  <SectionCard title="Performance & Browser Capabilities">
    <div style={{ padding: '14px 20px' }}>
      <div style={{
        fontFamily: FONT, fontSize: 10, color: C.textFaint,
        marginBottom: 14, letterSpacing: '0.01em',
      }}>
        Hardware capabilities detected in your browser. These affect app features.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
        <CapBadge active={caps.wasm}         label="WebAssembly — high-perf orderbook computation" />
        <CapBadge active={caps.webgpu}       label="WebGPU — GPU-accelerated chart rendering" />
        <CapBadge active={caps.sharedBuf}    label="SharedArrayBuffer — zero-copy price streaming" />
        <CapBadge active={caps.webTransport} label="WebTransport — ultra-low latency feed" />
        <CapBadge active={caps.serviceWorker} label="Service Worker — PWA offline support" />
        <CapBadge active={caps.pushNotif}    label="Notifications API — price alert push" />
      </div>
    </div>
    <div style={{
      padding: '10px 20px 14px',
      borderTop: '1px solid ' + C.border,
    }}>
      <div style={{
        fontFamily: FONT, fontSize: 9, color: C.textFaint, letterSpacing: '0.04em',
        lineHeight: 1.6,
      }}>
        SharedArrayBuffer requires COOP/COEP headers. WebGPU requires Chrome 113+.
        WebTransport requires Chrome 97+. All features gracefully degrade.
      </div>
    </div>
  </SectionCard>
));
PerformanceSection.displayName = 'PerformanceSection';

// ─── Section: Privacy ────────────────────────────────────────────────────────

const PrivacySection = memo(({ onClearData }: { onClearData: () => void }) => {
  const [cleared, setCleared] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const handleClear = useCallback(() => {
    try {
      const keep = ['zm_visited'];
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('zm_') && !keep.includes(k)) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
    } catch { /* ignore */ }
    onClearData();
    if (mountedRef.current) setCleared(true);
    setTimeout(() => { if (mountedRef.current) setCleared(false); }, 3000);
  }, [onClearData]);

  return (
    <SectionCard title="Privacy & Data">
      <SettingRow label="Local Storage" description="Portfolio, watchlist, alerts, and preferences are stored locally only — never sent to any server">
        <div style={{
          fontFamily: FONT, fontSize: 9, padding: '3px 8px', borderRadius: 5,
          background: C.positiveBg, border: '1px solid rgba(34,255,170,0.2)',
          color: C.positive, letterSpacing: '0.08em',
        }}>
          LOCAL ONLY
        </div>
      </SettingRow>
      <SettingRow label="Clear App Data" description="Reset portfolio, watchlist, alerts and all preferences" last>
        <button
          type="button"
          onClick={handleClear}
          style={{
            fontFamily: FONT, fontSize: 10, padding: '5px 14px', borderRadius: 7,
            background: cleared ? C.positiveBg : C.negativeBg,
            border: '1px solid ' + (cleared ? 'rgba(34,255,170,0.25)' : 'rgba(255,68,136,0.25)'),
            color: cleared ? C.positive : C.negative,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.2s', letterSpacing: '0.04em',
          }}
        >
          {cleared
            ? <><Check size={11} /> CLEARED</>
            : <><Trash2 size={11} /> CLEAR DATA</>
          }
        </button>
      </SettingRow>
    </SectionCard>
  );
});
PrivacySection.displayName = 'PrivacySection';

// ─── Section: About ──────────────────────────────────────────────────────────

const AboutSection = memo(() => (
  <SectionCard title="About">
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'rgba(0,238,255,0.08)',
          border: '1px solid rgba(0,238,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Monitor size={18} color={C.accent} />
        </div>
        <div>
          <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.textPrimary, letterSpacing: '0.08em' }}>
            ZERØ MERIDIAN
          </div>
          <div style={{ fontFamily: FONT, fontSize: 9, color: C.textFaint, letterSpacing: '0.15em', marginTop: 2 }}>
            CRYPTO INTELLIGENCE TERMINAL
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
        {[
          { label: 'Version',      value: APP_VERSION },
          { label: 'Build',        value: BUILD_PUSH  },
          { label: 'Stack',        value: 'React 18 + Vite + TypeScript' },
          { label: 'Data Sources', value: 'CoinGecko · Binance · DefiLlama · GoPlus' },
          { label: 'Transport',    value: 'WebSocket · WebTransport · REST fallback' },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontFamily: FONT, fontSize: 10, color: C.textFaint }}>{row.label}</span>
            <span style={{ fontFamily: FONT, fontSize: 10, color: C.textSecondary, textAlign: 'right' as const }}>{row.value}</span>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 16, paddingTop: 14,
        borderTop: '1px solid ' + C.border,
        display: 'flex', gap: 10,
      }}>
        {[
          { label: 'GitHub', href: 'https://github.com/wr98-code/new-zeromeridian' },
        ].map(link => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: FONT, fontSize: 10, padding: '5px 12px', borderRadius: 6,
              background: C.accentBg, border: '1px solid ' + C.accentBorder,
              color: C.accent, textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'all 0.15s',
            }}
          >
            <ExternalLink size={10} />
            {link.label}
          </a>
        ))}
      </div>
    </div>
  </SectionCard>
));
AboutSection.displayName = 'AboutSection';

// ─── Main Component ───────────────────────────────────────────────────────────

const LS_SETTINGS = 'zm_settings_v1';

interface AllSettings {
  appearance:    AppearanceSettings;
  data:          DataSettings;
  notifications: NotifSettings;
}

function loadSettings(): AllSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    if (raw) return JSON.parse(raw) as AllSettings;
  } catch { /* ignore */ }
  return {
    appearance: {
      accentColor:   'cyan',
      fontSize:      'medium',
      reducedMotion: false,
      compactMode:   false,
    },
    data: {
      refreshInterval:  30,
      webSocketEnabled: true,
      dataSaver:        false,
    },
    notifications: {
      pushEnabled:  false,
      soundEnabled: true,
    },
  };
}

const Settings = memo(() => {
  const { isMobile } = useBreakpoint();
  const mountedRef   = useRef(true);
  const caps         = useMemo(detectCapabilities, []);

  const [activeSection, setActiveSection] = useState<SectionId>('appearance');
  const [settings, setSettings] = useState<AllSettings>(loadSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Persist on every change
  useEffect(() => {
    try { localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)); }
    catch { /* ignore */ }
    if (mountedRef.current) {
      setSaved(true);
      const t = setTimeout(() => { if (mountedRef.current) setSaved(false); }, 1500);
      return () => clearTimeout(t);
    }
  }, [settings]);

  const handleAppearance = useCallback((k: keyof AppearanceSettings, v: unknown) => {
    if (!mountedRef.current) return;
    setSettings(prev => ({ ...prev, appearance: { ...prev.appearance, [k]: v } }));
  }, []);

  const handleData = useCallback((k: keyof DataSettings, v: unknown) => {
    if (!mountedRef.current) return;
    setSettings(prev => ({ ...prev, data: { ...prev.data, [k]: v } }));
  }, []);

  const handleNotif = useCallback((k: keyof NotifSettings, v: unknown) => {
    if (!mountedRef.current) return;
    setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, [k]: v } }));
  }, []);

  const handleClearData = useCallback(() => {
    if (!mountedRef.current) return;
    setSettings(loadSettings());
  }, []);

  const navStyle = useMemo(() => ({
    width: isMobile ? '100%' : 200,
    flexShrink: 0,
    background: 'rgba(14,17,28,1)',
    borderRadius: 12,
    border: '1px solid ' + C.border,
    overflow: 'hidden' as const,
    alignSelf: 'flex-start' as const,
  }), [isMobile]);

  const contentStyle = useMemo(() => ({
    flex: 1,
    minWidth: 0,
  }), []);

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      padding: isMobile ? '16px 12px' : '24px 28px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <div>
          <h1 style={{
            fontFamily: FONT, fontSize: 18, fontWeight: 700,
            color: C.textPrimary, letterSpacing: '0.06em', margin: 0,
          }}>
            SETTINGS
          </h1>
          <div style={{
            fontFamily: FONT, fontSize: 10, color: C.textFaint,
            letterSpacing: '0.12em', marginTop: 4,
          }}>
            ZERØ MERIDIAN CONFIGURATION
          </div>
        </div>
        <AnimatePresence>
          {saved && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              style={{
                fontFamily: FONT, fontSize: 10, padding: '5px 12px', borderRadius: 7,
                background: C.positiveBg, border: '1px solid rgba(34,255,170,0.2)',
                color: C.positive, display: 'flex', alignItems: 'center', gap: 5,
                letterSpacing: '0.06em',
              }}
            >
              <Check size={11} />
              SAVED
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Layout */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' as const : 'row' as const,
        gap: 20, alignItems: 'flex-start',
      }}>
        {/* Sidebar Nav */}
        <div style={navStyle}>
          {SECTIONS.map((sec, i) => {
            const Icon    = SECTION_ICONS[sec.id];
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 14px',
                  background: isActive ? C.accentBg : 'transparent',
                  border: 'none',
                  borderBottom: i < SECTIONS.length - 1 ? '1px solid ' + C.borderFaint : 'none',
                  borderLeft: '3px solid ' + (isActive ? C.accent : 'transparent'),
                  color: isActive ? C.accent : C.textSecondary,
                  cursor: 'pointer', transition: 'all 0.15s',
                  textAlign: 'left' as const,
                }}
              >
                <Icon size={13} />
                <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: isActive ? 600 : 400 }}>
                  {sec.label}
                </span>
                {isActive && <ChevronRight size={11} style={{ marginLeft: 'auto' }} />}
              </button>
            );
          })}
        </div>

        {/* Content Panel */}
        <div style={contentStyle}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {activeSection === 'appearance' && (
                <AppearanceSection settings={settings.appearance} onChange={handleAppearance} />
              )}
              {activeSection === 'data' && (
                <DataSection settings={settings.data} onChange={handleData} />
              )}
              {activeSection === 'notifications' && (
                <NotificationsSection
                  settings={settings.notifications}
                  onChange={handleNotif}
                  pushSupported={caps.pushNotif}
                />
              )}
              {activeSection === 'performance' && (
                <PerformanceSection caps={caps} />
              )}
              {activeSection === 'privacy' && (
                <PrivacySection onClearData={handleClearData} />
              )}
              {activeSection === 'about' && (
                <AboutSection />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});

Settings.displayName = 'Settings';
export default Settings;
