export type * from "./components/drawer/types.js";
export type DrawerDirection = "left" | "right" | "top" | "bottom";
export type OnChangeFn<T> = (value: T) => void;
export type OnDrag = (event: PointerEvent | MouseEvent, percentageDragged: number) => void;
export type OnRelease = (event: PointerEvent | MouseEvent, open: boolean) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFunction = (...args: any) => any;

export type Getters<T> = {
	[K in keyof T]: () => T[K];
};

export type VaulPointerEvent<T extends Element = HTMLElement> = PointerEvent & { currentTarget: T };
