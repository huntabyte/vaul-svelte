<script lang="ts">
	import { Drawer, type DrawerDirection } from "vaul-svelte";
	import DrawerContent from "./drawer-content.svelte";

	let { direction }: { direction: DrawerDirection } = $props();
</script>

<Drawer.Root {direction}>
	<Drawer.Trigger
		class="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
	>
		Open {direction} drawer
	</Drawer.Trigger>
	<Drawer.Portal>
		<Drawer.Overlay class="fixed inset-0 bg-black/40" />
		<DrawerContent drawerDirection={direction} />
	</Drawer.Portal>
</Drawer.Root>
