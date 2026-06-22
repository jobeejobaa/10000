import { useState, useEffect, useRef, useCallback } from 'react';

// Seuil d'accélération (en m/s²) au-delà duquel on considère que l'utilisateur secoue.
// 15 est un bon compromis : assez haut pour ignorer les vibrations de marche,
// assez bas pour être déclenché par un vrai geste de "secouer".
const SHAKE_THRESHOLD = 15;

// Délai minimum entre deux secousses détectées, pour éviter les déclenchements
// multiples sur un seul geste.
const SHAKE_COOLDOWN_MS = 1000;

/**
 * Détecte si l'API DeviceMotion nécessite une permission explicite
 * (c'est le cas sur iOS 13+ / Safari).
 */
function needsExplicitPermission() {
  return (
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof DeviceMotionEvent.requestPermission === 'function'
  );
}

/**
 * Hook qui appelle `onShake` quand l'utilisateur secoue son téléphone.
 *
 * @param {() => void} onShake - callback déclenché sur secousse détectée
 * @returns {{
 *   isSupported: boolean,        // l'appareil expose l'API DeviceMotion
 *   permissionState: string,     // 'unknown' | 'granted' | 'denied' | 'not-required'
 *   requestPermission: () => Promise<void>,
 * }}
 */
export function useShakeDetection(onShake) {
  const [permissionState, setPermissionState] = useState('unknown');
  const lastShakeTimeRef = useRef(0);
  const lastAccelerationRef = useRef({ x: 0, y: 0, z: 0 });
  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;

  const isSupported = typeof window !== 'undefined' && 'DeviceMotionEvent' in window;

  const handleMotion = useCallback((event) => {
    const acceleration = event.accelerationIncludingGravity;
    if (!acceleration) return;

    const { x = 0, y = 0, z = 0 } = acceleration;
    const last = lastAccelerationRef.current;
    const delta =
      Math.abs(x - last.x) + Math.abs(y - last.y) + Math.abs(z - last.z);
    lastAccelerationRef.current = { x, y, z };

    const now = Date.now();
    if (delta > SHAKE_THRESHOLD && now - lastShakeTimeRef.current > SHAKE_COOLDOWN_MS) {
      lastShakeTimeRef.current = now;
      onShakeRef.current();
    }
  }, []);

  useEffect(() => {
    if (!isSupported) return;
    if (needsExplicitPermission() && permissionState !== 'granted') return;

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [isSupported, permissionState, handleMotion]);

  useEffect(() => {
    if (isSupported && !needsExplicitPermission()) {
      setPermissionState('not-required');
    }
  }, [isSupported]);

  const requestPermission = useCallback(async () => {
    if (!needsExplicitPermission()) {
      setPermissionState('not-required');
      return;
    }
    try {
      const result = await DeviceMotionEvent.requestPermission();
      setPermissionState(result === 'granted' ? 'granted' : 'denied');
    } catch {
      setPermissionState('denied');
    }
  }, []);

  return { isSupported, permissionState, requestPermission };
}
