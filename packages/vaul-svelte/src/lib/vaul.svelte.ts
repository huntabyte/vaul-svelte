import { untrack } from "svelte";
import type {
	Box,
	Getter,
	ReadableBoxedValues,
	WithRefProps,
	WritableBox,
	WritableBoxedValues,
} from "svelte-toolbelt";
import type { MouseEventHandler, PointerEventHandler } from "svelte/elements";
import { isInput, isVertical } from "./internal/helpers/is.js";
import {
	BORDER_RADIUS,
	DRAG_CLASS,
	NESTED_DISPLACEMENT,
	TRANSITIONS,
	VELOCITY_THRESHOLD,
	WINDOW_TOP_OFFSET,
} from "./internal/constants.js";
import { PositionFixed } from "./position-fixed.svelte.js";
import { createContext } from "./internal/createContext.js";
import { SnapPointsState } from "./snap-points.svelte.js";
import type { DrawerDirection, OnDrag, OnRelease } from "./types.js";
import { getTranslate, isIOS, reset, set } from "./helpers.js";
import { useScaleBackground } from "./use-scale-background.svelte.js";

type DrawerRootStateProps = ReadableBoxedValues<{
	closeThreshold: number;
	shouldScaleBackground: boolean;
	scrollLockTimeout: number;
	snapPoints: (string | number)[] | undefined;
	fadeFromIndex: number | undefined;
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
	disablePreventScroll: boolean;
	container: HTMLElement | null;
	snapToSequentialPoint: boolean;
	repositionInputs: boolean;
	autoFocus: boolean;
}> &
	WritableBoxedValues<{
		open: boolean;
		activeSnapPoint: number | string | null | undefined;
	}>;

export class DrawerRootState {
	open: DrawerRootStateProps["open"];
	activeSnapPoint: DrawerRootStateProps["activeSnapPoint"];
	closeThreshold: DrawerRootStateProps["closeThreshold"];
	shouldScaleBackground: DrawerRootStateProps["shouldScaleBackground"];
	scrollLockTimeout: DrawerRootStateProps["scrollLockTimeout"];
	snapPoints: DrawerRootStateProps["snapPoints"];
	fadeFromIndex: DrawerRootStateProps["fadeFromIndex"];
	fixed: DrawerRootStateProps["fixed"];
	dismissible: DrawerRootStateProps["dismissible"];
	direction: DrawerRootStateProps["direction"];
	onDragProp: DrawerRootStateProps["onDrag"];
	onReleaseProp: DrawerRootStateProps["onRelease"];
	nested: DrawerRootStateProps["nested"];
	onCloseProp: DrawerRootStateProps["onClose"];
	backgroundColor: DrawerRootStateProps["backgroundColor"];
	modal: DrawerRootStateProps["modal"];
	handleOnly: DrawerRootStateProps["handleOnly"];
	noBodyStyles: DrawerRootStateProps["noBodyStyles"];
	preventScrollRestoration: DrawerRootStateProps["preventScrollRestoration"];
	setBackgroundColorOnScale: DrawerRootStateProps["setBackgroundColorOnScale"];
	disablePreventScroll: DrawerRootStateProps["disablePreventScroll"];
	container: DrawerRootStateProps["container"];
	snapToSequentialPoint: DrawerRootStateProps["snapToSequentialPoint"];
	repositionInputs: DrawerRootStateProps["repositionInputs"];
	autoFocus: DrawerRootStateProps["autoFocus"];
	//
	hasBeenOpened = $state(false);
	isDragging = $state(false);
	justReleased = $state(false);
	overlayNode = $state<HTMLElement | null>(null);
	openTime = $state<Date | null>(null);
	dragStartTime = $state<Date | null>(null);
	dragEndTime = $state<Date | null>(null);
	lastTimeDragPrevented = $state<Date | null>(null);
	isAllowedToDrag = $state(false);
	nestedOpenChangeTimer = $state<number | null>(null);
	pointerStart = $state(0);
	keyboardIsOpen = $state(false);
	previousDiffFromInitial = $state(0);
	drawerNode = $state<HTMLElement | null>(null);
	drawerHeight = $state(0);
	drawerWidth = $state(0);
	initialDrawerHeight = $state(0);
	//
	snapPointsState: SnapPointsState;
	snapPointsOffset = $derived.by(() => this.snapPointsState.snapPointsOffset);
	positionFixedState: PositionFixed;

