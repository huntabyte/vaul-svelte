<script lang="ts">
	import { Dialog as DialogPrimitive, type WithoutChildrenOrChild, useId } from "bits-ui";
	import { type WithChildren, box, mergeProps } from "svelte-toolbelt";
	import Mounted from "../utils/mounted.svelte";
	import type { DrawerOverlayProps } from "./types.js";
	import { useDrawerOverlay } from "$lib/vaul.svelte.js";

	let {
		id = useId(),
		ref = $bindable(null),
		children,
		...restProps
	}: WithChildren<WithoutChildrenOrChild<DrawerOverlayProps>> = $props();

	const overlayState = useDrawerOverlay({
		id: box.with(() => id),
		ref: box.with(
			() => ref,
			(v) => (ref = v)
		),
	});

	const mergedProps = $derived(mergeProps(restProps, overlayState.props));
</script>

<DialogPrimitive.Overlay bind:ref {...mergedProps}>
	<Mounted
		onMounted={(mounted) => {
			if (!mounted) {
				overlayState.root.overlayNode = null;
			}
		}}
	/>
	{@render children?.()}
</DialogPrimitive.Overlay>
