import { tick, untrack } from "svelte";
import {
	type ReadableBoxedValues,
	type WithRefProps,
	type WritableBoxedValues,
	addEventListener,
	box,
	useRefById,
} from "svelte-toolbelt";
import { isInput, isVertical } from "./internal/helpers/is.js";
import { getTranslate, resetStyles, setStyles } from "./internal/helpers/style.js";
import { TRANSITIONS, VELOCITY_THRESHOLD } from "./internal/constants.js";
import { isIOS } from "./internal/prevent-scroll.js";
import { PositionFixed } from "./position-fixed.svelte.js";
import { createContext } from "./internal/createContext.js";
import { noop } from "./internal/helpers/noop.js";
import { SnapPoints } from "./snap-points.svelte.js";

export const DEFAULT_CLOSE_THRESHOLD = 0.25;
export const DEFAULT_SCROLL_LOCK_TIMEOUT = 100;
const BORDER_RADIUS = 8;
const NESTED_DISPLACEMENT = 16;
const WINDOW_TOP_OFFSET = 26;
const DRAG_CLASS = "vaul-dragging";

export type DrawerDirection = "left" | "right" | "top" | "bottom";

export type OnDrag = (event: PointerEvent, percentageDragged: number) => void;
export type OnReleaseEvent = PointerEvent | MouseEvent | TouchEvent;
export type OnRelease = (event: PointerEvent, open: boolean) => void;

type DrawerRootStateProps = ReadableBoxedValues<{
	closeThreshold: number;
	shouldScaleBackground: boolean;
	scrollLockTimeout: number;
	snapPoints: (string | number)[] | null;
	fadeFromIndex: number | null;
	fixed: boolean;
	dismissible: boolean;
	direction: DrawerDirection;
	onDrag: OnDrag;
	onRelease: OnRelease;
	nested: boolean;
	onClose: () => void;
	backgroundColor: string | undefined;
	modal: boolean;
	handleOnly: boolean;
	noBodyStyles: boolean;
	preventScrollRestoration: boolean;
	setBackgroundColorOnScale: boolean;
}> &
	WritableBoxedValues<{
		open: boolean;
		activeSnapPoint: number | string | null | undefined;
	}>;

class DrawerRootState {
	open: DrawerRootStateProps["open"];
	closeThreshold: DrawerRootStateProps["closeThreshold"];
	shouldScaleBackground: DrawerRootStateProps["shouldScaleBackground"];
	scrollLockTimeout: DrawerRootStateProps["scrollLockTimeout"];
	snapPoints: DrawerRootStateProps["snapPoints"];
	fadeFromIndex: DrawerRootStateProps["fadeFromIndex"];
	fixed: DrawerRootStateProps["fixed"];
	dismissible: DrawerRootStateProps["dismissible"];
	direction: DrawerRootStateProps["direction"];
	modal: DrawerRootStateProps["modal"];
	onDragProp: DrawerRootStateProps["onDrag"];
	onReleaseProp: DrawerRootStateProps["onRelease"];
	nested: DrawerRootStateProps["nested"];
	onCloseProp: DrawerRootStateProps["onClose"];
	activeSnapPoint: DrawerRootStateProps["activeSnapPoint"];
	backgroundColor: DrawerRootStateProps["backgroundColor"];
	noBodyStyles: DrawerRootStateProps["noBodyStyles"];
	preventScrollRestoration: DrawerRootStateProps["preventScrollRestoration"];
	handleOnly: DrawerRootStateProps["handleOnly"];
	setBackgroundColorOnScale: DrawerRootStateProps["setBackgroundColorOnScale"];
	hasBeenOpened = $state(false);
	visible = $state(false);
	justReleased = $state(false);
	isDragging = $state(false);
	triggerNode = $state<HTMLElement | null>(null);
	overlayNode = $state<HTMLElement | null>(null);
	openTime = $state<Date | null>(null);
	dragStartTime = $state<Date | null>(null);
	dragEndTime = $state<Date | null>(null);
	lastTimeDragPrevented = $state<Date | null>(null);
	isAllowedToDrag = $state(false);
	nestedOpenChangeTimer = $state<ReturnType<typeof setTimeout> | null>(null);
	pointerStart = $state(0);
	keyboardIsOpen = $state(false);
	previousDiffFromInitial = $state(0);
	drawerNode = $state<HTMLElement | null>(null);
	drawerHeight = $state(0);
	initialDrawerHeight = $state(0);
	drawerId = $state<string | null>(null);

	positionFixedState: PositionFixed;
	snapPointState: SnapPoints;

