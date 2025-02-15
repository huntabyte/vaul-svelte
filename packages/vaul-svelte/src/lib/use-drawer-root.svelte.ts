import {
	afterSleep,
	box,
	type ReadableBoxedValues,
	type WritableBoxedValues,
} from "svelte-toolbelt";
import type { DrawerDirection } from "./types.js";
import { useSnapPoints } from "./use-snap-points.svelte.js";
import { isInput, usePreventScroll } from "./use-prevent-scroll.svelte.js";
import { usePositionFixed } from "./use-position-fixed.svelte.js";
import {
	BORDER_RADIUS,
	DRAG_CLASS,
	NESTED_DISPLACEMENT,
	TRANSITIONS,
	VELOCITY_THRESHOLD,
	WINDOW_TOP_OFFSET,
} from "./internal/constants.js";
import { isIOS, isMobileFirefox } from "./internal/browser.js";
import { on } from "svelte/events";
import { dampenValue, getTranslate, isVertical, reset, set } from "./helpers.js";
import { watch } from "runed";
import { DrawerContext } from "./context.js";

type UseDrawerRootProps = ReadableBoxedValues<{
	closeThreshold: number;
	shouldScaleBackground: boolean;
	scrollLockTimeout: number;
	snapPoints: (string | number)[] | undefined;
	fadeFromIndex: number | undefined;
	fixed: boolean;
	dismissible: boolean;
	direction: DrawerDirection;
	onDrag: (event: PointerEvent, percentageDragged: number) => void;
	onRelease: (event: PointerEvent, open: boolean) => void;
	nested: boolean;
	onClose: () => void;
	modal: boolean;
	handleOnly: boolean;
	noBodyStyles: boolean;
	preventScrollRestoration: boolean;
	setBackgroundColorOnScale: boolean;
	container: HTMLElement | null;
	snapToSequentialPoint: boolean;
	repositionInputs: boolean;
	autoFocus: boolean;
	disablePreventScroll: boolean;
	onOpenChange: (o: boolean) => void;
	onAnimationEnd: (open: boolean) => void;
}> &
	WritableBoxedValues<{
		open: boolean;
		activeSnapPoint: number | string | null;
	}>;

