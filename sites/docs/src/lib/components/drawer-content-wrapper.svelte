<script lang="ts">
	import { Drawer, type DrawerDirection } from "vaul-svelte";
	import { clsx } from "clsx";
	import type { Snippet } from "svelte";
	import CenteredContent from "./centered-content.svelte";

	let { drawerDirection, children }: { drawerDirection: DrawerDirection; children?: Snippet } =
		$props();
</script>

<Drawer.Content
	data-testid="content"
	class={clsx({
		"fixed flex bg-zinc-100 p-6": true,
		"bottom-0 left-0 right-0 h-[50%] flex-col rounded-t-[10px]": drawerDirection === "bottom",
		"left-0 right-0 top-0 h-[50%] flex-col rounded-b-[10px]": drawerDirection === "top",
		"bottom-0 left-0 top-0 w-[50%] flex-row rounded-r-[10px]": drawerDirection === "left",
		"bottom-0 right-0 top-0 w-[50%] flex-row rounded-l-[10px]": drawerDirection === "right",
	})}
>
	<div
		class={clsx({
			"flex h-full w-full gap-8 rounded-full": true,
			"flex-col": drawerDirection === "bottom",
			"flex-col-reverse": drawerDirection === "top",
			"flex-row-reverse": drawerDirection === "left",
			"flex-row ": drawerDirection === "right",
		})}
	>
		<div
			class={clsx({
				"rounded-full bg-zinc-300": true,
				"mx-auto h-1.5 w-12": drawerDirection === "top" || drawerDirection === "bottom",
				"my-auto h-12 w-1.5": drawerDirection === "left" || drawerDirection === "right",
			})}
		></div>
		<div class="grid h-full w-full place-content-center">
			<CenteredContent>
				{@render children?.()}
			</CenteredContent>
		</div>
	</div>
</Drawer.Content>
