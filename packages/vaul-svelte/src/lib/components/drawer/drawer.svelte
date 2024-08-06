<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { box } from "svelte-toolbelt";
	import type { RootProps } from "./index.js";
	import { noop } from "$lib/internal/helpers/noop.js";
	import {
		DEFAULT_CLOSE_THRESHOLD,
		DEFAULT_SCROLL_LOCK_TIMEOUT,
		useDrawerRoot,
	} from "$lib/vaul.svelte.js";

	let {
		open = $bindable(false),
		onOpenChange = noop,
		closeThreshold = DEFAULT_CLOSE_THRESHOLD,
		scrollLockTimeout = DEFAULT_SCROLL_LOCK_TIMEOUT,
		snapPoints = null,
		fadeFromIndex = snapPoints && snapPoints.length - 1,
		backgroundColor = "black",
		nested = false,
		shouldScaleBackground = false,
		activeSnapPoint = $bindable(null),
		onActiveSnapPointChange = noop,
		onRelease = noop,
		onDrag = noop,
		onClose = noop,
		dismissible = true,
		direction = "bottom",
		fixed = false,
		handleOnly = false,
		noBodyStyles = false,
		preventScrollRestoration = true,
		setBackgroundColorOnScale = true,
		disablePreventScroll = false,
		...restProps
	}: RootProps = $props();

	const rootState = useDrawerRoot({
		open: box.with(
			() => open,
			(v) => {
				open = v;
				onOpenChange(v);
			}
		),
		closeThreshold: box.with(() => closeThreshold),
		scrollLockTimeout: box.with(() => scrollLockTimeout),
		snapPoints: box.with(() => snapPoints),
		fadeFromIndex: box.with(() => fadeFromIndex),
		backgroundColor: box.with(() => backgroundColor),
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
		modal: box.with(() => true),
		handleOnly: box.with(() => handleOnly),
		noBodyStyles: box.with(() => noBodyStyles),
		preventScrollRestoration: box.with(() => preventScrollRestoration),
		setBackgroundColorOnScale: box.with(() => setBackgroundColorOnScale),
		disablePreventScroll: box.with(() => disablePreventScroll),
	});
</script>

<DialogPrimitive.Root
	bind:open
	onOpenChange={(o) => {
		onOpenChange(o);
		rootState.onOpenChange(o);
	}}
	{...restProps}
/>

<style global>
	:global([data-vaul-drawer]) {
		touch-action: none;
		will-change: transform;
		transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
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

	:global(.vaul-dragging .vaul-scrollable [data-vault-drawer-direction="top"]) {
		overflow-y: hidden !important;
	}
	:global(.vaul-dragging .vaul-scrollable [data-vault-drawer-direction="bottom"]) {
		overflow-y: hidden !important;
	}

	:global(.vaul-dragging .vaul-scrollable [data-vault-drawer-direction="left"]) {
		overflow-x: hidden !important;
	}

	:global(.vaul-dragging .vaul-scrollable [data-vault-drawer-direction="right"]) {
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

	:global(
			[data-vaul-drawer][data-vaul-drawer-visible="true"][data-vaul-drawer-direction="left"]
		) {
		transform: translate3d(var(--snap-point-height, 0), 0, 0);
	}

	:global(
			[data-vaul-drawer][data-vaul-drawer-visible="true"][data-vaul-drawer-direction="right"]
		) {
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

	:global([data-vaul-handle]) {
		display: block;
		position: relative;
		opacity: 0.8;
		margin-left: auto;
		margin-right: auto;
		height: 5px;
		width: 56px;
		border-radius: 1rem;
		touch-action: pan-y;
		cursor: grab;
	}

	:global([data-vaul-handle]:hover, [data-vaul-handle]:active) {
		opacity: 1;
	}

	:global([data-vaul-handle]:active) {
		cursor: grabbing;
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

	/* This will allow us to not animate via animation, but still benefit from delaying unmount via Radix. */

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

	@media (pointer: fine) {
		:global([data-vaul-handle-hitarea]) {
			width: 100%;
			height: 100%;
		}
	}
</style>
