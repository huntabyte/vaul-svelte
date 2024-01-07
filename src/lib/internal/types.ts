import type { Action } from 'svelte/action';

export type SvelteEvent<T extends Event = Event, U extends EventTarget = EventTarget> = T & {
	currentTarget: EventTarget & U;
};

export type OnChangeFn<T> = (value: T) => void;

export type Arrayable<T> = T | T[];

export type Expand<T> = T extends object
	? T extends infer O
		? { [K in keyof O]: O[K] }
		: never
	: T;

export type Builder<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	Element = any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	Param = any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	Attributes extends Record<string, any> = Record<string, any>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
> = Record<string, any> & {
	action: Action<Element, Param, Attributes>;
};
