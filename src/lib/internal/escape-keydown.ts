import { readable } from 'svelte/store';
import { addEventListener } from './helpers/event.js';
import { chain } from './prevent-scroll.js';
import { isFunction, isHTMLElement, noop } from '$lib/internal/helpers/index.js';

/**
 * Creates a readable store that tracks the latest Escape Keydown that occurred on the document.
 *
 * @returns A function to unsubscribe from the event listener and stop tracking keydown events.
 */
const documentEscapeKeyStore = readable<KeyboardEvent | undefined>(
	undefined,
	(set): (() => void) => {
		/**
		 * Event handler for keydown events on the document.
		 * Updates the store's value with the latest Escape Keydown event and then resets it to undefined.
		 */
		function keydown(event: KeyboardEvent | undefined) {
			if (event && event.key === 'Escape') {
				set(event);
			}

			// New subscriptions will not trigger immediately
			set(undefined);
		}

		// Adds a keydown event listener to the document, calling the keydown function when triggered.
		const unsubscribe = addEventListener(document, 'keydown', keydown, {
			passive: false
		});

		// Returns a function to unsubscribe from the event listener and stop tracking keydown events.
		return unsubscribe;
	}
);

export const useEscapeKeydown = (node: HTMLElement, config: EscapeKeydownConfig = {}) => {
	let unsub = noop;
	function update(config: EscapeKeydownConfig = {}) {
		unsub();

		unsub = chain(
			// Handle escape keydowns
			documentEscapeKeyStore.subscribe((e) => {
				if (!e) return;
				const target = e.target;

				if (!isHTMLElement(target) || target.closest('[data-escapee]') !== node) {
					return;
				}

				e.preventDefault();

				// If an ignore function is passed, check if it returns true
				if (config.ignore) {
					if (isFunction(config.ignore)) {
						if (config.ignore(e)) return;
					}
					// If an ignore array is passed, check if any elements in the array match the target
					else if (Array.isArray(config.ignore)) {
						if (
							config.ignore.length > 0 &&
							config.ignore.some((ignoreEl) => {
								return ignoreEl && target === ignoreEl;
							})
						)
							return;
					}
				}

				// If none of the above conditions are met, call the handler
				config.handler?.(e);
			}),
			(node.dataset.escapee = '')
		);
	}

	update(config);

	return {
		update,
		destroy() {
			node.removeAttribute('data-escapee');
			unsub();
		}
	};
};

export type EscapeKeydownConfig = {
	/**
	 * Callback when user presses the escape key element.
	 */
	handler?: (evt: KeyboardEvent) => void;

	/**
	 * A predicate function or a list of elements that should not trigger the event.
	 */
	ignore?: ((e: KeyboardEvent) => boolean) | Element[];
};
