<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { getCtx } from "../ctx.js";
	import type { CloseProps } from "./types.js";
	import CloseWrapper from "./close-wrapper.svelte.js";

	type $$Props = CloseProps;

	export let el: $$Props["el"] = undefined;
	export let asChild = false;

	const {
		methods: { closeDrawer },
	} = getCtx();
</script>

{#if asChild}
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
		{asChild}
		let:builder
	>
		<CloseWrapper meltBuilder={builder} let:newBuilder>
			<slot builder={newBuilder} />
		</CloseWrapper>
	</DialogPrimitive.Close>
{:else}
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
		{asChild}
		let:builder
	>
		<slot {builder} />
	</DialogPrimitive.Close>
{/if}
