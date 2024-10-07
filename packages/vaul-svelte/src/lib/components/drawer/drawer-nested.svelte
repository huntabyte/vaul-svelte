<script lang="ts">
	import DrawerRoot from "./drawer.svelte";
	import type { RootProps } from "./index.js";
	import { noop } from "$lib/internal/helpers/noop.js";
	import { getDrawerRootContext } from "$lib/vaul.svelte.js";

	let {
		open = $bindable(false),
		activeSnapPoint = $bindable(null),
		onOpenChange = noop,
		onDrag = noop,
		...restProps
	}: Omit<RootProps, "nested" | "onRelease" | "onClose"> = $props();

	const rootState = getDrawerRootContext();
</script>

<DrawerRoot
	bind:activeSnapPoint
	bind:open
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
	{...restProps as any}
/>