export function useDrawerRoot(opts: UseDrawerRootProps) {
	let hasBeenOpened = $state(false);
	let isDragging = $state(false);
	let justReleased = $state(false);
	let overlayNode = $state<HTMLElement | null>(null);
	let drawerNode = $state<HTMLElement | null>(null);
	let openTime: Date | null = null;
	let dragStartTime: Date | null = null;
	let dragEndTime: Date | null = null;
	let lastTimeDragPrevented: Date | null = null;
	let isAllowedToDrag = false;
	let nestedOpenChangeTimer: number | null = null;
	let pointerStart = 0;
	let keyboardIsOpen = box(false);
	let shouldAnimate = $state(!opts.open.current);
	let previousDiffFromInitial = 0;
	let drawerHeight = 0;
	let drawerWidth = 0;
	let initialDrawerHeight = 0;

	const snapPointsState = useSnapPoints({
		snapPoints: opts.snapPoints,
		drawerNode: () => drawerNode,
		activeSnapPoint: opts.activeSnapPoint,
		container: opts.container,
		direction: opts.direction,
		fadeFromIndex: opts.fadeFromIndex,
		overlayNode: () => overlayNode,
		setOpenTime: (time) => {
			openTime = time;
		},
		snapToSequentialPoint: opts.snapToSequentialPoint,
		open: opts.open,
	});

	usePreventScroll({
		isDisabled: () =>
			!opts.open.current ||
			isDragging ||
			!opts.modal.current ||
			justReleased ||
			!hasBeenOpened ||
			!opts.repositionInputs.current ||
			!opts.disablePreventScroll.current,
	});

	const { restorePositionSetting } = usePositionFixed({
		...opts,
		hasBeenOpened: () => hasBeenOpened,
	});

	function getScale() {
		return (window.innerWidth - WINDOW_TOP_OFFSET) / window.innerWidth;
	}

	function onPress(event: PointerEvent) {
		if (!opts.dismissible.current && !opts.snapPoints.current) return;
		if (drawerNode && !drawerNode.contains(event.target as Node)) return;

		drawerHeight = drawerNode?.getBoundingClientRect().height || 0;
		drawerWidth = drawerNode?.getBoundingClientRect().width || 0;
		isDragging = true;
		dragStartTime = new Date();

		// iOS doesn't trigger mouseUp after scrolling so we need to listen to touched in order to disallow dragging
		if (isIOS()) {
			on(window, "touchend", () => (isAllowedToDrag = false), { once: true });
		}
		// Ensure we maintain correct pointer capture even when going outside of the drawer
		(event.target as HTMLElement).setPointerCapture(event.pointerId);
		pointerStart = isVertical(opts.direction.current) ? event.pageY : event.pageX;
	}

	function shouldDrag(el: EventTarget, isDraggingInDirection: boolean) {
		let element = el as HTMLElement;
		const highlightedText = window.getSelection()?.toString();
		const swipeAmount = drawerNode ? getTranslate(drawerNode, opts.direction.current) : null;
		const date = new Date();

		// Fixes https://github.com/emilkowalski/vaul/issues/483
		if (element.tagName === "SELECT") return false;

		if (element.hasAttribute("data-vaul-no-drag") || element.closest("[data-vaul-no-drag]")) {
			return false;
		}

		if (opts.direction.current === "right" || opts.direction.current === "left") {
			return true;
		}

		// Allow scrolling when animating
		if (openTime && date.getTime() - openTime.getTime() < 500) {
			return false;
		}

		if (swipeAmount !== null) {
			if (opts.direction.current === "bottom" ? swipeAmount > 0 : swipeAmount < 0) {
				return true;
			}
		}

		// Don't drag if there's highlighted text
		if (highlightedText && highlightedText.length > 0) {
			return false;
		}

		// Disallow dragging if drawer was scrolled within `scrollLockTimeout`
		if (
			lastTimeDragPrevented &&
			date.getTime() - lastTimeDragPrevented.getTime() < opts.scrollLockTimeout.current &&
			swipeAmount === 0
		) {
			lastTimeDragPrevented = date;
			return false;
		}

		if (isDraggingInDirection) {
			lastTimeDragPrevented = date;

			// We are dragging down so we should allow scrolling
			return false;
		}

		// Keep climbing up the DOM tree as long as there's a parent
		while (element) {
			// Check if the element is scrollable
			if (element.scrollHeight > element.clientHeight) {
				if (element.scrollTop !== 0) {
					lastTimeDragPrevented = new Date();

					// The element is scrollable and not scrolled to the top, so don't drag
					return false;
				}

				if (element.getAttribute("role") === "dialog") {
					return true;
				}
			}

			// Move up to the parent element
			element = element.parentNode as HTMLElement;
		}

		// No scrollable parents not scrolled to the top found, so drag
		return true;
	}

	function onDrag(event: PointerEvent) {
		if (!drawerNode || !isDragging) return;

		// We need to know how much of the drawer has been dragged in percentages so that we can transform background accordingly
		const directionMultiplier =
			opts.direction.current === "bottom" || opts.direction.current === "right" ? 1 : -1;
		const draggedDistance =
			(pointerStart - (isVertical(opts.direction.current) ? event.pageY : event.pageX)) *
			directionMultiplier;
		const isDraggingInDirection = draggedDistance > 0;

		// Pre condition for disallowing dragging in the close direction.
		const noCloseSnapPointsPreCondition =
			opts.snapPoints.current && !opts.dismissible.current && !isDraggingInDirection;

		// Disallow dragging down to close when first snap point is the active one and dismissible prop is set to false.
		if (noCloseSnapPointsPreCondition && snapPointsState.activeSnapPointIndex === 0) return;

		// We need to capture last time when drag with scroll was triggered and have a timeout between
		const absDraggedDistance = Math.abs(draggedDistance);
		const wrapper = document.querySelector("[data-vaul-drawer-wrapper]");
		const drawerDimension =
			opts.direction.current === "bottom" || opts.direction.current === "top"
				? drawerHeight
				: drawerWidth;

		// Calculate the percentage dragged, where 1 is the closed position
		let percentageDragged = absDraggedDistance / drawerDimension;
		const snapPointPercentageDragged = snapPointsState.getPercentageDragged(
			absDraggedDistance,
			isDraggingInDirection
		);

		if (snapPointPercentageDragged !== null) {
			percentageDragged = snapPointPercentageDragged;
		}

		// Disallow close dragging beyond the smallest snap point.
		if (noCloseSnapPointsPreCondition && percentageDragged >= 1) {
			return;
		}

		if (!isAllowedToDrag && !shouldDrag(event.target!, isDraggingInDirection)) return;
		drawerNode.classList.add(DRAG_CLASS);
		// If shouldDrag gave true once after pressing down on the drawer, we set isAllowedToDrag to true and it will remain true until we let go, there's no reason to disable dragging mid way, ever, and that's the solution to it
		isAllowedToDrag = true;
		set(drawerNode, {
			transition: "none",
		});

		set(overlayNode, {
			transition: "none",
		});

		if (opts.snapPoints.current) {
			snapPointsState.onDrag({ draggedDistance });
		}

		// Run this only if snapPoints are not defined or if we are at the last snap point (highest one)
		if (isDraggingInDirection && !opts.snapPoints.current) {
			const dampenedDraggedDistance = dampenValue(draggedDistance);

			const translateValue = Math.min(dampenedDraggedDistance * -1, 0) * directionMultiplier;
			set(drawerNode, {
				transform: isVertical(opts.direction.current)
					? `translate3d(0, ${translateValue}px, 0)`
					: `translate3d(${translateValue}px, 0, 0)`,
			});
			return;
		}

		const opacityValue = 1 - percentageDragged;

		if (
			snapPointsState.shouldFade ||
			(opts.fadeFromIndex.current &&
				snapPointsState.activeSnapPointIndex === opts.fadeFromIndex.current - 1)
		) {
			opts.onDrag.current?.(event, percentageDragged);

			set(
				overlayNode,
				{
					opacity: `${opacityValue}`,
					transition: "none",
				},
				true
			);
		}

		if (wrapper && overlayNode && opts.shouldScaleBackground.current) {
			// Calculate percentageDragged as a fraction (0 to 1)
			const scaleValue = Math.min(getScale() + percentageDragged * (1 - getScale()), 1);
			const borderRadiusValue = 8 - percentageDragged * 8;

			const translateValue = Math.max(0, 14 - percentageDragged * 14);

			set(
				wrapper,
				{
					borderRadius: `${borderRadiusValue}px`,
					transform: isVertical(opts.direction.current)
						? `scale(${scaleValue}) translate3d(0, ${translateValue}px, 0)`
						: `scale(${scaleValue}) translate3d(${translateValue}px, 0, 0)`,
					transition: "none",
				},
				true
			);
		}

		if (!opts.snapPoints.current) {
			const translateValue = absDraggedDistance * directionMultiplier;
			set(drawerNode, {
				transform: isVertical(opts.direction.current)
					? `translate3d(0, ${translateValue}px, 0)`
					: `translate3d(${translateValue}px, 0, 0)`,
			});
		}
	}

	$effect(() => {
		window.requestAnimationFrame(() => {
			shouldAnimate = true;
		});
	});

	function onDialogOpenChange(o: boolean) {
		if (!opts.dismissible.current && !o) return;
		if (o) {
			hasBeenOpened = true;
		} else {
			closeDrawer(true);
		}

		opts.open.current = o;
	}

	function onVisualViewportChange() {
		if (!drawerNode || !opts.repositionInputs.current) return;

		const focusedElement = document.activeElement as HTMLElement;
		if (isInput(focusedElement) || keyboardIsOpen.current) {
			const visualViewportHeight = window.visualViewport?.height || 0;
			const totalHeight = window.innerHeight;
			// This is the height of the keyboard
			let diffFromInitial = totalHeight - visualViewportHeight;
			const drawerHeight = drawerNode.getBoundingClientRect().height || 0;
			// Adjust drawer height only if it's tall enough
			const isTallEnough = drawerHeight > totalHeight * 0.8;

			if (!initialDrawerHeight) {
				initialDrawerHeight = drawerHeight;
			}
			const offsetFromTop = drawerNode.getBoundingClientRect().top;

			// visualViewport height may change due to some subtle changes to the keyboard. Checking if the height changed by 60 or more will make sure that they keyboard really changed its open state.
			if (Math.abs(previousDiffFromInitial - diffFromInitial) > 60) {
				keyboardIsOpen.current = !keyboardIsOpen.current;
			}

			if (
				opts.snapPoints.current &&
				opts.snapPoints.current.length > 0 &&
				snapPointsState.snapPointsOffset &&
				snapPointsState.activeSnapPointIndex
			) {
				const activeSnapPointHeight =
					snapPointsState.snapPointsOffset[snapPointsState.activeSnapPointIndex] || 0;
				diffFromInitial += activeSnapPointHeight;
			}
			previousDiffFromInitial = diffFromInitial;
			// We don't have to change the height if the input is in view, when we are here we are in the opened keyboard state so we can correctly check if the input is in view
			if (drawerHeight > visualViewportHeight || keyboardIsOpen.current) {
				const height = drawerNode.getBoundingClientRect().height;
				let newDrawerHeight = height;

				if (height > visualViewportHeight) {
					newDrawerHeight =
						visualViewportHeight - (isTallEnough ? offsetFromTop : WINDOW_TOP_OFFSET);
				}
				// When fixed, don't move the drawer upwards if there's space, but rather only change it's height so it's fully scrollable when the keyboard is open
				if (opts.fixed.current) {
					drawerNode.style.height = `${height - Math.max(diffFromInitial, 0)}px`;
				} else {
					drawerNode.style.height = `${Math.max(newDrawerHeight, visualViewportHeight - offsetFromTop)}px`;
				}
			} else if (!isMobileFirefox()) {
				drawerNode.style.height = `${initialDrawerHeight}px`;
			}

			if (
				opts.snapPoints.current &&
				opts.snapPoints.current.length > 0 &&
				!keyboardIsOpen.current
			) {
				drawerNode.style.bottom = `0px`;
			} else {
				// Negative bottom value would never make sense
				drawerNode.style.bottom = `${Math.max(diffFromInitial, 0)}px`;
			}
		}
	}

	watch(
		[
			() => snapPointsState.activeSnapPointIndex,
			() => opts.snapPoints.current,
			() => snapPointsState.snapPointsOffset,
			() => drawerNode,
		],
		() => {
			if (!window.visualViewport) return;
			return on(window.visualViewport, "resize", onVisualViewportChange);
		}
	);

	function cancelDrag() {
		if (!isDragging || !drawerNode) return;

		drawerNode.classList.remove(DRAG_CLASS);
		isAllowedToDrag = false;
		isDragging = false;
		dragEndTime = new Date();
	}

	function closeDrawer(fromWithin?: boolean) {
		cancelDrag();
		opts.onClose?.current();

		if (!fromWithin) {
			handleOpenChange(false);
			opts.open.current = false;
		}

		window.setTimeout(() => {
			if (opts.snapPoints.current && opts.snapPoints.current.length > 0) {
				opts.activeSnapPoint.current = opts.snapPoints.current[0];
			}
		}, TRANSITIONS.DURATION * 1000);
	}

	function resetDrawer() {
		if (!drawerNode) return;
		const wrapper = document.querySelector("[data-vaul-drawer-wrapper]");
		const currentSwipeAmount = getTranslate(drawerNode, opts.direction.current);

		set(drawerNode, {
			transform: "translate3d(0, 0, 0)",
			transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
		});

		set(overlayNode, {
			transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			opacity: "1",
		});

		// Don't reset background if swiped upwards
		if (
			opts.shouldScaleBackground.current &&
			currentSwipeAmount &&
			currentSwipeAmount > 0 &&
			opts.open.current
		) {
			set(
				wrapper,
				{
					borderRadius: `${BORDER_RADIUS}px`,
					overflow: "hidden",
					...(isVertical(opts.direction.current)
						? {
								transform: `scale(${getScale()}) translate3d(0, calc(env(safe-area-inset-top) + 14px), 0)`,
								transformOrigin: "top",
							}
						: {
								transform: `scale(${getScale()}) translate3d(calc(env(safe-area-inset-top) + 14px), 0, 0)`,
								transformOrigin: "left",
							}),
					transitionProperty: "transform, border-radius",
					transitionDuration: `${TRANSITIONS.DURATION}s`,
					transitionTimingFunction: `cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
				},
				true
			);
		}
	}

	function onRelease(event: PointerEvent | null) {
		if (!isDragging || !drawerNode) return;

		drawerNode.classList.remove(DRAG_CLASS);
		isAllowedToDrag = false;
		isDragging = false;
		dragEndTime = new Date();
		const swipeAmount = getTranslate(drawerNode, opts.direction.current);

		if (
			!event ||
			(event.target && !shouldDrag(event.target, false)) ||
			!swipeAmount ||
			Number.isNaN(swipeAmount)
		) {
			return;
		}

		if (dragStartTime === null) {
			return;
		}

		const timeTaken = dragEndTime.getTime() - dragStartTime.getTime();
		const distMoved =
			pointerStart - (isVertical(opts.direction.current) ? event.pageY : event.pageX);
		const velocity = Math.abs(distMoved) / timeTaken;

		if (velocity > 0.05) {
			// `justReleased` is needed to prevent the drawer from focusing on an input when the drag ends, as it's not the intent most of the time.
			justReleased = true;

			setTimeout(() => {
				justReleased = false;
			}, 200);
		}

		if (opts.snapPoints.current) {
			const directionMultiplier =
				opts.direction.current === "bottom" || opts.direction.current === "right" ? 1 : -1;
			snapPointsState.onRelease({
				draggedDistance: distMoved * directionMultiplier,
				closeDrawer,
				velocity,
				dismissible: opts.dismissible.current,
			});
			opts.onRelease.current?.(event, true);
			return;
		}

		// Moved upwards, don't do anything
		if (
			opts.direction.current === "bottom" || opts.direction.current === "right"
				? distMoved > 0
				: distMoved < 0
		) {
			resetDrawer();
			opts.onRelease.current?.(event, true);
			return;
		}

		if (velocity > VELOCITY_THRESHOLD) {
			closeDrawer();
			opts.onRelease.current?.(event, false);
			return;
		}

		const visibleDrawerHeight = Math.min(
			drawerNode.getBoundingClientRect().height ?? 0,
			window.innerHeight
		);
		const visibleDrawerWidth = Math.min(
			drawerNode.getBoundingClientRect().width ?? 0,
			window.innerWidth
		);

		const isHorizontalSwipe =
			opts.direction.current === "left" || opts.direction.current === "right";
		if (
			Math.abs(swipeAmount) >=
			(isHorizontalSwipe ? visibleDrawerWidth : visibleDrawerHeight) *
				opts.closeThreshold.current
		) {
			closeDrawer();
			opts.onRelease.current?.(event, false);
			return;
		}

		opts.onRelease.current?.(event, true);
		resetDrawer();
	}

	watch(
		() => opts.open.current,
		() => {
			// Trigger enter animation without using CSS animation
			if (opts.open.current) {
				set(document.documentElement, {
					scrollBehavior: "auto",
				});

				openTime = new Date();
			}

			return () => {
				reset(document.documentElement, "scrollBehavior");
			};
		}
	);

	function onNestedOpenChange(o: boolean) {
		const scale = o ? (window.innerWidth - NESTED_DISPLACEMENT) / window.innerWidth : 1;

		const initialTranslate = o ? -NESTED_DISPLACEMENT : 0;

		if (nestedOpenChangeTimer) {
			window.clearTimeout(nestedOpenChangeTimer);
		}

		set(drawerNode, {
			transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			transform: isVertical(opts.direction.current)
				? `scale(${scale}) translate3d(0, ${initialTranslate}px, 0)`
				: `scale(${scale}) translate3d(${initialTranslate}px, 0, 0)`,
		});

		if (!o && drawerNode) {
			nestedOpenChangeTimer = window.setTimeout(() => {
				const translateValue = getTranslate(
					drawerNode as HTMLElement,
					opts.direction.current
				);
				set(drawerNode, {
					transition: "none",
					transform: isVertical(opts.direction.current)
						? `translate3d(0, ${translateValue}px, 0)`
						: `translate3d(${translateValue}px, 0, 0)`,
				});
			}, 500);
		}
	}

	function onNestedDrag(_event: PointerEvent, percentageDragged: number) {
		if (percentageDragged < 0) return;

		const initialScale = (window.innerWidth - NESTED_DISPLACEMENT) / window.innerWidth;
		const newScale = initialScale + percentageDragged * (1 - initialScale);
		const newTranslate = -NESTED_DISPLACEMENT + percentageDragged * NESTED_DISPLACEMENT;

		set(drawerNode, {
			transform: isVertical(opts.direction.current)
				? `scale(${newScale}) translate3d(0, ${newTranslate}px, 0)`
				: `scale(${newScale}) translate3d(${newTranslate}px, 0, 0)`,
			transition: "none",
		});
	}

	function onNestedRelease(_event: PointerEvent, o: boolean) {
		const dim = isVertical(opts.direction.current) ? window.innerHeight : window.innerWidth;
		const scale = o ? (dim - NESTED_DISPLACEMENT) / dim : 1;
		const translate = o ? -NESTED_DISPLACEMENT : 0;

		if (o) {
			set(drawerNode, {
				transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
				transform: isVertical(opts.direction.current)
					? `scale(${scale}) translate3d(0, ${translate}px, 0)`
					: `scale(${scale}) translate3d(${translate}px, 0, 0)`,
			});
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let bodyStyles: any;

	function handleOpenChange(o: boolean) {
		opts.onOpenChange.current?.(o);
		if (o && !opts.nested.current) {
			bodyStyles = document.body.style.cssText;
		} else if (!o && !opts.nested.current) {
			afterSleep(TRANSITIONS.DURATION * 1000, () => {
				document.body.style.cssText = bodyStyles;
			});
		}

		if (!o && !opts.nested.current) {
			restorePositionSetting();
		}

		setTimeout(() => {
			opts.onAnimationEnd.current?.(o);
		}, TRANSITIONS.DURATION * 1000);

		if (o && !opts.modal.current) {
			if (typeof window !== "undefined") {
				window.requestAnimationFrame(() => {
					document.body.style.pointerEvents = "auto";
				});
			}
		}

		if (!o) {
			// This will be removed when the exit animation ends (`500ms`)
			document.body.style.pointerEvents = "auto";
		}
	}

	watch(
		() => opts.modal.current,
		() => {
			if (!opts.modal.current) {
				window.requestAnimationFrame(() => {
					document.body.style.pointerEvents = "auto";
				});
			}
		}
	);

	function setOverlayNode(node: HTMLElement | null) {
		overlayNode = node;
	}

	function setDrawerNode(node: HTMLElement | null) {
		drawerNode = node;
	}

	return DrawerContext.set({
		...opts,
		keyboardIsOpen,
		closeDrawer,
		setDrawerNode,
		setOverlayNode,
		onDrag,
		onNestedDrag,
		onNestedOpenChange,
		onNestedRelease,
		onRelease,
		onPress,
		onDialogOpenChange,
		get shouldAnimate() {
			return shouldAnimate;
		},
		get isDragging() {
			return isDragging;
		},
		get overlayNode() {
			return overlayNode;
		},
		get drawerNode() {
			return drawerNode;
		},
		get snapPointsOffset() {
			return snapPointsState.snapPointsOffset;
		},
		get shouldFade() {
			return snapPointsState.shouldFade;
		},
		restorePositionSetting,
		handleOpenChange,
	});
}
