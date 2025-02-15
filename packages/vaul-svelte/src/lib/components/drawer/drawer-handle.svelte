<script lang="ts">
	import { box, mergeProps } from "svelte-toolbelt";
	import type { HandleProps } from "./index.js";
	import { useId } from "$lib/internal/use-id.js";
	import { useDrawerHandle } from "$lib/use-drawer-handle.svelte.js";

	let {
		id = useId(),
		ref = $bindable(null),
		preventCycle = false,
		children,
		...restProps
	}: HandleProps = $props();

	const handleState = useDrawerHandle({
		id: box.with(() => id),
		ref: box.with(
			() => ref,
			(v) => (ref = v)
		),
		preventCycle: box.with(() => preventCycle),
	});

	const mergedProps = $derived(mergeProps(restProps, handleState.props));
</script>

<div {...mergedProps}>
	<span data-vaul-handle-hitarea="" aria-hidden="true">
		{@render children?.()}
	</span>
</div>
