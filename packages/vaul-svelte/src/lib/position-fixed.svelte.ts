import { onMount, untrack } from "svelte";
import {
	type ReadableBoxedValues,
	type WritableBoxedValues,
	addEventListener,
} from "svelte-toolbelt";
import { useId } from "./internal/use-id.js";

let previousBodyPosition: Record<string, string> | null = null;

type PositionFixedProps = WritableBoxedValues<{
	open: boolean;
}> &
	ReadableBoxedValues<{
		modal: boolean;
		nested: boolean;
		hasBeenOpened: boolean;
		preventScrollRestoration: boolean;
		noBodyStyles: boolean;
		disablePreventScroll: boolean;
	}>;

function getActiveUrl() {
	return typeof window !== "undefined" ? window.location.href : "";
}

let firstPositionFixedId: string | null = null;

export class PositionFixed {
	#open: PositionFixedProps["open"];
	#modal: PositionFixedProps["modal"];
	#nested: PositionFixedProps["nested"];
	#hasBeenOpened: PositionFixedProps["hasBeenOpened"];
	#preventScrollRestoration: PositionFixedProps["preventScrollRestoration"];
	#disablePreventScroll: PositionFixedProps["disablePreventScroll"];
	#noBodyStyles: PositionFixedProps["noBodyStyles"];
	#activeUrl = $state(getActiveUrl());
	#scrollPos = $state(0);
	#id = useId();

	constructor(props: PositionFixedProps) {
		this.#open = props.open;
		this.#modal = props.modal;
		this.#nested = props.nested;
		this.#hasBeenOpened = props.hasBeenOpened;
		this.#preventScrollRestoration = props.preventScrollRestoration;
		this.#noBodyStyles = props.noBodyStyles;
		this.#disablePreventScroll = props.disablePreventScroll;

		onMount(() => {
			const onScroll = () => {
				this.#scrollPos = window.scrollY;
			};

			onScroll();

			const unsubListener = addEventListener(window, "scroll", onScroll);

			return () => {
				unsubListener();
			};
		});

		$effect(() => {
			const _ = this.#activeUrl;
			const open = this.#open.current;
			const modal = this.#modal.current;
			const hasBeenOpened = this.#hasBeenOpened.current;
			const nested = this.#nested.current;
			const __ = this.#noBodyStyles.current;
			untrack(() => {
				if (nested || !hasBeenOpened) return;
				// This is needed to force Safari toolbar to show **before** the drawer starts animating to prevent a gnarly shift from happening
				if (open) {
					const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

					!isStandalone && this.#setPositionFixed();

					if (!modal) {
						setTimeout(() => {
							this.restorePositionSetting();
						}, 500);
					}
				} else {
					this.restorePositionSetting();
				}
			});

			return () => {
				this.restorePositionSetting();
			};
		});
	}

	#setPositionFixed = () => {
		// If previousBodyPosition is already set, don't set it again.
		if (
			previousBodyPosition === null &&
			this.#open.current &&
			!this.#noBodyStyles.current &&
			(firstPositionFixedId === null || firstPositionFixedId === this.#id)
		) {
			firstPositionFixedId = this.#id;
			const win = document.defaultView ?? window;

			const { documentElement } = document;
			const scrollbarWidth = win.innerWidth - documentElement.clientWidth;

			previousBodyPosition = {
				position: document.body.style.position,
				top: document.body.style.top,
				left: document.body.style.left,
				height: document.body.style.height,
				right: "unset",
				paddingRight: document.body.style.paddingRight,
			};

			// Update the dom inside an animation frame
			const { scrollX, innerHeight } = window;

			if (!this.#disablePreventScroll.current) {
				document.body.style.setProperty("position", "fixed", "important");
			}
			Object.assign(document.body.style, {
				top: `${-this.#scrollPos}px`,
				left: `${-scrollX}px`,
				right: "0px",
				height: "auto",
				paddingRight: this.#disablePreventScroll.current
					? document.body.style.paddingRight
					: `${scrollbarWidth}px`,
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
		if (
			previousBodyPosition !== null &&
			!this.#noBodyStyles.current &&
			firstPositionFixedId === this.#id
		) {
			// Convert the position from "px" to Int
			const y = -Number.parseInt(document.body.style.top, 10);
			const x = -Number.parseInt(document.body.style.left, 10);

			// Restore styles
			Object.assign(document.body.style, previousBodyPosition);

			window.requestAnimationFrame(() => {
				if (
					this.#preventScrollRestoration.current &&
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
