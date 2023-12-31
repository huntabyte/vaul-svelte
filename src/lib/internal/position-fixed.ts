import { writable, get, type Writable } from 'svelte/store';
import { effect, addEventListener } from './helpers/index.js';
import { onMount } from 'svelte';

let previousBodyPosition: Record<string, string> | null = null;

export function handlePositionFixed({
	isOpen,
	modal,
	nested,
	hasBeenOpened
}: {
	isOpen: Writable<boolean>;
	modal: Writable<boolean>;
	nested: Writable<boolean>;
	hasBeenOpened: Writable<boolean>;
}) {
	const activeUrl = writable(typeof window !== 'undefined' ? window.location.href : '');
	let scrollPos = 0;

	function setPositionFixed(open: boolean) {
		// If previousBodyPosition is already set, don't set it again.
		if (!(previousBodyPosition === null && open)) return;

		previousBodyPosition = {
			position: document.body.style.position,
			top: document.body.style.top,
			left: document.body.style.left,
			height: document.body.style.height
		};

		// Update the dom inside an animation frame
		const { scrollX, innerHeight } = window;

		document.body.style.setProperty('position', 'fixed', 'important');
		document.body.style.top = `${-scrollPos}px`;
		document.body.style.left = `${-scrollX}px`;
		document.body.style.right = '0px';
		document.body.style.height = 'auto';

		setTimeout(
			() =>
				requestAnimationFrame(() => {
					// Attempt to check if the bottom bar appeared due to the position change
					const bottomBarHeight = innerHeight - window.innerHeight;
					if (bottomBarHeight && scrollPos >= innerHeight) {
						// Move the content further up so that the bottom bar doesn't hide it
						document.body.style.top = `${-(scrollPos + bottomBarHeight)}px`;
					}
				}),
			300
		);
	}

	function restorePositionSetting() {
		if (previousBodyPosition === null) return;
		const $activeUrl = get(activeUrl);
		// Convert the position from "px" to Int
		const y = -parseInt(document.body.style.top, 10);
		const x = -parseInt(document.body.style.left, 10);

		// Restore styles
		document.body.style.position = previousBodyPosition.position;
		document.body.style.top = previousBodyPosition.top;
		document.body.style.left = previousBodyPosition.left;
		document.body.style.height = previousBodyPosition.height;
		document.body.style.right = 'unset';

		requestAnimationFrame(() => {
			if ($activeUrl !== window.location.href) {
				activeUrl.set(window.location.href);
				return;
			}

			window.scrollTo(x, y);
		});

		previousBodyPosition = null;
	}

	onMount(() => {
		function onScroll() {
			scrollPos = window.scrollY;
		}

		onScroll();

		const removeListener = addEventListener(window, 'scroll', onScroll);

		return () => {
			removeListener;
		};
	});

	effect([isOpen, activeUrl], ([$isOpen, _]) => {
		if (typeof document === 'undefined') return;
		if (get(nested) || !get(hasBeenOpened)) return;
		// This is needed to force Safari toolbar to show **before** the drawer starts animating to prevent a gnarly shift from happening
		if ($isOpen) {
			setPositionFixed($isOpen);

			if (!get(modal)) {
				setTimeout(() => {
					restorePositionSetting();
				}, 500);
			}
		} else {
			restorePositionSetting();
		}
	});

	return { restorePositionSetting };
}
