import { tick, untrack } from "svelte";
import { type ReadableBoxedValues, type WritableBoxedValues, box } from "svelte-toolbelt";
import { isBottomOrRight, isInput, isVertical } from "./internal/helpers/is.js";
import { getTranslate, resetStyles, setStyles, styleToString } from "./internal/helpers/style.js";
import { TRANSITIONS, VELOCITY_THRESHOLD } from "./internal/constants.js";
import { preventScroll } from "./internal/prevent-scroll.js";
import { PositionFixed } from "./position-fixed.svelte.js";

const CLOSE_THRESHOLD = 0.25;
const SCROLL_LOCK_TIMEOUT = 100;
const BORDER_RADIUS = 8;
const NESTED_DISPLACEMENT = 16;
const WINDOW_TOP_OFFSET = 26;
const DRAG_CLASS = "vaul-dragging";

export type DrawerDirection = "left" | "right" | "top" | "bottom";

export type OnDragEvent = PointerEvent | TouchEvent;
export type OnDrag = (event: OnDragEvent, percentageDragged: number) => void;
export type OnReleaseEvent = PointerEvent | MouseEvent | TouchEvent;
export type OnRelease = (event: OnReleaseEvent, open: boolean) => void;

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
	triggerNode = $state<HTMLElement | null>(null);
	overlayNode = $state<HTMLElement | null>(null);
	hasBeenOpened = $state(false);
	visible = $state(false);
	justReleased = $state(false);
	openTime = $state<Date | null>(null);
	keyboardIsOpen = $state(false);
	drawerNode = $state<HTMLElement | null>(null);
	drawerId = $state<string | null>(null);
	isDragging = false;
	dragStartTime: Date | null = null;
	isClosing = false;
	pointerStart = 0;
	dragEndTime: Date | null = null;
	lastTimeDragPrevented: Date | null = null;
	isAllowedToDrag = false;
	drawerHeight = 0;
	previousDiffFromInitial = 0;
	initialDrawerHeight = 0;
	nestedOpenChangeTimer: ReturnType<typeof setTimeout> | null = null;

	isLastSnapPoint = $derived.by(() => {
		const activeSnapPoint = this.activeSnapPoint.current;
		const snapPoints = this.snapPoints.current;
		return activeSnapPoint === snapPoints?.[snapPoints.length - 1];
	});

	shouldFade = $derived.by(() => {
		const snapPoints = this.snapPoints.current;
		const fadeFromIndex = this.fadeFromIndex.current;
		const activeSnapPoint = this.activeSnapPoint.current;
		return (
			(snapPoints &&
				snapPoints.length > 0 &&
				(fadeFromIndex || fadeFromIndex === 0) &&
				!Number.isNaN(fadeFromIndex) &&
				snapPoints[fadeFromIndex] === activeSnapPoint) ||
			!snapPoints
		);
	});

	activeSnapPointIndex = $derived.by(() => {
		const snapPoints = this.snapPoints.current;
		const activeSnapPoint = this.activeSnapPoint.current;
		return snapPoints?.findIndex((snapPoint) => snapPoint === activeSnapPoint) ?? null;
	});

	snapPointsOffset = $derived.by(() => {
		const snapPoints = this.snapPoints.current;
		if (snapPoints) {
			return snapPoints.map((snapPoint) => {
				const hasWindow = typeof window !== "undefined";
				const isPx = typeof snapPoint === "string";
				let snapPointAsNumber = 0;

				if (isPx) {
					snapPointAsNumber = Number.parseInt(snapPoint, 10);
				}
				const direction = this.direction.current;

				if (isVertical(direction)) {
					const height = isPx
						? snapPointAsNumber
						: hasWindow
							? snapPoint * window.innerHeight
							: 0;

					if (hasWindow) {
						return direction === "bottom"
							? window.innerHeight - height
							: window.innerHeight + height;
					}

					return height;
				}

				const width = isPx
					? snapPointAsNumber
					: hasWindow
						? snapPoint * window.innerWidth
						: 0;

				if (hasWindow) {
					return direction === "right"
						? window.innerWidth - width
						: window.innerWidth + width;
				}

				return width;
			});
		}
		return [];
	});

	activeSnapPointOffset = $derived.by(() => {
		const snapPointsOffset = this.snapPointsOffset;
		const activeSnapPointIndex = this.activeSnapPointIndex;
		return activeSnapPointIndex !== null ? snapPointsOffset?.[activeSnapPointIndex] : null;
	});

	activeUrl = $state(typeof window !== "undefined" ? window.location.href : "");
	positionFixed: PositionFixed;

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
		this.positionFixed = new PositionFixed({
			hasBeenOpened: box.with(() => this.hasBeenOpened),
			open: this.open,
			modal: this.modal,
			nested: this.nested,
		});

		$effect(() => {
			const activeSnapPoint = this.activeSnapPoint.current;
			const drawerNode = this.drawerNode;
			if (activeSnapPoint && drawerNode) {
				const snapPoints = untrack(() => this.snapPoints.current);
				const snapPointsOffset = untrack(() => this.snapPointsOffset);
				const newIndex =
					snapPoints?.findIndex((snapPoint) => snapPoint === activeSnapPoint) ?? -1;
				if (
					snapPointsOffset &&
					newIndex !== -1 &&
					typeof snapPointsOffset[newIndex] === "number"
				) {
					untrack(() => {
						this.snapToPoint(snapPointsOffset[newIndex] as number);
					});
				}
			}
		});

		$effect(() => {
			const open = this.open.current;
			untrack(() => {
				if (!open && this.shouldScaleBackground.current) {
					const id = setTimeout(() => {
						resetStyles(document.body, "background");
					}, 200);
					return () => clearTimeout(id);
				}
			});
		});

		// prevent scroll when the drawer is open
		$effect(() => {
			const open = this.open.current;
			let unsub = () => {};
			if (open) {
				unsub = preventScroll();
			}
			return unsub;
		});

		$effect(() => {
			const open = this.open.current;
			if (!open) return;
			untrack(() => {
				setStyles(document.documentElement, {
					scrollBehavior: "auto",
				});
				this.openTime = new Date();
				this.scaleBackground(true, this.backgroundColor.current);
			});
		});

		$effect(() => {
			const visible = this.visible;
			if (!visible) return;
			untrack(() => {
				const drawerNode = this.drawerNode;
				if (!drawerNode) return;
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

		$effect(() => {
			const activeSnapPoint = this.activeSnapPoint.current;
			const drawerNode = this.drawerNode;
			if (!activeSnapPoint || !drawerNode) return;

			untrack(() => {
				const snapPoints = this.snapPoints.current;
				const snapPointsOffset = this.snapPointsOffset;
				const newIndex =
					snapPoints?.findIndex((snapPoint) => snapPoint === activeSnapPoint) ?? -1;
				if (
					snapPointsOffset &&
					newIndex !== -1 &&
					typeof snapPointsOffset[newIndex] === "number"
				) {
					this.snapToPoint(snapPointsOffset[newIndex]);
				}
			});
		});
	}

	setActiveSnapPoint = (newValue: number | string | null) => {
		this.activeSnapPoint.current = newValue;
	};

	setOpen = (open: boolean) => {
		this.open.current = open;
	};

	getContentStyle = (style: string | null = "") => {
		if (this.snapPointsOffset && this.snapPointsOffset.length > 0) {
			const styleProp = styleToString({
				"--snap-point-height": `${this.snapPointsOffset[0]}px`,
			});
			return style + styleProp;
		}
	};

	onSnapPointChange = (activeSnapPointIdx: number) => {
		// change openTime when we reach the last snap point to prevent dragging for 500ms incase it's scrollable.
		const snapPoints = this.snapPoints.current;
		const snapPointsOffset = this.snapPointsOffset;
		if (snapPoints && activeSnapPointIdx === snapPointsOffset.length - 1) {
			this.openTime = new Date();
		}
	};

	snapToPoint = (dimension: number) => {
		tick().then(() => {
			const snapPointsOffset = this.snapPointsOffset;
			const newSnapPointIndex =
				snapPointsOffset?.findIndex((snapPointDim) => snapPointDim === dimension) ?? null;

			const drawerNode = this.drawerNode;
			const direction = this.direction.current;

			this.onSnapPointChange(newSnapPointIndex);

			setStyles(drawerNode, {
				transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(
					","
				)})`,
				transform: isVertical(direction)
					? `translate3d(0, ${dimension}px, 0)`
					: `translate3d(${dimension}px, 0, 0)`,
			});

			const fadeFromIndex = this.fadeFromIndex.current;
			const overlayNode = this.overlayNode;

			if (
				snapPointsOffset &&
				newSnapPointIndex !== snapPointsOffset.length - 1 &&
				newSnapPointIndex !== fadeFromIndex
			) {
				setStyles(overlayNode, {
					transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(
						","
					)})`,
					opacity: "0",
				});
			} else {
				setStyles(overlayNode, {
					transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(
						","
					)})`,
					opacity: "1",
				});
			}

			const snapPoints = this.snapPoints.current;
			if (newSnapPointIndex === null || !snapPoints) {
				this.setActiveSnapPoint(null);
			} else {
				this.setActiveSnapPoint(snapPoints[newSnapPointIndex]);
			}
		});
	};

	onReleaseSnapPoints = ({
		draggedDistance,
		closeDrawer,
		velocity,
		dismissible,
	}: {
		draggedDistance: number;
		closeDrawer: () => void;
		velocity: number;
		dismissible: boolean;
	}) => {
		const fadeFromIndex = this.fadeFromIndex.current;
		if (fadeFromIndex === undefined) return;
		const activeSnapPointOffset = this.activeSnapPointOffset;
		const activeSnapPointIndex = this.activeSnapPointIndex;
		const overlayNode = this.overlayNode;
		const snapPointsOffset = this.snapPointsOffset;
		const snapPoints = this.snapPoints.current;
		const direction = this.direction.current;

		const currentPosition =
			direction === "bottom" || direction === "right"
				? (activeSnapPointOffset ?? 0) - draggedDistance
				: (activeSnapPointOffset ?? 0) + draggedDistance;

		const isOverlaySnapPoint = activeSnapPointIndex === fadeFromIndex - 1;
		const isFirst = activeSnapPointIndex === 0;
		const hasDraggedUp = draggedDistance > 0;

		if (isOverlaySnapPoint) {
			setStyles(overlayNode, {
				transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(
					","
				)})`,
			});
		}

		if (velocity > 2 && !hasDraggedUp) {
			if (dismissible) closeDrawer();
			else this.snapToPoint(snapPointsOffset[0]); // snap to initial point
			return;
		}

		if (velocity > 2 && hasDraggedUp && snapPointsOffset && snapPoints) {
			this.snapToPoint(snapPointsOffset[snapPoints.length - 1] as number);
			return;
		}

		const closestSnapPoint = snapPointsOffset?.reduce((prev, curr) => {
			if (typeof prev !== "number" || typeof curr !== "number") return prev;

			return Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition)
				? curr
				: prev;
		});

		const dim = isVertical(direction) ? window.innerHeight : window.innerWidth;

		if (velocity > VELOCITY_THRESHOLD && Math.abs(draggedDistance) < dim * 0.4) {
			const dragDirection = hasDraggedUp ? 1 : -1; // 1 = up, -1 = down

			if (dragDirection > 0 && this.isLastSnapPoint && snapPoints) {
				this.snapToPoint(snapPointsOffset[snapPoints.length - 1]);
				return;
			}

			if (isFirst && dragDirection < 0 && dismissible) {
				closeDrawer();
			}

			if (activeSnapPointIndex === null) return;

			this.snapToPoint(snapPointsOffset[activeSnapPointIndex + dragDirection]);
			return;
		}

		this.snapToPoint(closestSnapPoint);
	};

	onDragSnapPoints = ({ draggedDistance }: { draggedDistance: number }) => {
		const drawerNode = this.drawerNode;
		const activeSnapPointOffset = this.activeSnapPointOffset;
		if (activeSnapPointOffset === null) return;
		const snapPointsOffset = this.snapPointsOffset;
		const direction = this.direction.current;

		const newValue =
			direction === "bottom" || direction === "right"
				? activeSnapPointOffset - draggedDistance
				: activeSnapPointOffset + draggedDistance;

		const lastSnapPoint = snapPointsOffset[snapPointsOffset.length - 1];

		// dont do anything if we exceed the last(biggest) snap point
		if (isBottomOrRight(direction) && newValue < lastSnapPoint) {
			return;
		}

		if (!isBottomOrRight(direction) && newValue > lastSnapPoint) {
			return;
		}

		setStyles(drawerNode, {
			transform: isVertical(direction)
				? `translate3d(0, ${newValue}px, 0)`
				: `translate3d(${newValue}px, 0, 0)`,
		});
	};

	getSnapPointsPercentageDragged = (absDraggedDistance: number, isDraggingDown: boolean) => {
		const activeSnapPointIndex = this.activeSnapPointIndex;
		const snapPointsOffset = this.snapPointsOffset;
		const snapPoints = this.snapPoints.current;
		const fadeFromIndex = this.fadeFromIndex.current;
		if (
			!snapPoints ||
			typeof activeSnapPointIndex !== "number" ||
			!snapPointsOffset ||
			fadeFromIndex === undefined
		) {
			return null;
		}

		const isOverlaySnapPoint = activeSnapPointIndex === fadeFromIndex - 1;
		const isOverlaySnapPointOrHigher = activeSnapPointIndex >= fadeFromIndex;

		if (isOverlaySnapPointOrHigher && isDraggingDown) {
			return 0;
		}

		// Don't animate if we are at the last snap point (highest one)
		if (isOverlaySnapPoint && !isDraggingDown) return 1;
		if (!this.shouldFade && !isOverlaySnapPoint) return null;

		// Either fadeFrom index or the one before
		const targetSnapPointIndex = isOverlaySnapPoint
			? activeSnapPointIndex + 1
			: activeSnapPointIndex - 1;

		// Get the distance from overlaySnapPoint to the one before or vice-versa to calculate the opacity percentage accordingly
		const snapPointDistance = isOverlaySnapPoint
			? snapPointsOffset[targetSnapPointIndex] - snapPointsOffset[targetSnapPointIndex - 1]
			: snapPointsOffset[targetSnapPointIndex + 1] - snapPointsOffset[targetSnapPointIndex];

		const percentageDragged = absDraggedDistance / Math.abs(snapPointDistance);

		if (isOverlaySnapPoint) {
			return 1 - percentageDragged;
		} else {
			return percentageDragged;
		}
	};

	scaleBackground = (open: boolean, backgroundColor: string | undefined = "black") => {
		const wrapper = document.querySelector("[data-vaul-drawer-wrapper]");

		if (!wrapper || !this.shouldScaleBackground.current) return;
		const direction = this.direction.current;

		if (open) {
			// setting original styles initially
			setStyles(document.body, {
				background: document.body.style.backgroundColor || document.body.style.background,
			});

			// setting body styles, with cache ignored, so that we can get correct original styles in reset
			setStyles(
				document.body,
				{
					background: backgroundColor,
				},
				true
			);

			setStyles(wrapper, {
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

	closeDrawer = (withKeyboard: boolean = false) => {
		if (this.isClosing) return;

		const drawerNode = this.drawerNode;
		if (!drawerNode) return;
		const direction = this.direction.current;

		this.onCloseProp.current();

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

		this.isClosing = true;

		setTimeout(() => {
			this.visible = false;
			this.setOpen(false);
			this.isClosing = false;
			if (withKeyboard) {
				this.triggerNode?.focus();
			}
		}, 300);

		const snapPoints = this.snapPoints.current;

		setTimeout(() => {
			resetStyles(document.documentElement, "scrollBehavior");
			if (snapPoints) {
				this.setActiveSnapPoint(snapPoints[0]);
			}
		}, TRANSITIONS.DURATION * 1000); // seconds to ms
	};

	resetDrawer = () => {
		const drawerNode = this.drawerNode;
		if (!drawerNode) return;
		const overlayNode = this.overlayNode;
		const wrapper = document.querySelector("[data-vaul-drawer-wrapper]");
		const direction = this.direction.current;
		const currentSwipeAmount = getTranslate(drawerNode, direction);

		setStyles(drawerNode, {
			transform: "translate3d(0, 0, 0)",
			transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
		});

		setStyles(overlayNode, {
			transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			opacity: "1",
		});

		const shouldScaleBackground = this.shouldScaleBackground.current;
		const isOpen = this.open.current;

		// Don't reset background if swiped upwards
		if (shouldScaleBackground && currentSwipeAmount && currentSwipeAmount > 0 && isOpen) {
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
		}
	};

	shouldDrag = (node: HTMLElement, isDraggingInDirection: boolean) => {
		const drawerNode = this.drawerNode;
		let element = node as HTMLElement;
		const highlightedText = window.getSelection()?.toString();
		const direction = this.direction.current;
		const swipeAmount = drawerNode ? getTranslate(drawerNode, direction) : null;
		const date = new Date();

		// dont drag if the element has the `data-vaul-no-drag` attribute
		if (element.hasAttribute("data-vaul-no-drag") || element.closest("[data-vaul-no-drag]")) {
			return false;
		}

		// Allow scrolling when animating
		const openTime = this.openTime;

		if (openTime && date.getTime() - openTime.getTime() < 500) {
			return false;
		}

		if (swipeAmount !== null) {
			if (
				direction === "bottom" || direction === "right" ? swipeAmount > 0 : swipeAmount < 0
			) {
				return true;
			}
		}

		if (swipeAmount !== null && swipeAmount > 0) {
			return true;
		}

		// Don't drag if there's highlighted text
		if (highlightedText && highlightedText.length > 0) {
			return false;
		}

		const scrollLockTimeout = this.scrollLockTimeout.current;
		// Disallow dragging if drawer was scrolled within `scrollLockTimeout`
		if (
			this.lastTimeDragPrevented &&
			date.getTime() - this.lastTimeDragPrevented.getTime() < scrollLockTimeout &&
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

	onRelease = (e: OnReleaseEvent) => {
		const drawerNode = this.drawerNode;
		if (!this.isDragging || !drawerNode) return;
		if (this.isAllowedToDrag && isInput(e.target as HTMLElement)) {
			// If we were just dragging, prevent focusing on inputs etc. on release
			(e.target as HTMLInputElement).blur();
		}

		drawerNode.classList.remove(DRAG_CLASS);
		this.isAllowedToDrag = false;
		this.isDragging = false;

		this.dragEndTime = new Date();

		const direction = this.direction.current;
		const swipeAmount = getTranslate(drawerNode, direction);

		if (
			(e.target && !this.shouldDrag(e.target as HTMLElement, false)) ||
			!swipeAmount ||
			Number.isNaN(swipeAmount)
		) {
			return;
		}

		if (this.dragStartTime === null) return;

		const timeTaken = this.dragEndTime.getTime() - this.dragStartTime.getTime();
		const distMoved = getDistanceMoved(this.pointerStart, direction, e);
		const velocity = Math.abs(distMoved) / timeTaken;

		if (velocity > 0.05) {
			// `justReleased` is needed to prevent the drawer from focusing on an input when the drag ends, as it's not the intent most of the time.
			this.justReleased = true;

			setTimeout(() => {
				this.justReleased = false;
			}, 200);
		}

		if (this.snapPoints) {
			this.onReleaseSnapPoints({
				draggedDistance: distMoved * getDirectionMultiplier(direction),
				closeDrawer: this.closeDrawer,
				velocity,
				dismissible: this.dismissible.current,
			});

			this.onReleaseProp?.current(e, true);
		}

		if (direction === "bottom" || direction === "right" ? distMoved > 0 : distMoved < 0) {
			this.resetDrawer();
			this.onReleaseProp?.current(e, false);
			return;
		}

		if (velocity > VELOCITY_THRESHOLD) {
			this.closeDrawer();
			this.onReleaseProp?.current(e, false);
			return;
		}

		const visibleDrawerHeight = Math.min(
			this.drawerNode?.getBoundingClientRect().height ?? 0,
			window.innerHeight
		);

		if (swipeAmount >= visibleDrawerHeight * this.closeThreshold.current) {
			this.closeDrawer();
			this.onReleaseProp?.current(e, false);
			return;
		}

		this.onReleaseProp?.current(e, true);
		this.resetDrawer();
	};

	onNestedOpenChange = (o: boolean) => {
		const drawerNode = this.drawerNode;
		const scale = o ? (window.innerWidth - NESTED_DISPLACEMENT) / window.innerWidth : 1;
		const y = o ? -NESTED_DISPLACEMENT : 0;
		if (this.nestedOpenChangeTimer) {
			window.clearTimeout(this.nestedOpenChangeTimer);
		}

		setStyles(drawerNode, {
			transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			transform: `scale(${scale}) translate3d(0, ${y}px, 0)`,
		});

		if (!o && drawerNode) {
			this.nestedOpenChangeTimer = setTimeout(() => {
				const direction = this.direction.current;
				const translateValue = getTranslate(drawerNode, direction);
				setStyles(drawerNode, {
					transition: "none",
					transform: isVertical(direction)
						? `translate3d(0, ${translateValue}px, 0)`
						: `translate3d(${translateValue}px, 0, 0)`,
				});
			}, 500);
		}
	};

	onNestedDrag = (_: PointerEvent | MouseEvent | TouchEvent, percentageDragged: number) => {
		if (percentageDragged < 0) return;
		const initialScale = (window.innerWidth - NESTED_DISPLACEMENT) / window.innerWidth;
		const newScale = initialScale + percentageDragged * (1 - initialScale);
		const newTranslate = -NESTED_DISPLACEMENT + percentageDragged * NESTED_DISPLACEMENT;
		const direction = this.direction.current;

		setStyles(this.drawerNode, {
			transform: isVertical(direction)
				? `scale(${newScale}) translate3d(0, ${newTranslate}px, 0)`
				: `scale(${newScale}) translate3d(${newTranslate}px, 0, 0)`,
			transition: "none",
		});
	};

	onNestedRelease = (_: PointerEvent | MouseEvent | TouchEvent, o: boolean) => {
		const direction = this.direction.current;
		const dim = isVertical(direction) ? window.innerHeight : window.innerWidth;
		const scale = o ? (dim - NESTED_DISPLACEMENT) / dim : 1;
		const translate = o ? -NESTED_DISPLACEMENT : 0;

		if (!o) return;

		setStyles(this.drawerNode, {
			transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(
				","
			)})`,
			transform: isVertical(direction)
				? `scale(${scale}) translate3d(0, ${translate}px, 0)`
				: `scale(${scale}) translate3d(${translate}px, 0, 0)`,
		});
	};
}

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
