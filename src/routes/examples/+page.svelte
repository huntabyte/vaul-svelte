<script lang="ts">
	import NestedDrawer from "./nested-drawer.svelte";
	import ScrollableDrawer from "./scrollable-drawer.svelte";
	import SnapPointDrawer from "./snap-point-drawer.svelte";
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
	</div>
</div>
