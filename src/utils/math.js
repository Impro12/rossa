/**
 * math.js — common math utilities
 */

/** @param {number} a @param {number} b @param {number} t */
export const lerp = (a, b, t) => a + (b - a) * t;

/** @param {number} v @param {number} min @param {number} max */
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/** @param {number} v @param {number} inMin @param {number} inMax @param {number} outMin @param {number} outMax */
export const remap = (v, inMin, inMax, outMin, outMax) =>
  outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);

/** @param {number} deg */
export const degToRad = (deg) => (deg * Math.PI) / 180;

/** @param {number} rad */
export const radToDeg = (rad) => (rad * 180) / Math.PI;

/** Easing: smooth-step */
export const smoothstep = (t) => t * t * (3 - 2 * t);
