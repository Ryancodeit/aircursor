/**
 * Remaps raw device orientation angles (alpha, beta, gamma) based on screen orientation angle (0, 90, -90, 180).
 * Handles portrait, landscape-left, landscape-right, and inverted device postures.
 */
export function normalizeOrientation(
  alpha: number,
  beta: number,
  gamma: number,
  screenAngle: number = 0
): { yaw: number; pitch: number; roll: number } {
  const rad = (screenAngle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Remap beta (pitch) and gamma (roll) according to screen rotation angle
  const pitch = beta * cos - gamma * sin;
  const roll = beta * sin + gamma * cos;
  const yaw = alpha;

  return { yaw, pitch, roll };
}
