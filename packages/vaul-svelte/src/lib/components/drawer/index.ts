import { Dialog as DrawerPrimitive } from "bits-ui";
export { default as Root } from "./drawer.svelte";
export { default as Content } from "./drawer-content.svelte";
export { default as Overlay } from "./drawer-overlay.svelte";
export { default as NestedRoot } from "./drawer-nested.svelte";
export { default as Handle } from "./drawer-handle.svelte";

export const Portal: typeof DrawerPrimitive.Portal = DrawerPrimitive.Portal;
export const Trigger: typeof DrawerPrimitive.Trigger = DrawerPrimitive.Trigger;
export const Title: typeof DrawerPrimitive.Title = DrawerPrimitive.Title;
export const Description: typeof DrawerPrimitive.Description = DrawerPrimitive.Description;
export const Close: typeof DrawerPrimitive.Close = DrawerPrimitive.Close;

export type {
	DrawerRootProps as RootProps,
	DrawerContentProps as ContentProps,
	DrawerOverlayProps as OverlayProps,
	DrawerRootProps as NestedRootProps,
	DrawerHandleProps as HandleProps,
	DrawerTitleProps as TitleProps,
	DrawerDescriptionProps as DescriptionProps,
	DrawerCloseProps as CloseProps,
	DrawerPortalProps as PortalProps,
} from "./types.js";
