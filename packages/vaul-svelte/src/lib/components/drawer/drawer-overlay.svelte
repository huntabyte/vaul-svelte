<script lang="ts">
	import { Dialog as DialogPrimitive, type WithoutChildrenOrChild } from "bits-ui";
	import { type WithChildren, box, mergeProps } from "svelte-toolbelt";
	import type { OverlayProps } from "./index.js";
	import { useId } from "$lib/internal/use-id.js";
	import { useDrawerOverlay } from "$lib/use-drawer-overlay.svelte.js";

	let {
		id = useId(),
		ref = $bindable(null),
		children,
		...restProps
	}: WithChildren<WithoutChildrenOrChild<OverlayProps>> = $props();

	const overlayState = useDrawerOverlay({
		id: box.with(() => id),
		ref: box.with(
			() => ref,
			(v) => (ref = v)
		),
	});

	const mergedProps = $derived(mergeProps(restProps, overlayState.props));
</script>

{#if overlayState.shouldRender}
	<DialogPrimitive.Overlay {...mergedProps}>
		{@render children?.()}
	</DialogPrimitive.Overlay>
{/if}
