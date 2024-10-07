<script lang="ts">
	import { Dialog as DialogPrimitive, type WithoutChildrenOrChild } from "bits-ui";
	import { type WithChildren, box, mergeProps } from "svelte-toolbelt";
	import Mounted from "../utils/mounted.svelte";
	import type { OverlayProps } from "./index.js";
	import { useId } from "$lib/internal/use-id.js";
	import { useDrawerOverlay } from "$lib/vaul.svelte.js";

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

<DialogPrimitive.Overlay bind:ref {...mergedProps}>
	<Mounted
		onMounted={(m) => {
			overlayState.mounted = m;
		}}
	/>
	{@render children?.()}
</DialogPrimitive.Overlay>