	constructor(props: DrawerRootStateProps) {
		this.open = props.open;
		this.activeSnapPoint = props.activeSnapPoint;
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
		this.backgroundColor = props.backgroundColor;
		this.modal = props.modal;
		this.handleOnly = props.handleOnly;
		this.noBodyStyles = props.noBodyStyles;
		this.preventScrollRestoration = props.preventScrollRestoration;
		this.setBackgroundColorOnScale = props.setBackgroundColorOnScale;
		this.disablePreventScroll = props.disablePreventScroll;
		this.container = props.container;
		this.snapToSequentialPoint = props.snapToSequentialPoint;
		this.repositionInputs = props.repositionInputs;
		this.autoFocus = props.autoFocus;
		//
		this.snapPointsState = new SnapPointsState(this);
		this.positionFixedState = new PositionFixed(this);

		$effect(() => {
			const activeSnapPointIndex = this.snapPointsState.activeSnapPointIndex;
			const snapPoints = this.snapPoints.current;
			const snapPointsOffset = this.snapPointsState.snapPointsOffset;
			this.drawerNode;

			return untrack(() => {
				const onVisualViewportChange = () => {
					if (!this.drawerNode || !this.repositionInputs.current) return;

					const focusedElement = document.activeElement as HTMLElement;
					if (isInput(focusedElement) || this.keyboardIsOpen) {
						const visualViewportHeight = window.visualViewport?.height || 0;
						const totalHeight = window.innerHeight;
						// This is the height of the keyboard
						let diffFromInitial = totalHeight - visualViewportHeight;
						const drawerHeight = this.drawerNode.getBoundingClientRect().height || 0;
						// Adjust drawer height only if it's tall enough
						const isTallEnough = drawerHeight > totalHeight * 0.8;

						if (!this.initialDrawerHeight) {
							this.initialDrawerHeight = drawerHeight;
						}
						const offsetFromTop = this.drawerNode.getBoundingClientRect().top;

						// visualViewport height may change due to some subtle changes to the keyboard. Checking if the height changed by 60 or more will make sure that they keyboard really changed its open state.
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
						if (drawerHeight > visualViewportHeight || this.keyboardIsOpen) {
							const height = this.drawerNode.getBoundingClientRect().height;
							let newDrawerHeight = height;

							if (height > visualViewportHeight) {
								newDrawerHeight =
									visualViewportHeight -
									(isTallEnough ? offsetFromTop : WINDOW_TOP_OFFSET);
							}
							// When fixed, don't move the drawer upwards if there's space, but rather only change it's height so it's fully scrollable when the keyboard is open
							if (this.fixed.current) {
								this.drawerNode.style.height = `${height - Math.max(diffFromInitial, 0)}px`;
							} else {
								this.drawerNode.style.height = `${Math.max(newDrawerHeight, visualViewportHeight - offsetFromTop)}px`;
							}
						} else {
							this.drawerNode.style.height = `${this.initialDrawerHeight}px`;
						}

						if (snapPoints && snapPoints.length > 0 && !this.keyboardIsOpen) {
							this.drawerNode.style.bottom = `0px`;
						} else {
							// Negative bottom value would never make sense
							this.drawerNode.style.bottom = `${Math.max(diffFromInitial, 0)}px`;
						}
					}
				};

				window.visualViewport?.addEventListener("resize", onVisualViewportChange);
				return () =>
					window.visualViewport?.removeEventListener("resize", onVisualViewportChange);
			});
		});

		// Trigger enter animation without using CSS animation
		$effect(() => {
			const open = this.open.current;
			return untrack(() => {
				if (open) {
					set(document.documentElement, {
						scrollBehavior: "auto",
					});
					this.openTime = new Date();
				}
				return () => {
					reset(document.documentElement, "scrollBehavior");
				};
			});
		});

		// $effect(() => {
		// 	if (!this.modal.current) {
		// 		window.requestAnimationFrame(() => {
		// 			document.body.style.pointerEvents = "auto";
		// 		});
		// 	}
		// });
	}

	setActiveSnapPoint = (snapPoint: string | number | null) => {
		this.activeSnapPoint.current = snapPoint;
	};

	onSnapPointChange = (activeSnapPointIndex: number) => {
		// Change openTime ref when we reach the last snap point to prevent dragging for 500ms incase it's scrollable.
		if (this.snapPoints.current && activeSnapPointIndex === this.snapPointsOffset.length - 1)
			this.openTime = new Date();
	};

