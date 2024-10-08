<script lang="ts">
	import { Dialog as DialogPrimitive, type WithoutChildrenOrChild } from "bits-ui";
	import { type WithChildren, box, mergeProps } from "svelte-toolbelt";
	import Mounted from "../utils/mounted.svelte";
	import type { ContentProps } from "./index.js";
	import { useDrawerContent } from "$lib/vaul.svelte.js";
	import { noop } from "$lib/internal/helpers/noop.js";
	import { useId } from "$lib/internal/use-id.js";

	let {
		id = useId(),
		ref = $bindable(null),
		onOpenAutoFocus = noop,
		onInteractOutside = noop,
		oncontextmenu = noop,
		onpointerdown = noop,
		onpointerup = noop,
		onpointerout = noop,
		onpointermove = noop,
		children,
		...restProps
	}: WithChildren<WithoutChildrenOrChild<ContentProps>> = $props();

	const contentState = useDrawerContent({
		id: box.with(() => id),
		ref: box.with(
			() => ref,
			(v) => (ref = v)
		),
		onContextMenu: box.with(() => oncontextmenu),
		onInteractOutside: box.with(() => onInteractOutside),
		onPointerDown: box.with(() => onpointerdown),
		onPointerMove: box.with(() => onpointermove),
		onPointerOut: box.with(() => onpointerout),
		onPointerUp: box.with(() => onpointerup),
		onOpenAutoFocus: box.with(() => onOpenAutoFocus),
	});

	const mergedProps = $derived(mergeProps(restProps, contentState.props));
</script>

<DialogPrimitive.Content {...mergedProps}>
	{@render children?.()}
	<Mounted onMounted={(m) => (contentState.mounted = m)} />
</DialogPrimitive.Content>
