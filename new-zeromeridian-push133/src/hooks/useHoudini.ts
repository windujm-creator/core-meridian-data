/**
 * useHoudini.ts — ZERØ MERIDIAN 2026 Phase 9
 * CSS Houdini Paint Worklet registration.
 * Paints: zm-aurora-grid | zm-price-bg | zm-noise-tile
 * Zero JSX ✓  mountedRef ✓  useMemo ✓
 */
import { useRef, useEffect, useState, useMemo } from 'react';
import type React from 'react';

export type HoudiniStatus = 'idle' | 'loading' | 'ready' | 'unsupported';
export interface HoudiniAPI {
  status: HoudiniStatus; isSupported: boolean;
  getAuroraBg: (trend: number, intensity?: number, hue?: number) => React.CSSProperties;
  getPriceBg:  (trend: number, intensity?: number) => React.CSSProperties;
  getNoiseBg:  (intensity?: number) => React.CSSProperties;
}

const PROPS = Object.freeze([
  { name: '--zm-trend', syntax: '<number>', inherits: false, initialValue: '0' },
  { name: '--zm-intensity', syntax: '<number>', inherits: false, initialValue: '0.5' },
  { name: '--zm-hue', syntax: '<number>', inherits: false, initialValue: '220' },
] as const);

function regProps() {
  if(typeof CSS==='undefined'||!('registerProperty' in CSS))return;
  for(const p of PROPS){try{(CSS as unknown as{registerProperty:(o:typeof p)=>void}).registerProperty(p);}catch{}}
}

export function useHoudini(): HoudiniAPI {
  const mountedRef=useRef(true);
  const[status,setStatus]=useState<HoudiniStatus>('idle');
  const isSupported=useMemo(()=>typeof CSS!=='undefined'&&'paintWorklet' in CSS,[]);

  useEffect(()=>{
    mountedRef.current=true;
    if(!isSupported){setStatus('unsupported');return()=>{mountedRef.current=false;};}
    setStatus('loading');
    regProps();
    const c=CSS as unknown as{paintWorklet?:{addModule:(u:string)=>Promise<void>}};
    if(c.paintWorklet){
      c.paintWorklet.addModule('/houdini/zmPaint.js')
        .then(()=>{if(mountedRef.current)setStatus('ready');})
        .catch(()=>{if(mountedRef.current)setStatus('unsupported');});
    }else{setStatus('unsupported');}
    return()=>{mountedRef.current=false;};
  },[isSupported]);

  const getAuroraBg=useMemo(()=>(trend:number,intensity=0.6,hue=220):React.CSSProperties=>{
    if(status==='ready')return{'--zm-trend':String(trend),'--zm-intensity':String(intensity),'--zm-hue':String(hue),background:'paint(zm-aurora-grid)',willChange:'background'} as React.CSSProperties;
    const a=0.05*intensity,c=trend>=0?'rgba(52,211,153,'+a+')':'rgba(251,113,133,'+a+')';
    return{background:'radial-gradient(ellipse at 15% 30%, '+c+' 0%, transparent 60%), rgba(5,5,14,0.98)'};
  },[status]);

  const getPriceBg=useMemo(()=>(trend:number,intensity=0.5):React.CSSProperties=>{
    if(status==='ready')return{'--zm-trend':String(trend),'--zm-intensity':String(intensity),background:'paint(zm-price-bg)',willChange:'background'} as React.CSSProperties;
    const a=0.06*Math.abs(trend)*intensity,c=trend>=0?'rgba(52,211,153,'+a+')':'rgba(251,113,133,'+a+')';
    return{background:'linear-gradient(to top, '+c+', transparent 50%), rgba(8,10,18,0.97)'};
  },[status]);

  const getNoiseBg=useMemo(()=>(intensity=0.3):React.CSSProperties=>{
    if(status==='ready')return{'--zm-intensity':String(intensity),background:'paint(zm-noise-tile)',willChange:'background'} as React.CSSProperties;
    return{background:'rgba(8,10,18,1)'};
  },[status]);

  return useMemo(()=>({status,isSupported,getAuroraBg,getPriceBg,getNoiseBg}),[status,isSupported,getAuroraBg,getPriceBg,getNoiseBg]);
}
