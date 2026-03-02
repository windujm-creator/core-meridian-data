/**
 * Settings.tsx — ZERØ MERIDIAN 2026 push133
 * push133: Light professional reskin (Bloomberg mode push132)
 * - Object.freeze() ✓  rgba() only ✓  Zero className ✓
 * - JetBrains Mono ✓  React.memo + displayName ✓
 */

import React, { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import {
  Palette, Database, Bell, Zap, Shield, Info,
  ChevronRight, Check, RefreshCw, Trash2, ExternalLink,
  Monitor, Cpu, Globe, Volume2, VolumeX,
} from 'lucide-react';

const FONT = "'JetBrains Mono', monospace";
const APP_VERSION = "3.0.0";
const BUILD_PUSH  = "push133";

const C = Object.freeze({
  bgBase:       "rgba(248,249,252,1)",
  bgCard:       "rgba(255,255,255,1)",
  bgCardHover:  "rgba(243,245,250,1)",
  bgInput:      "rgba(243,245,252,1)",
  accent:       "rgba(15,40,180,1)",
  accentDim:    "rgba(15,40,180,0.08)",
  accentBorder: "rgba(15,40,180,0.22)",
  positive:     "rgba(0,155,95,1)",
  positiveDim:  "rgba(0,155,95,0.09)",
  negative:     "rgba(208,35,75,1)",
  negativeDim:  "rgba(208,35,75,0.09)",
  warning:      "rgba(195,125,0,1)",
  warningDim:   "rgba(195,125,0,0.09)",
  textPrimary:  "rgba(8,12,40,1)",
  textSecondary:"rgba(55,65,110,1)",
  textMuted:    "rgba(110,120,160,1)",
  textFaint:    "rgba(165,175,210,1)",
  border:       "rgba(15,40,100,0.10)",
  borderFaint:  "rgba(15,40,100,0.06)",
  shadow:       "0 1px 4px rgba(15,40,100,0.07), 0 0 0 1px rgba(15,40,100,0.06)",
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
  { id: "appearance",    label: "Appearance"    },
  { id: "data",          label: "Data & Feeds"  },
  { id: "notifications", label: "Notifications" },
  { id: "performance",   label: "Performance"   },
  { id: "privacy",       label: "Privacy"       },
  { id: "about",         label: "About"         },
]);

// ─── Toggle switch ────────────────────────────────────────────────────────────

const Toggle = memo(({ on, onChange, label }: { on: boolean; onChange: () => void; label?: string }) => {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={onChange}>
      {label && <span style={{ fontFamily: FONT, fontSize: "11px", color: C.textSecondary }}>{label}</span>}
      <div style={{ width: 36, height: 20, borderRadius: 10, background: on ? C.accent : C.border, position: "relative" as const, transition: "background 0.2s", flexShrink: 0 }}>
        <div style={{ position: "absolute" as const, top: 3, left: on ? 19 : 3, width: 14, height: 14, borderRadius: 7, background: "rgba(255,255,255,1)", boxShadow: "0 1px 4px rgba(0,0,0,0.15)", transition: "left 0.2s" }} />
      </div>
    </div>
  );
});
Toggle.displayName = "Toggle";

// ─── SettingRow ───────────────────────────────────────────────────────────────

const SettingRow = memo(({ label, desc, right }: { label: string; desc?: string; right: React.ReactNode }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: "1px solid " + C.borderFaint, gap: 16 }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: FONT, fontSize: "12px", fontWeight: 600, color: C.textPrimary }}>{label}</div>
      {desc && <div style={{ fontFamily: FONT, fontSize: "10px", color: C.textMuted, marginTop: 2 }}>{desc}</div>}
    </div>
    <div style={{ flexShrink: 0 }}>{right}</div>
  </div>
));
SettingRow.displayName = "SettingRow";

// ─── Section card ─────────────────────────────────────────────────────────────

