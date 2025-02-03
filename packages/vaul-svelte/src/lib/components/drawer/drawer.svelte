<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { box } from "svelte-toolbelt";
	import type { RootProps } from "./index.js";
	import { noop } from "$lib/internal/noop.js";
	import { CLOSE_THRESHOLD, SCROLL_LOCK_TIMEOUT } from "$lib/internal/constants.js";
	import { useDrawerRoot } from "$lib/use-drawer-root.svelte.js";

	let {
		open = $bindable(false),
		onOpenChange = noop,
		onDrag = noop,
		onRelease = noop,
		snapPoints,
		shouldScaleBackground = false,
		setBackgroundColorOnScale = true,
		closeThreshold = CLOSE_THRESHOLD,
		scrollLockTimeout = SCROLL_LOCK_TIMEOUT,
		dismissible = true,
		handleOnly = false,
		fadeFromIndex = snapPoints && snapPoints.length - 1,
		activeSnapPoint = $bindable(null),
		onActiveSnapPointChange = noop,
		fixed = false,
		modal = true,
		onClose = noop,
		nested = false,
		noBodyStyles = false,
		direction = "bottom",
		snapToSequentialPoint = false,
		preventScrollRestoration = false,
		repositionInputs = true,
		onAnimationEnd = noop,
		container = null,
		autoFocus = false,
		disablePreventScroll = true,
		...restProps
	}: RootProps = $props();

	const rootState = useDrawerRoot({
		open: box.with(
			() => open,
			(o) => {
				open = o;
				rootState.handleOpenChange(o);
			}
		),
		closeThreshold: box.with(() => closeThreshold),
		scrollLockTimeout: box.with(() => scrollLockTimeout),
		snapPoints: box.with(() => snapPoints),
		fadeFromIndex: box.with(() => fadeFromIndex),
		nested: box.with(() => nested),
		shouldScaleBackground: box.with(() => shouldScaleBackground),
		activeSnapPoint: box.with(
			() => activeSnapPoint,
			(v) => {
				activeSnapPoint = v;
				onActiveSnapPointChange(v);
			}
		),
		onRelease: box.with(() => onRelease),
		onDrag: box.with(() => onDrag),
		onClose: box.with(() => onClose),
		dismissible: box.with(() => dismissible),
		direction: box.with(() => direction),
		fixed: box.with(() => fixed),
		modal: box.with(() => modal),
		handleOnly: box.with(() => handleOnly),
		noBodyStyles: box.with(() => noBodyStyles),
		preventScrollRestoration: box.with(() => preventScrollRestoration),
		setBackgroundColorOnScale: box.with(() => setBackgroundColorOnScale),
		repositionInputs: box.with(() => repositionInputs),
		autoFocus: box.with(() => autoFocus),
		snapToSequentialPoint: box.with(() => snapToSequentialPoint),
		container: box.with(() => container),
		disablePreventScroll: box.with(() => disablePreventScroll),
		onOpenChange: box.with(() => onOpenChange),
		onAnimationEnd: box.with(() => onAnimationEnd),
	});
</script>

<DialogPrimitive.Root
	bind:open={
		() => rootState.open.current,
		(o) => {
			rootState.onDialogOpenChange(o);
			rootState.handleOpenChange(o);
		}
	}
	{...restProps}
/>

