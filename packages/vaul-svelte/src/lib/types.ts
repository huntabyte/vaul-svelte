export type * from "./components/drawer/types.js";
export type DrawerDirection = "left" | "right" | "top" | "bottom";
export type OnChangeFn<T> = (value: T) => void;
export type OnDrag = (event: PointerEvent | MouseEvent, percentageDragged: number) => void;
export type OnRelease = (event: PointerEvent | MouseEvent, open: boolean) => void;
// eslint-disable-next-line ts/no-explicit-any
export type AnyFunction = (...args: any) => any;
