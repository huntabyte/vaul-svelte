<script lang="ts">
	import DrawerRoot from "./drawer.svelte";
	import type { DrawerRootProps } from "./types.js";
	import { noop } from "$lib/internal/helpers/noop.js";
	import { getDrawerRootContext } from "$lib/vaul.svelte.js";

	let {
		onOpenChange = noop,
		onDrag = noop,
		...restProps
	}: Omit<DrawerRootProps, "nested" | "onRelease" | "onClose"> = $props();

	const rootState = getDrawerRootContext();
</script>

<DrawerRoot
	nested
	onClose={() => rootState.onNestedOpenChange(false)}
	onDrag={(e, p) => {
		rootState.onNestedDrag(e, p);
		onDrag(e, p);
	}}
	onOpenChange={(o) => {
		if (o) {
			rootState.onNestedOpenChange(o);
		}
		onOpenChange(o);
	}}
	onRelease={(e, o) => rootState.onNestedRelease(e, o)}
	{...restProps}
/>
