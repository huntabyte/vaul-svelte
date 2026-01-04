<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { setCtx } from "../ctx.js";
	import type { Props } from "./types.js";
	import { get } from "svelte/store";

	type $$Props = Props;

	export let open = false;
	export let onOpenChange: $$Props["onOpenChange"] = undefined;
	export let closeThreshold: $$Props["closeThreshold"] = undefined;
	export let scrollLockTimeout: $$Props["scrollLockTimeout"] = undefined;
	export let snapPoints: $$Props["snapPoints"] = undefined;
	export let fadeFromIndex: $$Props["fadeFromIndex"] = undefined;
	export let openFocus: $$Props["openFocus"] = undefined;
	export let onOutsideClick: $$Props["onOutsideClick"] = undefined;
	export let closeOnOutsideClick: $$Props["closeOnOutsideClick"] = true;
	export let backgroundColor: $$Props["backgroundColor"] = "black";
	export let nested: $$Props["nested"] = false;
	export let shouldScaleBackground: $$Props["shouldScaleBackground"] = false;
	export let activeSnapPoint: $$Props["activeSnapPoint"] = undefined;
	export let onActiveSnapPointChange: $$Props["onActiveSnapPointChange"] = undefined;
	export let onRelease: $$Props["onRelease"] = undefined;
	export let onDrag: $$Props["onDrag"] = undefined;
	export let onClose: $$Props["onClose"] = undefined;
	export let dismissible: $$Props["dismissible"] = undefined;
	export let direction: $$Props["direction"] = "bottom";

	const {
		states: {
			keyboardIsOpen,
			activeSnapPoint: localActiveSnapPoint,
			drawerId,
			openDrawerIds,
			isOpen,
		},
		methods: { closeDrawer, openDrawer },
		options: { dismissible: localDismissible },
		updateOption,
	} = setCtx({
		defaultOpen: open,
		defaultActiveSnapPoint: activeSnapPoint,
		onOpenChange: ({ next }) => {
			if (open !== next) {
				onOpenChange?.(next);
				open = next;
			}
			return next;
		},
		onActiveSnapPointChange: ({ next }) => {
			if (next === undefined && snapPoints && activeSnapPoint !== next) {
				const newNext = snapPoints[0];
				onActiveSnapPointChange?.(newNext);
				activeSnapPoint = newNext;
				return newNext;
			}

			if (activeSnapPoint !== next) {
				onActiveSnapPointChange?.(next);
				activeSnapPoint = next;
			}
			return next;
		},
		closeThreshold,
		scrollLockTimeout,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		snapPoints: snapPoints as any,
		fadeFromIndex,
		nested,
		onDrag,
		onClose,
		onRelease,
		shouldScaleBackground,
		backgroundColor,
		dismissible,
		direction,
	});

	$: activeSnapPoint !== undefined && localActiveSnapPoint.set(activeSnapPoint);

	$: updateOption("closeThreshold", closeThreshold);
	$: updateOption("scrollLockTimeout", scrollLockTimeout);
	$: updateOption("snapPoints", snapPoints);
	$: updateOption("fadeFromIndex", fadeFromIndex);
	$: updateOption("openFocus", openFocus);
	$: updateOption("shouldScaleBackground", shouldScaleBackground);
	$: updateOption("backgroundColor", backgroundColor);
	$: updateOption("dismissible", dismissible);
	$: updateOption("direction", direction);

	$: open && !$isOpen && openDrawer();
	$: !open && $isOpen && closeDrawer();
</script>

<DialogPrimitive.Root
	{closeOnOutsideClick}
	closeOnEscape={false}
	bind:open
	preventScroll={false}
	onOpenChange={(o) => {
		onOpenChange?.(o);
		if (!o) {
			closeDrawer();
		} else if (o) {
			openDrawer();
		}
	}}
	onOutsideClick={(e) => {
		if (!closeOnOutsideClick) return;

		onOutsideClick?.(e);

		if (e?.defaultPrevented) return;

		if ($keyboardIsOpen) {
			keyboardIsOpen.set(false);
		}
		e.preventDefault();
		if (!$localDismissible) {
			return;
		}
		const $openDialogIds = get(openDrawerIds);
		const isLast = $openDialogIds[$openDialogIds.length - 1] === get(drawerId);
		if (isLast) {
			onOpenChange?.(false);
			closeDrawer();
		}
	}}
	{...$$restProps}
