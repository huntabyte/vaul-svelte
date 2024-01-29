<script lang="ts">
	import Root from "./root.svelte";
	import { getCtx } from "../ctx.js";
	import type { Props } from "./types.js";

	type $$Props = Props;

	export let onDrag: $$Props["onDrag"] = undefined;
	export let onOpenChange: $$Props["onOpenChange"] = undefined;
	export let open: $$Props["open"] = undefined;

	const {
		methods: { onNestedDrag, onNestedRelease, onNestedOpenChange },
	} = getCtx();

	if (!onNestedDrag) {
		throw new Error("NestedRoot must be a child of a Root");
	}
</script>

<Root
	nested={true}
	bind:open
	onClose={() => {
		onNestedOpenChange(false);
	}}
	onDrag={(e, p) => {
		onNestedDrag(e, p);
		onDrag?.(e, p);
	}}
	onOpenChange={(o) => {
		if (o) {
			onNestedOpenChange(o);
		}
		onOpenChange?.(o);
	}}
	onRelease={onNestedRelease}
	{...$$restProps}
>
	<slot />
</Root>
