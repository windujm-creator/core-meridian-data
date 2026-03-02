/**
 * XLogo.tsx — ZERØ MERIDIAN push128
 * push128: Fix logo nggak blend sama dark background
 *   - Ganti base64 PNG → pakai /logo.png (public asset, sama kayak Portal.tsx)
 *   - Tambah mix-blend-mode: 'screen' supaya background putih logo hilang di dark bg
 *   - Tambah drop-shadow filter supaya logo glowing cyan sesuai design system
 * - React.memo + displayName ✓  rgba() only ✓  Zero className ✓  useMemo ✓
 */

import React, { useMemo } from 'react';

interface XLogoProps {
  size?: number;
  /** Tambah glow effect, default true */
  glow?: boolean;
}

const XLogo = React.memo(({ size = 180, glow = true }: XLogoProps) => {
  const wrapStyle = useMemo(() => Object.freeze({
    width: size,
    height: size,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }), [size]);

  const imgStyle = useMemo(() => Object.freeze({
    width: size,
    height: size,
    objectFit: 'contain' as const,
    display: 'block',
    // mix-blend-mode screen: pixel putih = transparan di atas background gelap
    // pixel cyan logo tetap telihat, background putih/abu menghilang
    mixBlendMode: 'screen' as const,
    filter: glow
      ? 'drop-shadow(0 0 18px rgba(0,238,255,0.55)) drop-shadow(0 0 6px rgba(0,238,255,0.3))'
      : 'none',
    willChange: 'transform' as const,
  }), [size, glow]);

  return (
    <div style={wrapStyle}>
      <img
        src="/logo.png"
        alt="ZERØ MERIDIAN Logo"
        width={size}
        height={size}
        style={imgStyle}
      />
    </div>
  );
});

XLogo.displayName = 'XLogo';
export default XLogo;
