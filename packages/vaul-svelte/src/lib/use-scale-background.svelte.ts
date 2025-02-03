import { watch } from "runed";
import { BORDER_RADIUS, TRANSITIONS, WINDOW_TOP_OFFSET } from "./internal/constants.js";
import { assignStyle, chain, isVertical } from "./helpers.js";
import { noop } from "./internal/noop.js";
import { DrawerContext } from "./context.js";

export function useScaleBackground() {
	const ctx = DrawerContext.get();
	let timeoutId: number | null = null;
	const initialBackgroundColor =
		typeof document !== "undefined" ? document.body.style.backgroundColor : "";

	function getScale() {
		return (window.innerWidth - WINDOW_TOP_OFFSET) / window.innerWidth;
	}

	watch([() => ctx.open.current, () => ctx.shouldScaleBackground.current], () => {
		if (ctx.open.current && ctx.shouldScaleBackground.current) {
			if (timeoutId) clearTimeout(timeoutId);
			const wrapper =
				(document.querySelector("[data-vaul-drawer-wrapper]") as HTMLElement) ||
				(document.querySelector("[data-vaul-drawer-wrapper]") as HTMLElement);

			if (!wrapper) return;

			chain(
				ctx.setBackgroundColorOnScale.current && !ctx.noBodyStyles.current
					? assignStyle(document.body, { background: "black" })
					: noop,
				assignStyle(wrapper, {
					transformOrigin: isVertical(ctx.direction.current) ? "top" : "left",
					transitionProperty: "transform, border-radius",
					transitionDuration: `${TRANSITIONS.DURATION}s`,
					transitionTimingFunction: `cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
				})
			);

			const wrapperStylesCleanup = assignStyle(wrapper, {
				borderRadius: `${BORDER_RADIUS}px`,
				overflow: "hidden",
				...(isVertical(ctx.direction.current)
					? {
							transform: `scale(${getScale()}) translate3d(0, calc(env(safe-area-inset-top) + 14px), 0)`,
						}
					: {
							transform: `scale(${getScale()}) translate3d(calc(env(safe-area-inset-top) + 14px), 0, 0)`,
						}),
			});

			return () => {
				wrapperStylesCleanup();
				timeoutId = window.setTimeout(() => {
					if (initialBackgroundColor) {
						document.body.style.background = initialBackgroundColor;
					} else {
						document.body.style.removeProperty("background");
					}
				}, TRANSITIONS.DURATION * 1000);
			};
		}
	});
}
