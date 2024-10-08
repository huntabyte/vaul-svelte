<script lang="ts">
	import { onMount } from "svelte";

	let { onMounted }: { onMounted: (bool: boolean) => void } = $props();

	onMount(() => {
		onMounted(true);
		return () => {
			onMounted(false);
		};
	});
</script>
