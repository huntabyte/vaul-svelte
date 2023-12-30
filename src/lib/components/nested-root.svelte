<script lang="ts">
	import Root from './root.svelte';
	import { getCtx } from './ctx.js';
	import type { RootProps } from './types.js';

	type $$Props = RootProps;

	export let onDrag: $$Props['onDrag'] = undefined;
	export let onOpenChange: $$Props['onOpenChange'] = undefined;

	const {
		methods: { onNestedDrag, onNestedRelease, onNestedOpenChange }
	} = getCtx();

	if (!onNestedDrag) {
		throw new Error('NestedRoot must be a child of a Root');
	}
</script>

<Root
	nested
	{...$$restProps}
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
/>
