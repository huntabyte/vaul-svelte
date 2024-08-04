<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import TriggerWrapper from "./trigger-wrapper.svelte";
	import { getCtx } from "../ctx.js";

	type $$Props = DialogPrimitive.TriggerProps;
	type $$Events = DialogPrimitive.TriggerEvents;

	const {
		refs: { triggerRef },
	} = getCtx();

	export let el: HTMLButtonElement | undefined = undefined;
	export let asChild: boolean = false;

	$: if (el) {
		triggerRef.set(el);
	}
</script>

{#if asChild}
	<DialogPrimitive.Trigger {asChild} let:builder on:click on:keydown bind:el {...$$restProps}>
		<TriggerWrapper meltBuilder={builder} let:newBuilder>
			<slot builder={newBuilder} />
		</TriggerWrapper>
	</DialogPrimitive.Trigger>
{:else}
	<DialogPrimitive.Trigger let:builder on:click on:keydown bind:el {...$$restProps}>
		<slot {builder} />
	</DialogPrimitive.Trigger>
{/if}