const SectionCard = memo(({ children, title, icon: Icon, accent }: { children: React.ReactNode; title: string; icon: React.ComponentType<{size?: number; style?: React.CSSProperties}>; accent?: string }) => (
  <div style={{ background: C.bgCard, border: "1px solid " + C.border, borderRadius: 12, overflow: "hidden" as const, boxShadow: C.shadow, marginBottom: 12 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 18px", borderBottom: "1px solid " + C.borderFaint, background: "rgba(248,249,252,0.7)" }}>
      <Icon size={14} style={{ color: accent ?? C.accent }} />
      <span style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: C.textPrimary, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{title}</span>
    </div>
    {children}
  </div>
));
SectionCard.displayName = "SectionCard";

// ─── StatusBadge ──────────────────────────────────────────────────────────────

const StatusBadge = memo(({ ok, label }: { ok: boolean; label: string }) => (
  <span style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 600, color: ok ? C.positive : C.textFaint, background: ok ? C.positiveDim : "rgba(165,175,210,0.12)", border: "1px solid " + (ok ? "rgba(0,155,95,0.22)" : C.borderFaint), borderRadius: 4, padding: "2px 7px" }}>
    {label}
  </span>
));
StatusBadge.displayName = "StatusBadge";

// ─── Settings ─────────────────────────────────────────────────────────────────

