import type { ReadableBoxedValues, WritableBoxedValues } from "svelte-toolbelt";
import { untrack } from "svelte";
import type { DrawerDirection } from "./types.js";
import { isVertical } from "./internal/helpers/is.js";
import { setStyles } from "./internal/helpers/style.js";
import { TRANSITIONS, VELOCITY_THRESHOLD } from "./internal/constants.js";

type SnapPointsProps = WritableBoxedValues<{
	activeSnapPoint: number | string | null | undefined;
}> &
	ReadableBoxedValues<{
		snapPoints: (number | string)[] | null;
		fadeFromIndex: number | null;
		drawerRef: HTMLElement | null;
		overlayRef: HTMLElement | null;
		direction: DrawerDirection;
	}> & {
		onSnapPointChange: (activeSnapPointIdx: number) => void;
		setActiveSnapPoint: (newValue: number | string | null | undefined) => void;
	};

export class SnapPoints {
	#activeSnapPoint: SnapPointsProps["activeSnapPoint"];
	#snapPoints: SnapPointsProps["snapPoints"];
	#fadeFromIndex: SnapPointsProps["fadeFromIndex"];
	#drawerRef: SnapPointsProps["drawerRef"];
	#overlayRef: SnapPointsProps["overlayRef"];
	#direction: SnapPointsProps["direction"];
	#onSnapPointChange: SnapPointsProps["onSnapPointChange"];
	#setActiveSnapPoint: SnapPointsProps["setActiveSnapPoint"];