	constructor(props: DrawerRootStateProps) {
		this.open = props.open;
		this.closeThreshold = props.closeThreshold;
		this.shouldScaleBackground = props.shouldScaleBackground;
		this.scrollLockTimeout = props.scrollLockTimeout;
		this.snapPoints = props.snapPoints;
		this.fadeFromIndex = props.fadeFromIndex;
		this.fixed = props.fixed;
		this.dismissible = props.dismissible;
		this.direction = props.direction;
		this.onDragProp = props.onDrag;
		this.onReleaseProp = props.onRelease;
		this.nested = props.nested;
		this.onCloseProp = props.onClose;
		this.activeSnapPoint = props.activeSnapPoint;
		this.backgroundColor = props.backgroundColor;
		this.modal = props.modal;
		this.handleOnly = props.handleOnly;
		this.noBodyStyles = props.noBodyStyles;
		this.preventScrollRestoration = props.preventScrollRestoration;
		this.setBackgroundColorOnScale = props.setBackgroundColorOnScale;

		this.positionFixedState = new PositionFixed({
			hasBeenOpened: box.with(() => this.hasBeenOpened),
			open: this.open,
			modal: this.modal,
			nested: this.nested,
			noBodyStyles: this.noBodyStyles,
			preventScrollRestoration: this.preventScrollRestoration,
		});

		this.snapPointState = new SnapPoints({
			activeSnapPoint: this.activeSnapPoint,
			snapPoints: this.snapPoints,
			fadeFromIndex: this.fadeFromIndex,
			drawerRef: box.with(() => this.drawerNode),
			overlayRef: box.with(() => this.overlayNode),
			direction: this.direction,
			onSnapPointChange: this.onSnapPointChange,
			setActiveSnapPoint: this.setActiveSnapPoint,
		});

		$effect(() => {
			return () => {
				this.scaleBackground(false);
				this.positionFixedState.restorePositionSetting();
			};
		});

		$effect(() => {
			const activeSnapPointIndex = this.snapPointState.activeSnapPointIndex;
			const snapPoints = this.snapPoints.current;
			const snapPointsOffset = this.snapPointState.snapPointsOffset;
			let removeListener = noop;

			untrack(() => {
				const onVisualViewportChange = () => {
					const drawerNode = this.drawerNode;
					if (!drawerNode) return;
					const keyboardIsOpen = this.keyboardIsOpen;
					const focusedElement = document.activeElement as HTMLElement;
					if (isInput(focusedElement) || keyboardIsOpen) {
						const visualViewportHeight = window.visualViewport?.height || 0;
						// this is the height of the keyboard
						let diffFromInitial = window.innerHeight - visualViewportHeight;
						const drawerHeight = drawerNode.getBoundingClientRect().height || 0;
						if (!this.initialDrawerHeight) {
							this.initialDrawerHeight = drawerHeight;
						}
						const offsetFromTop = drawerNode.getBoundingClientRect().top;

						// visualViewport height may change due to some subtle changes to the
						// keyboard. Checking if the height changed by 60 or more will make sure
						// that they keyboard really changed its open state.
						if (Math.abs(this.previousDiffFromInitial - diffFromInitial) > 60) {
							this.keyboardIsOpen = !this.keyboardIsOpen;
						}

						if (
							snapPoints &&
							snapPoints.length > 0 &&
							snapPointsOffset &&
							activeSnapPointIndex
						) {
							const activeSnapPointHeight =
								snapPointsOffset[activeSnapPointIndex] || 0;
							diffFromInitial += activeSnapPointHeight;
						}

						this.previousDiffFromInitial = diffFromInitial;

						// We don't have to change the height if the input is in view, when we are here we are in the opened keyboard state so we can correctly check if the input is in view
						if (drawerHeight > visualViewportHeight || keyboardIsOpen) {
							const height = drawerNode.getBoundingClientRect().height;
							let newDrawerHeight = height;

							if (height > visualViewportHeight) {
								newDrawerHeight = visualViewportHeight - WINDOW_TOP_OFFSET;
							}
							// When fixed, don't move the drawer upwards if there's space, but rather only change it's height so it's fully scrollable when the keyboard is open
							if (this.fixed.current) {
								drawerNode.style.height = `${height - Math.max(diffFromInitial, 0)}px`;
							} else {
								drawerNode.style.height = `${Math.max(
									newDrawerHeight,
									visualViewportHeight - offsetFromTop
								)}px`;
							}
						} else {
							drawerNode.style.height = `${this.initialDrawerHeight}px`;
						}

						if (snapPoints && snapPoints.length > 0 && !keyboardIsOpen) {
							drawerNode.style.bottom = `0px`;
						} else {
							// Negative bottom value would never make sense
							drawerNode.style.bottom = `${Math.max(diffFromInitial, 0)}px`;
						}
					}
				};

				if (window.visualViewport) {
					removeListener = addEventListener(
						window.visualViewport,
						"resize",
						onVisualViewportChange
					);
				}
			});
			return removeListener;
		});

		$effect(() => {
			const open = this.open.current;
			const shouldScaleBackground = this.shouldScaleBackground.current;

			if (!open && shouldScaleBackground) {
				const id = setTimeout(() => {
					resetStyles(document.body, "background");
				}, 200);
				return () => clearTimeout(id);
			}
		});

		// Trigger enter animation without using CSS animation
		$effect(() => {
			const open = this.open.current;
			if (!open) return;
			untrack(() => {
				setStyles(document.documentElement, {
					scrollBehavior: "auto",
				});

				this.openTime = new Date();
				this.scaleBackground(true);
			});
		});

		// Find all scrollable elements inside our drawer and assign a class to it so that we can disable overflow when dragging to prevent pointermove not being captured

		$effect(() => {
			const visible = this.visible;
			const drawerNode = untrack(() => this.drawerNode);
			if (!(drawerNode && visible)) return;

			untrack(() => {
				const children = drawerNode.querySelectorAll("*");
				for (const child of children) {
					const htmlChild = child as HTMLElement;
					if (
						htmlChild.scrollHeight > htmlChild.clientHeight ||
						htmlChild.scrollWidth > htmlChild.clientWidth
					) {
						htmlChild.classList.add("vaul-scrollable");
					}
				}
			});
		});
	}

