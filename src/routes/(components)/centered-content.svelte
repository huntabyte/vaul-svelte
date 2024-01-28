<script lang="ts">
	import { Drawer } from "$lib/index.js";
</script>

<div class="mx-auto max-w-md">
	<Drawer.Title class="mb-4 font-medium">Drawer for Svelte.</Drawer.Title>
	<p class="mb-2 text-gray-600">
		This component can be used as a Dialog replacement on mobile and tablet devices.
	</p>
	<p class="mb-2 text-gray-600">
		It comes unstyled, has gesture-driven animations, and was originally made by
		<a href="https://emilkowal.ski/" class="underline" target="_blank"> Emil Kowalski </a>
		and ported to Svelte by
		<a href="https://x.com/huntabyte" class="underline" target="_blank">Huntabyte</a>
		.
	</p>
	<p class="mb-8 text-gray-600">
		It uses
		<a href="https://www.bits-ui.com/docs/components/dialog" class="underline" target="_blank">
			Bits' Dialog primitive
		</a>
		under the hood and is inspired by
		<a
			href="https://twitter.com/devongovett/status/1674470185783402496"
			class="underline"
			target="_blank"
		>
			this tweet.
		</a>
	</p>
	<slot />
</div>
