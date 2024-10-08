import { untrack } from "svelte";
import { isBrowser, isVertical } from "./internal/helpers/is.js";
import type { DrawerRootState } from "./vaul.svelte.js";
import { set } from "./helpers.js";
import { TRANSITIONS, VELOCITY_THRESHOLD } from "./internal/constants.js";

type Dimensions = {
	innerWidth: number;
	innerHeight: number;
};

export class SnapPointsState {
	#root: DrawerRootState;
	#direction = $derived.by(() => this.#root.direction.current);
	#container = $derived.by(() => this.#root.container.current);
	#snapPoints = $derived.by(() => this.#root.snapPoints.current ?? []);
	activeSnapPoint = $derived.by(() => this.#root.activeSnapPoint.current);
	fadeFromIndex = $derived.by(() => this.#root.fadeFromIndex.current);
	#overlayNode = $derived.by(() => this.#root.overlayNode);
	#drawerNode = $derived.by(() => this.#root.drawerNode);
	#snapToSequentialPoint = $derived.by(() => this.#root.snapToSequentialPoint.current);

	windowDimensions = $state.raw<Dimensions | undefined>(
		isBrowser
			? {
					innerWidth: window.innerWidth,
					innerHeight: window.innerHeight,
				}
			: undefined
	);
	isLastSnapPoint = $derived.by(() => {
		return this.activeSnapPoint === this.#snapPoints?.[this.#snapPoints.length - 1] || null;
	});

	activeSnapPointIndex = $derived.by(() => {
		return this.#snapPoints?.findIndex((snapPoint) => snapPoint === this.activeSnapPoint);
	});

	shouldFade = $derived.by(() => {
		return (
			(this.#snapPoints &&
				this.#snapPoints.length > 0 &&
				(this.fadeFromIndex || this.fadeFromIndex === 0) &&
				!Number.isNaN(this.fadeFromIndex) &&
				this.#snapPoints[this.fadeFromIndex] === this.activeSnapPoint) ||
			!this.#snapPoints
		);
	});

	snapPointsOffset = $derived.by(() => {
		this.windowDimensions;
		this.#root.open.current;
		const containerSize = this.#container
			? {
					width: this.#container.getBoundingClientRect().width,
					height: this.#container.getBoundingClientRect().height,
				}
			: typeof window !== "undefined"
				? { width: window.innerWidth, height: window.innerHeight }
				: { width: 0, height: 0 };

		const offset =
			this.#snapPoints?.map((snapPoint) => {
				const isPx = typeof snapPoint === "string";
				let snapPointAsNumber = 0;

				if (isPx) {
					snapPointAsNumber = Number.parseInt(snapPoint, 10);
				}

				if (isVertical(this.#direction)) {
					const height = isPx
						? snapPointAsNumber
						: this.windowDimensions
							? snapPoint * containerSize.height
							: 0;

					if (this.windowDimensions) {
						return this.#direction === "bottom"
							? containerSize.height - height
							: -containerSize.height + height;
					}

					return height;
				}
				const width = isPx
					? snapPointAsNumber
					: this.windowDimensions
						? snapPoint * containerSize.width
						: 0;

				if (this.windowDimensions) {
					return this.#direction === "right"
						? containerSize.width - width
						: -containerSize.width + width;
				}

				return width;
			}) ?? [];
		return offset;
	});

	activeSnapPointOffset = $derived.by(() => {
		if (this.activeSnapPointIndex !== null) {
			if (this.activeSnapPointIndex !== undefined) {
				return this.snapPointsOffset[this.activeSnapPointIndex];
			}
		}
		return null;
	});

	constructor(root: DrawerRootState) {
		this.#root = root;

		$effect(() => {
			return untrack(() => {
				window.addEventListener("resize", this.#onResize);
				return () => window.removeEventListener("resize", this.#onResize);
			});
		});

		$effect(() => {
			const activeSnapPoint = this.activeSnapPoint;
			const snapPoints = this.#snapPoints;
			const snapPointsOffset = this.snapPointsOffset;
			untrack(() => {
				if (activeSnapPoint) {
					const newIndex =
						snapPoints?.findIndex((snapPoint) => snapPoint === activeSnapPoint) ?? -1;
					if (
						snapPointsOffset &&
						newIndex !== -1 &&
						typeof snapPointsOffset[newIndex] === "number"
					) {
						this.snapToPoint(snapPointsOffset[newIndex]);
					}
				}
			});
		});
	}

	#onResize = () => {
		this.windowDimensions = {
			innerWidth: window.innerWidth,
			innerHeight: window.innerHeight,
		};
	};

	snapToPoint = (dimension: number) => {
		const newSnapPointIndex =
			this.snapPointsOffset.findIndex((snapPointDim) => snapPointDim === dimension) ?? null;

		this.#root.onSnapPointChange(newSnapPointIndex);
		set(this.#drawerNode, {
			transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			transform: isVertical(this.#direction)
				? `translate3d(0, ${dimension}px, 0)`
				: `translate3d(${dimension}px, 0, 0)`,
		});

		if (
			this.snapPointsOffset &&
			newSnapPointIndex !== this.snapPointsOffset.length - 1 &&
			newSnapPointIndex !== this.fadeFromIndex &&
			this.fadeFromIndex !== undefined &&
			newSnapPointIndex < this.fadeFromIndex
		) {
			set(this.#overlayNode, {
				transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
				opacity: "0",
			});
		} else {
			set(this.#overlayNode, {
				transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
				opacity: "1",
			});
		}

		this.#root.setActiveSnapPoint(this.#snapPoints?.[Math.max(newSnapPointIndex, 0)]);
	};

	onRelease = (props: {
		draggedDistance: number;
		closeDrawer: () => void;
		velocity: number;
		dismissible: boolean;
	}) => {
		if (this.fadeFromIndex === undefined) return;

		const currentPosition =
			this.#direction === "bottom" || this.#direction === "right"
				? (this.activeSnapPointOffset ?? 0) - props.draggedDistance
				: (this.activeSnapPointOffset ?? 0) + props.draggedDistance;
		const isOverlaySnapPoint = this.activeSnapPointIndex === this.fadeFromIndex - 1;
		const isFirst = this.activeSnapPointIndex === 0;
		const hasDraggedUp = props.draggedDistance > 0;

		if (isOverlaySnapPoint) {
			set(this.#overlayNode, {
				transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			});
		}

		if (!this.#snapToSequentialPoint && props.velocity > 2 && !hasDraggedUp) {
			if (props.dismissible) props.closeDrawer();
			else this.snapToPoint(this.snapPointsOffset[0]);
			return;
		}

		if (
			!this.#snapToSequentialPoint &&
			props.velocity > 2 &&
			hasDraggedUp &&
			this.snapPointsOffset &&
			this.#snapPoints
		) {
			this.snapToPoint(this.snapPointsOffset[this.#snapPoints.length - 1]);
			return;
		}

		const closestSnapPoint = this.snapPointsOffset?.reduce((prev, curr) => {
			if (typeof prev !== "number" || typeof curr !== "number") return prev;
			return Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition)
				? curr
				: prev;
		});

		const dim = isVertical(this.#direction) ? window.innerHeight : window.innerWidth;
		if (props.velocity > VELOCITY_THRESHOLD && Math.abs(props.draggedDistance) < dim * 0.4) {
			const dragDirection = hasDraggedUp ? 1 : -1; // 1 = up, -1 = down

			// Don't do anything if we swipe upwards while being on the last snap point
			if (dragDirection > 0 && this.isLastSnapPoint) {
				this.snapToPoint(this.snapPointsOffset[this.#snapPoints.length - 1]);
				return;
			}

			if (isFirst && dragDirection < 0 && props.dismissible) {
				this.#root.closeDrawer();
			}

			if (this.activeSnapPointIndex === null) return;

			this.snapToPoint(this.snapPointsOffset[this.activeSnapPointIndex + dragDirection]);
			return;
		}

		this.snapToPoint(closestSnapPoint);
	};

	onDrag = (props: { draggedDistance: number }) => {
		if (this.activeSnapPointOffset === null) return;
		const newValue =
			this.#direction === "bottom" || this.#direction === "right"
				? this.activeSnapPointOffset - props.draggedDistance
				: this.activeSnapPointOffset + props.draggedDistance;

		// Don't do anything if we exceed the last(biggest) snap point
		if (
			(this.#direction === "bottom" || this.#direction === "right") &&
			newValue < this.snapPointsOffset[this.snapPointsOffset.length - 1]
		) {
			return;
		}
		if (
			(this.#direction === "top" || this.#direction === "left") &&
			newValue > this.snapPointsOffset[this.snapPointsOffset.length - 1]
		) {
			return;
		}

		set(this.#drawerNode, {
			transform: isVertical(this.#direction)
				? `translate3d(0, ${newValue}px, 0)`
				: `translate3d(${newValue}px, 0, 0)`,
		});
	};

	getPercentageDragged = (absDraggedDistance: number, isDraggingDown: boolean) => {
		if (
			!this.#snapPoints.length ||
			typeof this.activeSnapPointIndex !== "number" ||
			!this.snapPointsOffset.length ||
			this.fadeFromIndex === undefined
		)
			return null;

		// If this is true we are dragging to a snap point that is supposed to have an overlay
		const isOverlaySnapPoint = this.activeSnapPointIndex === this.fadeFromIndex - 1;
		const isOverlaySnapPointOrHigher = this.activeSnapPointIndex >= this.fadeFromIndex;

		if (isOverlaySnapPointOrHigher && isDraggingDown) {
			return 0;
		}

		// Don't animate, but still use this one if we are dragging away from the overlaySnapPoint
		if (isOverlaySnapPoint && !isDraggingDown) return 1;
		if (!this.shouldFade && !isOverlaySnapPoint) return null;

		// Either fadeFrom index or the one before
		const targetSnapPointIndex = isOverlaySnapPoint
			? this.activeSnapPointIndex + 1
			: this.activeSnapPointIndex - 1;

		// Get the distance from overlaySnapPoint to the one before or vice-versa to calculate the opacity percentage accordingly
		const snapPointDistance = isOverlaySnapPoint
			? this.snapPointsOffset[targetSnapPointIndex] -
				this.snapPointsOffset[targetSnapPointIndex - 1]
			: this.snapPointsOffset[targetSnapPointIndex + 1] -
				this.snapPointsOffset[targetSnapPointIndex];

		const percentageDragged = absDraggedDistance / Math.abs(snapPointDistance);

		if (isOverlaySnapPoint) {
			return 1 - percentageDragged;
		} else {
			return percentageDragged;
		}
	};
}
