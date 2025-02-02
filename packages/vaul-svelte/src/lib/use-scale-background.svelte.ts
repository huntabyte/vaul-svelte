import { BORDER_RADIUS, TRANSITIONS, WINDOW_TOP_OFFSET } from "./internal/constants.js";
import { isVertical } from "./internal/is.js";
import type { DrawerRootState } from "./vaul.svelte.js";
import { noop } from "./internal/noop.js";
import { chain } from "./internal/chain.js";
import { assignStyle } from "./helpers.js";
import { onMountEffect } from "svelte-toolbelt";
import { watch } from "runed";

export function useScaleBackground(root: DrawerRootState) {
	let timeoutId: number | null = null;
	let initialBackgroundColor = "";

	function getScale() {
		return (window.innerWidth - WINDOW_TOP_OFFSET) / window.innerWidth;
	}

	onMountEffect(() => {
		initialBackgroundColor = document.body.style.backgroundColor;
	});

	watch(
		[
			() => root.open.current,
			() => root.shouldScaleBackground.current,
			() => root.setBackgroundColorOnScale.current,
		],
		() => {
			if (!root.open.current || !root.shouldScaleBackground.current) return;

			if (timeoutId) window.clearTimeout(timeoutId);
			const wrapper =
				(document.querySelector("[data-vaul-drawer-wrapper]") as HTMLElement) ||
				(document.querySelector("[vaul-drawer-wrapper]") as HTMLElement);

			if (!wrapper) return;

			chain(
				root.setBackgroundColorOnScale.current && !root.noBodyStyles.current
					? assignStyle(document.body, { background: "black" })
					: noop,
				assignStyle(wrapper, {
					transformOrigin: isVertical(root.direction.current) ? "top" : "left",
					transitionProperty: "transform, border-radius",
					transitionDuration: `${TRANSITIONS.DURATION}s`,
					transitionTimingFunction: `cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
				})
			);

			const wrapperStylesCleanup = assignStyle(wrapper, {
				borderRadius: `${BORDER_RADIUS}px`,
				overflow: "hidden",
				...(isVertical(root.direction.current)
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
	);
}
