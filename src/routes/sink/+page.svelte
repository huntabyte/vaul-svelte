<script lang="ts">
	import { dev } from '$app/environment';
	import Nested from '../examples/nested/+page.svelte';
	import { goto } from '$app/navigation';

	if (!dev) {
		goto('/');
	}
</script>

<Nested />
