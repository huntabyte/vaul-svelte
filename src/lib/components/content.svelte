<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import type { OverlayProps } from './types.js';
	import { getCtx } from './ctx.js';
	import { styleToString } from '$lib/internal/helpers/style.js';

	type $$Props = OverlayProps;

	const {
		refs: { drawerRef },
		states: { visible, snapPointsOffset },
		methods: { onPress, onDrag, onRelease }
	} = getCtx();

	export let style: $$Props['style'] = '';

	$: styleProp =
		$snapPointsOffset && $snapPointsOffset.length > 0
			? styleToString({
					'--snap-point-height': `${$snapPointsOffset[0]!}px`
				}) + style
			: style;
</script>

<DialogPrimitive.Content
	bind:el={$drawerRef}
	style={styleProp}
	on:pointermove={onDrag}
	on:pointerdown={onPress}
	on:pointerup={onRelease}
	data-vaul-drawer=""
	data-vaul-drawer-visible={$visible ? 'true' : 'false'}
	{...$$restProps}
>
	<slot />
</DialogPrimitive.Content>
