import { Context } from "runed";
import type { DrawerDirection } from "./types.js";
import type { ReadableBoxedValues, WritableBoxedValues } from "svelte-toolbelt";

interface DrawerContextValue
	extends ReadableBoxedValues<{
			dismissible: boolean;
			snapPoints: (number | string)[] | null | undefined;
			modal: boolean;
			onOpenChange: (o: boolean) => void;
			direction: DrawerDirection;
			shouldScaleBackground: boolean;
			setBackgroundColorOnScale: boolean;
			noBodyStyles: boolean;
			handleOnly: boolean;
			container: HTMLElement | null;
			autoFocus: boolean;
		}>,
		WritableBoxedValues<{
			keyboardIsOpen: boolean;
			activeSnapPoint: number | string | null;
			open: boolean;
		}> {
	drawerNode: HTMLElement | null;
	setDrawerNode: (node: HTMLElement | null) => void;
	overlayNode: HTMLElement | null;
	setOverlayNode: (node: HTMLElement | null) => void;
	onPress: (event: PointerEvent) => void;
	onRelease: (event: PointerEvent | null) => void;
	onDrag: (event: PointerEvent) => void;
	onNestedDrag: (event: PointerEvent, percentageDragged: number) => void;
	onNestedOpenChange: (o: boolean) => void;
	onNestedRelease: (event: PointerEvent, open: boolean) => void;
	closeDrawer: () => void;
	restorePositionSetting: () => void;
	onDialogOpenChange: (open: boolean) => void;
	handleOpenChange: (open: boolean) => void;
	readonly isDragging: boolean;
	readonly snapPointsOffset: number[] | null;
	readonly activeSnapPointIndex?: number | null;
	readonly shouldAnimate: boolean;
	readonly shouldFade: boolean;
}

export const DrawerContext = new Context<DrawerContextValue>("Drawer.Root");
