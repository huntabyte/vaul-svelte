<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import type { CloseProps } from "./types.js";
	import { getCtx } from "../ctx.js";

	type $$Props = CloseProps;

	export let el: $$Props["el"] = undefined;

	const {
		methods: { closeDrawer }
	} = getCtx();
</script>

<DialogPrimitive.Close
	bind:el
	on:click={(e) => {
		e.preventDefault();
		closeDrawer();
	}}
	on:keydown={(e) => {
		if (e.detail.originalEvent.key === "Enter" || e.detail.originalEvent.key === " ") {
			e.preventDefault();
			closeDrawer(true);
		}
	}}
	{...$$restProps}
>
	<slot />
</DialogPrimitive.Close>
