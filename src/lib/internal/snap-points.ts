import { derived, get, type Writable } from 'svelte/store';
import { TRANSITIONS, VELOCITY_THRESHOLD } from './constants.js';
import { effect, set } from './helpers/index.js';

export function createSnapPoints({
	activeSnapPoint,
	snapPoints,
	drawerRef,
	overlayRef,
	fadeFromIndex,
	onSnapPointChange
}: {
	activeSnapPoint: Writable<number | string | null>;
	snapPoints: Writable<(number | string)[] | undefined>;
	fadeFromIndex: Writable<number | undefined>;
	drawerRef: Writable<HTMLDivElement | undefined>;
	overlayRef: Writable<HTMLDivElement | undefined>;
	onSnapPointChange(activeSnapPointIndex: number): void;
}) {
	const isLastSnapPoint = derived(
		[snapPoints, activeSnapPoint],
		([$snapPoints, $activeSnapPoint]) => {
			return $activeSnapPoint === $snapPoints?.[$snapPoints.length - 1];
		}
	);

	const shouldFade = derived(
		[snapPoints, fadeFromIndex, activeSnapPoint],
		([$snapPoints, $fadeFromIndex, $activeSnapPoint]) => {
			return (
				($snapPoints &&
					$snapPoints.length > 0 &&
					($fadeFromIndex || $fadeFromIndex === 0) &&
					!Number.isNaN($fadeFromIndex) &&
					$snapPoints[$fadeFromIndex] === $activeSnapPoint) ||
				!$snapPoints
			);
		}
	);

	const activeSnapPointIndex = derived(
		[snapPoints, activeSnapPoint],
		([$snapPoints, $activeSnapPoint]) =>
			$snapPoints?.findIndex((snapPoint) => snapPoint === $activeSnapPoint) ?? null
	);

	const snapPointsOffset = derived(
		snapPoints,
		($snapPoints) =>
			$snapPoints?.map((snapPoint) => {
				const hasWindow = typeof window !== 'undefined';
				const isPx = typeof snapPoint === 'string';
				let snapPointAsNumber = 0;

				if (isPx) {
					snapPointAsNumber = parseInt(snapPoint, 10);
				}

				const height = isPx ? snapPointAsNumber : hasWindow ? snapPoint * window.innerHeight : 0;

				if (hasWindow) {
					return window.innerHeight - height;
				}

				return height;
			}) ?? []
	);

	const activeSnapPointOffset = derived(
		[snapPointsOffset, activeSnapPointIndex],
		([$snapPointsOffset, $activeSnapPointIndex]) =>
			$activeSnapPointIndex !== null ? $snapPointsOffset?.[$activeSnapPointIndex] : null
	);

	// drawerRef.current, snapPoints, snapPointsOffset, fadeFromIndex, overlayRef, setActiveSnapPoint

	const snapToPoint = derived(
		[drawerRef, snapPoints, snapPointsOffset, fadeFromIndex, overlayRef],
		([$drawerRef, $snapPoints, $snapPointsOffset, $fadeFromIndex, $overlayRef]) => {
			return (height: number) => {
				const newSnapPointIndex =
					$snapPointsOffset?.findIndex((snapPointHeight) => snapPointHeight === height) ?? null;
				onSnapPointChange(newSnapPointIndex);
				set($drawerRef, {
					transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(
						','
					)})`,
					transform: `translate3d(0, ${height}px, 0)`
				});

				if (
					$snapPointsOffset &&
					newSnapPointIndex !== $snapPointsOffset.length - 1 &&
					newSnapPointIndex !== $fadeFromIndex
				) {
					set($overlayRef, {
						transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(
							','
						)})`,
						opacity: '0'
					});
				} else {
					set($overlayRef, {
						transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(
							','
						)})`,
						opacity: '1'
					});
				}

				activeSnapPoint.update(() =>
					newSnapPointIndex !== null && $snapPoints ? $snapPoints?.[newSnapPointIndex] : null
				);
			};
		}
	);

	effect(
		[activeSnapPoint, snapPoints, snapPointsOffset, snapToPoint],
		([$activeSnapPoint, $snapPoints, $snapPointsOffset, $snapToPoint]) => {
			if ($activeSnapPoint) {
				const newIndex =
					$snapPoints?.findIndex((snapPoint) => snapPoint === $activeSnapPoint) ?? null;
				if ($snapPointsOffset && newIndex && typeof $snapPointsOffset[newIndex] === 'number') {
					$snapToPoint($snapPointsOffset[newIndex] as number);
				}
			}
		}
	);

	function onRelease({
		draggedDistance,
		closeDrawer,
		velocity,
		dismissible
	}: {
		draggedDistance: number;
		closeDrawer: () => void;
		velocity: number;
		dismissible: boolean;
	}) {
		const $fadeFromIndex = get(fadeFromIndex);
		const $activeSnapPointOffset = get(activeSnapPointOffset);
		if ($fadeFromIndex === undefined || $activeSnapPointOffset === null) return;
		const $activeSnapPointIndex = get(activeSnapPointIndex);
		const $snapToPoint = get(snapToPoint);
		const $overlayRef = get(overlayRef);
		const $snapPointsOffset = get(snapPointsOffset);
		const $snapPoints = get(snapPoints);

		const currentPosition = $activeSnapPointOffset - draggedDistance;
		const isOverlaySnapPoint = $activeSnapPointIndex === $fadeFromIndex - 1;
		const isFirst = $activeSnapPointIndex === 0;
		const hasDraggedUp = draggedDistance > 0;

		if (isOverlaySnapPoint) {
			set($overlayRef, {
				transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`
			});
		}

		if (velocity > 2 && !hasDraggedUp) {
			if (dismissible) closeDrawer();
			else $snapToPoint($snapPointsOffset[0]); // snap to initial point
			return;
		}

		if (velocity > 2 && hasDraggedUp && $snapPointsOffset && $snapPoints) {
			$snapToPoint($snapPointsOffset[$snapPoints.length - 1] as number);
			return;
		}

		// Find the closest snap point to the current position
		const closestSnapPoint = $snapPointsOffset?.reduce((prev, curr) => {
			if (typeof prev !== 'number' || typeof curr !== 'number') return prev;

			return Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev;
		});

		if (velocity > VELOCITY_THRESHOLD && Math.abs(draggedDistance) < window.innerHeight * 0.4) {
			const dragDirection = hasDraggedUp ? 1 : -1; // 1 = up, -1 = down

			// Don't do anything if we swipe upwards while being on the last snap point
			if (dragDirection > 0 && get(isLastSnapPoint) && $snapPoints) {
				$snapToPoint($snapPointsOffset[$snapPoints.length - 1]);
				return;
			}

			if (isFirst && dragDirection < 0 && dismissible) {
				closeDrawer();
			}

			if ($activeSnapPointIndex === null) return;

			$snapToPoint($snapPointsOffset[$activeSnapPointIndex + dragDirection]);
			return;
		}

		$snapToPoint(closestSnapPoint);
	}

	function onDrag({ draggedDistance }: { draggedDistance: number }) {
		const $drawerRef = get(drawerRef);
		const $activeSnapPointOffset = get(activeSnapPointOffset);
		if ($activeSnapPointOffset === null) return;
		const newYValue = $activeSnapPointOffset - draggedDistance;

		set($drawerRef, {
			transform: `translate3d(0, ${newYValue}px, 0)`
		});
	}

	function getPercentageDragged(absDraggedDistance: number, isDraggingDown: boolean) {
		const $activeSnapPointIndex = get(activeSnapPointIndex);
		const $snapPointsOffset = get(snapPointsOffset);
		const $snapPoints = get(snapPoints);
		const $fadeFromIndex = get(fadeFromIndex);
		if (
			!$snapPoints ||
			typeof $activeSnapPointIndex !== 'number' ||
			!$snapPointsOffset ||
			$fadeFromIndex === undefined
		)
			return null;

		// If this is true we are dragging to a snap point that is supposed to have an overlay
		const isOverlaySnapPoint = $activeSnapPointIndex === $fadeFromIndex - 1;
		const isOverlaySnapPointOrHigher = $activeSnapPointIndex >= $fadeFromIndex;

		if (isOverlaySnapPointOrHigher && isDraggingDown) {
			return 0;
		}

		// Don't animate, but still use this one if we are dragging away from the overlaySnapPoint
		if (isOverlaySnapPoint && !isDraggingDown) return 1;
		if (!shouldFade && !isOverlaySnapPoint) return null;

		// Either fadeFrom index or the one before
		const targetSnapPointIndex = isOverlaySnapPoint
			? $activeSnapPointIndex + 1
			: $activeSnapPointIndex - 1;

		// Get the distance from overlaySnapPoint to the one before or vice-versa to calculate the opacity percentage accordingly
		const snapPointDistance = isOverlaySnapPoint
			? $snapPointsOffset[targetSnapPointIndex] - $snapPointsOffset[targetSnapPointIndex - 1]
			: $snapPointsOffset[targetSnapPointIndex + 1] - $snapPointsOffset[targetSnapPointIndex];

		const percentageDragged = absDraggedDistance / Math.abs(snapPointDistance);

		if (isOverlaySnapPoint) {
			return 1 - percentageDragged;
		} else {
			return percentageDragged;
		}
	}

	return {
		isLastSnapPoint,
		shouldFade,
		getPercentageDragged,
		activeSnapPointIndex,
		onRelease,
		onDrag,
		snapPointsOffset
	};
}
