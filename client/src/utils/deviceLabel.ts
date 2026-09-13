/**
 * Generates a simple, non-fingerprinting friendly device label based on basic UA keywords.
 * Falls back to "Controller" or "Screen" if unavailable.
 */
export function getFriendlyDeviceLabel(role: 'screen' | 'controller'): string {
  if (typeof navigator === 'undefined') {
    return role === 'screen' ? 'Screen' : 'Controller';
  }

  const ua = navigator.userAgent || '';

  if (role === 'controller') {
    if (/iPhone/i.test(ua)) return 'iPhone Controller';
    if (/iPad/i.test(ua)) return 'iPad Controller';
    if (/Android/i.test(ua)) return 'Android Phone';
    return 'Phone Controller';
  } else {
    if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac Screen';
    if (/Windows/i.test(ua)) return 'Windows PC Screen';
    if (/iPad|Tablet/i.test(ua)) return 'Tablet Screen';
    return 'Target Screen';
  }
}
