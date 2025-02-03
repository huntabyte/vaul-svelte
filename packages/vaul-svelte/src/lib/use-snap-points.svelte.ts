import type { ReadableBoxedValues, WritableBoxedValues } from "svelte-toolbelt";
import type { DrawerDirection, Getters } from "./types.js";
import { onMount } from "svelte";
import { on } from "svelte/events";
import { isVertical, set } from "./helpers.js";
import { TRANSITIONS, VELOCITY_THRESHOLD } from "./internal/constants.js";
import { watch } from "runed";

export function useSnapPoints({
	snapPoints,
	drawerNode: drawerNode,
	overlayNode: overlayNode,
	fadeFromIndex,
	setOpenTime,
	direction,
	container,
	snapToSequentialPoint,
	activeSnapPoint,
	open,
}: Getters<{
	drawerNode: HTMLElement | null;
	overlayNode: HTMLElement | null;
}> & {
	setOpenTime: (time: Date) => void;
} & WritableBoxedValues<{
		activeSnapPoint: number | string | null | undefined;
		open: boolean;
	}> &
	ReadableBoxedValues<{
		direction: DrawerDirection;
		container: HTMLElement | null | undefined;
		snapToSequentialPoint: boolean;
		fadeFromIndex: number | undefined;
		snapPoints: (number | string)[] | undefined;
	}>) {
	let windowDimensions = $state(
		typeof window !== "undefined"
			? { innerWidth: window.innerWidth, innerHeight: window.innerHeight }
			: undefined
	);

	onMount(() => {
		function onResize() {
			windowDimensions = {
				innerWidth: window.innerWidth,
				innerHeight: window.innerHeight,
			};
		}

		return on(window, "resize", onResize);
	});

	const isLastSnapPoint = $derived(
		activeSnapPoint.current === snapPoints.current?.[snapPoints.current.length - 1] || null
	);

	const activeSnapPointIndex = $derived(
		snapPoints.current?.findIndex((snapPoint) => snapPoint === activeSnapPoint.current)
	);

	const shouldFade = $derived(
		(snapPoints.current &&
			snapPoints.current.length > 0 &&
			(fadeFromIndex.current || fadeFromIndex.current === 0) &&
			!Number.isNaN(fadeFromIndex.current) &&
			snapPoints.current[fadeFromIndex.current] === activeSnapPoint.current) ||
			!snapPoints.current
	);

	const snapPointsOffset = $derived.by(() => {
		open.current;
		const containerSize = container.current
			? {
					width: container.current.getBoundingClientRect().width,
					height: container.current.getBoundingClientRect().height,
				}
			: typeof window !== "undefined"
				? { width: window.innerWidth, height: window.innerHeight }
				: { width: 0, height: 0 };

		return (
			snapPoints.current?.map((snapPoint) => {
				const isPx = typeof snapPoint === "string";
				let snapPointAsNumber = 0;

				if (isPx) {
					snapPointAsNumber = parseInt(snapPoint, 10);
				}

				if (isVertical(direction.current)) {
					const height = isPx
						? snapPointAsNumber
						: windowDimensions
							? snapPoint * containerSize.height
							: 0;

					if (windowDimensions) {
						return direction.current === "bottom"
							? containerSize.height - height
							: -containerSize.height + height;
					}

					return height;
				}
				const width = isPx
					? snapPointAsNumber
					: windowDimensions
						? snapPoint * containerSize.width
						: 0;

				if (windowDimensions) {
					return direction.current === "right"
						? containerSize.width - width
						: -containerSize.width + width;
				}

				return width;
			}) ?? []
		);
	});

	const activeSnapPointOffset = $derived.by(() => {
		if (activeSnapPointIndex !== null) {
			if (activeSnapPointIndex !== undefined) {
				return snapPointsOffset[activeSnapPointIndex];
			}
		}
		return null;
	});

	function onSnapPointChange(activeSnapPointIndex: number) {
		if (snapPoints.current && activeSnapPointIndex === snapPointsOffset.length) {
			setOpenTime(new Date());
		}
	}

	function snapToPoint(dimension: number) {
		const newSnapPointIndex =
			snapPointsOffset?.findIndex((snapPointDim) => snapPointDim === dimension) ?? null;
		onSnapPointChange(newSnapPointIndex);

		set(drawerNode(), {
			transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			transform: isVertical(direction.current)
				? `translate3d(0, ${dimension}px, 0)`
				: `translate3d(${dimension}px, 0, 0)`,
		});

		if (
			snapPointsOffset &&
			newSnapPointIndex !== snapPointsOffset.length - 1 &&
			fadeFromIndex.current !== undefined &&
			newSnapPointIndex !== fadeFromIndex.current &&
			newSnapPointIndex < fadeFromIndex.current
		) {
			set(overlayNode(), {
				transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
				opacity: "0",
			});
		} else {
			set(overlayNode(), {
				transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
				opacity: "1",
			});
		}

		activeSnapPoint.current = snapPoints.current?.[Math.max(newSnapPointIndex, 0)];
	}

	watch([() => activeSnapPoint.current, () => snapPoints.current, () => snapPointsOffset], () => {
		if (!activeSnapPoint.current) return;
		const newIndex =
			snapPoints.current?.findIndex((snapPoint) => snapPoint === activeSnapPoint.current) ??
			-1;
		if (snapPointsOffset && newIndex !== -1 && typeof snapPointsOffset[newIndex] === "number") {
			snapToPoint(snapPointsOffset[newIndex]);
		}
	});

	function onRelease({
		draggedDistance,
		closeDrawer,
		velocity,
		dismissible,
	}: {
		draggedDistance: number;
		closeDrawer: () => void;
		velocity: number;
		dismissible: boolean;
	}) {
		if (fadeFromIndex.current === undefined) return;

		const currentPosition =
			direction.current === "bottom" || direction.current === "right"
				? (activeSnapPointOffset ?? 0) - draggedDistance
				: (activeSnapPointOffset ?? 0) + draggedDistance;
		const isOverlaySnapPoint = activeSnapPointIndex === fadeFromIndex.current - 1;
		const isFirst = activeSnapPointIndex === 0;
		const hasDraggedUp = draggedDistance > 0;

		if (isOverlaySnapPoint) {
			set(overlayNode(), {
				transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			});
		}

		if (!snapToSequentialPoint.current && velocity > 2 && !hasDraggedUp) {
			if (dismissible) closeDrawer();
			else snapToPoint(snapPointsOffset[0]); // snap to initial point
			return;
		}

		if (
			!snapToSequentialPoint.current &&
			velocity > 2 &&
			hasDraggedUp &&
			snapPointsOffset &&
			snapPoints.current
		) {
			snapToPoint(snapPointsOffset[snapPoints.current.length - 1] as number);
			return;
		}

		// Find the closest snap point to the current position
		const closestSnapPoint = snapPointsOffset?.reduce((prev, curr) => {
			if (typeof prev !== "number" || typeof curr !== "number") return prev;

			return Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition)
				? curr
				: prev;
		});

		const dim = isVertical(direction.current) ? window.innerHeight : window.innerWidth;
		if (velocity > VELOCITY_THRESHOLD && Math.abs(draggedDistance) < dim * 0.4) {
			const dragDirection = hasDraggedUp ? 1 : -1; // 1 = up, -1 = down

			// Don't do anything if we swipe upwards while being on the last snap point
			if (dragDirection > 0 && isLastSnapPoint && snapPoints.current) {
				snapToPoint(snapPointsOffset[snapPoints.current.length - 1]);
				return;
			}

			if (isFirst && dragDirection < 0 && dismissible) {
				closeDrawer();
			}

			if (activeSnapPointIndex == null) return;

			snapToPoint(snapPointsOffset[activeSnapPointIndex + dragDirection]);
			return;
		}

		snapToPoint(closestSnapPoint);
	}

	function onDrag({ draggedDistance }: { draggedDistance: number }) {
		if (activeSnapPointOffset === null) return;
		const newValue =
			direction.current === "bottom" || direction.current === "right"
				? activeSnapPointOffset - draggedDistance
				: activeSnapPointOffset + draggedDistance;

		// Don't do anything if we exceed the last(biggest) snap point
		if (
			(direction.current === "bottom" || direction.current === "right") &&
			newValue < snapPointsOffset[snapPointsOffset.length - 1]
		) {
			return;
		}
		if (
			(direction.current === "top" || direction.current === "left") &&
			newValue > snapPointsOffset[snapPointsOffset.length - 1]
		) {
			return;
		}

		set(drawerNode(), {
			transform: isVertical(direction.current)
				? `translate3d(0, ${newValue}px, 0)`
				: `translate3d(${newValue}px, 0, 0)`,
		});
	}

	function getPercentageDragged(absDraggedDistance: number, isDraggingDown: boolean) {
		if (
			!snapPoints.current ||
			typeof activeSnapPointIndex !== "number" ||
			!snapPointsOffset ||
			fadeFromIndex.current === undefined
		)
			return null;

		// If this is true we are dragging to a snap point that is supposed to have an overlay
		const isOverlaySnapPoint = activeSnapPointIndex === fadeFromIndex.current - 1;
		const isOverlaySnapPointOrHigher = activeSnapPointIndex >= fadeFromIndex.current;

		if (isOverlaySnapPointOrHigher && isDraggingDown) {
			return 0;
		}

		// Don't animate, but still use this one if we are dragging away from the overlaySnapPoint
		if (isOverlaySnapPoint && !isDraggingDown) return 1;
		if (!shouldFade && !isOverlaySnapPoint) return null;

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
	}

	return {
		get isLastSnapPoint() {
			return isLastSnapPoint;
		},
		get shouldFade() {
			return shouldFade;
		},
		get activeSnapPointIndex() {
			return activeSnapPointIndex;
		},
		get snapPointsOffset() {
			return $state.snapshot(snapPointsOffset);
		},
		getPercentageDragged,
		onRelease,
		onDrag,
	};
}
