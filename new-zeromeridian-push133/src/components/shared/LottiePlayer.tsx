import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';

interface LottiePlayerProps {
  src: string | object;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  onComplete?: () => void;
  onLoopComplete?: () => void;
  reducedMotionFallback?: React.ReactNode;
  'aria-label'?: string;
}

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

const LottiePlayer: React.FC<LottiePlayerProps> = ({
  src,
  loop = true,
  autoplay = true,
  speed = 1,
  width,
  height,
  style,
  onComplete,
  onLoopComplete,
  reducedMotionFallback,
  'aria-label': ariaLabel,
}) => {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const mountedRef = useRef(true);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [animData, setAnimData] = useState<object | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);

    const handler = (e: MediaQueryListEvent) => {
      if (mountedRef.current) setPrefersReducedMotion(e.matches);
    };
    mq.addEventListener('change', handler);

    return () => {
      mountedRef.current = false;
      mq.removeEventListener('change', handler);
    };
  }, []);

  useEffect(() => {
    if (typeof src === 'object' && src !== null) {
      setAnimData(src);
      setLoadState('loaded');
      return;
    }

    const controller = new AbortController();
    setLoadState('loading');

    fetch(src as string, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load Lottie animation');
        return res.json();
      })
      .then(data => {
        if (mountedRef.current) {
          setAnimData(data);
          setLoadState('loaded');
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError' && mountedRef.current) {
          setLoadState('error');
        }
      });

    return () => controller.abort();
  }, [src]);

  useEffect(() => {
    if (lottieRef.current && loadState === 'loaded') {
      lottieRef.current.setSpeed(speed);
    }
  }, [speed, loadState]);

  const handleComplete = useCallback(() => {
    if (mountedRef.current && onComplete) onComplete();
  }, [onComplete]);

  const handleLoopComplete = useCallback(() => {
    if (mountedRef.current && onLoopComplete) onLoopComplete();
  }, [onLoopComplete]);

  const containerStyle = useMemo(() => ({
    width: width ?? '100%',
    height: height ?? '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style,
  }), [width, height, style]);

  const loadingStyle = useMemo(() => ({
    width: '100%',
    height: '100%',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
    animation: 'pulse 1.5s ease-in-out infinite',
    minHeight: '48px',
  }), []);

  // Reduced motion: show fallback or static placeholder
  if (prefersReducedMotion) {
    if (reducedMotionFallback) {
      return <div style={containerStyle}>{reducedMotionFallback}</div>;
    }
    return (
      <div
        style={{ ...containerStyle, background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}
        role="img"
        aria-label={ariaLabel ?? 'Animation (paused for reduced motion)'}
      />
    );
  }

  if (loadState === 'idle' || loadState === 'loading') {
    return (
      <div style={containerStyle} role="status" aria-label="Loading animation">
        <div style={loadingStyle} />
      </div>
    );
  }

  if (loadState === 'error' || !animData) {
    return (
      <div
        style={{ ...containerStyle, background: 'rgba(252,129,74,0.05)', borderRadius: '8px' }}
        role="alert"
        aria-label="Failed to load animation"
      />
    );
  }

  return (
    <div style={containerStyle} role="img" aria-label={ariaLabel ?? 'Lottie animation'}>
      <Lottie
        lottieRef={lottieRef}
        animationData={animData}
        loop={loop}
        autoplay={autoplay}
        onComplete={handleComplete}
        onLoopComplete={handleLoopComplete}
        style={{ width: '100%', height: '100%' }}
        rendererSettings={RENDERER_SETTINGS}
      />
    </div>
  );
};

const RENDERER_SETTINGS = Object.freeze({
  preserveAspectRatio: 'xMidYMid meet',
  progressiveLoad: true,
  hideOnTransparent: true,
});

LottiePlayer.displayName = 'LottiePlayer';

export default React.memo(LottiePlayer);
export type { LottiePlayerProps };
