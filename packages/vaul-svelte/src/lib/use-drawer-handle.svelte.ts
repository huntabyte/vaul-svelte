import { useRefById, type ReadableBoxedValues, type WithRefProps } from "svelte-toolbelt";
import { DrawerContext } from "./context.js";

interface UseDrawerHandleOpts
	extends WithRefProps,
		ReadableBoxedValues<{
			preventCycle: boolean;
		}> {}

const LONG_HANDLE_PRESS_TIMEOUT = 250;
const DOUBLE_TAP_TIMEOUT = 120;

export function useDrawerHandle(opts: UseDrawerHandleOpts) {
	const ctx = DrawerContext.get();

	useRefById({
		id: opts.id,
		ref: opts.ref,
		deps: () => ctx.open.current,
	});

	let closeTimeoutId: number | null = null;
	let shouldCancelInteraction = false;

	function handleStartInteraction() {
		closeTimeoutId = window.setTimeout(() => {
			// Cancel click interaction on a long press
			shouldCancelInteraction = true;
		}, LONG_HANDLE_PRESS_TIMEOUT);
	}

	function handleCancelInteraction() {
		if (closeTimeoutId) {
			window.clearTimeout(closeTimeoutId);
		}
		shouldCancelInteraction = false;
	}

	function handleCycleSnapPoints() {
		// Prevent accidental taps while resizing drawer
		if (ctx.isDragging || opts.preventCycle.current || shouldCancelInteraction) {
			handleCancelInteraction();
			return;
		}
		// Make sure to clear the timeout id if the user releases the handle before the cancel timeout
		handleCancelInteraction();

		if (!ctx.snapPoints.current || ctx.snapPoints.current.length === 0) {
			if (!ctx.dismissible.current) {
				ctx.closeDrawer();
			}
			return;
		}

		const isLastSnapPoint =
			ctx.activeSnapPoint.current ===
			ctx.snapPoints.current[ctx.snapPoints.current.length - 1];

		if (isLastSnapPoint && ctx.dismissible.current) {
			ctx.closeDrawer();
			return;
		}

		const currentSnapIndex = ctx.snapPoints.current.findIndex(
			(point) => point === ctx.activeSnapPoint.current
		);
		if (currentSnapIndex === -1) return; // activeSnapPoint not found in snapPoints
		const nextSnapPoint = ctx.snapPoints.current[currentSnapIndex + 1];
		ctx.activeSnapPoint.current = nextSnapPoint;
	}

	function handleStartCycle() {
		if (shouldCancelInteraction) {
			handleCancelInteraction();
			return;
		}
		window.setTimeout(() => {
			handleCycleSnapPoints();
		}, DOUBLE_TAP_TIMEOUT);
	}

	const props = $derived({
		id: opts.id.current,
		"data-vaul-drawer-visible": ctx.open.current ? "true" : "false",
		"data-vaul-handle": "",
		"aria-hidden": "true",
		onclick: handleStartCycle,
		onpointercancel: handleCancelInteraction,
		onpointerdown: (e: PointerEvent) => {
			if (ctx.handleOnly.current) ctx.onPress(e);
			handleStartInteraction();
		},
		onpointermove: (e: PointerEvent) => {
			if (ctx.handleOnly.current) ctx.onDrag(e);
		},
	});

	return {
		get props() {
			return props;
		},
	};
}
