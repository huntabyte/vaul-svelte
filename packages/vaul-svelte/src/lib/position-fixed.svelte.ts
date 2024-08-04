import { onMount, untrack } from "svelte";
import {
	type Getter,
	type ReadableBoxedValues,
	type WritableBoxedValues,
	addEventListener,
} from "svelte-toolbelt";

type PositionFixedProps = WritableBoxedValues<{
	open: boolean;
}> &
	ReadableBoxedValues<{
		modal: boolean;
		nested: boolean;
		hasBeenOpened: boolean;
	}>;

let previousBodyPosition: Record<string, string> | null = null;

export class PositionFixed {
	#open: PositionFixedProps["open"];
	#modal: PositionFixedProps["modal"];
	#nested: PositionFixedProps["nested"];
	#hasBeenOpened: PositionFixedProps["hasBeenOpened"];
	#activeUrl = $state(typeof window !== "undefined" ? window.location.href : "");
	#scrollPos = 0;

	constructor(props: PositionFixedProps) {
		this.#open = props.open;
		this.#modal = props.modal;
		this.#nested = props.nested;
		this.#hasBeenOpened = props.hasBeenOpened;

		onMount(() => {
			const onScroll = () => {
				this.#scrollPos = window.scrollY;
			};

			onScroll();

			const unsubListener = addEventListener(window, "scroll", onScroll);

			return unsubListener;
		});

		$effect(() => {
			const _ = this.#activeUrl;
			const open = this.#open.current;
			untrack(() => {
				if (this.#nested.current || !this.#hasBeenOpened.current) return;
				// This is needed to force Safari toolbar to show **before** the drawer starts animating to prevent a gnarly shift from happening
				if (open) {
					this.#setPositionFixed(open);

					if (!this.#modal.current) {
						setTimeout(() => {
							this.restorePositionSetting();
						}, 500);
					}
				} else {
					this.restorePositionSetting();
				}
			});
		});
	}

	#setPositionFixed = (o: boolean) => {
		// If previousBodyPosition is already set, don't set it again.
		if (!(previousBodyPosition === null && o)) return;

		previousBodyPosition = {
			position: document.body.style.position,
			top: document.body.style.top,
			left: document.body.style.left,
			height: document.body.style.height,
		};

		// Update the dom inside an animation frame
		const { scrollX, innerHeight } = window;

		document.body.style.setProperty("position", "fixed", "important");
		document.body.style.top = `${-this.#scrollPos}px`;
		document.body.style.left = `${-scrollX}px`;
		document.body.style.right = "0px";
		document.body.style.height = "auto";

		setTimeout(
			() =>
				requestAnimationFrame(() => {
					// Attempt to check if the bottom bar appeared due to the position change
					const bottomBarHeight = innerHeight - window.innerHeight;
					if (bottomBarHeight && this.#scrollPos >= innerHeight) {
						// Move the content further up so that the bottom bar doesn't hide it
						document.body.style.top = `${-(this.#scrollPos + bottomBarHeight)}px`;
					}
				}),
			300
		);
	};

	restorePositionSetting = () => {
		if (previousBodyPosition === null) return;
		const activeUrl = this.#activeUrl;

		// Convert the position from "px" to Int
		const y = -Number.parseInt(document.body.style.top, 10);
		const x = -Number.parseInt(document.body.style.left, 10);

		// Restore styles
		document.body.style.position = previousBodyPosition.position;
		document.body.style.top = previousBodyPosition.top;
		document.body.style.left = previousBodyPosition.left;
		document.body.style.height = previousBodyPosition.height;
		document.body.style.right = "unset";

		requestAnimationFrame(() => {
			if (activeUrl !== window.location.href) {
				this.#activeUrl = window.location.href;
				return;
			}

			window.scrollTo(x, y);
		});

		previousBodyPosition = null;
	};
}
