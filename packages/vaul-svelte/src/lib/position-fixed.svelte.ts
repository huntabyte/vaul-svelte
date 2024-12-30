import type { DrawerRootState } from "./vaul.svelte.js";
import { useEventListener, watch } from "runed";
import { isSafari } from "./internal/helpers/platform.js";

let previousBodyPosition: Record<string, string> | null = null;

export class PositionFixed {
	#root: DrawerRootState;
	#activeUrl = $state(typeof window !== "undefined" ? window.location.href : "");
	#scrollPos = $state(0);

	constructor(root: DrawerRootState) {
		this.#root = root;
		if (typeof window === "undefined") return;

		const onScroll = () => {
			this.#scrollPos = window.scrollY;
		};

		onScroll();

		useEventListener(window, "scroll", () => {
			this.#scrollPos = window.scrollY;
		});

		watch([() => this.#activeUrl, () => this.#root.modal.current], ([_, modal]) => {
			if (!modal) return;

			return () => {
				if (typeof document === "undefined") return;
				// another drawer has opened, safe to ignore the execution
				const hasDrawerOpened = !!document.querySelector("[data-vaul-drawer]");
				if (hasDrawerOpened) return;

				this.restorePositionSetting();
			};
		});

		watch(
			[
				() => this.#root.open.current,
				() => this.#root.modal.current,
				() => this.#root.hasBeenOpened,
				() => this.#root.nested.current,
				() => this.#activeUrl,
			],
			([open, modal, hasBeenOpened, nested]) => {
				if (nested || !hasBeenOpened) return;
				// This is needed to force Safari toolbar to show **before** the drawer starts animating to prevent a gnarly shift from happening
				if (open) {
					// avoid for standalone mode (PWA)
					const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
					!isStandalone && this.setPositionFixed();

					if (!modal) {
						window.setTimeout(() => {
							this.restorePositionSetting();
						}, 500);
					}
				} else {
					this.restorePositionSetting();
				}
			}
		);
	}

	setPositionFixed = () => {
		// All browsers on iOS will return true here.
		if (!isSafari()) return;

		if (
			previousBodyPosition === null &&
			this.#root.open.current &&
			!this.#root.noBodyStyles.current
		) {
			previousBodyPosition = {
				position: document.body.style.position,
				top: document.body.style.top,
				left: document.body.style.left,
				height: document.body.style.height,
				right: "unset",
			};

			// update the dom inside an animation frame

			const { scrollX, innerHeight } = window;

			document.body.style.setProperty("position", "fixed", "important");
			Object.assign(document.body.style, {
				top: `${-this.#scrollPos}px`,
				left: `${-scrollX}px`,
				right: "0px",
				height: "auto",
			});

			window.setTimeout(
				() =>
					window.requestAnimationFrame(() => {
						// Attempt to check if the bottom bar appeared due to the position change
						const bottomBarHeight = innerHeight - window.innerHeight;
						if (bottomBarHeight && this.#scrollPos >= innerHeight) {
							// Move the content further up so that the bottom bar doesn't hide it
							document.body.style.top = `${-(this.#scrollPos + bottomBarHeight)}px`;
						}
					}),
				300
			);
		}
	};

	restorePositionSetting = () => {
		// all browsers on iOS will return true here.
		if (!isSafari()) return;

		if (previousBodyPosition !== null && !this.#root.noBodyStyles.current) {
			// Convert the position from "px" to Int
			const y = -Number.parseInt(document.body.style.top, 10);
			const x = -Number.parseInt(document.body.style.left, 10);

			// Restore styles
			Object.assign(document.body.style, previousBodyPosition);

			window.requestAnimationFrame(() => {
				if (
					this.#root.preventScrollRestoration.current &&
					this.#activeUrl !== window.location.href
				) {
					this.#activeUrl = window.location.href;
					return;
				}

				window.scrollTo(x, y);
			});

			previousBodyPosition = null;
		}
	};
}