	setActiveSnapPoint = (newValue: number | string | null | undefined) => {
		this.activeSnapPoint.current = newValue;
	};

	setOpen = (open: boolean) => {
		this.open.current = open;
	};

	setHasBeenOpened = (hasBeenOpened: boolean) => {
		this.hasBeenOpened = hasBeenOpened;
	};

	getContentStyle = () => {
		const snapPointsOffset = this.snapPointState.snapPointsOffset;
		if (snapPointsOffset && snapPointsOffset.length > 0) {
			return {
				"--snap-point-height": `${snapPointsOffset[0]}px`,
			};
		}
	};

	onSnapPointChange = (activeSnapPointIdx: number) => {
		// change openTime when we reach the last snap point to prevent dragging for 500ms incase it's scrollable.
		const snapPoints = this.snapPoints.current;
		const snapPointsOffset = this.snapPointState.snapPointsOffset;
		if (snapPoints && activeSnapPointIdx === snapPointsOffset.length - 1) {
			this.openTime = new Date();
		}
	};

	openDrawer = () => {
		this.setHasBeenOpened(true);
		this.setOpen(true);
	};

	onPress = (e: PointerEvent) => {
		const dismissible = this.dismissible.current;
		const snapPoints = this.snapPoints.current;
		const drawerNode = this.drawerNode;
		if (!dismissible && !snapPoints) return;
		if (drawerNode && !drawerNode.contains(e.target as Node)) return;
		this.drawerHeight = drawerNode?.getBoundingClientRect().height || 0;
		this.isDragging = true;
		this.dragStartTime = new Date();

		// iOS doesn't trigger mouseUp after scrolling so we need to listen to touched in order to disallow dragging
		if (isIOS()) {
			window.addEventListener("touchend", () => (this.isAllowedToDrag = false), {
				once: true,
			});
		}
		// Ensure we maintain correct pointer capture even when going outside of the drawer
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		const direction = this.direction.current;

		this.pointerStart = isVertical(direction) ? e.clientY : e.clientX;
	};

