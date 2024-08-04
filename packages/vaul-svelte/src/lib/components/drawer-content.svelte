<script lang="ts">
	import { Dialog as DialogPrimitive, useId } from "bits-ui";
	import { box, mergeProps } from "svelte-toolbelt";
	import type { DrawerContentProps } from "./types.js";
	import { useDrawerContent } from "$lib/vaul.svelte.js";
	import { noop } from "$lib/internal/helpers/noop.js";

	let {
		id = useId(),
		ref = $bindable(null),
		onMountAutoFocus = noop,
		onEscapeKeydown = noop,
		onInteractOutside = noop,
		onFocusOutside = noop,
		...restProps
	}: DrawerContentProps = $props();

	const contentState = useDrawerContent({
		id: box.with(() => id),
		ref: box.with(
			() => ref,
			(v) => (ref = v)
		),
	});

	const mergedProps = $derived(mergeProps(restProps, contentState.props));
</script>

<DialogPrimitive.Content
	bind:ref
	{...mergedProps}
	onMountAutoFocus={(e) => {
		onMountAutoFocus(e);
		if (e.defaultPrevented) return;
		contentState.onMountAutoFocus(e);
	}}
	onEscapeKeydown={(e) => {
		onEscapeKeydown(e);
		if (e.defaultPrevented) return;
		if (!contentState.root.modal.current) {
			e.preventDefault();
		}
	}}
	onFocusOutside={(e) => {
		onFocusOutside(e);
		if (e.defaultPrevented) return;
		if (!contentState.root.modal.current) {
			e.preventDefault();
		}
	}}
	onInteractOutside={(e) => {
		onInteractOutside(e);
		if (e.defaultPrevented) return;
		contentState.onInteractOutside(e);
	}}
/>
