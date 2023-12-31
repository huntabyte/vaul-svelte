// This code comes from https://github.com/adobe/react-spectrum/blob/main/packages/%40react-aria/overlays/src/usePreventScroll.ts

import { addEventListener, chain, isInput } from '$lib/internal/helpers/index.js';

function isMac(): boolean | undefined {
	return testPlatform(/^Mac/);
}

function isIPhone(): boolean | undefined {
	return testPlatform(/^iPhone/);
}

export function isSafari(): boolean | undefined {
	return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

function isIPad(): boolean | undefined {
	return (
		testPlatform(/^iPad/) ||
		// iPadOS 13 lies and says it's a Mac, but we can distinguish by detecting touch support.
		(isMac() && navigator.maxTouchPoints > 1)
	);
}

export function isIOS(): boolean | undefined {
	return isIPhone() || isIPad();
}

function testPlatform(re: RegExp): boolean | undefined {
	return typeof window !== 'undefined' && window.navigator != null
		? re.test(window.navigator.platform)
		: undefined;
}

const visualViewport = typeof document !== 'undefined' && window.visualViewport;

export function isScrollable(node: Element): boolean {
	const style = window.getComputedStyle(node);
	return /(auto|scroll)/.test(style.overflow + style.overflowX + style.overflowY);
}

export function getScrollParent(node: Element): Element {
	if (isScrollable(node)) {
		node = node.parentElement as HTMLElement;
	}

	while (node && !isScrollable(node)) {
		node = node.parentElement as HTMLElement;
	}

	return node || document.scrollingElement || document.documentElement;
}

// The number of active usePreventScroll calls. Used to determine whether to revert back to the original page style/scroll position
let preventScrollCount = 0;
let restore: () => void;

/**
 * Prevents scrolling on the document body on mount, and
 * restores it on unmount. Also ensures that content does not
 * shift due to the scrollbars disappearing.
 */
export function preventScroll() {
	if (typeof document === 'undefined') return () => {};

	preventScrollCount++;
	if (preventScrollCount === 1) {
		if (isIOS()) {
			restore = preventScrollMobileSafari();
		} else {
			restore = preventScrollStandard();
		}
	}

	return () => {
		preventScrollCount--;
		if (preventScrollCount === 0) {
			restore();
		}
	};
}

function getPaddingProperty(documentElement: HTMLElement) {
	// RTL <body> scrollbar
	const documentLeft = documentElement.getBoundingClientRect().left;
	const scrollbarX = Math.round(documentLeft) + documentElement.scrollLeft;
	return scrollbarX ? 'paddingLeft' : 'paddingRight';
}

function setCSSProperty(el: HTMLElement | null | undefined, property: string, value: string) {
	if (!el) return;
	const previousValue = el.style.getPropertyValue(property);
	el.style.setProperty(property, value);
	return () => {
		if (previousValue) {
			el.style.setProperty(property, previousValue);
		} else {
			el.style.removeProperty(property);
		}
	};
}

// For most browsers, all we need to do is set `overflow: hidden` on the root element, and
// add some padding to prevent the page from shifting when the scrollbar is hidden.
function preventScrollStandard() {
	if (typeof document === 'undefined') return () => {};
	const win = document.defaultView ?? window;

	const { documentElement, body } = document;
	const scrollbarWidth = win.innerWidth - documentElement.clientWidth;
	const setScrollbarWidthProperty = () =>
		setCSSProperty(documentElement, '--scrollbar-width', `${scrollbarWidth}px`);
	const paddingProperty = getPaddingProperty(documentElement);
	const scrollbarSidePadding = win.getComputedStyle(body)[paddingProperty];

	return chain(
		setScrollbarWidthProperty(),
		setStyle(body, paddingProperty, `calc(${scrollbarSidePadding} + ${scrollbarWidth}px)`),
		setStyle(body, 'overflow', 'hidden')
	);
}

// Mobile Safari is a whole different beast. Even with overflow: hidden,
// it still scrolls the page in many situations:
//
// 1. When the bottom toolbar and address bar are collapsed, page scrolling is always allowed.
// 2. When the keyboard is visible, the viewport does not resize. Instead, the keyboard covers part of
//    it, so it becomes scrollable.
// 3. When tapping on an input, the page always scrolls so that the input is centered in the visual viewport.
//    This may cause even fixed position elements to scroll off the screen.
// 4. When using the next/previous buttons in the keyboard to navigate between inputs, the whole page always
//    scrolls, even if the input is inside a nested scrollable element that could be scrolled instead.
//
// In order to work around these cases, and prevent scrolling without jankiness, we do a few things:
//
// 1. Prevent default on `touchmove` events that are not in a scrollable element. This prevents touch scrolling
//    on the window.
// 2. Prevent default on `touchmove` events inside a scrollable element when the scroll position is at the
//    top or bottom. This avoids the whole page scrolling instead, but does prevent overscrolling.
// 3. Prevent default on `touchend` events on input elements and handle focusing the element ourselves.
// 4. When focusing an input, apply a transform to trick Safari into thinking the input is at the top
//    of the page, which prevents it from scrolling the page. After the input is focused, scroll the element
//    into view ourselves, without scrolling the whole page.
// 5. Offset the body by the scroll position using a negative margin and scroll to the top. This should appear the
//    same visually, but makes the actual scroll position always zero. This is required to make all of the
//    above work or Safari will still try to scroll the page when focusing an input.
// 6. As a last resort, handle window scroll events, and scroll back to the top. This can happen when attempting
//    to navigate to an input with the next/previous buttons that's outside a modal.
function preventScrollMobileSafari() {
	let scrollable: Element;
	let lastY = 0;
	const { documentElement, body, activeElement } = document;

	function onTouchStart(e: TouchEvent) {
		// Store the nearest scrollable parent element from the element that the user touched.
		scrollable = getScrollParent(e.target as Element);
		if (scrollable === documentElement && scrollable === body) return;

		lastY = e.changedTouches[0].pageY;
	}

	function onTouchMove(e: TouchEvent) {
		// Prevent scrolling the window.
		if (!scrollable || scrollable === documentElement || scrollable === body) {
			e.preventDefault();
			return;
		}

		// Prevent scrolling up when at the top and scrolling down when at the bottom
		// of a nested scrollable area, otherwise mobile Safari will start scrolling
		// the window instead. Unfortunately, this disables bounce scrolling when at
		// the top but it's the best we can do.
		const y = e.changedTouches[0].pageY;
		const scrollTop = scrollable.scrollTop;
		const bottom = scrollable.scrollHeight - scrollable.clientHeight;

		if (bottom === 0) return;

		if ((scrollTop <= 0 && y > lastY) || (scrollTop >= bottom && y < lastY)) {
			e.preventDefault();
		}

		lastY = y;
	}

	function onTouchEnd(e: TouchEvent) {
		const target = e.target as HTMLElement;
		if (!(isInput(target) && target !== activeElement)) return;
		// Apply this change if we're not already focused on the target element
		e.preventDefault();

		// Apply a transform to trick Safari into thinking the input is at the top of the page
		// so it doesn't try to scroll it into view. When tapping on an input, this needs to
		// be done before the "focus" event, so we have to focus the element ourselves.
		target.style.transform = 'translateY(-2000px)';
		target.focus();
		requestAnimationFrame(() => {
			target.style.transform = '';
		});
	}

	function onFocus(e: FocusEvent) {
		const target = e.target as HTMLElement;
		if (!isInput(target)) return;

		// Transform also needs to be applied in the focus event in cases where focus moves
		// other than tapping on an input directly, e.g. the next/previous buttons in the
		// software keyboard. In these cases, it seems applying the transform in the focus event
		// is good enough, whereas when tapping an input, it must be done before the focus event. 🤷‍♂️
		target.style.transform = 'translateY(-2000px)';
		requestAnimationFrame(() => {
			target.style.transform = '';

			// This will have prevented the browser from scrolling the focused element into view,
			// so we need to do this ourselves in a way that doesn't cause the whole page to scroll.
			if (visualViewport) {
				if (visualViewport.height < window.innerHeight) {
					// If the keyboard is already visible, do this after one additional frame
					// to wait for the transform to be removed.
					requestAnimationFrame(() => {
						scrollIntoView(target);
					});
				} else {
					// Otherwise, wait for the visual viewport to resize before scrolling so we can
					// measure the correct position to scroll to.
					visualViewport.addEventListener('resize', () => scrollIntoView(target), { once: true });
				}
			}
		});
	}

	function onWindowScroll() {
		// Last resort. If the window scrolled, scroll it back to the top.
		// It should always be at the top because the body will have a negative margin (see below).
		window.scrollTo(0, 0);
	}

	// Record the original scroll position so we can restore it.
	// Then apply a negative margin to the body to offset it by the scroll position. This will
	// enable us to scroll the window to the top, which is required for the rest of this to work.
	const scrollX = window.pageXOffset;
	const scrollY = window.pageYOffset;

	const restoreStyles = chain(
		setStyle(
			documentElement,
			'paddingRight',
			`${window.innerWidth - documentElement.clientWidth}px`
		),
		setStyle(documentElement, 'overflow', 'hidden')
		// setStyle(document.body, 'marginTop', `-${scrollY}px`),
	);

	// Scroll to the top. The negative margin on the body will make this appear the same.
	window.scrollTo(0, 0);

	const removeEvents = chain(
		addEventListener(document, 'touchstart', onTouchStart, { passive: false, capture: true }),
		addEventListener(document, 'touchmove', onTouchMove, { passive: false, capture: true }),
		addEventListener(document, 'touchend', onTouchEnd, { passive: false, capture: true }),
		addEventListener(document, 'focus', onFocus, true),
		addEventListener(window, 'scroll', onWindowScroll)
	);

	return () => {
		// Restore styles and scroll the page back to where it was.
		restoreStyles();
		removeEvents();
		window.scrollTo(scrollX, scrollY);
	};
}

// Sets a CSS property on an element, and returns a function to revert it to the previous value.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setStyle(element: HTMLElement, style: any, value: string) {
	const cur = element.style[style];
	element.style[style] = value;

	return () => {
		element.style[style] = cur;
	};
}

function scrollIntoView(target: Element) {
	const { documentElement, body, scrollingElement } = document;

	const root = scrollingElement || documentElement;
	while (target && target !== root) {
		// Find the parent scrollable element and adjust the scroll position if the target is not already in view.
		const scrollable = getScrollParent(target);
		if (scrollable !== documentElement && scrollable !== body && scrollable !== target) {
			const scrollableTop = scrollable.getBoundingClientRect().top;
			const targetTop = target.getBoundingClientRect().top;
			const targetBottom = target.getBoundingClientRect().bottom;
			const keyboardHeight = scrollable.getBoundingClientRect().bottom;

			if (targetBottom > keyboardHeight) {
				scrollable.scrollTop += targetTop - scrollableTop;
			}
		}

		//@ts-expect-error - target is not root so it must have a parentElement
		target = scrollable.parentElement;
	}
}
