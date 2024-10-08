<script lang="ts">
	import { Dialog } from "bits-ui";
	import { useDrawerPortal } from "$lib/vaul.svelte.js";

	const portalState = useDrawerPortal();

	let { to = portalState.props.to, ...restProps }: Dialog.PortalProps = $props();
</script>

<Dialog.Portal {to} {...restProps} />
