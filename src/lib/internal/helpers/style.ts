interface Style {
	[key: string]: string;
}

const cache = new WeakMap();

export function set(el?: Element | HTMLElement | null, styles?: Style, ignoreCache = false) {
	if (!el || !(el instanceof HTMLElement) || !styles) return;

	// if (el.hasAttribute('data-vaul-drawer')) {
	// 	console.log(styles);
	// }

	const originalStyles: Style = {};

	Object.entries(styles).forEach(([key, value]: [string, string]) => {
		if (key.startsWith('--')) {
			el.style.setProperty(key, value);
			return;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		originalStyles[key] = (el.style as any)[key];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(el.style as any)[key] = value;
	});

	if (ignoreCache) return;

	cache.set(el, originalStyles);
}

export function reset(el: Element | HTMLElement | null, prop?: string) {
	if (!el || !(el instanceof HTMLElement)) return;
	const originalStyles = cache.get(el);

	if (!originalStyles) {
		return;
	}

	if (prop) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(el.style as any)[prop] = originalStyles[prop];
	} else {
		Object.entries(originalStyles).forEach(([key, value]) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(el.style as any)[key] = value;
		});
	}
}

export function getTranslateY(element: HTMLElement): number | null {
	const style = window.getComputedStyle(element);
	const transform =
		// @ts-expect-error - mozTransform is not recognized
		style.transform || style.webkitTransform || style.mozTransform;
	let mat = transform.match(/^matrix3d\((.+)\)$/);
	if (mat) return parseFloat(mat[1].split(', ')[13]);
	mat = transform.match(/^matrix\((.+)\)$/);
	return mat ? parseFloat(mat[1].split(', ')[5]) : null;
}

export function styleToString(style: Record<string, number | string | undefined>): string {
	return Object.keys(style).reduce((str, key) => {
		if (style[key] === undefined) return str;
		return str + `${key}:${style[key]};`;
	}, '');
}
