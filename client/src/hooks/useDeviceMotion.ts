import { useState, useEffect, useCallback, useRef } from 'react';
import { OrientationData } from '@aircursor/shared';

export type PermissionState = 'unknown' | 'granted' | 'denied' | 'not_required';

export function useDeviceMotion(onOrientationUpdate?: (data: OrientationData) => void) {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown');
  const [currentOrientation, setCurrentOrientation] = useState<OrientationData | null>(null);

  const callbackRef = useRef(onOrientationUpdate);
  useEffect(() => {
    callbackRef.current = onOrientationUpdate;
  }, [onOrientationUpdate]);

  useEffect(() => {
    if (!window.DeviceOrientationEvent) {
      setIsSupported(false);
      setPermissionState('denied');
      return;
    }

    // Check if iOS permission request API exists
    if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: Function }).requestPermission === 'function') {
      setPermissionState('unknown');
    } else {
      setPermissionState('not_required');
    }
  }, []);

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (event.alpha === null || event.beta === null || event.gamma === null) return;

    const data: OrientationData = {
      alpha: event.alpha,
      beta: event.beta,
      gamma: event.gamma,
      timestamp: Date.now(),
    };

    setCurrentOrientation(data);
    if (callbackRef.current) {
      callbackRef.current(data);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: Function }).requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as unknown as { requestPermission: Function }).requestPermission();
        if (response === 'granted') {
          setPermissionState('granted');
          window.addEventListener('deviceorientation', handleOrientation, true);
          return true;
        } else {
          setPermissionState('denied');
          return false;
        }
      } catch (err) {
        console.error('[DeviceMotion] Permission error:', err);
        setPermissionState('denied');
        return false;
      }
    } else {
      setPermissionState('granted');
      window.addEventListener('deviceorientation', handleOrientation, true);
      return true;
    }
  }, [handleOrientation]);

  // Start listening if permission granted/not required
  useEffect(() => {
    if (permissionState !== 'granted' && permissionState !== 'not_required') {
      return;
    }
    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [permissionState, handleOrientation]);

  return {
    isSupported,
    permissionState,
    requestPermission,
    currentOrientation,
  };
}
