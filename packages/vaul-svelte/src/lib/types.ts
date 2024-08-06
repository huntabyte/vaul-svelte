export type * from "./components/drawer/types.js";
export type DrawerDirection = "left" | "right" | "top" | "bottom";
export type OnChangeFn<T> = (value: T) => void;
export type OnDrag = (event: PointerEvent, percentageDragged: number) => void;
export type OnRelease = (event: PointerEvent, open: boolean) => void;
