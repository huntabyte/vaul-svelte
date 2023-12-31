<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import type { OverlayProps } from './types.js';
	import { getCtx } from '../ctx.js';
	import Visible from './visible.svelte';

	type $$Props = OverlayProps;

	const {
		refs: { drawerRef },
		states: { visible },
		helpers: { getContentStyle },
		methods: { onPress, onDrag, onRelease }
	} = getCtx();

	export let style: $$Props['style'] = '';
</script>

<DialogPrimitive.Content
	bind:el={$drawerRef}
	style={$getContentStyle(style)}
	on:pointermove={onDrag}
	on:pointerdown={onPress}
	on:pointerup={onRelease}
	data-vaul-drawer=""
	data-vaul-drawer-visible={$visible ? 'true' : 'false'}
	{...$$restProps}
>
	<Visible />
	<slot />
</DialogPrimitive.Content>
