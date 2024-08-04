<script lang="ts">
	import { Dialog as DialogPrimitive, useId } from "bits-ui";
	import { box, mergeProps } from "svelte-toolbelt";
	import type { DrawerOverlayProps } from "./types.js";
	import { useDrawerOverlay } from "$lib/vaul.svelte.js";

	let { id = useId(), ref = $bindable(null), ...restProps }: DrawerOverlayProps = $props();

	const overlayState = useDrawerOverlay({
		id: box.with(() => id),
		ref: box.with(
			() => ref,
			(v) => (ref = v)
		),
	});

	const mergedProps = $derived(mergeProps(restProps, overlayState.props));
</script>

<DialogPrimitive.Overlay bind:ref {...mergedProps} />