	onPress = (e: PointerEvent) => {
		if (!this.dismissible.current && !this.snapPoints.current) return;
		if (this.drawerNode && !this.drawerNode.contains(e.target as Node)) return;

		const drawerRect = this.drawerNode?.getBoundingClientRect();

		this.drawerHeight = drawerRect?.height || 0;
		this.drawerWidth = drawerRect?.width || 0;
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

		this.pointerStart = isVertical(this.direction.current) ? e.pageY : e.pageX;
	};

	shouldDrag = (el: EventTarget | null, isDraggingInDirection: boolean) => {
		if (el === null) return false;
		let element = el as HTMLElement;
		const highlightedText = window.getSelection()?.toString();
		const swipeAmount = this.drawerNode
			? getTranslate(this.drawerNode, this.direction.current)
			: null;
		const date = new Date();

		if (element.hasAttribute("data-vaul-no-drag") || element.closest("[data-vaul-no-drag]")) {
			return false;
		}

		if (this.direction.current === "right" || this.direction.current === "left") {
			return true;
		}

		// Allow scrolling when animating
		if (this.openTime && date.getTime() - this.openTime.getTime() < 500) {
			return false;
		}

		if (swipeAmount !== null) {
			if (this.direction.current === "bottom" ? swipeAmount > 0 : swipeAmount < 0) {
				return true;
			}
		}

		// Don't drag if there's highlighted text
		if (highlightedText && highlightedText.length > 0) {
			return false;
		}

		// Disallow dragging if drawer was scrolled within `scrollLockTimeout`
		if (
			this.lastTimeDragPrevented !== null &&
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
		if (!this.drawerNode) return;
		if (!this.isDragging) return;
		const directionMultiplier =
			this.direction.current === "bottom" || this.direction.current === "right" ? 1 : -1;
		const draggedDistance =
			(this.pointerStart - (isVertical(this.direction.current) ? e.pageY : e.pageX)) *
			directionMultiplier;
		const isDraggingInDirection = draggedDistance > 0;

		// Pre condition for disallowing dragging in the close direction.
		const noCloseSnapPointsPreCondition =
			this.snapPoints.current && !this.dismissible.current && !isDraggingInDirection;

		// Disallow dragging down to close when first snap point is the active one and dismissible prop is set to false.
		if (noCloseSnapPointsPreCondition && this.snapPointsState.activeSnapPointIndex === 0)
			return;

		// We need to capture last time when drag with scroll was triggered and have a timeout between
		const absDraggedDistance = Math.abs(draggedDistance);
		const wrapper = document.querySelector("[data-vaul-drawer-wrapper]");
		const drawerDimension =
			this.direction.current === "bottom" || this.direction.current === "top"
				? this.drawerHeight
				: this.drawerWidth;

		// Calculate the percentage dragged, where 1 is the closed position
		let percentageDragged = absDraggedDistance / drawerDimension;

		const snapPointPercentageDragged = this.snapPointsState.getPercentageDragged(
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

		if (!this.isAllowedToDrag && !this.shouldDrag(e.target, isDraggingInDirection)) {
			return;
		}
		this.drawerNode.classList.add(DRAG_CLASS);
		// If shouldDrag gave true once after pressing down on the drawer, we set isAllowedToDrag to true and it will remain true until we let go, there's no reason to disable dragging mid way, ever, and that's the solution to it
		this.isAllowedToDrag = true;

		set(this.drawerNode, {
			transition: "none",
		});

		set(this.overlayNode, {
			transition: "none",
		});

		if (this.snapPoints.current && this.snapPoints.current.length > 0) {
			this.snapPointsState.onDrag({ draggedDistance });
		}

		// Run this only if snapPoints are not defined or if we are at the last snap point (highest one)
		if (isDraggingInDirection && !this.snapPoints.current) {
			const dampenedDraggedDistance = dampenValue(draggedDistance);

			const translateValue = Math.min(dampenedDraggedDistance * -1, 0) * directionMultiplier;
			set(this.drawerNode, {
				transform: isVertical(this.direction.current)
					? `translate3d(0, ${translateValue}px, 0)`
					: `translate3d(${translateValue}px, 0, 0)`,
			});
			return;
		}

		const opacityValue = 1 - percentageDragged;

		if (
			this.snapPointsState.shouldFade ||
			(this.snapPointsState.fadeFromIndex &&
				this.snapPointsState.activeSnapPointIndex ===
					this.snapPointsState.fadeFromIndex - 1)
		) {
			this.onDragProp.current?.(e, percentageDragged);

			set(
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

			set(
				wrapper,
				{
					borderRadius: `${borderRadiusValue}px`,
					transform: isVertical(this.direction.current)
						? `scale(${scaleValue}) translate3d(0, ${translateValue}px, 0)`
						: `scale(${scaleValue}) translate3d(${translateValue}px, 0, 0)`,
					transition: "none",
				},
				true
			);
		}

		if (!this.snapPoints.current) {
			const translateValue = absDraggedDistance * directionMultiplier;

			set(this.drawerNode, {
				transform: isVertical(this.direction.current)
					? `translate3d(0, ${translateValue}px, 0)`
					: `translate3d(${translateValue}px, 0, 0)`,
			});
		}
	};

	closeDrawer = (fromWithin?: boolean) => {
		this.cancelDrag();
		this.onCloseProp.current?.();

		if (!fromWithin) {
			this.open.current = false;
		}

		window.setTimeout(() => {
			if (this.snapPoints.current && this.snapPoints.current.length > 0) {
				this.activeSnapPoint.current = this.snapPoints.current[0];
			}
		}, TRANSITIONS.DURATION * 1000);
	};

	resetDrawer = () => {
		if (!this.drawerNode) return;
		const wrapper = document.querySelector("[data-vaul-drawer-wrapper]");
		const currentSwipeAmount = getTranslate(this.drawerNode, this.direction.current);

		set(this.drawerNode, {
			transform: "translate3d(0, 0, 0)",
			transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
		});

		set(this.overlayNode, {
			transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			opacity: "1",
		});

		// Don't reset background if swiped upwards
		if (
			this.shouldScaleBackground.current &&
			currentSwipeAmount &&
			currentSwipeAmount > 0 &&
			this.open.current
		) {
			set(
				wrapper,
				{
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
				},
				true
			);
		}
	};

	cancelDrag = () => {
		if (!this.isDragging || !this.drawerNode) return;
		this.drawerNode.classList.remove(DRAG_CLASS);
		this.isAllowedToDrag = false;
		this.isDragging = false;
		this.dragEndTime = new Date();
	};

	onRelease = (e: PointerEvent | MouseEvent) => {
		if (!this.isDragging || !this.drawerNode) return;

		this.drawerNode.classList.remove(DRAG_CLASS);
		this.isAllowedToDrag = false;
		this.isDragging = false;
		this.dragEndTime = new Date();
		const swipeAmount = getTranslate(this.drawerNode, this.direction.current);

		if (!this.shouldDrag(e.target, false) || !swipeAmount || Number.isNaN(swipeAmount)) return;

		if (this.dragStartTime === null) return;

		const timeTaken = this.dragEndTime.getTime() - this.dragStartTime.getTime();
		const distMoved =
			this.pointerStart - (isVertical(this.direction.current) ? e.pageY : e.pageX);
		const velocity = Math.abs(distMoved) / timeTaken;

		if (velocity > 0.05) {
			// `justReleased` is needed to prevent the drawer from focusing on an input when the drag ends, as it's not the intent most of the time.
			this.justReleased = true;

			setTimeout(() => {
				this.justReleased = false;
			}, 200);
		}

		if (this.snapPoints.current) {
			const directionMultiplier =
				this.direction.current === "bottom" || this.direction.current === "right" ? 1 : -1;
			this.snapPointsState.onRelease({
				draggedDistance: distMoved * directionMultiplier,
				closeDrawer: this.closeDrawer,
				velocity,
				dismissible: this.dismissible.current,
			});
			this.onReleaseProp.current?.(e, true);
			return;
		}

		// Moved upwards, don't do anything
		if (
			this.direction.current === "bottom" || this.direction.current === "right"
				? distMoved > 0
				: distMoved < 0
		) {
			this.resetDrawer();
			this.onReleaseProp.current?.(e, true);
			return;
		}

		if (velocity > VELOCITY_THRESHOLD) {
			this.closeDrawer();
			this.onReleaseProp.current?.(e, false);
			return;
		}

		const visibleDrawerHeight = Math.min(
			this.drawerNode.getBoundingClientRect().height ?? 0,
			window.innerHeight
		);
		const visibleDrawerWidth = Math.min(
			this.drawerNode.getBoundingClientRect().width ?? 0,
			window.innerWidth
		);

		const isHorizontalSwipe =
			this.direction.current === "left" || this.direction.current === "right";
		if (
			Math.abs(swipeAmount) >=
			(isHorizontalSwipe ? visibleDrawerWidth : visibleDrawerHeight) *
				this.closeThreshold.current
		) {
			this.closeDrawer();
			this.onReleaseProp.current?.(e, false);
			return;
		}

		this.onReleaseProp.current?.(e, true);
		this.resetDrawer();
	};

	onNestedOpenChange = (o: boolean) => {
		const scale = o ? (window.innerWidth - NESTED_DISPLACEMENT) / window.innerWidth : 1;

		const y = o ? -NESTED_DISPLACEMENT : 0;

		if (this.nestedOpenChangeTimer) {
			window.clearTimeout(this.nestedOpenChangeTimer);
		}

		set(this.drawerNode, {
			transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			transform: `scale(${scale}) translate3d(0, ${y}px, 0)`,
		});

		if (!o && this.drawerNode) {
			this.nestedOpenChangeTimer = window.setTimeout(() => {
				const translateValue = getTranslate(
					this.drawerNode as HTMLElement,
					this.direction.current
				);
				set(this.drawerNode, {
					transition: "none",
					transform: isVertical(this.direction.current)
						? `translate3d(0, ${translateValue}px, 0)`
						: `translate3d(${translateValue}px, 0, 0)`,
				});
			}, 500);
		}
	};

	onNestedDrag = (_e: PointerEvent | MouseEvent, percentageDragged: number) => {
		if (percentageDragged < 0) return;

		const initialScale = (window.innerWidth - NESTED_DISPLACEMENT) / window.innerWidth;
		const newScale = initialScale + percentageDragged * (1 - initialScale);
		const newTranslate = -NESTED_DISPLACEMENT + percentageDragged * NESTED_DISPLACEMENT;

		set(this.drawerNode, {
			transform: isVertical(this.direction.current)
				? `scale(${newScale}) translate3d(0, ${newTranslate}px, 0)`
				: `scale(${newScale}) translate3d(${newTranslate}px, 0, 0)`,
			transition: "none",
		});
	};

	onNestedRelease = (_e: PointerEvent | MouseEvent, o: boolean) => {
		const dim = isVertical(this.direction.current) ? window.innerHeight : window.innerWidth;
		const scale = o ? (dim - NESTED_DISPLACEMENT) / dim : 1;
		const translate = o ? -NESTED_DISPLACEMENT : 0;

		if (o) {
			set(this.drawerNode, {
				transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
				transform: isVertical(this.direction.current)
					? `scale(${scale}) translate3d(0, ${translate}px, 0)`
					: `scale(${scale}) translate3d(${translate}px, 0, 0)`,
			});
		}
	};

	onDialogOpenChange = (o: boolean) => {
		if (!this.dismissible.current && !this.open.current) return;
		if (o) {
			this.hasBeenOpened = true;
		} else {
			this.closeDrawer(true);
		}

		this.open.current = o;
	};
}

type DrawerOverlayStateProps = WithRefProps;

class DrawerOverlayState {
	#root: DrawerRootState;
	#id: DrawerOverlayStateProps["id"];
	#ref: DrawerOverlayStateProps["ref"];
	mounted = $state(false);

	constructor(props: DrawerOverlayStateProps, root: DrawerRootState) {
		this.#root = root;
		this.#id = props.id;
		this.#ref = props.ref;

		useRefById({
			id: this.#id,
			ref: this.#ref,
			onRefChange: (node) => {
				if (!this.mounted) {
					this.#root.overlayNode = null;
				} else {
					this.#root.overlayNode = node;
				}
			},
			deps: () => this.mounted,
		});
	}

	#hasSnapPoints = $derived.by(
		() => this.#root.snapPoints.current && this.#root.snapPoints.current.length > 0
	);

	#onmouseup = (e: MouseEvent) => {
		this.#root.onRelease(e);
	};

	props = $derived.by(
		() =>
			({
				id: this.#id.current,
				"data-vaul-overlay": "",
				"data-vaul-snap-points":
					this.#root.open.current && this.#hasSnapPoints ? "true" : "false",
				"data-vaul-snap-points-overlay":
					this.#root.open.current && this.#root.snapPointsState.shouldFade
						? "true"
						: "false",
				onmouseup: this.#onmouseup,
			}) as const
	);
}

type DrawerContentStateProps = WithRefProps &
	ReadableBoxedValues<{
		onInteractOutside: (e: PointerEvent) => void;
		onPointerDown: PointerEventHandler<HTMLDivElement>;
		onPointerMove: PointerEventHandler<HTMLDivElement>;
		onPointerUp: PointerEventHandler<HTMLDivElement>;
		onPointerOut: PointerEventHandler<HTMLDivElement>;
		onContextMenu: MouseEventHandler<HTMLDivElement>;
		onOpenAutoFocus: (e: Event) => void;
	}>;

class DrawerContentState {
	#root: DrawerRootState;
	#id: DrawerContentStateProps["id"];
	#ref: DrawerContentStateProps["ref"];
	#onInteractOutsideProp: DrawerContentStateProps["onInteractOutside"];
	#onPointerDownProp: DrawerContentStateProps["onPointerDown"];
	#onPointerMoveProp: DrawerContentStateProps["onPointerMove"];
	#onPointerUpProp: DrawerContentStateProps["onPointerUp"];
	#onPointerOutProp: DrawerContentStateProps["onPointerOut"];
	#onContextMenuProp: DrawerContentStateProps["onContextMenu"];
	#onOpenAutoFocusProp: DrawerContentStateProps["onOpenAutoFocus"];
	//
	delayedSnapPoints = $state(false);
	pointerStart = $state<{ x: number; y: number } | null>(null);
	lastKnownPointerEvent = $state<PointerEvent | null>(null);
	wasBeyondThePoint = $state(false);
	hasSnapPoints = $derived.by(
		() => this.#root.snapPoints.current && this.#root.snapPoints.current.length > 0
	);
	mounted = $state(false);

