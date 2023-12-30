<script lang="ts">
	import { getCtx } from './ctx.js';
	import { Dialog as DialogPrimitive } from 'bits-ui';

	const {
		refs: { overlayRef },
		states: { isOpen, visible, snapPoints, shouldFade },
		methods: { onRelease }
	} = getCtx();

	$: hasSnapPoints = $snapPoints && $snapPoints.length > 0;
</script>

<DialogPrimitive.Overlay
	on:mouseup={onRelease}
	bind:el={$overlayRef}
	data-vaul-drawer-visible={$visible ? 'true' : 'false'}
	data-vaul-overlay=""
	data-vaul-snap-points={$isOpen && hasSnapPoints ? 'true' : 'false'}
	data-vaul-snap-points-overlay={$isOpen && $shouldFade ? 'true' : 'false'}
	{...$$restProps}
/>