	shouldDrag = (node: EventTarget, isDraggingInDirection: boolean) => {
		let element = node as HTMLElement;
		const highlightedText = window.getSelection()?.toString();
		const drawerNode = this.drawerNode;
		const direction = this.direction.current;
		const swipeAmount = drawerNode ? getTranslate(drawerNode, direction) : null;
		const date = new Date();

		if (element.hasAttribute("data-vaul-no-drag") || element.closest("[data-vaul-no-drag]")) {
			return false;
		}

		if (direction === "right" || direction === "left") {
			return true;
		}

		// Allow scrolling when animating
		if (this.openTime && date.getTime() - this.openTime.getTime() < 500) {
			return false;
		}

		if (swipeAmount !== null) {
			if (direction === "bottom" ? swipeAmount > 0 : swipeAmount < 0) {
				return true;
			}
		}

		// Don't drag if there's highlighted text
		if (highlightedText && highlightedText.length > 0) {
			return false;
		}

		// Disallow dragging if drawer was scrolled within `scrollLockTimeout`
		if (
			this.lastTimeDragPrevented &&
			date.getTime() - this.lastTimeDragPrevented.getTime() <
				this.scrollLockTimeout.current &&
			swipeAmount === 0
		) {
			this.lastTimeDragPrevented = date;
			return false;
		}

		if (isDraggingInDirection) {
			this.lastTimeDragPrevented = date;

			// We are dragging down so we should allow scrolling
			return false;
		}

		// Keep climbing up the DOM tree as long as there's a parent
		while (element) {
			// Check if the element is scrollable
			if (element.scrollHeight > element.clientHeight) {
				if (element.scrollTop !== 0) {
					this.lastTimeDragPrevented = new Date();

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
	};

	onDrag = (e: PointerEvent) => {
		const drawerNode = this.drawerNode;
		if (!drawerNode) return;
		// We need to know how much of the drawer has been dragged in percentages so that we can transform background accordingly
		if (!this.isDragging) return;
		const direction = this.direction.current;
		const directionMultiplier = direction === "bottom" || direction === "right" ? 1 : -1;
		const draggedDistance =
			(this.pointerStart - (isVertical(direction) ? e.clientY : e.clientX)) *
			directionMultiplier;

		const isDraggingInDirection = draggedDistance > 0;

		// Pre condition for disallowing dragging in the close direction.
		const snapPoints = this.snapPoints.current;
		const dismissible = this.dismissible.current;
		const noCloseSnapPointsPreCondition = snapPoints && !dismissible && !isDraggingInDirection;
		const activeSnapPointIndex = this.snapPointState.activeSnapPointIndex;

		// Disallow dragging down to close when first snap point is the active one and dismissible prop is set to false.
		if (noCloseSnapPointsPreCondition && activeSnapPointIndex === 0) return;

		// We need to capture last time when drag with scroll was triggered and have a timeout between
		const absDraggedDistance = Math.abs(draggedDistance);
		const wrapper = document.querySelector("[vaul-drawer-wrapper]");

		// Calculate the percentage dragged, where 1 is the closed position
		let percentageDragged = absDraggedDistance / this.drawerHeight;
		const snapPointPercentageDragged = this.snapPointState.getPercentageDragged(
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

		if (!this.isAllowedToDrag && !this.shouldDrag(e.target!, isDraggingInDirection)) return;
		drawerNode.classList.add(DRAG_CLASS);
		// If shouldDrag gave true once after pressing down on the drawer, we set isAllowedToDrag to true and it will remain true until we let go, there's no reason to disable dragging mid way, ever, and that's the solution to it
		this.isAllowedToDrag = true;
		setStyles(drawerNode, {
			transition: "none",
		});

		setStyles(this.overlayNode, {
			transition: "none",
		});

		if (snapPoints) {
			this.snapPointState.onDragSnapPoints({ draggedDistance });
		}

		// Run this only if snapPoints are not defined or if we are at the last snap point (highest one)
		if (isDraggingInDirection && !snapPoints) {
			const dampenedDraggedDistance = dampenValue(draggedDistance);

			const translateValue = Math.min(dampenedDraggedDistance * -1, 0) * directionMultiplier;
			setStyles(drawerNode, {
				transform: isVertical(direction)
					? `translate3d(0, ${translateValue}px, 0)`
					: `translate3d(${translateValue}px, 0, 0)`,
			});
			return;
		}

		const opacityValue = 1 - percentageDragged;

		if (
			this.snapPointState.shouldFade ||
			(this.fadeFromIndex.current && activeSnapPointIndex === this.fadeFromIndex.current - 1)
		) {
			this.onDragProp?.current(e, percentageDragged);

			setStyles(
				this.overlayNode,
				{
					opacity: `${opacityValue}`,
					transition: "none",
				},
				true
			);
		}

		if (wrapper && this.overlayNode && this.shouldScaleBackground.current) {
			// Calculate percentageDragged as a fraction (0 to 1)
			const scaleValue = Math.min(getScale() + percentageDragged * (1 - getScale()), 1);
			const borderRadiusValue = 8 - percentageDragged * 8;

			const translateValue = Math.max(0, 14 - percentageDragged * 14);

			setStyles(
				wrapper,
				{
					borderRadius: `${borderRadiusValue}px`,
					transform: isVertical(direction)
						? `scale(${scaleValue}) translate3d(0, ${translateValue}px, 0)`
						: `scale(${scaleValue}) translate3d(${translateValue}px, 0, 0)`,
					transition: "none",
				},
				true
			);
		}

		if (!snapPoints) {
			const translateValue = absDraggedDistance * directionMultiplier;

			setStyles(drawerNode, {
				transform: isVertical(direction)
					? `translate3d(0, ${translateValue}px, 0)`
					: `translate3d(${translateValue}px, 0, 0)`,
			});
		}
	};

	closeDrawer = () => {
		const drawerNode = this.drawerNode;
		if (!drawerNode) return;

		this.cancelDrag();
		this.onCloseProp.current();
		const direction = this.direction.current;

		setStyles(drawerNode, {
			transform: isVertical(direction)
				? `translate3d(0, ${direction === "bottom" ? "100%" : "-100%"}, 0)`
				: `translate3d(${direction === "right" ? "100%" : "-100%"}, 0, 0)`,
			transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
		});

		setStyles(this.overlayNode, {
			opacity: "0",
			transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
		});

		this.scaleBackground(false);

		window.setTimeout(() => {
			this.visible = false;
			this.open.current = false;
		}, 300);

		window.setTimeout(() => {
			if (this.snapPoints.current) {
				this.setActiveSnapPoint(this.snapPoints.current[0]);
			}
		}, TRANSITIONS.DURATION * 1000); // seconds to ms
	};

	resetDrawer = () => {
		const drawerNode = this.drawerNode;
		if (!drawerNode) return;
		const wrapper = document.querySelector("[data-vaul-drawer-wrapper]");
		const direction = this.direction.current;
		const currentSwipeAmount = getTranslate(drawerNode, direction);

		setStyles(drawerNode, {
			transform: "translate3d(0, 0, 0)",
			transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
		});

		setStyles(this.overlayNode, {
			transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			opacity: "1",
		});
		// Don't reset background if swiped upwards
		if (
			!(
				this.shouldScaleBackground.current &&
				currentSwipeAmount &&
				currentSwipeAmount > 0 &&
				this.open.current
			)
		) {
			return;
		}

		setStyles(
			wrapper,
			{
				borderRadius: `${BORDER_RADIUS}px`,
				overflow: "hidden",
				...(isVertical(direction)
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
	};

	cancelDrag = () => {
		const drawerNode = this.drawerNode;
		if (!this.isDragging || !drawerNode) return;

		drawerNode.classList.remove(DRAG_CLASS);
		this.isAllowedToDrag = false;
		this.isDragging = false;
		this.dragEndTime = new Date();
	};

	onRelease = (e: PointerEvent) => {
		const drawerNode = this.drawerNode;
		if (!this.isDragging || !drawerNode) return;

		drawerNode.classList.remove(DRAG_CLASS);
		this.isAllowedToDrag = false;
		this.isDragging = false;
		this.dragEndTime = new Date();
		const direction = this.direction.current;
		const swipeAmount = getTranslate(drawerNode, direction);

		if (!this.shouldDrag(e.target!, false) || !swipeAmount || Number.isNaN(swipeAmount)) return;

		if (this.dragStartTime === null) return;

		const timeTaken = this.dragEndTime.getTime() - this.dragStartTime.getTime();
		const distMoved = this.pointerStart - (isVertical(direction) ? e.clientY : e.clientX);
		const velocity = Math.abs(distMoved) / timeTaken;

		if (velocity > 0.05) {
			// `justReleased` is needed to prevent the drawer from focusing on an input when the drag ends, as it's not the intent most of the time.
			this.justReleased = true;

			setTimeout(() => {
				this.justReleased = false;
			}, 200);
		}

		if (this.snapPoints) {
			const directionMultiplier = direction === "bottom" || direction === "right" ? 1 : -1;
			this.snapPointState.onReleaseSnapPoints({
				draggedDistance: distMoved * directionMultiplier,
				closeDrawer: this.closeDrawer,
				velocity,
				dismissible: this.dismissible.current,
			});
			this.onReleaseProp.current(e, true);
			return;
		}

		// Moved upwards, don't do anything
		if (direction === "bottom" || direction === "right" ? distMoved > 0 : distMoved < 0) {
			this.resetDrawer();
			this.onReleaseProp.current(e, true);
			return;
		}

		if (velocity > VELOCITY_THRESHOLD) {
			this.closeDrawer();
			this.onReleaseProp.current(e, false);
			return;
		}

		const visibleDrawerHeight = Math.min(
			drawerNode.getBoundingClientRect().height ?? 0,
			window.innerHeight
		);

		if (swipeAmount >= visibleDrawerHeight * this.closeThreshold.current) {
			this.closeDrawer();
			this.onReleaseProp.current(e, false);
			return;
		}

		this.onReleaseProp.current(e, true);
		this.resetDrawer();
	};

	scaleBackground = (open: boolean) => {
		const wrapper = document.querySelector("[vaul-drawer-wrapper]");

		if (!wrapper || !this.shouldScaleBackground.current) return;

		if (open) {
			if (this.setBackgroundColorOnScale.current) {
				if (!this.noBodyStyles.current) {
					// setting original styles initially
					setStyles(document.body, {
						background:
							document.body.style.backgroundColor || document.body.style.background,
					});
					// setting body styles, with cache ignored, so that we can get correct original styles in reset
					setStyles(
						document.body,
						{
							background: "black",
						},
						true
					);
				}
			}

			setStyles(wrapper, {
				borderRadius: `${BORDER_RADIUS}px`,
				overflow: "hidden",
				...(isVertical(this.direction.current)
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
			});
		} else {
			// Exit
			resetStyles(wrapper, "overflow");
			resetStyles(wrapper, "transform");
			resetStyles(wrapper, "borderRadius");
			setStyles(wrapper, {
				transitionProperty: "transform, border-radius",
				transitionDuration: `${TRANSITIONS.DURATION}s`,
				transitionTimingFunction: `cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			});
		}
	};

	onNestedOpenChange = (o: boolean) => {
		const scale = o ? (window.innerWidth - NESTED_DISPLACEMENT) / window.innerWidth : 1;
		const y = o ? -NESTED_DISPLACEMENT : 0;

		if (this.nestedOpenChangeTimer) {
			window.clearTimeout(this.nestedOpenChangeTimer);
		}
		const drawerNode = this.drawerNode;

		setStyles(drawerNode, {
			transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			transform: `scale(${scale}) translate3d(0, ${y}px, 0)`,
		});
		const direction = this.direction.current;

		if (!o && drawerNode) {
			this.nestedOpenChangeTimer = setTimeout(() => {
				const translateValue = getTranslate(drawerNode as HTMLElement, direction);
				setStyles(drawerNode, {
					transition: "none",
					transform: isVertical(direction)
						? `translate3d(0, ${translateValue}px, 0)`
						: `translate3d(${translateValue}px, 0, 0)`,
				});
			}, 500);
		}
	};

	onNestedDrag = (_: PointerEvent, percentageDragged: number) => {
		if (percentageDragged < 0) return;
		const direction = this.direction.current;
		const initialDim = isVertical(direction) ? window.innerHeight : window.innerWidth;
		const initialScale = (initialDim - NESTED_DISPLACEMENT) / initialDim;
		const newScale = initialScale + percentageDragged * (1 - initialScale);
		const newTranslate = -NESTED_DISPLACEMENT + percentageDragged * NESTED_DISPLACEMENT;

		setStyles(this.drawerNode, {
			transform: isVertical(direction)
				? `scale(${newScale}) translate3d(0, ${newTranslate}px, 0)`
				: `scale(${newScale}) translate3d(${newTranslate}px, 0, 0)`,
			transition: "none",
		});
	};

	onNestedRelease = (_: PointerEvent, o: boolean) => {
		const direction = this.direction.current;
		const dim = isVertical(direction) ? window.innerHeight : window.innerWidth;
		const scale = o ? (dim - NESTED_DISPLACEMENT) / dim : 1;
		const translate = o ? -NESTED_DISPLACEMENT : 0;

		if (o) {
			setStyles(this.drawerNode, {
				transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
				transform: isVertical(direction)
					? `scale(${scale}) translate3d(0, ${translate}px, 0)`
					: `scale(${scale}) translate3d(${translate}px, 0, 0)`,
			});
		}
	};

	onOpenChange = (o: boolean) => {
		if (!o) {
			this.closeDrawer();
		} else {
			this.hasBeenOpened = true;
			this.setOpen(true);
		}
	};

	createContentState = (props: DrawerContentStateProps) => {
		return new DrawerContentState(props, this);
	};

	createOverlayState = (props: DrawerOverlayStateProps) => {
		return new DrawerOverlayState(props, this);
	};

	createHandleState = (props: DrawerHandleStateProps) => {
		return new DrawerHandleState(props, this);
	};
}

type DrawerContentStateProps = WithRefProps;

class DrawerContentState {
	#id: DrawerContentStateProps["id"];
	#ref: DrawerContentStateProps["ref"];
	root: DrawerRootState;
	#pointerStart = $state<{ x: number; y: number } | null>(null);
	#wasBeyondThePoint = $state(false);

	constructor(props: DrawerContentStateProps, root: DrawerRootState) {
		this.#id = props.id;
		this.#ref = props.ref;
		this.root = root;

		useRefById({
			id: this.#id,
			ref: this.#ref,
			condition: () => this.root.open.current,
			onRefChange: (node) => {
				this.root.drawerNode = node;
			},
		});

		$effect(() => {
			this.root.visible = true;
		});
	}

	#isDeltaInDirection = (
		delta: { x: number; y: number },
		direction: DrawerDirection,
		threshold = 0
	) => {
		if (this.#wasBeyondThePoint) return true;

		const deltaY = Math.abs(delta.y);
		const deltaX = Math.abs(delta.x);
		const isDeltaX = deltaX > deltaY;
		const dFactor = ["bottom", "right"].includes(direction) ? 1 : -1;

		if (direction === "bottom" || direction === "right") {
			const isReverseDirection = delta.x * dFactor < 0;
			if (!isReverseDirection && deltaX >= 0 && deltaX <= threshold) {
				return isDeltaX;
			}
		} else {
			const isReverseDirection = delta.y * dFactor < 0;
			if (!isReverseDirection && deltaY >= 0 && deltaY <= threshold) {
				return !isDeltaX;
			}
		}

		this.#wasBeyondThePoint = true;
		return true;
	};

	onMountAutoFocus = (e: Event) => {
		e.preventDefault();
		this.root.drawerNode?.focus();
	};

	onInteractOutside = (e: PointerEvent | TouchEvent | MouseEvent) => {
		if (!this.root.modal.current) {
			e.preventDefault();
			return;
		}
		if (this.root.keyboardIsOpen) {
			this.root.keyboardIsOpen = false;
		}
		e.preventDefault();
		this.root.closeDrawer();
	};

	onFocusOutside = (e: Event) => {
		if (this.root.modal.current) return;
		e.preventDefault();
	};

	#onpointerdown = (e: PointerEvent) => {
		if (this.root.handleOnly.current) return;
		this.#pointerStart = { x: e.clientX, y: e.clientY };
		this.root.onPress(e);
	};

	#onpointermove = (e: PointerEvent) => {
		if (this.root.handleOnly.current) return;
		if (!this.#pointerStart) return;
		const yPosition = e.clientY - this.#pointerStart.y;
		const xPosition = e.clientX - this.#pointerStart.x;

		const swipeStartThreshold = e.pointerType === "touch" ? 10 : 2;
		const delta = { x: xPosition, y: yPosition };

		const isAllowedToSwipe = this.#isDeltaInDirection(
			delta,
			this.root.direction.current,
			swipeStartThreshold
		);
		if (isAllowedToSwipe) {
			this.root.onDrag(e);
		} else if (
			Math.abs(xPosition) > swipeStartThreshold ||
			Math.abs(yPosition) > swipeStartThreshold
		) {
			this.#pointerStart = null;
		}
	};

	#onpointerup = (e: PointerEvent) => {
		this.#pointerStart = null;
		this.#wasBeyondThePoint = false;
		this.root.onRelease(e);
	};

	#style = $derived.by(() => this.root.getContentStyle());

	props = $derived.by(
		() =>
			({
				id: this.#id.current,
				"data-vaul-drawer": "",
				"data-vaul-drawer-direction": this.root.direction.current,
				"data-vaul-drawer-visible": this.root.visible ? "true" : "false",
				style: this.#style,
				onpointerdown: this.#onpointerdown,
				onpointermove: this.#onpointermove,
				onpointerup: this.#onpointerup,
			}) as const
	);
}

type DrawerOverlayStateProps = WithRefProps;

class DrawerOverlayState {
	#id: DrawerOverlayStateProps["id"];
	#ref: DrawerOverlayStateProps["ref"];
	root: DrawerRootState;
	#hasSnapPoints = $derived.by(
		() => this.root.snapPoints.current && this.root.snapPoints.current.length > 0
	);

	constructor(props: DrawerOverlayStateProps, root: DrawerRootState) {
		this.#id = props.id;
		this.#ref = props.ref;
		this.root = root;

		useRefById({
			id: this.#id,
			ref: this.#ref,
			condition: () => this.root.open.current,
			onRefChange: (node) => {
				this.root.overlayNode = node;
			},
		});
	}

	#onmouseup = (e: PointerEvent) => {
		this.root.onRelease(e);
	};

	props = $derived.by(
		() =>
			({
				id: this.#id.current,
				"data-vaul-drawer-visible": this.root.visible ? "true" : "false",
				"data-vaul-overlay": "",
				"data-vaul-snap-points":
					this.root.open.current && this.#hasSnapPoints ? "true" : "false",
				"data-vaul-snap-points-overlay":
					this.root.open.current && this.root.snapPointState.shouldFade
						? "true"
						: "false",
				onmouseup: this.#onmouseup,
			}) as const
	);
}

type DrawerHandleStateProps = WithRefProps &
	ReadableBoxedValues<{
		preventCycle: boolean;
	}>;

const LONG_HANDLE_PRESS_TIMEOUT = 250;
const DOUBLE_TAP_TIMEOUT = 120;

class DrawerHandleState {
	#id: DrawerHandleStateProps["id"];
	#ref: DrawerHandleStateProps["ref"];
	#preventCycle: DrawerHandleStateProps["preventCycle"];
	root: DrawerRootState;
	#closeTimeoutId: number | null = $state(null);
	#shouldCancelInteractions = $state(false);

	constructor(props: DrawerHandleStateProps, root: DrawerRootState) {
		this.#id = props.id;
		this.#ref = props.ref;
		this.#preventCycle = props.preventCycle;
		this.root = root;

		useRefById({
			id: this.#id,
			ref: this.#ref,
			condition: () => this.root.open.current,
			onRefChange: (node) => {
				this.root.triggerNode = node;
			},
		});
	}

	handleStartCycle = () => {
		if (this.#shouldCancelInteractions) {
			this.handleCancelInteraction();
			return;
		}
		window.setTimeout(() => {
			this.handleCycleSnapPoints();
		}, DOUBLE_TAP_TIMEOUT);
	};

	handleCycleSnapPoints = () => {
		// prevent accidental taps while resizing drawer
		if (this.root.isDragging || this.#preventCycle.current || this.#shouldCancelInteractions) {
			this.handleCancelInteraction();
			return;
		}
		// clear timeout id if the user releases the handle before the cancel timeout
		this.handleCancelInteraction();

		const snapPoints = this.root.snapPoints.current;
		const dismissible = this.root.dismissible.current;

		if ((!snapPoints || snapPoints.length === 0) && dismissible) {
			this.root.closeDrawer();
			return;
		}

		const activeSnapPoint = this.root.activeSnapPoint.current;

		const isLastSnapPoint = activeSnapPoint === snapPoints?.[snapPoints.length - 1];

		if (isLastSnapPoint && dismissible) {
			this.root.closeDrawer();
			return;
		}

		const currentSnapIdx = snapPoints?.findIndex((snapPoint) => snapPoint === activeSnapPoint);
		if (currentSnapIdx === -1 || currentSnapIdx === undefined) return;
		const nextSnapPoint = snapPoints?.[currentSnapIdx + 1];
		if (!nextSnapPoint) return;
		this.root.setActiveSnapPoint(nextSnapPoint);
	};

	handleStartInteraction = () => {
		this.#closeTimeoutId = window.setTimeout(() => {
			// cancel click interaction on a long press
			this.#shouldCancelInteractions = true;
		}, LONG_HANDLE_PRESS_TIMEOUT);
	};

	handleCancelInteraction = () => {
		if (this.#closeTimeoutId) {
			window.clearTimeout(this.#closeTimeoutId);
		}
		this.#shouldCancelInteractions = false;
	};

	#onclick = (_: MouseEvent) => {
		this.handleStartCycle();
	};

	#ondblclick = (_: MouseEvent) => {
		this.#shouldCancelInteractions = true;
		this.root.closeDrawer();
	};

	#onpointercancel = (_: PointerEvent) => {
		this.handleCancelInteraction();
	};

	#onpointerdown = (e: PointerEvent) => {
		if (this.root.handleOnly.current) {
			this.root.onPress(e);
		}
		this.handleStartInteraction();
	};

	#onpointermove = (e: PointerEvent) => {
		if (this.root.handleOnly.current) {
			this.root.onDrag(e);
		}
	};

	props = $derived.by(
		() =>
			({
				id: this.#id.current,
				"data-vaul-drawer-visible": this.root.visible ? "true" : "false",
				"data-vaul-handle": "",
				"aria-hidden": "true",
				onclick: this.#onclick,
				ondblclick: this.#ondblclick,
				onpointercancel: this.#onpointercancel,
				onpointerdown: this.#onpointerdown,
				onpointermove: this.#onpointermove,
			}) as const
	);

	hitAreaProps = $derived.by(
		() =>
			({
				"data-vaul-handle-hitarea": "",
				"aria-hidden": "true",
			}) as const
	);
}

////////////////////////////////////
// CONTEXT
////////////////////////////////////

export const [setDrawerRootContext, getDrawerRootContext] =
	createContext<DrawerRootState>("Drawer.Root");

export function useDrawerRoot(props: DrawerRootStateProps) {
	return setDrawerRootContext(new DrawerRootState(props));
}

export function useDrawerContent(props: DrawerContentStateProps) {
	return getDrawerRootContext().createContentState(props);
}

export function useDrawerOverlay(props: DrawerOverlayStateProps) {
	return getDrawerRootContext().createOverlayState(props);
}

export function useDrawerHandle(props: DrawerHandleStateProps) {
	return getDrawerRootContext().createHandleState(props);
}

////////////////////////////////////
// HELPERS
////////////////////////////////////

function getScale() {
	return (window.innerWidth - WINDOW_TOP_OFFSET) / window.innerWidth;
}

function getDistanceMoved(
	pointerStart: number,
	direction: DrawerDirection,
	event: PointerEvent | MouseEvent | TouchEvent
) {
	if (event.type.startsWith("touch")) {
		return getDistanceMovedForTouch(pointerStart, direction, event as TouchEvent);
	} else {
		return getDistanceMovedForPointer(pointerStart, direction, event as PointerEvent);
	}
}

function getDistanceMovedForPointer(
	pointerStart: number,
	direction: DrawerDirection,
	event: PointerEvent | MouseEvent
) {
	return pointerStart - (isVertical(direction) ? event.screenY : event.screenX);
}

function getDistanceMovedForTouch(
	pointerStart: number,
	direction: DrawerDirection,
	event: TouchEvent
) {
	return (
		pointerStart -
		(isVertical(direction) ? event.changedTouches[0].screenY : event.changedTouches[0].screenX)
	);
}

function getDirectionMultiplier(direction: DrawerDirection) {
	return direction === "bottom" || direction === "right" ? 1 : -1;
}

export function dampenValue(v: number) {
	return 8 * (Math.log(v + 1) - 2);
}
