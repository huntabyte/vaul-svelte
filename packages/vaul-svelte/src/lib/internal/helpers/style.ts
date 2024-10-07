import { isVertical } from "./is.js";
import type { DrawerDirection } from "$lib/types.js";

interface Style {
	[key: string]: string;
}

const cache = new WeakMap();

export function setStyles(
	el: Element | HTMLElement | null | undefined,
	styles: Style,
	ignoreCache = false
) {
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

export function assignStyle(
	element: HTMLElement | null | undefined,
	style: Partial<CSSStyleDeclaration>
) {
	if (!element) return () => {};

	const prevStyle = element.style.cssText;
	Object.assign(element.style, style);

	return () => {
		element.style.cssText = prevStyle;
	};
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
