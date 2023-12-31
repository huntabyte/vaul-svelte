<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { setCtx } from '../ctx.js';
	import type { Props } from './types.js';

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

	const {
		states: { keyboardIsOpen },
		methods: { closeDrawer, openDrawer },
		options: { dismissible },
		updateOption
	} = setCtx({
		defaultOpen: open,
		onOpenChange: ({ next }) => {
			if (open !== next) {
				onOpenChange?.(next);
				open = next;
			}
			return next;
		},
		closeThreshold,
		scrollLockTimeout,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		snapPoints: snapPoints as any,
		fadeFromIndex,
		nested,
		shouldScaleBackground
	});

	$: updateOption('closeThreshold', closeThreshold);
	$: updateOption('scrollLockTimeout', scrollLockTimeout);
	$: updateOption('snapPoints', snapPoints);
	$: updateOption('fadeFromIndex', fadeFromIndex);
	$: updateOption('openFocus', openFocus);
	$: updateOption('shouldScaleBackground', shouldScaleBackground);
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
			$keyboardIsOpen = false;
		}
		e.preventDefault();
		onOpenChange?.(false);
		if (!$dismissible || open !== undefined) {
			return;
		}
		closeDrawer();
	}}
>
	<slot />
</DialogPrimitive.Root>