	constructor(props: DrawerContentStateProps, root: DrawerRootState) {
		this.#root = root;
		this.#id = props.id;
		this.#ref = props.ref;
		this.#onInteractOutsideProp = props.onInteractOutside;
		this.#onPointerDownProp = props.onPointerDown;
		this.#onPointerMoveProp = props.onPointerMove;
		this.#onPointerUpProp = props.onPointerUp;
		this.#onPointerOutProp = props.onPointerOut;
		this.#onContextMenuProp = props.onContextMenu;
		this.#onOpenAutoFocusProp = props.onOpenAutoFocus;

		useRefById({
			id: this.#id,
			ref: this.#ref,
			onRefChange: (node) => {
				if (!this.mounted) {
					this.#root.drawerNode = null;
				} else {
					this.#root.drawerNode = node;
				}
			},
			deps: () => this.mounted && this.#root.open.current,
		});

		useScaleBackground(this.#root);

		$effect(() => {
			if (this.hasSnapPoints && this.#root.open.current) {
				window.requestAnimationFrame(() => {
					this.delayedSnapPoints = true;
				});
			} else {
				this.delayedSnapPoints = false;
			}
		});
	}

	isDeltaInDirection = (
		delta: { x: number; y: number },
		direction: DrawerDirection,
		threshold = 0
	) => {
		if (this.wasBeyondThePoint) return true;

		const deltaY = Math.abs(delta.y);
		const deltaX = Math.abs(delta.x);
		const isDeltaX = deltaX > deltaY;
		const dFactor = ["bottom", "right"].includes(direction) ? 1 : -1;

		if (direction === "left" || direction === "right") {
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

		this.wasBeyondThePoint = true;
		return true;
	};

	handleOnPointerUp = (e: PointerEvent) => {
		this.pointerStart = null;
		this.wasBeyondThePoint = false;
		this.#root.onRelease(e);
	};

	onOpenAutoFocus = (e: Event) => {
		this.#onOpenAutoFocusProp.current(e);
		// if (!this.#root.autoFocus.current) {
		// 	e.preventDefault();
		// }
	};

	onInteractOutside = (e: PointerEvent) => {
		this.#onInteractOutsideProp.current(e);

		if (!this.#root.modal.current || e.defaultPrevented) {
			e.preventDefault();
			return;
		}

		if (this.#root.keyboardIsOpen) {
			this.#root.keyboardIsOpen = false;
		}
	};

	onFocusOutside = (e: Event) => {
		if (!this.#root.modal.current) {
			e.preventDefault();
		}
	};

	#onpointermove: PointerEventHandler<HTMLDivElement> = (e) => {
		this.lastKnownPointerEvent = e;
		if (this.#root.handleOnly.current) return;
		this.#onPointerMoveProp.current(e);
		if (!this.pointerStart) return;
		const yPosition = e.pageY - this.pointerStart.y;
		const xPosition = e.pageX - this.pointerStart.x;

		const swipeStartThreshold = e.pointerType === "touch" ? 10 : 2;
		const delta = { x: xPosition, y: yPosition };

		const isAllowedToSwipe = this.isDeltaInDirection(
			delta,
			this.#root.direction.current,
			swipeStartThreshold
		);
		if (isAllowedToSwipe) this.#root.onDrag(e);
		else if (
			Math.abs(xPosition) > swipeStartThreshold ||
			Math.abs(yPosition) > swipeStartThreshold
		) {
			this.pointerStart = null;
		}
	};

	#onpointerup: PointerEventHandler<HTMLDivElement> = (e) => {
		this.#onPointerUpProp.current(e);
		this.pointerStart = null;
		this.wasBeyondThePoint = false;
		this.#root.onRelease(e);
	};

	#onpointerout: PointerEventHandler<HTMLDivElement> = (e) => {
		this.#onPointerOutProp.current(e);
		if (!this.lastKnownPointerEvent) return;
		this.handleOnPointerUp(this.lastKnownPointerEvent);
	};

