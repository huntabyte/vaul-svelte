<script lang="ts">
	import { Dialog } from "bits-ui";
	import { DrawerContext } from "$lib/context.js";

	const ctx = DrawerContext.get();

	let { to = ctx.container.current ?? undefined, ...restProps }: Dialog.PortalProps = $props();
</script>

<Dialog.Portal {to} {...restProps} />
