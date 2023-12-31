export function isHTMLElement(el: unknown): el is HTMLElement {
	return el instanceof HTMLElement;
}

export const isBrowser = typeof document !== 'undefined';

// eslint-disable-next-line @typescript-eslint/ban-types
export function isFunction(v: unknown): v is Function {
	return typeof v === 'function';
}
