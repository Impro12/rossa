/**
 * dom.js — lightweight DOM helpers
 */

/** @param {string} sel @param {Element} [ctx] @returns {Element|null} */
export const $ = (sel, ctx = document) => ctx.querySelector(sel);

/** @param {string} sel @param {Element} [ctx] @returns {NodeListOf<Element>} */
export const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

/**
 * @param {string} tag
 * @param {Object} [attrs]
 * @param {...string|Element} children
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'style') Object.assign(node.style, v);
    else node.setAttribute(k, v);
  }
  node.append(...children);
  return node;
}

/**
 * @param {Element} el
 * @param {string} cls
 * @param {boolean} [force]
 */
export const toggle = (el, cls, force) => el.classList.toggle(cls, force);
