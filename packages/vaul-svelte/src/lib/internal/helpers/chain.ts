// eslint-disable-next-line ts/no-explicit-any
export type AnyFunction = (...args: any) => any;

/**
 * Receives functions as arguments and returns a new function that calls all.
 */
export function chain<T>(...fns: T[]) {
	return (...args: T extends AnyFunction ? Parameters<T> : never) => {
		for (const fn of fns) {
			if (typeof fn === "function") {
				fn(...args);
			}
		}
	};
}
