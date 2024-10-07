import { untrack } from "svelte";
import { isSafari } from "./prevent-scroll.svelte.js";
import type { DrawerRootState } from "./vaul.svelte.js";

let previousBodyPosition: Record<string, string> | null = null;

export class PositionFixed {
	#root: DrawerRootState;
	#activeUrl = $state(typeof window !== "undefined" ? window.location.href : "");
	#scrollPos = $state(0);
	#open = $derived.by(() => this.#root.open.current);
	#noBodyStyles = $derived.by(() => this.#root.noBodyStyles.current);
	#preventScrollRestoration = $derived.by(() => this.#root.preventScrollRestoration.current);
	#modal = $derived.by(() => this.#root.modal.current);
	#nested = $derived.by(() => this.#root.nested.current);
	#hasBeenOpened = $derived.by(() => this.#root.hasBeenOpened);

	constructor(root: DrawerRootState) {
		this.#root = root;

		$effect(() => {
			untrack(() => {
				const onScroll = () => {
					this.#scrollPos = window.scrollY;
				};

				onScroll();

				window.addEventListener("scroll", onScroll);

				return () => {
					window.removeEventListener("scroll", onScroll);
				};
			});
		});

		$effect(() => {
			this.#activeUrl;
			if (!this.#modal) return;

			return () => {
				if (typeof document === "undefined") return;
				// another drawer has opened, safe to ignore the execution
				const hasDrawerOpened = !!document.querySelector("[data-vaul-drawer]");
				if (hasDrawerOpened) return;

				this.restorePositionSetting();
			};
		});

		$effect(() => {
			this.#open;
			const modal = this.#modal;
			const hasBeenOpened = this.#hasBeenOpened;
			const nested = this.#nested;
			this.#activeUrl;

			untrack(() => {
				if (nested || !hasBeenOpened) return;
				// This is needed to force Safari toolbar to show **before** the drawer starts animating to prevent a gnarly shift from happening
				if (this.#open) {
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
			});
		});
	}

	setPositionFixed = () => {
		// All browsers on iOS will return true here.
		if (!isSafari()) return;

		if (previousBodyPosition === null && this.#open && !this.#noBodyStyles) {
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

		if (previousBodyPosition !== null && !this.#noBodyStyles) {
			// Convert the position from "px" to Int
			const y = -Number.parseInt(document.body.style.top, 10);
			const x = -Number.parseInt(document.body.style.left, 10);

			// Restore styles
			Object.assign(document.body.style, previousBodyPosition);

			window.requestAnimationFrame(() => {
				if (this.#preventScrollRestoration && this.#activeUrl !== window.location.href) {
					this.#activeUrl = window.location.href;
					return;
				}

				window.scrollTo(x, y);
			});

			previousBodyPosition = null;
		}
	};
}