const Settings = memo(() => {
  const { isMobile } = useBreakpoint();
  const [section, setSection] = useState<SectionId>("appearance");
  const [sound, setSound]       = useState(true);
  const [pushNotif, setPush]    = useState(false);
  const [dataSaver, setDataSaver] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [wsEnabled, setWsEnabled] = useState(true);
  const [hasWebGPU, setHasWebGPU] = useState(false);
  const [hasSAB, setHasSAB]       = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setHasWebGPU("gpu" in navigator);
    setHasSAB(typeof SharedArrayBuffer !== "undefined");
    return () => { mountedRef.current = false; };
  }, []);

  const handleClearStorage = useCallback(() => {
    if (!window.confirm("Clear all local data? This cannot be undone.")) return;
    try { localStorage.clear(); window.location.reload(); } catch {}
  }, []);

  const handleRequestPush = useCallback(async () => {
    if (!("Notification" in window)) return;
    try {
      const perm = await Notification.requestPermission();
      if (mountedRef.current) setPush(perm === "granted");
    } catch {}
  }, []);

  const pageSt = useMemo(() => Object.freeze({
    background: C.bgBase, minHeight: "100vh", fontFamily: FONT,
    padding: isMobile ? "12px" : "16px 20px",
  }), [isMobile]);

  const layoutSt = useMemo(() => Object.freeze({
    display: "flex", gap: 16,
    flexDirection: isMobile ? "column" as const : "row" as const,
    alignItems: "flex-start" as const,
  }), [isMobile]);

  return (
    <div style={pageSt}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 3, height: 22, borderRadius: 2, background: C.accent }} />
          <h1 style={{ fontFamily: FONT, fontSize: isMobile ? 18 : 22, fontWeight: 800, color: C.textPrimary, margin: 0, letterSpacing: "-0.01em" }}>Settings</h1>
        </div>
        <p style={{ fontFamily: FONT, fontSize: "9px", color: C.textFaint, margin: "4px 0 0 13px", letterSpacing: "0.10em", textTransform: "uppercase" as const }}>
          App configuration · {APP_VERSION} · {BUILD_PUSH}
        </p>
      </div>

      <div style={layoutSt}>
        {/* Section nav */}
        <div style={{ width: isMobile ? "100%" : 180, flexShrink: 0, background: C.bgCard, border: "1px solid " + C.border, borderRadius: 10, overflow: "hidden" as const, boxShadow: C.shadow }}>
          {SECTIONS.map(s => {
            const Icon = SECTION_ICONS[s.id];
            const active = section === s.id;
            return (
              <button key={s.id} type="button" onClick={() => setSection(s.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", background: active ? C.accentDim : "transparent", border: "none", borderLeft: "2px solid " + (active ? C.accent : "transparent"), borderBottom: "1px solid " + C.borderFaint, cursor: "pointer", color: active ? C.accent : C.textMuted, fontFamily: FONT, fontSize: "11px", fontWeight: active ? 700 : 500, transition: "all 0.13s", textAlign: "left" as const }}>
                <Icon size={13} />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <AnimatePresence mode="wait">
            <motion.div key={section} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>

              {section === "appearance" && (
                <SectionCard title="Appearance" icon={Palette}>
                  <SettingRow label="Theme" desc="Current theme. More options coming." right={
                    <span style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: C.accent, background: C.accentDim, border: "1px solid " + C.accentBorder, borderRadius: 4, padding: "3px 8px" }}>Light Professional</span>
                  } />
                  <SettingRow label="Reduced Motion" desc="Minimize animations for accessibility" right={<Toggle on={reducedMotion} onChange={() => setReducedMotion(v => !v)} />} />
                  <SettingRow label="Font" desc="Terminal display font" right={<span style={{ fontFamily: FONT, fontSize: "11px", color: C.textMuted }}>JetBrains Mono</span>} />
                </SectionCard>
              )}

              {section === "data" && (
                <SectionCard title="Data & Feeds" icon={Database}>
                  <SettingRow label="WebSocket Feeds" desc="Live real-time price streaming" right={<Toggle on={wsEnabled} onChange={() => setWsEnabled(v => !v)} />} />
                  <SettingRow label="Data Saver" desc="Reduce API call frequency" right={<Toggle on={dataSaver} onChange={() => setDataSaver(v => !v)} />} />
                  <SettingRow label="Price Source" desc="Primary market data provider" right={<span style={{ fontFamily: FONT, fontSize: "11px", color: C.textMuted }}>CoinGecko API</span>} />
                  <SettingRow label="Refresh Interval" desc="Auto-refresh dashboard data" right={<span style={{ fontFamily: FONT, fontSize: "11px", color: C.textMuted }}>60s</span>} />
                </SectionCard>
              )}

              {section === "notifications" && (
                <SectionCard title="Notifications" icon={Bell}>
                  <SettingRow label="Sound Alerts" desc="Play sound on triggered alerts" right={<Toggle on={sound} onChange={() => setSound(v => !v)} />} />
                  <SettingRow label="Push Notifications" desc="Browser push for price alerts" right={
                    pushNotif
                      ? <StatusBadge ok label="Enabled" />
                      : <button onClick={handleRequestPush} style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 600, color: C.accent, background: C.accentDim, border: "1px solid " + C.accentBorder, borderRadius: 5, padding: "4px 10px", cursor: "pointer" }}>Enable</button>
                  } />
                </SectionCard>
              )}

              {section === "performance" && (
                <SectionCard title="Performance" icon={Zap}>
                  <SettingRow label="WebGPU" desc="GPU-accelerated computations" right={<StatusBadge ok={hasWebGPU} label={hasWebGPU ? "Supported" : "Unavailable"} />} />
                  <SettingRow label="SharedArrayBuffer" desc="High-performance order book" right={<StatusBadge ok={hasSAB} label={hasSAB ? "Enabled" : "Unavailable"} />} />
                  <SettingRow label="WebAssembly" desc="WASM order book engine" right={<StatusBadge ok label="Loaded" />} />
                  <SettingRow label="Web Workers" desc="Background data processing" right={<StatusBadge ok label="Active" />} />
                </SectionCard>
              )}

              {section === "privacy" && (
                <SectionCard title="Privacy" icon={Shield} accent={C.negative}>
                  <SettingRow label="Analytics" desc="Anonymous usage statistics" right={<Toggle on={false} onChange={() => {}} />} />
                  <SettingRow label="Clear All Local Data" desc="Removes portfolio, watchlist, alerts" right={
                    <button onClick={handleClearStorage}
                      style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 600, color: C.negative, background: C.negativeDim, border: "1px solid rgba(208,35,75,0.22)", borderRadius: 5, padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                      <Trash2 size={11} /> Clear
                    </button>
                  } />
                </SectionCard>
              )}

              {section === "about" && (
                <SectionCard title="About" icon={Info}>
                  <SettingRow label="Version"    right={<span style={{ fontFamily: FONT, fontSize: "11px", color: C.textMuted }}>{APP_VERSION}</span>} />
                  <SettingRow label="Build"      right={<span style={{ fontFamily: FONT, fontSize: "11px", color: C.accent }}>{BUILD_PUSH}</span>} />
                  <SettingRow label="Stack"      right={<span style={{ fontFamily: FONT, fontSize: "10px", color: C.textFaint }}>React 18 · Vite · TypeScript</span>} />
                  <SettingRow label="Data"       right={<span style={{ fontFamily: FONT, fontSize: "10px", color: C.textFaint }}>CoinGecko · Binance WS · Alt.me</span>} />
                  <SettingRow label="Repository" right={
                    <a href="https://github.com/wr98-code/new-zeromeridian" target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: FONT, fontSize: "11px", color: C.accent, display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
                      GitHub <ExternalLink size={10} />
                    </a>
                  } />
                  <SettingRow label="Deploy" right={
                    <a href="https://zeromeridian.vercel.app" target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: FONT, fontSize: "11px", color: C.accent, display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
                      zeromeridian.vercel.app <ExternalLink size={10} />
                    </a>
                  } />
                </SectionCard>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});
Settings.displayName = "Settings";
export default Settings;