	constructor(props: SnapPointsProps) {
		this.#activeSnapPoint = props.activeSnapPoint;
		this.#snapPoints = props.snapPoints;
		this.#fadeFromIndex = props.fadeFromIndex;
		this.#drawerRef = props.drawerRef;
		this.#overlayRef = props.overlayRef;
		this.#direction = props.direction;
		this.#onSnapPointChange = props.onSnapPointChange;
		this.#setActiveSnapPoint = props.setActiveSnapPoint;

		$effect(() => {
			const activeSnapPoint = this.#activeSnapPoint.current;
			const snapPoints = this.#snapPoints.current;
			const snapPointsOffset = this.snapPointsOffset;
			untrack(() => {
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

	isLastSnapPoint = $derived.by(() => {
		const activeSnapPoint = this.#activeSnapPoint.current;
		const snapPoints = this.#snapPoints.current;
		return activeSnapPoint === snapPoints?.[snapPoints.length - 1] || null;
	});

	shouldFade = $derived.by(() => {
		const snapPoints = this.#snapPoints.current;
		const fadeFromIndex = this.#fadeFromIndex.current;
		const activeSnapPoint = this.#activeSnapPoint.current;
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
		const snapPoints = this.#snapPoints.current;
		const activeSnapPoint = this.#activeSnapPoint.current;
		return snapPoints?.findIndex((snapPoint) => snapPoint === activeSnapPoint) ?? null;
	});

	snapPointsOffset = $derived.by(() => {
		const snapPoints = this.#snapPoints.current;
		if (!snapPoints) return [];
		const direction = this.#direction.current;
		return snapPoints.map((snapPoint) => {
			const hasWindow = typeof window !== "undefined";
			const isPx = typeof snapPoint === "string";
			let snapPointAsNumber = 0;

			if (isPx) {
				snapPointAsNumber = Number.parseInt(snapPoint, 10);
			}

			if (isVertical(direction)) {
				const height = isPx
					? snapPointAsNumber
					: hasWindow
						? snapPoint * window.innerHeight
						: 0;

				if (hasWindow) {
					return direction === "bottom"
						? window.innerHeight - height
						: -window.innerHeight + height;
				}
				return height;
			}
			const width = isPx ? snapPointAsNumber : hasWindow ? snapPoint * window.innerWidth : 0;

			if (hasWindow) {
				return direction === "right"
					? window.innerWidth - width
					: -window.innerWidth + width;
			}

			return width;
		});
	});

	activeSnapPointOffset = $derived.by(() => {
		const activeSnapPointIndex = this.activeSnapPointIndex;
		const snapPointsOffset = this.snapPointsOffset;
		return activeSnapPointIndex !== null ? snapPointsOffset?.[activeSnapPointIndex] : null;
	});

	snapToPoint = (dimension: number) => {
		const snapPointsOffset = this.snapPointsOffset;
		const onSnapPointChange = this.#onSnapPointChange;
		const newSnapPointIndex =
			snapPointsOffset?.findIndex((snapPointDim) => snapPointDim === dimension) ?? null;
		onSnapPointChange(newSnapPointIndex);
		const drawerNode = this.#drawerRef.current;
		const direction = this.#direction.current;
		setStyles(drawerNode, {
			transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			transform: isVertical(direction)
				? `translate3d(0, ${dimension}px, 0)`
				: `translate3d(${dimension}px, 0, 0)`,
		});

		if (
			snapPointsOffset &&
			newSnapPointIndex !== snapPointsOffset.length - 1 &&
			newSnapPointIndex !== this.#fadeFromIndex.current
		) {
			setStyles(this.#overlayRef.current, {
				transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
				opacity: "0",
			});
		} else {
			setStyles(this.#overlayRef.current, {
				transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
				opacity: "1",
			});
		}

		this.#setActiveSnapPoint(
			newSnapPointIndex !== null ? this.#snapPoints.current?.[newSnapPointIndex] : null
		);
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
		if (this.#fadeFromIndex.current === undefined || this.#fadeFromIndex.current === null)
			return;
		const direction = this.#direction.current;
		const activeSnapPointOffset = this.activeSnapPointOffset;
		const activeSnapPointIndex = this.activeSnapPointIndex;
		const fadeFromIndex = this.#fadeFromIndex.current;

		const currentPosition =
			direction === "bottom" || direction === "right"
				? (activeSnapPointOffset ?? 0) - draggedDistance
				: (activeSnapPointOffset ?? 0) + draggedDistance;
		const isOverlaySnapPoint = activeSnapPointIndex === fadeFromIndex - 1;
		const isFirst = activeSnapPointIndex === 0;
		const hasDraggedUp = draggedDistance > 0;

		if (isOverlaySnapPoint) {
			setStyles(this.#overlayRef.current, {
				transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			});
		}

		if (velocity > 2 && !hasDraggedUp) {
			if (dismissible) closeDrawer();
			else this.snapToPoint(this.snapPointsOffset[0]); // snap to initial point
			return;
		}

		if (velocity > 2 && hasDraggedUp && this.snapPointsOffset && this.#snapPoints.current) {
			this.snapToPoint(this.snapPointsOffset[this.#snapPoints.current.length - 1] as number);
			return;
		}

		// Find the closest snap point to the current position
		const closestSnapPoint = this.snapPointsOffset?.reduce((prev, curr) => {
			if (typeof prev !== "number" || typeof curr !== "number") return prev;

			return Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition)
				? curr
				: prev;
		});

		const dim = isVertical(direction) ? window.innerHeight : window.innerWidth;
		if (velocity > VELOCITY_THRESHOLD && Math.abs(draggedDistance) < dim * 0.4) {
			const dragDirection = hasDraggedUp ? 1 : -1; // 1 = up, -1 = down

			// Don't do anything if we swipe upwards while being on the last snap point
			if (dragDirection > 0 && this.isLastSnapPoint) {
				if (!this.#snapPoints.current) return;
				this.snapToPoint(this.snapPointsOffset[this.#snapPoints.current.length - 1]);
				return;
			}

			if (isFirst && dragDirection < 0 && dismissible) {
				closeDrawer();
			}

			if (activeSnapPointIndex === null) return;

			this.snapToPoint(this.snapPointsOffset[activeSnapPointIndex + dragDirection]);
			return;
		}

		this.snapToPoint(closestSnapPoint);
	};

	onDragSnapPoints = ({ draggedDistance }: { draggedDistance: number }) => {
		if (this.activeSnapPointOffset === null) return;
		const direction = this.#direction.current;
		const newValue =
			direction === "bottom" || direction === "right"
				? this.activeSnapPointOffset - draggedDistance
				: this.activeSnapPointOffset + draggedDistance;

		// Don't do anything if we exceed the last(biggest) snap point
		if (
			(direction === "bottom" || direction === "right") &&
			newValue < this.snapPointsOffset[this.snapPointsOffset.length - 1]
		) {
			return;
		}
		if (
			(direction === "top" || direction === "left") &&
			newValue > this.snapPointsOffset[this.snapPointsOffset.length - 1]
		) {
			return;
		}

		setStyles(this.#drawerRef.current, {
			transform: isVertical(direction)
				? `translate3d(0, ${newValue}px, 0)`
				: `translate3d(${newValue}px, 0, 0)`,
		});
	};

	getPercentageDragged = (absDraggedDistance: number, isDraggingDown: boolean) => {
		const snapPoints = this.#snapPoints.current;
		const activeSnapPointIndex = this.activeSnapPointIndex;
		const snapPointsOffset = this.snapPointsOffset;
		const fadeFromIndex = this.#fadeFromIndex.current;
		if (
			!snapPoints ||
			typeof activeSnapPointIndex !== "number" ||
			!snapPointsOffset ||
			fadeFromIndex === undefined ||
			fadeFromIndex === null
		)
			return null;

		// If this is true we are dragging to a snap point that is supposed to have an overlay
		const isOverlaySnapPoint = activeSnapPointIndex === fadeFromIndex - 1;
		const isOverlaySnapPointOrHigher = activeSnapPointIndex >= fadeFromIndex;

		if (isOverlaySnapPointOrHigher && isDraggingDown) {
			return 0;
		}

		// Don't animate, but still use this one if we are dragging away from the overlaySnapPoint
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
}
