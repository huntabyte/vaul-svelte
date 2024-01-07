<script lang="ts">
	// This is kinda weird but we need to be able to pass the builder down somehow
	// if someone uses `asChild` to modify it. Since it's only exposed as a slot prop
	// we need something in between the `<DialogPrimitive.Trigger>` and the slot

	import type { Builder } from "$lib/internal/types.js";
	import { getCtx } from "../ctx.js";

	export let meltBuilder: Builder;

	const {
		methods: { closeDrawer }
	} = getCtx();

	$: ({ _, ...rest } = meltBuilder);

	// We're wrapping the melt action so we can set the triggerRef
	// even if a user is using `asChild`
	const wrappedAction = (node: HTMLElement) => {
		const handleKeydown = (e: KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				closeDrawer(true);
			}
		};

		const handleClick = () => {
			closeDrawer();
		};

		node.addEventListener("keydown", handleKeydown);
		node.addEventListener("click", handleClick);

		return () => {
			node.removeEventListener("keydown", handleKeydown);
			node.removeEventListener("click", handleClick);
		};
	};

	$: Object.assign(rest, {
		action: wrappedAction
	});
</script>

<slot newBuilder={rest} />