	#oncontextmenu: MouseEventHandler<HTMLDivElement> = (e) => {
		this.#onContextMenuProp.current(e);
		if (!this.lastKnownPointerEvent) return;
		this.handleOnPointerUp(this.lastKnownPointerEvent);
	};

	#onpointerdown: PointerEventHandler<HTMLDivElement> = (e) => {
		if (this.#root.handleOnly.current) return;
		this.#onPointerDownProp.current(e);
		this.pointerStart = { x: e.pageX, y: e.pageY };
		this.#root.onPress(e);
	};

	snapPointsOffset = $derived.by(() =>
		$state.snapshot(this.#root.snapPointsState.snapPointsOffset)
	);

	props = $derived.by(
		() =>
			({
				id: this.#id.current,
				"data-vaul-drawer-direction": this.#root.direction.current,
				"data-vaul-drawer": "",
				"data-vaul-delayed-snap-points": this.delayedSnapPoints ? "true" : "false",
				"data-vaul-custom-container": this.#root.container.current ? "true" : "false",
				"data-vaul-snap-points":
					this.#root.open.current && this.hasSnapPoints ? "true" : "false",
				style:
					this.snapPointsOffset && this.snapPointsOffset.length > 0
						? {
								"--snap-point-height": `${this.snapPointsOffset[0]!}px`,
							}
						: undefined,
				onpointerdown: this.#onpointerdown,
				onpointermove: this.#onpointermove,
				onpointerup: this.#onpointerup,
				onpointerout: this.#onpointerout,
				oncontextmenu: this.#oncontextmenu,
			}) as const
	);
}

const LONG_HANDLE_PRESS_TIMEOUT = 250;
const DOUBLE_TAP_TIMEOUT = 120;

type DrawerHandleStateProps = WithRefProps &
	ReadableBoxedValues<{
		preventCycle: boolean;
	}>;

class DrawerHandleState {
	#root: DrawerRootState;
	#id: DrawerHandleStateProps["id"];
	#ref: DrawerHandleStateProps["ref"];
	preventCycle: DrawerHandleStateProps["preventCycle"];
	closeTimeoutId = $state<number | null>(null);
	shouldCancelInteraction = $state(false);

