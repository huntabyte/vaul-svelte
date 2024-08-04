import { onMount, tick, untrack } from "svelte";
import {
	type ReadableBoxedValues,
	type WithRefProps,
	type WritableBoxedValues,
	addEventListener,
	box,
	useRefById,
} from "svelte-toolbelt";
import { isBottomOrRight, isInput, isVertical } from "./internal/helpers/is.js";
import { getTranslate, resetStyles, setStyles, styleToString } from "./internal/helpers/style.js";
import { TRANSITIONS, VELOCITY_THRESHOLD } from "./internal/constants.js";
import { isIOS, preventScroll } from "./internal/prevent-scroll.js";
import { PositionFixed } from "./position-fixed.svelte.js";
import { createContext } from "./internal/createContext.js";
import { noop } from "./internal/helpers/noop.js";

export const DEFAULT_CLOSE_THRESHOLD = 0.25;
export const DEFAULT_SCROLL_LOCK_TIMEOUT = 100;
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
	handleOnly: boolean;
	noBodyStyles: boolean;
	preventScrollRestoration: boolean;
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
		this.handleOnly = props.handleOnly;
		this.noBodyStyles = props.noBodyStyles;
		this.preventScrollRestoration = props.preventScrollRestoration;

		this.positionFixed = new PositionFixed({
			hasBeenOpened: box.with(() => this.hasBeenOpened),
			open: this.open,
			modal: this.modal,
			nested: this.nested,
			noBodyStyles: this.noBodyStyles,
			preventScrollRestoration: this.preventScrollRestoration,
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

		$effect(() => {
			const activeSnapPointIndex = this.activeSnapPointIndex;
			const snapPoints = this.snapPoints.current;
			const snapPointsOffset = this.snapPointsOffset;
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
	}

	setActiveSnapPoint = (newValue: number | string | null) => {
		this.activeSnapPoint.current = newValue;
	};

	setOpen = (open: boolean) => {
		this.open.current = open;
	};

	setHasBeenOpened = (hasBeenOpened: boolean) => {
		this.hasBeenOpened = hasBeenOpened;
	};

	getContentStyle = () => {
		if (this.snapPointsOffset && this.snapPointsOffset.length > 0) {
			return {
				"--snap-point-height": `${this.snapPointsOffset[0]}px`,
			};
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

	openDrawer = () => {
		if (this.isClosing) return;
		this.setHasBeenOpened(true);
		this.setOpen(true);
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

	onPress = (e: PointerEvent) => {
		const drawerNode = this.drawerNode;
		if (!this.dismissible.current && !this.snapPoints.current) return;
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

		this.pointerStart = isVertical(this.direction.current) ? e.screenY : e.screenX;
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

	onDrag = (e: PointerEvent) => {
		const drawerNode = this.drawerNode;
		if (!drawerNode) return;
		// We need to know how much of the drawer has been dragged in percentages so that we can transform background accordingly
		if (this.isDragging) {
			const direction = this.direction.current;
			const directionMultiplier = direction === "bottom" || direction === "right" ? 1 : -1;
			const draggedDistance =
				(this.pointerStart - (isVertical(direction) ? e.clientY : e.clientX)) *
				directionMultiplier;
			const isDraggingInDirection = draggedDistance > 0;

			// Pre condition for disallowing dragging in the close direction.
			const noCloseSnapPointsPreCondition =
				this.snapPoints.current && !this.dismissible.current && !isDraggingInDirection;

			// Disallow dragging down to close when first snap point is the active one and dismissible prop is set to false.
			if (noCloseSnapPointsPreCondition && this.activeSnapPointIndex === 0) return;

			// We need to capture last time when drag with scroll was triggered and have a timeout between
			const absDraggedDistance = Math.abs(draggedDistance);
			const wrapper = document.querySelector("[vaul-drawer-wrapper]");

			// Calculate the percentage dragged, where 1 is the closed position
			let percentageDragged = absDraggedDistance / this.drawerHeight;
			const snapPointPercentageDragged = this.getSnapPointsPercentageDragged(
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

			if (
				!this.isAllowedToDrag &&
				!this.shouldDrag(e.target as HTMLElement, isDraggingInDirection)
			)
				return;
			drawerNode.classList.add(DRAG_CLASS);
			// If shouldDrag gave true once after pressing down on the drawer, we set isAllowedToDrag to true and it will remain true until we let go, there's no reason to disable dragging mid way, ever, and that's the solution to it
			this.isAllowedToDrag = true;
			setStyles(drawerNode, {
				transition: "none",
			});

			setStyles(this.overlayNode, {
				transition: "none",
			});

			if (this.snapPoints.current) {
				this.onDragSnapPoints({ draggedDistance });
			}

			// Run this only if snapPoints are not defined or if we are at the last snap point (highest one)
			if (isDraggingInDirection && !this.snapPoints.current) {
				const dampenedDraggedDistance = dampenValue(draggedDistance);

				const translateValue =
					Math.min(dampenedDraggedDistance * -1, 0) * directionMultiplier;
				setStyles(drawerNode, {
					transform: isVertical(direction)
						? `translate3d(0, ${translateValue}px, 0)`
						: `translate3d(${translateValue}px, 0, 0)`,
				});
				return;
			}

			const opacityValue = 1 - percentageDragged;

			if (
				this.shouldFade ||
				(this.fadeFromIndex.current &&
					this.activeSnapPointIndex === this.fadeFromIndex.current - 1)
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

			if (!this.snapPoints.current) {
				const translateValue = absDraggedDistance * directionMultiplier;

				setStyles(this.drawerNode, {
					transform: isVertical(direction)
						? `translate3d(0, ${translateValue}px, 0)`
						: `translate3d(${translateValue}px, 0, 0)`,
				});
			}
		}
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

	createContentState = (props: DrawerContentStateProps) => {
		return new DrawerContentState(props, this);
	};

	createOverlayState = (props: DrawerOverlayStateProps) => {
		return new DrawerOverlayState(props, this);
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
				"vaul-drawer": "",
				"vaul-drawer-direction": this.root.direction.current,
				"vaul-drawer-visible": this.root.visible ? "true" : "false",
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

	#onmouseup = (e: MouseEvent) => {
		this.root.onRelease(e);
	};

	props = $derived.by(
		() =>
			({
				id: this.#id.current,
				"vaul-drawer-visible": this.root.visible ? "true" : "false",
				"vaul-overlay": "",
				"vaul-snap-points":
					this.root.open.current && this.#hasSnapPoints ? "true" : "false",
				"vaul-snap-points-overlay":
					this.root.open.current && this.root.shouldFade ? "true" : "false",
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
	#closeTimeoutId: number | null = null;
	#shouldCancelInteractions = false;

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
		if (this.root.isDragging || this.#preventCycle || this.#shouldCancelInteractions) {
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
				"vaul-drawer-visible": this.root.visible ? "true" : "false",
				"vaul-handle": "",
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
				"vaul-handle-hitarea": "",
				"aria-hidden": "true",
			}) as const
	);
}

////////////////////////////////////
// CONTEXT
////////////////////////////////////

const [setDrawerRootContext, getDrawerRootContext] = createContext<DrawerRootState>("Drawer.Root");

export function useDrawerRoot(props: DrawerRootStateProps) {
	return setDrawerRootContext(new DrawerRootState(props));
}

export function useDrawerContent(props: DrawerContentStateProps) {
	return getDrawerRootContext().createContentState(props);
}

export function useDrawerOverlay(props: DrawerOverlayStateProps) {
	return getDrawerRootContext().createOverlayState(props);
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
