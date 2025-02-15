<script lang="ts">
	import { Dialog as DialogPrimitive, type WithoutChildrenOrChild } from "bits-ui";
	import { type WithChildren, box, mergeProps } from "svelte-toolbelt";
	import type { ContentProps } from "./index.js";
	import { noop } from "$lib/internal/noop.js";
	import { useId } from "$lib/internal/use-id.js";
	import { useDrawerContent } from "$lib/use-drawer-content.svelte.js";
	import Mounted from "../utils/mounted.svelte";

	let {
		id = useId(),
		ref = $bindable(null),
		onOpenAutoFocus = noop,
		onInteractOutside = noop,
		onFocusOutside = noop,
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
		oncontextmenu: box.with(() => oncontextmenu ?? noop),
		onInteractOutside: box.with(() => onInteractOutside),
		onpointerdown: box.with(() => onpointerdown ?? noop),
		onpointermove: box.with(() => onpointermove ?? noop),
		onpointerout: box.with(() => onpointerout ?? noop),
		onpointerup: box.with(() => onpointerup ?? noop),
		onOpenAutoFocus: box.with(() => onOpenAutoFocus),
		onFocusOutside: box.with(() => onFocusOutside),
	});

	const snapPointsOffset = $state.snapshot(contentState.ctx.snapPointsOffset);

	const styleProp = $derived(
		snapPointsOffset && snapPointsOffset.length > 0
			? {
					"--snap-point-height": `${snapPointsOffset[contentState.ctx.activeSnapPointIndex ?? 0]}px`,
				}
			: {}
	);

	const mergedProps = $derived(
		mergeProps(restProps, contentState.props, { style: styleProp })
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	) as any;
</script>

<DialogPrimitive.Content {...mergedProps}>
	{@render children?.()}
	<Mounted onMounted={contentState.setMounted} />
</DialogPrimitive.Content>
