import { readable } from 'svelte/store';
import { addEventListener } from './helpers/event-listener.js';
import { chain } from '$lib/internal/helpers/index.js';
import { noop } from '$lib/internal/helpers/index.js';

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

export function handleEscapeKeydown(node: HTMLElement, handler: (e: KeyboardEvent) => void) {
	let unsub = noop;
	function update(handler: (e: KeyboardEvent) => void) {
		// unsubscribe from the previous config/listeners if they exist
		unsub();

		unsub = chain(
			// Handle escape keydowns
			documentEscapeKeyStore.subscribe((e) => {
				if (!e) return;
				const target = e.target;

				if (!isHTMLElement(target) || target.closest('[data-escapee]') !== node) {
					return;
				}

				// preventDefault here to prevent exiting fullscreen for mac
				e.preventDefault();

				handler(e);
			})
		);

		// to remain compatible with nested Bits/Melt components, we set a data
		// attribute to indicate that this element is handling escape keydowns
		// so we only handle the highest level escapee
		node.setAttribute('data-escapee', '');
	}

	update(handler);

	return () => {
		unsub();
		node.removeAttribute('data-escapee');
	};
}

function isHTMLElement(el: unknown): el is HTMLElement {
	return el instanceof HTMLElement;
}
