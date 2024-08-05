import type { Action } from "svelte/action";

export type OnChangeFn<T> = (value: T) => void;

export type Arrayable<T> = T | T[];

export type Expand<T> = T extends object
	? T extends infer O
		? { [K in keyof O]: O[K] }
		: never
	: T;

export type Builder<
	// eslint-disable-next-line ts/no-explicit-any
	Element = any,
	// eslint-disable-next-line ts/no-explicit-any
	Param = any,
	// eslint-disable-next-line ts/no-explicit-any
	Attributes extends Record<string, any> = Record<string, any>,
	// eslint-disable-next-line ts/no-explicit-any
> = Record<string, any> & {
	action: Action<Element, Param, Attributes>;
};

export type DrawerDirection = "left" | "right" | "top" | "bottom";
