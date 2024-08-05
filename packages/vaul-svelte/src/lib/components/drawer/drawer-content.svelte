<script lang="ts">
	import { Dialog as DialogPrimitive, type WithoutChildrenOrChild, useId } from "bits-ui";
	import { type WithChildren, box, mergeProps } from "svelte-toolbelt";
	import Mounted from "../utils/mounted.svelte";
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
		children,
		...restProps
	}: WithChildren<WithoutChildrenOrChild<DrawerContentProps>> = $props();

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
	preventScroll={false}
	onMountAutoFocus={(e) => {
		onMountAutoFocus(e);
		if (e.defaultPrevented) return;
		contentState.onMountAutoFocus(e);
	}}
	onEscapeKeydown={(e) => {
		onEscapeKeydown(e);
		if (e.defaultPrevented) return;
		e.preventDefault();
		if (!contentState.root.modal.current) return;
		contentState.root.closeDrawer();
	}}
	onFocusOutside={(e) => {
		onFocusOutside(e);
		if (e.defaultPrevented) return;
		contentState.onFocusOutside(e);
	}}
	onInteractOutside={(e) => {
		onInteractOutside(e);
		if (e.defaultPrevented) return;
		contentState.onInteractOutside(e);
	}}
>
	<Mounted
		onMounted={(mounted) => {
			if (mounted) {
				contentState.root.visible = true;
			} else {
				contentState.root.drawerNode = null;
			}
		}}
	/>
	{@render children?.()}
</DialogPrimitive.Content>
