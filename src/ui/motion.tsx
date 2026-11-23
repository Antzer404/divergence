import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';

const PresenceContext = createContext(true);
export const useIsPresent = () => useContext(PresenceContext);
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Keep the last open surface mounted while its closing animation completes. */
export function Presence({ show, children }: { show: boolean; children: ReactNode }) {
  const [mounted, setMounted] = useState(show);
  const snapshot = useRef(children);
  if (show) snapshot.current = children;
  useEffect(() => {
    if (show) { setMounted(true); return; }
    const timer = window.setTimeout(() => setMounted(false), reducedMotion() ? 0 : 190);
    return () => window.clearTimeout(timer);
  }, [show]);
  return show || mounted ? <PresenceContext.Provider value={show}>{snapshot.current}</PresenceContext.Provider> : null;
}

/** Briefly fade the old page before mounting the next, including rapid tab changes. */
export function AnimatedView({ viewKey, className, children, onEntered, role, id }: {
  viewKey: string; className: string; children: ReactNode; onEntered?: () => void; role?: string; id?: string;
}) {
  const [displayKey, setDisplayKey] = useState(viewKey);
  const [leaving, setLeaving] = useState(false);
  const content = useRef(children);
  const latest = useRef(children);
  const entered = useRef(onEntered);
  latest.current = children;
  entered.current = onEntered;
  if (displayKey === viewKey) content.current = children;
  useLayoutEffect(() => {
    if (displayKey === viewKey) { setLeaving(false); entered.current?.(); return; }
    setLeaving(true);
    const timer = window.setTimeout(() => {
      content.current = latest.current;
      setDisplayKey(viewKey);
    }, reducedMotion() ? 0 : 90);
    return () => window.clearTimeout(timer);
  }, [viewKey, displayKey]);
  return <div key={displayKey} className={`${className} animated-view`} data-phase={leaving ? 'leaving' : 'entering'} inert={leaving} role={role} id={id}>{content.current}</div>;
}

/** A local light follows the real pointer; no custom cursor and no React renders per move. */
export function usePointerLight() {
  const frame = useRef<number | undefined>(undefined);
  const target = useRef<HTMLElement | null>(null);
  const clear = () => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    target.current?.removeAttribute('data-pointer');
    target.current = null;
  };
  useEffect(() => clear, []);
  return {
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (event.pointerType === 'touch' || reducedMotion()) return;
      const element = event.currentTarget;
      if (target.current !== element) clear();
      target.current = element;
      const bounds = element.getBoundingClientRect();
      const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        element.style.setProperty('--pointer-x', `${x}px`);
        element.style.setProperty('--pointer-y', `${y}px`);
        element.dataset.pointer = 'true';
      });
    },
    onPointerLeave: clear,
  };
}
