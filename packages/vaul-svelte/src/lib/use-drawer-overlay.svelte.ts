import { useRefById, type WithRefProps } from "svelte-toolbelt";
import { DrawerContext } from "./context.js";

type UseDrawerOverlayProps = WithRefProps;

export function useDrawerOverlay(opts: UseDrawerOverlayProps) {
	const ctx = DrawerContext.get();
	let mounted = $state(false);

	useRefById({
		id: opts.id,
		ref: opts.ref,
		deps: () => mounted,
		onRefChange: (node) => {
			if (!mounted) {
				ctx.setOverlayNode(null);
			} else {
				ctx.setOverlayNode(node);
			}
		},
	});

	const hasSnapPoints = $derived(ctx.snapPoints.current && ctx.snapPoints.current.length > 0);

	const shouldRender = $derived(ctx.modal.current);

	const props = $derived({
		id: opts.id.current,
		onmouseup: ctx.onRelease,
		"data-vaul-overlay": "",
		"data-vaul-snap-points": ctx.open.current && hasSnapPoints ? "true" : "false",
		"data-vaul-snap-points-overlay": ctx.open.current && ctx.shouldFade ? "true" : "false",
		"data-vaul-animate": ctx.shouldAnimate ? "true" : "false",
	});

	return {
		get props() {
			return props;
		},
		get shouldRender() {
			return shouldRender;
		},
		setMounted: (value: boolean) => {
			mounted = value;
		},
	};
}