	constructor(props: DrawerHandleStateProps, root: DrawerRootState) {
		this.#root = root;
		this.#id = props.id;
		this.#ref = props.ref;
		this.preventCycle = props.preventCycle;

		useRefById({
			id: this.#id,
			ref: this.#ref,
			deps: () => this.#root.open.current,
		});
	}

	handleStartCycle = () => {
		// Stop if this is the second click of a double click
		if (this.shouldCancelInteraction) {
			this.handleCancelInteraction();
			return;
		}
		window.setTimeout(() => {
			this.handleCycleSnapPoints();
		}, DOUBLE_TAP_TIMEOUT);
	};

	handleCycleSnapPoints = () => {
		// Prevent accidental taps while resizing drawer
		if (this.#root.isDragging || this.preventCycle.current || this.shouldCancelInteraction) {
			this.handleCancelInteraction();
			return;
		}
		// Make sure to clear the timeout id if the user releases the handle before the cancel timeout
		this.handleCancelInteraction();

		if (
			(!this.#root.snapPoints.current || this.#root.snapPoints.current.length === 0) &&
			this.#root.dismissible.current
		) {
			this.#root.closeDrawer();
			return;
		}

		const isLastSnapPoint =
			this.#root.activeSnapPoint.current ===
			this.#root.snapPoints.current?.[this.#root.snapPoints.current.length - 1];

		if (isLastSnapPoint && this.#root.dismissible.current) {
			this.#root.closeDrawer();
			return;
		}

		const currentSnapIndex = this.#root.snapPoints.current?.findIndex(
			(point) => point === this.#root.activeSnapPoint.current
		);
		if (currentSnapIndex === -1 || currentSnapIndex === undefined) return; // activeSnapPoint not found in snapPoints
		const nextSnapPoint = this.#root.snapPoints.current?.[currentSnapIndex + 1] ?? null;
		this.#root.setActiveSnapPoint(nextSnapPoint);
	};

