<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { setCtx } from '../ctx.js';
	import type { Props } from './types.js';
	import { get } from 'svelte/store';

	type $$Props = Props;

	export let open = false;
	export let onOpenChange: $$Props['onOpenChange'] = undefined;
	export let closeThreshold: $$Props['closeThreshold'] = undefined;
	export let scrollLockTimeout: $$Props['scrollLockTimeout'] = undefined;
	export let snapPoints: $$Props['snapPoints'] = undefined;
	export let fadeFromIndex: $$Props['fadeFromIndex'] = undefined;
	export let openFocus: $$Props['openFocus'] = undefined;
	export let onOutsideClick: $$Props['onOutsideClick'] = undefined;
	export let nested: $$Props['nested'] = false;
	export let shouldScaleBackground: $$Props['shouldScaleBackground'] = false;
	export let activeSnapPoint: $$Props['activeSnapPoint'] = undefined;
	export let onActiveSnapPointChange: $$Props['onActiveSnapPointChange'] = undefined;
	export let onRelease: $$Props['onRelease'] = undefined;
	export let onDrag: $$Props['onDrag'] = undefined;
	export let onClose: $$Props['onClose'] = undefined;
	export let dismissible: $$Props['dismissible'] = undefined;

	const {
		states: { keyboardIsOpen, activeSnapPoint: localActiveSnapPoint, drawerId, openDrawerIds },
		methods: { closeDrawer, openDrawer },
		options: { dismissible: localDismissible },
		updateOption
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
		dismissible
	});

	$: activeSnapPoint !== undefined && localActiveSnapPoint.set(activeSnapPoint);

	$: updateOption('closeThreshold', closeThreshold);
	$: updateOption('scrollLockTimeout', scrollLockTimeout);
	$: updateOption('snapPoints', snapPoints);
	$: updateOption('fadeFromIndex', fadeFromIndex);
	$: updateOption('openFocus', openFocus);
	$: updateOption('shouldScaleBackground', shouldScaleBackground);
	$: updateOption('dismissible', dismissible);
</script>

<DialogPrimitive.Root
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
		onOutsideClick?.(e);
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
>
	<slot />
</DialogPrimitive.Root>

<style>
	:global([data-vaul-drawer]) {
		touch-action: none;
		transform: translate3d(0, 100%, 0);
		transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
	}

	:global(.vaul-dragging .vaul-scrollable) {
		overflow-y: hidden !important;
	}

	:global([data-vaul-drawer][data-vaul-drawer-visible='true']) {
		transform: translate3d(0, var(--snap-point-height, 0), 0);
	}

	:global([data-vaul-overlay]) {
		opacity: 0;
		transition: opacity 0.5s cubic-bezier(0.32, 0.72, 0, 1);
	}

	:global([data-vaul-overlay][data-vaul-drawer-visible='true']) {
		opacity: 1;
	}

	:global([data-vaul-drawer]::after) {
		content: '';
		position: absolute;
		top: 100%;
		background: inherit;
		background-color: inherit;
		left: 0;
		right: 0;
		height: 200%;
	}

	:global(
			[data-vaul-overlay][data-vaul-snap-points='true']:not(
					[data-vaul-snap-points-overlay='true']
				):not([data-state='closed'])
		) {
		opacity: 0;
	}

	:global(
			[data-vaul-overlay][data-vaul-snap-points-overlay='true']:not(
					[data-vaul-drawer-visible='false']
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
