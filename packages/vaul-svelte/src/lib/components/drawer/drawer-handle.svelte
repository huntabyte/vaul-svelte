<script lang="ts">
	import { box, mergeProps } from "svelte-toolbelt";
	import { useId } from "bits-ui";
	import type { DrawerHandleProps } from "./types.js";
	import { useDrawerHandle } from "$lib/vaul.svelte.js";

	let {
		id = useId(),
		ref = $bindable(null),
		preventCycle = false,
		children,
		...restProps
	}: DrawerHandleProps = $props();

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
	<span {...handleState.hitAreaProps}>
		{@render children?.()}
	</span>
</div>