<style global>
	:global([data-vaul-drawer]) {
		touch-action: none;
		will-change: transform;
		transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
		animation-duration: 0.5s;
		animation-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
	}

	:global(
			[data-vaul-drawer][data-vaul-snap-points="false"][data-vaul-drawer-direction="bottom"][data-state="open"]
		) {
		animation-name: slideFromBottom;
	}
	:global(
			[data-vaul-drawer][data-vaul-snap-points="false"][data-vaul-drawer-direction="bottom"][data-state="closed"]
		) {
		animation-name: slideToBottom;
	}

	:global(
			[data-vaul-drawer][data-vaul-snap-points="false"][data-vaul-drawer-direction="top"][data-state="open"]
		) {
		animation-name: slideFromTop;
	}
	:global(
			[data-vaul-drawer][data-vaul-snap-points="false"][data-vaul-drawer-direction="top"][data-state="closed"]
		) {
		animation-name: slideToTop;
	}

	:global(
			[data-vaul-drawer][data-vaul-snap-points="false"][data-vaul-drawer-direction="left"][data-state="open"]
		) {
		animation-name: slideFromLeft;
	}
	:global(
			[data-vaul-drawer][data-vaul-snap-points="false"][data-vaul-drawer-direction="left"][data-state="closed"]
		) {
		animation-name: slideToLeft;
	}

	:global(
			[data-vaul-drawer][data-vaul-snap-points="false"][data-vaul-drawer-direction="right"][data-state="open"]
		) {
		animation-name: slideFromRight;
	}
	:global(
			[data-vaul-drawer][data-vaul-snap-points="false"][data-vaul-drawer-direction="right"][data-state="closed"]
		) {
		animation-name: slideToRight;
	}

	:global([data-vaul-drawer][data-vaul-snap-points="true"][data-vaul-drawer-direction="bottom"]) {
		transform: translate3d(0, var(--initial-transform, 100%), 0);
	}

	:global([data-vaul-drawer][data-vaul-snap-points="true"][data-vaul-drawer-direction="top"]) {
		transform: translate3d(0, calc(var(--initial-transform, 100%) * -1), 0);
	}

	:global([data-vaul-drawer][data-vaul-snap-points="true"][data-vaul-drawer-direction="left"]) {
		transform: translate3d(calc(var(--initial-transform, 100%) * -1), 0, 0);
	}

	:global([data-vaul-drawer][data-vaul-snap-points="true"][data-vaul-drawer-direction="right"]) {
		transform: translate3d(var(--initial-transform, 100%), 0, 0);
	}

	:global(
			[data-vaul-drawer][data-vaul-delayed-snap-points="true"][data-vaul-drawer-direction="top"]
		) {
		transform: translate3d(0, var(--snap-point-height, 0), 0);
	}

	:global(
			[data-vaul-drawer][data-vaul-delayed-snap-points="true"][data-vaul-drawer-direction="bottom"]
		) {
		transform: translate3d(0, var(--snap-point-height, 0), 0);
	}

	:global(
			[data-vaul-drawer][data-vaul-delayed-snap-points="true"][data-vaul-drawer-direction="left"]
		) {
		transform: translate3d(var(--snap-point-height, 0), 0, 0);
	}

	:global(
			[data-vaul-drawer][data-vaul-delayed-snap-points="true"][data-vaul-drawer-direction="right"]
		) {
		transform: translate3d(var(--snap-point-height, 0), 0, 0);
	}

	:global([data-vaul-overlay][data-vaul-snap-points="false"]) {
		animation-duration: 0.5s;
		animation-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
	}
	:global([data-vaul-overlay][data-vaul-snap-points="false"][data-state="open"]) {
		animation-name: fadeIn;
	}
	:global([data-vaul-overlay][data-state="closed"]) {
		animation-name: fadeOut;
	}

	:global([data-vaul-animate="false"]) {
		animation: none !important;
	}

	:global([data-vaul-overlay][data-vaul-snap-points="true"]) {
		opacity: 0;
		transition: opacity 0.5s cubic-bezier(0.32, 0.72, 0, 1);
	}

	:global([data-vaul-overlay][data-vaul-snap-points="true"]) {
		opacity: 1;
	}

	:global([data-vaul-drawer]:not([data-vaul-custom-container="true"])::after) {
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

	:global([data-vaul-overlay][data-vaul-snap-points-overlay="true"]) {
		opacity: 1;
	}

	:global([data-vaul-handle]) {
		display: block;
		position: relative;
		opacity: 0.7;
		background: #e2e2e4;
		margin-left: auto;
		margin-right: auto;
		height: 5px;
		width: 32px;
		border-radius: 1rem;
		touch-action: pan-y;
	}

	:global([data-vaul-handle]:hover, [data-vaul-handle]:active) {
		opacity: 1;
	}

	:global([data-vaul-handle-hitarea]) {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: max(100%, 2.75rem); /* 44px */
		height: max(100%, 2.75rem); /* 44px */
		touch-action: inherit;
	}

	/* This will allow us to not animate via animation, but still benefit from delaying unmount via Radix. */

	@keyframes -global-fake-animation {
		from {
		}
		to {
		}
	}

	@keyframes -global-fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes -global-fadeOut {
		to {
			opacity: 0;
		}
	}

	@keyframes -global-slideFromBottom {
		from {
			transform: translate3d(0, var(--initial-transform, 100%), 0);
		}
		to {
			transform: translate3d(0, 0, 0);
		}
	}

	@keyframes -global-slideToBottom {
		to {
			transform: translate3d(0, var(--initial-transform, 100%), 0);
		}
	}

	@keyframes -global-slideFromTop {
		from {
			transform: translate3d(0, calc(var(--initial-transform, 100%) * -1), 0);
		}
		to {
			transform: translate3d(0, 0, 0);
		}
	}

	@keyframes -global-slideToTop {
		to {
			transform: translate3d(0, calc(var(--initial-transform, 100%) * -1), 0);
		}
	}

	@keyframes -global-slideFromLeft {
		from {
			transform: translate3d(calc(var(--initial-transform, 100%) * -1), 0, 0);
		}
		to {
			transform: translate3d(0, 0, 0);
		}
	}

	@keyframes -global-slideToLeft {
		to {
			transform: translate3d(calc(var(--initial-transform, 100%) * -1), 0, 0);
		}
	}

	@keyframes -global-slideFromRight {
		from {
			transform: translate3d(var(--initial-transform, 100%), 0, 0);
		}
		to {
			transform: translate3d(0, 0, 0);
		}
	}

	@keyframes -global-slideToRight {
		to {
			transform: translate3d(var(--initial-transform, 100%), 0, 0);
		}
	}

	@media (hover: hover) and (pointer: fine) {
		:global([data-vaul-drawer]) {
			user-select: none !important;
		}
	}

	@media (pointer: fine) {
		:global([data-vaul-handle-hitarea]) {
			width: 100%;
			height: 100%;
		}
	}
</style>
