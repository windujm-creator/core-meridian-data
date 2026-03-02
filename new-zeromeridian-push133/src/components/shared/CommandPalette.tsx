/**
 * CommandPalette.tsx — ZERØ MERIDIAN v30
 * Bloomberg-style command palette — Ctrl/Cmd + K
 */

import React, { memo, useCallback, useEffect, useRef } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandPaletteProps {
  open:    boolean;
  onClose: () => void;
}

const COMMANDS = [
  { group: 'Navigate',     label: 'Dashboard',     path: '/dashboard',   kbd: '1' },
  { group: 'Navigate',     label: 'Markets',        path: '/markets',     kbd: '2' },
  { group: 'Navigate',     label: 'Order Book',     path: '/orderbook',   kbd: '3' },
  { group: 'Navigate',     label: 'Charts',         path: '/charts',      kbd: '4' },
  { group: 'Navigate',     label: 'Watchlist',      path: '/watchlist',   kbd: '5' },
  { group: 'Navigate',     label: 'Portfolio',      path: '/portfolio',   kbd: '' },
  { group: 'Navigate',     label: 'Alerts',         path: '/alerts',      kbd: '' },
  { group: 'Analytics',    label: 'DeFi',           path: '/defi',        kbd: '' },
  { group: 'Analytics',    label: 'On-Chain',       path: '/onchain',     kbd: '' },
  { group: 'Analytics',    label: 'Derivatives',    path: '/derivatives', kbd: '' },
  { group: 'Analytics',    label: 'Fundamentals',   path: '/fundamentals',kbd: '' },
  { group: 'Analytics',    label: 'Tokens',         path: '/tokens',      kbd: '' },
  { group: 'Analytics',    label: 'Sentiment',      path: '/sentiment',   kbd: '' },
  { group: 'Intelligence', label: 'Smart Money',    path: '/smart-money', kbd: '' },
  { group: 'Intelligence', label: 'Networks',       path: '/networks',    kbd: '' },
  { group: 'Intelligence', label: 'Security',       path: '/security',    kbd: '' },
  { group: 'Intelligence', label: 'AI Signals',     path: '/ai-signals',  kbd: '' },
  { group: 'Tools',        label: 'Converter',      path: '/converter',   kbd: '' },
];

const CommandPalette = memo(({ open, onClose }: CommandPaletteProps) => {
  const navigate   = useNavigate();
  const inputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Keyboard shortcuts 1-5 for top pages
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      const cmd = COMMANDS.find(c => c.kbd && c.kbd === e.key);
      if (cmd && !e.metaKey && !e.ctrlKey && !e.altKey) {
        navigate(cmd.path);
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, navigate, onClose]);

  const handleSelect = useCallback((path: string) => {
    navigate(path);
    onClose();
  }, [navigate, onClose]);

  const groups = [...new Set(COMMANDS.map(c => c.group))];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              background: 'rgba(4,5,12,0.7)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: 'spring', stiffness: 500, damping: 36 }}
            style={{
              position: 'fixed',
              top: '15%',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 301,
              width: '100%',
              maxWidth: 560,
              background: 'var(--zm-sidebar-bg)',
              border: '1px solid var(--zm-border-strong)',
              borderRadius: 12,
              boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(79,127,255,0.1)',
              overflow: 'hidden',
            }}
          >
            <Command
              style={{ background: 'transparent' }}
              shouldFilter={true}
            >
              {/* Search input */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px',
                borderBottom: '1px solid var(--zm-border)',
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="6" cy="6" r="4.5" stroke="var(--zm-text-3)" strokeWidth="1.3"/>
                  <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="var(--zm-text-3)" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                <Command.Input
                  ref={inputRef}
                  placeholder="Search pages, features..."
                  style={{
                    flex: 1, background: 'transparent', border: 'none',
                    outline: 'none', color: 'var(--zm-text-1)',
                    fontFamily: 'var(--zm-font-ui)', fontSize: 14,
                  }}
                />
                <kbd style={{
                  fontFamily: 'var(--zm-font-data)', fontSize: 9,
                  padding: '2px 6px', borderRadius: 4,
                  background: 'var(--zm-surface)', border: '1px solid var(--zm-border-strong)',
                  color: 'var(--zm-text-3)',
                }}>ESC</kbd>
              </div>

              {/* Results */}
              <Command.List style={{ maxHeight: 380, overflowY: 'auto', padding: '8px' }}>
                <Command.Empty style={{
                  padding: '24px',
                  textAlign: 'center',
                  fontFamily: 'var(--zm-font-ui)',
                  fontSize: 13,
                  color: 'var(--zm-text-3)',
                }}>
                  No results found.
                </Command.Empty>

                {groups.map(group => (
                  <Command.Group
                    key={group}
                    heading={group}
                    style={{ marginBottom: 4 }}
                  >
                    <style>{`
                      [cmdk-group-heading] {
                        font-family: var(--zm-font-data);
                        font-size: 9px;
                        letter-spacing: 0.14em;
                        text-transform: uppercase;
                        color: var(--zm-text-3);
                        padding: 8px 8px 4px;
                      }
                      [cmdk-item] {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 8px 10px;
                        border-radius: 7px;
                        cursor: pointer;
                        font-family: var(--zm-font-ui);
                        font-size: 13px;
                        color: var(--zm-text-1);
                        transition: background 100ms ease;
                      }
                      [cmdk-item][aria-selected="true"],
                      [cmdk-item]:hover {
                        background: var(--zm-blue-bg);
                        color: var(--zm-blue);
                      }
                    `}</style>
                    {COMMANDS.filter(c => c.group === group).map(cmd => (
                      <Command.Item
                        key={cmd.path}
                        value={cmd.label}
                        onSelect={() => handleSelect(cmd.path)}
                      >
                        <span>{cmd.label}</span>
                        {cmd.kbd && (
                          <kbd style={{
                            fontFamily: 'var(--zm-font-data)', fontSize: 9,
                            padding: '1px 5px', borderRadius: 4,
                            background: 'var(--zm-surface)', border: '1px solid var(--zm-border-strong)',
                            color: 'var(--zm-text-3)',
                          }}>
                            {cmd.kbd}
                          </kbd>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>

              {/* Footer */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 16px',
                borderTop: '1px solid var(--zm-border)',
                fontFamily: 'var(--zm-font-data)',
                fontSize: 9, color: 'var(--zm-text-3)',
                letterSpacing: '0.06em',
              }}>
                <span>↑↓ navigate</span>
                <span>↵ select</span>
                <span>esc close</span>
                <span style={{ marginLeft: 'auto' }}>1–5 quick nav</span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

CommandPalette.displayName = 'CommandPalette';
export default CommandPalette;
