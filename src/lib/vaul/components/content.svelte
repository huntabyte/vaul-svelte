<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import type { ContentProps } from "./types.js";
	import { getCtx } from "../ctx.js";
	import Visible from "./visible.svelte";

	type $$Props = ContentProps;
	type $$Events = DialogPrimitive.ContentEvents;

	const {
		refs: { drawerRef },
		states: { visible },
		helpers: { getContentStyle },
		methods: { onPress, onDrag, onRelease },
		options: { direction },
	} = getCtx();

	export let style: $$Props["style"] = "";
</script>

<DialogPrimitive.Content
	bind:el={$drawerRef}
	style={$getContentStyle(style)}
	on:pointerdown={(e) => {
		onPress(e);
	}}
	on:pointerup={(e) => {
		onRelease(e);
	}}
	on:pointermove={(e) => {
		onDrag(e);
	}}
	on:touchend={(e) => {
		onRelease(e);
	}}
	on:touchmove={(e) => {
		onDrag(e);
	}}
	data-vaul-drawer=""
	data-vaul-drawer-direction={$direction}
	data-vaul-drawer-visible={$visible ? "true" : "false"}
	{...$$restProps}
>
	<Visible />
	<slot />
</DialogPrimitive.Content>
