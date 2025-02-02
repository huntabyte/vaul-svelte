import type { DrawerDirection } from "$lib/types.js";

// HTML input types that do not cause the software keyboard to appear.
const nonTextInputTypes = new Set([
	"checkbox",
	"radio",
	"range",
	"color",
	"file",
	"image",
	"button",
	"submit",
	"reset",
]);

export const isBrowser = typeof document !== "undefined";

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function isFunction(v: unknown): v is Function {
	return typeof v === "function";
}

export function isInput(target: Element) {
	return (
		(target instanceof HTMLInputElement && !nonTextInputTypes.has(target.type)) ||
		target instanceof HTMLTextAreaElement ||
		(target instanceof HTMLElement && target.isContentEditable)
	);
}

export function isVertical(direction: DrawerDirection) {
	switch (direction) {
		case "top":
		case "bottom":
			return true;
		case "left":
		case "right":
			return false;
		default:
			return direction satisfies never;
	}
}

export function isBottomOrRight(direction: DrawerDirection) {
	if (direction === "bottom" || direction === "right") return true;
	return false;
}
