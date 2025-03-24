<script lang="ts">
	import "../app.pcss";
	import Metadata from "$lib/components/metadata.svelte";
	import { onMount } from "svelte";
	import { dev } from "$app/environment";

	onMount(async () => {
		if (dev) {
			const eruda = (await import("eruda")).default;
			eruda.init();
		}
	});

	let { children } = $props();
</script>

<Metadata />

<main data-vaul-drawer-wrapper="">
	{@render children()}
</main>