>
	<slot />
</DialogPrimitive.Root>

<style>
	:global([data-vaul-drawer]) {
		touch-action: none;
		transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
	}

	:global([data-vaul-drawer][disable-animation="true"]) {
		transition: transform 0.0s cubic-bezier(0.32, 0.72, 0, 1) !important;
		animation-duration: 0.0s !important;
	}

	:global([data-vaul-drawer][data-vaul-drawer-direction="bottom"]) {
		transform: translate3d(0, 100%, 0);
	}

	:global([data-vaul-drawer][data-vaul-drawer-direction="top"]) {
		transform: translate3d(0, -100%, 0);
	}

	:global([data-vaul-drawer][data-vaul-drawer-direction="left"]) {
		transform: translate3d(-100%, 0, 0);
	}

	:global([data-vaul-drawer][data-vaul-drawer-direction="right"]) {
		transform: translate3d(100%, 0, 0);
	}

	:global(.vaul-dragging .vaul-scrollable [data-vaul-drawer-direction="top"]) {
		overflow-y: hidden !important;
	}

	:global(.vaul-dragging .vaul-scrollable [data-vaul-drawer-direction="bottom"]) {
		overflow-y: hidden !important;
	}

	:global(.vaul-dragging .vaul-scrollable [data-vaul-drawer-direction="left"]) {
		overflow-x: hidden !important;
	}
	:global(.vaul-dragging .vaul-scrollable [data-vaul-drawer-direction="right"]) {
		overflow-x: hidden !important;
	}

	:global([data-vaul-drawer][data-vaul-drawer-visible="true"][data-vaul-drawer-direction="top"]) {
		transform: translate3d(0, var(--snap-point-height, 0), 0);
	}

	:global(
			[data-vaul-drawer][data-vaul-drawer-visible="true"][data-vaul-drawer-direction="bottom"]
		) {
		transform: translate3d(0, var(--snap-point-height, 0), 0);
	}

	:global([data-vaul-drawer][data-vaul-drawer-visible="true"][data-vaul-drawer-direction="left"]) {
		transform: translate3d(var(--snap-point-height, 0), 0, 0);
	}

	:global([data-vaul-drawer][data-vaul-drawer-visible="true"][data-vaul-drawer-direction="right"]) {
		transform: translate3d(var(--snap-point-height, 0), 0, 0);
	}

	:global([data-vaul-overlay]) {
		opacity: 0;
		transition: opacity 0.5s cubic-bezier(0.32, 0.72, 0, 1);
	}

	:global([data-vaul-overlay][data-vaul-drawer-visible="true"]) {
		opacity: 1;
	}

	:global([data-vaul-drawer]::after) {
		content: "";
		position: absolute;
		background: inherit;
		background-color: inherit;
	}

	:global([data-vaul-drawer][data-vaul-drawer-direction="top"]::after) {
		top: initial;
		bottom: 100%;
		left: 0;
		right: 0;
		height: 200%;
	}

	:global([data-vaul-drawer][data-vaul-drawer-direction="bottom"]::after) {
		top: 100%;
		bottom: initial;
		left: 0;
		right: 0;
		height: 200%;
	}

	:global([data-vaul-drawer][data-vaul-drawer-direction="left"]::after) {
		left: initial;
		right: 100%;
		top: 0;
		bottom: 0;
		width: 200%;
	}

	:global([data-vaul-drawer][data-vaul-drawer-direction="right"]::after) {
		left: 100%;
		right: initial;
		top: 0;
		bottom: 0;
		width: 200%;
	}

	:global(
			[data-vaul-overlay][data-vaul-snap-points="true"]:not(
					[data-vaul-snap-points-overlay="true"]
				):not([data-state="closed"])
		) {
		opacity: 0;
	}

	:global(
			[data-vaul-overlay][data-vaul-snap-points-overlay="true"]:not(
					[data-vaul-drawer-visible="false"]
				)
		) {
		opacity: 1;
	}

	/* This will allow us to not animate via animation, but still benefit from delaying
	unmount via Bits */
	@keyframes -global-fake-animation {
		from {
		}
		to {
		}
	}

	@media (hover: hover) and (pointer: fine) {
		:global([data-vaul-drawer]) {
			user-select: none;
		}
	}
</style>
