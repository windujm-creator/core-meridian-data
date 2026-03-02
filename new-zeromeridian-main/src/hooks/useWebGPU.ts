/**
 * useWebGPU.ts — ZERØ MERIDIAN
 * WebGPU detection with WebGL2 fallback.
 * Zero JSX — pure TS hook.
 * - mountedRef ✓
 * - useCallback + useMemo ✓
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';

export type RenderBackend = 'webgpu' | 'webgl2' | 'webgl1' | 'canvas2d';

export interface WebGPUState {
  backend:       RenderBackend;
  isWebGPU:      boolean;
  isWebGL2:      boolean;
  isDetecting:   boolean;
  adapterInfo:   GPUAdapterInfo | null;
  maxTexture:    number;
}

const INITIAL_STATE: WebGPUState = Object.freeze({
  backend:     'canvas2d',
  isWebGPU:    false,
  isWebGL2:    false,
  isDetecting: true,
  adapterInfo: null,
  maxTexture:  0,
});

function detectWebGL2(): { supported: boolean; maxTexture: number } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return { supported: false, maxTexture: 0 };
    const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    return { supported: true, maxTexture };
  } catch {
    return { supported: false, maxTexture: 0 };
  }
}

function detectWebGL1(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

export function useWebGPU(): WebGPUState & { retry: () => void } {
  const [state, setState] = useState<WebGPUState>(INITIAL_STATE);
  const mountedRef  = useRef(true);
  const detectedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const detect = useCallback(async () => {
    if (!mountedRef.current) return;
    setState(prev => ({ ...prev, isDetecting: true }));

    // 1. Try WebGPU
    if ('gpu' in navigator) {
      try {
        const adapter = await (navigator as Navigator & { gpu: GPU }).gpu.requestAdapter();
        if (adapter && mountedRef.current) {
          let adapterInfo: GPUAdapterInfo | null = null;
          try {
            adapterInfo = await adapter.requestAdapterInfo();
          } catch {
            // not all browsers expose adapterInfo
          }
          setState({
            backend:     'webgpu',
            isWebGPU:    true,
            isWebGL2:    false,
            isDetecting: false,
            adapterInfo,
            maxTexture:  16384,
          });
          detectedRef.current = true;
          return;
        }
      } catch {
        // WebGPU request failed, fall through
      }
    }

    // 2. Try WebGL2
    const { supported: gl2, maxTexture } = detectWebGL2();
    if (gl2 && mountedRef.current) {
      setState({
        backend:     'webgl2',
        isWebGPU:    false,
        isWebGL2:    true,
        isDetecting: false,
        adapterInfo: null,
        maxTexture,
      });
      detectedRef.current = true;
      return;
    }

    // 3. Try WebGL1
    if (detectWebGL1() && mountedRef.current) {
      setState({
        backend:     'webgl1',
        isWebGPU:    false,
        isWebGL2:    false,
        isDetecting: false,
        adapterInfo: null,
        maxTexture:  4096,
      });
      detectedRef.current = true;
      return;
    }

    // 4. Fallback Canvas2D
    if (mountedRef.current) {
      setState({
        backend:     'canvas2d',
        isWebGPU:    false,
        isWebGL2:    false,
        isDetecting: false,
        adapterInfo: null,
        maxTexture:  0,
      });
      detectedRef.current = true;
    }
  }, []);

  useEffect(() => {
    detect();
  }, [detect]);

  return useMemo(() => ({ ...state, retry: detect }), [state, detect]);
}
