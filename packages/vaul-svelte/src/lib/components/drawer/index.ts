import { Dialog as DrawerPrimitive } from "bits-ui";

export { default as Root } from "./drawer.svelte";
export { default as Content } from "./drawer-content.svelte";
export { default as Overlay } from "./drawer-overlay.svelte";
export { default as NestedRoot } from "./drawer-nested.svelte";
export { default as Handle } from "./drawer-handle.svelte";

export const Portal = DrawerPrimitive.Portal;
export const Trigger = DrawerPrimitive.Trigger;
export const Title = DrawerPrimitive.Title;
export const Description = DrawerPrimitive.Description;
export const Close = DrawerPrimitive.Close;

export type PortalProps = DrawerPrimitive.PortalProps;
export type TriggerProps = DrawerPrimitive.TriggerProps;
export type TitleProps = DrawerPrimitive.TitleProps;
export type DescriptionProps = DrawerPrimitive.DescriptionProps;
export type CloseProps = DrawerPrimitive.CloseProps;

export type {
	DrawerRootProps as RootProps,
	DrawerContentProps as ContentProps,
	DrawerOverlayProps as OverlayProps,
	DrawerRootProps as NestedRootProps,
	DrawerHandleProps as HandleProps,
} from "./types.js";
