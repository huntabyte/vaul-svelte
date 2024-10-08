import { untrack } from "svelte";
import { BORDER_RADIUS, TRANSITIONS, WINDOW_TOP_OFFSET } from "./internal/constants.js";
import { isVertical } from "./internal/helpers/is.js";
import type { DrawerRootState } from "./vaul.svelte.js";
import { noop } from "./internal/helpers/noop.js";
import { chain } from "./internal/helpers/chain.js";
import { assignStyle } from "./helpers.js";

export function useScaleBackground(root: DrawerRootState) {
	const direction = $derived.by(() => root.direction.current);
	const isOpen = $derived.by(() => root.open.current);
	const shouldScaleBackground = $derived.by(() => root.shouldScaleBackground.current);
	const setBackgroundColorOnScale = $derived.by(() => root.setBackgroundColorOnScale.current);
	const noBodyStyles = $derived.by(() => root.noBodyStyles.current);

	let timeoutId = $state<number | null>(null);
	let initialBackgroundColor = $state("");

	function getScale() {
		return (window.innerWidth - WINDOW_TOP_OFFSET) / window.innerWidth;
	}

	$effect(() => {
		untrack(() => {
			initialBackgroundColor = document.body.style.backgroundColor;
		});
	});

	$effect(() => {
		isOpen;
		shouldScaleBackground;
		setBackgroundColorOnScale;

		return untrack(() => {
			if (isOpen && shouldScaleBackground) {
				if (timeoutId) window.clearTimeout(timeoutId);
				const wrapper =
					(document.querySelector("[data-vaul-drawer-wrapper]") as HTMLElement) ||
					(document.querySelector("[vaul-drawer-wrapper]") as HTMLElement);

				if (!wrapper) return;

				chain(
					setBackgroundColorOnScale && !noBodyStyles
						? assignStyle(document.body, { background: "black" })
						: noop,
					assignStyle(wrapper, {
						transformOrigin: isVertical(direction) ? "top" : "left",
						transitionProperty: "transform, border-radius",
						transitionDuration: `${TRANSITIONS.DURATION}s`,
						transitionTimingFunction: `cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
					})
				);

				const wrapperStylesCleanup = assignStyle(wrapper, {
					borderRadius: `${BORDER_RADIUS}px`,
					overflow: "hidden",
					...(isVertical(direction)
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
	});
}
