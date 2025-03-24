<script lang="ts">
	import NestedDrawer from "./nested-drawer.svelte";
	import NonDraggableDrawer from "./non-draggable-drawer.svelte";
	import ScrollableDrawer from "./scrollable-drawer.svelte";
	import SnapPointDrawer from "./snap-point-drawer.svelte";
	import DirectionDrawer from "$lib/components/direction-drawer.svelte";

	const directions = ["top", "left", "bottom", "right"] as const;
</script>

<div class="mx-auto max-w-2xl pt-64 text-center">
	<div class="relative flex flex-col items-center justify-evenly p-8">
		<h1 class="relative mb-4 text-2xl font-semibold">Usage Examples</h1>
		<div class="mb-4">
			<NestedDrawer />
		</div>
		<div class="mb-4">
			<ScrollableDrawer />
		</div>
		<div class="mb-4">
			<SnapPointDrawer />
		</div>
		{#each directions as direction}
			<div class="mb-4">
				<DirectionDrawer {direction} />
			</div>
		{/each}
		<div>
			<NonDraggableDrawer />
		</div>
	</div>
</div>
