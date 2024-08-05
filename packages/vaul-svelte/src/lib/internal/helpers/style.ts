import type { DrawerDirection } from "../types.js";
import { isVertical } from "./index.js";

interface Style {
	[key: string]: string;
}

const cache = new WeakMap();

export function setStyles(
	el: Element | HTMLElement | null | undefined,
	styles: Style,
	ignoreCache = false
) {
	console.log(el, styles);
	if (!el || !(el instanceof HTMLElement)) return;
	const originalStyles: Style = {};

	Object.entries(styles).forEach(([key, value]: [string, string]) => {
		if (key.startsWith("--")) {
			el.style.setProperty(key, value);
			return;
		}

		// eslint-disable-next-line ts/no-explicit-any
		originalStyles[key] = (el.style as any)[key];
		// eslint-disable-next-line ts/no-explicit-any
		(el.style as any)[key] = value;
	});

	if (ignoreCache) return;

	cache.set(el, originalStyles);
}

export function resetStyles(el: Element | HTMLElement | null, prop?: string) {
	if (!el || !(el instanceof HTMLElement)) return;
	const originalStyles = cache.get(el);

	if (!originalStyles) {
		return;
	}

	if (prop) {
		// eslint-disable-next-line ts/no-explicit-any
		(el.style as any)[prop] = originalStyles[prop];
	} else {
		Object.entries(originalStyles).forEach(([key, value]) => {
			// eslint-disable-next-line ts/no-explicit-any
			(el.style as any)[key] = value;
		});
	}
}

export function getTranslate(element: HTMLElement, direction: DrawerDirection): number | null {
	if (!element) return null;
	const style = window.getComputedStyle(element);
	const transform =
		// @ts-expect-error - vendor prefix
		style.transform || style.webkitTransform || style.mozTransform;
	let mat = transform.match(/^matrix3d\((.+)\)$/);
	if (mat) {
		// https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/matrix3d
		return Number.parseFloat(mat[1].split(", ")[isVertical(direction) ? 13 : 12]);
	}
	// https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/matrix
	mat = transform.match(/^matrix\((.+)\)$/);
	return mat ? Number.parseFloat(mat[1].split(", ")[isVertical(direction) ? 5 : 4]) : null;
}