	handleStartInteraction = () => {
		this.closeTimeoutId = window.setTimeout(() => {
			// Cancel click interaction on a long press
			this.shouldCancelInteraction = true;
		}, LONG_HANDLE_PRESS_TIMEOUT);
	};

	handleCancelInteraction = () => {
		if (this.closeTimeoutId !== null) {
			window.clearTimeout(this.closeTimeoutId);
		}
		this.shouldCancelInteraction = false;
	};

	#onclick = () => {
		this.handleStartCycle();
	};

	#onpointercancel = () => {
		this.handleCancelInteraction();
	};

	#onpointerdown = (e: PointerEvent) => {
		if (this.#root.handleOnly.current) {
			this.#root.onDrag(e);
		}
	};

	props = $derived.by(
		() =>
			({
				id: this.#id.current,
				onclick: this.#onclick,
				onpointerdown: this.#onpointerdown,
				onpointercancel: this.#onpointercancel,
				"data-vaul-drawer-visible": this.#root.open.current ? "true" : "false",
				"data-vaul-handle": "",
				"aria-hidden": "true",
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

class DrawerPortalState {
	#root: DrawerRootState;

	constructor(root: DrawerRootState) {
		this.#root = root;
	}

	props = $derived.by(() => ({
		to: this.#root.container.current ? this.#root.container.current : undefined,
	}));
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
	const root = getDrawerRootContext();
	return new DrawerContentState(props, root);
}

export function useDrawerOverlay(props: DrawerOverlayStateProps) {
	const root = getDrawerRootContext();
	return new DrawerOverlayState(props, root);
}

export function useDrawerHandle(props: DrawerHandleStateProps) {
	const root = getDrawerRootContext();
	return new DrawerHandleState(props, root);
}

export function useDrawerPortal() {
	const root = getDrawerRootContext();
	return new DrawerPortalState(root);
}

////////////////////////////////////
// HELPERS
////////////////////////////////////

function getScale() {
	return (window.innerWidth - WINDOW_TOP_OFFSET) / window.innerWidth;
}

export function dampenValue(v: number) {
	return 8 * (Math.log(v + 1) - 2);
}

type UseRefByIdProps = {
	/**
	 * The ID of the node to find.
	 */
	id: Box<string>;

	/**
	 * The ref to set the node to.
	 */
	ref: WritableBox<HTMLElement | null>;

	/**
	 * A reactive condition that will cause the node to be set.
	 */
	deps?: Getter<unknown>;

	/**
	 * A callback fired when the ref changes.
	 */
	onRefChange?: (node: HTMLElement | null) => void;
};

/**
 * Finds the node with that ID and sets it to the boxed node.
 * Reactive using `$effect` to ensure when the ID or condition changes,
 * an update is triggered and new node is found.
 */
export function useRefById({
	id,
	ref,
	deps = () => true,
	onRefChange = () => {},
}: UseRefByIdProps) {
	const trueDeps = $derived.by(() => deps());
	$effect(() => {
		// re-run when the ID changes.
		id.current;
		// re-run when the deps changes.
		trueDeps;
		return untrack(() => {
			const node = document.getElementById(id.current);
			ref.current = node;
			onRefChange(ref.current);

			return () => {
				onRefChange(null);
			};
		});
	});

	$effect(() => {
		return () => {
			ref.current = null;
			onRefChange(null);
		};
	});
}
