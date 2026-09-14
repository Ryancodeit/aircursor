export interface UserPreferences {
  sensitivityPreset: 'low' | 'medium' | 'high' | 'custom';
  sensitivity: number; // gain multiplier (10 - 45)
  deadZone: number;     // degrees threshold (0.02 - 0.20)
  smoothing: number;    // fallback alpha (0.15 - 0.85)
  invertX: boolean;
  invertY: boolean;
  adaptiveSmoothing: boolean;
  hapticFeedback: boolean;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  sensitivityPreset: 'medium',
  sensitivity: 22,
  deadZone: 0.08,
  smoothing: 0.35,
  invertX: false,
  invertY: false,
  adaptiveSmoothing: true,
  hapticFeedback: true,
};

const STORAGE_KEY = 'aircursor_user_preferences_v1';

export function loadUserPreferences(): UserPreferences {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_USER_PREFERENCES };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_USER_PREFERENCES };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_USER_PREFERENCES, ...parsed };
  } catch (err) {
    console.warn('[UserPreferences] Failed to load preferences from localStorage:', err);
    return { ...DEFAULT_USER_PREFERENCES };
  }
}

export function saveUserPreferences(prefs: UserPreferences): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.warn('[UserPreferences] Failed to save preferences to localStorage:', err);
  }
}

export const SENSITIVITY_PRESETS = {
  low: 14,
  medium: 22,
  high: 32,
} as const;
