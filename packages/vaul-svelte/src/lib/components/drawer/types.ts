import type {
	BitsPrimitiveDivAttributes,
	DialogContentPropsWithoutHTML,
	DialogOverlayPropsWithoutHTML,
	Dialog as DrawerPrimitive,
	WithChild,
	WithoutChildrenOrChild,
} from "bits-ui";
import type { WithChildren, Without } from "svelte-toolbelt";

export type WithFadeFromProps = {
	/**
	 * Array of numbers from 0 to 100 that corresponds to % of the screen a given snap point should take up.
	 * Should go from least visible. Example `[0.2, 0.5, 0.8]`.
	 * You can also use px values, which doesn't take screen height into account.
	 */
	snapPoints: (number | string)[];
	/**
	 * Index of a `snapPoint` from which the overlay fade should be applied. Defaults to the last snap point.
	 */
	fadeFromIndex: number;
};

export type WithoutFadeFromProps = {
	/**
	 * Array of numbers from 0 to 100 that corresponds to % of the screen a given snap point should take up.
	 * Should go from least visible. Example `[0.2, 0.5, 0.8]`.
	 * You can also use px values, which doesn't take screen height into account.
	 */
	snapPoints?: (number | string)[];
	fadeFromIndex?: never;
};

export type BaseDrawerRootPropsWithoutHTML = WithChildren<{
	activeSnapPoint?: number | string | null;
	onActiveSnapPointChange?: (snapPoint: number | string | null) => void;
	open?: boolean;
	/**
	 * Number between 0 and 1 that determines when the drawer should be closed.
	 * Example: threshold of 0.5 would close the drawer if the user swiped for 50% of the height of the drawer or more.
	 * @default 0.25
	 */
	closeThreshold?: number;
	/**
	 * When `true` the `body` doesn't get any styles assigned from Vaul
	 */
	noBodyStyles?: boolean;
	onOpenChange?: (open: boolean) => void;
	shouldScaleBackground?: boolean;
	/**
	 * When `false` we don't change body's background color when the drawer is open.
	 * @default true
	 */
	setBackgroundColorOnScale?: boolean;
	/**
	 * Duration for which the drawer is not draggable after scrolling content inside of the drawer.
	 * @default 500ms
	 */
	scrollLockTimeout?: number;
	/**
	 * When `true`, don't move the drawer upwards if there's space, but rather only change it's height so it's fully scrollable when the keyboard is open
	 */
	fixed?: boolean;
	/**
	 * When `true` only allows the drawer to be dragged by the `<Drawer.Handle />` component.
	 * @default false
	 */
	handleOnly?: boolean;
	/**
	 * When `false` dragging, clicking outside, pressing esc, etc. will not close the drawer.
	 * Use this in combination with the `open` prop, otherwise you won't be able to open/close the drawer.
	 * @default true
	 */
	dismissible?: boolean;
	onDrag?: (event: PointerEvent, percentageDragged: number) => void;
	onRelease?: (event: PointerEvent, open: boolean) => void;
	/**
	 * When `false` it allows to interact with elements outside of the drawer without closing it.
	 * @default true
	 */
	modal?: boolean;
	nested?: boolean;
	onClose?: () => void;
	/**
	 * Direction of the drawer. Can be `top` or `bottom`, `left`, `right`.
	 * @default 'bottom'
	 */
	direction?: "top" | "bottom" | "left" | "right";
	/**
	 * Opened by default, skips initial enter animation. Still reacts to `open` state changes
	 * @default false
	 */
	defaultOpen?: boolean;
	/**
	 * When set to `true` prevents scrolling on the document body on mount, and restores it on unmount.
	 * @default false
	 */
	disablePreventScroll?: boolean;
	/**
	 * When `true` Vaul will reposition inputs rather than scroll then into view if the keyboard is in the way.
	 * Setting it to `false` will fall back to the default browser behavior.
	 * @default true when {@link snapPoints} is defined
	 */
	repositionInputs?: boolean;
	/**
	 * Disabled velocity based swiping for snap points.
	 * This means that a snap point won't be skipped even if the velocity is high enough.
	 * Useful if each snap point in a drawer is equally important.
	 * @default false
	 */
	snapToSequentialPoint?: boolean;
	container?: HTMLElement | null;
	/**
	 * Gets triggered after the open or close animation ends, it receives an `open` argument with the `open` state of the drawer by the time the function was triggered.
	 * Useful to revert any state changes for example.
	 */
	onAnimationEnd?: (open: boolean) => void;
	preventScrollRestoration?: boolean;
	autoFocus?: boolean;
}> &
	(WithFadeFromProps | WithoutFadeFromProps);

export type DrawerRootPropsWithoutHTML = BaseDrawerRootPropsWithoutHTML &
	Without<DrawerPrimitive.RootProps, BaseDrawerRootPropsWithoutHTML>;

export type DrawerRootProps = DrawerRootPropsWithoutHTML;

export type DrawerHandlePropsWithoutHTML = Omit<
	WithChild<{
		/**
		 * Whether to prevent cycling the snap points when the handle is pressed.
		 *
		 * @default false
		 */
		preventCycle?: boolean;
	}>,
	"child"
>;

export type DrawerHandleProps = DrawerHandlePropsWithoutHTML &
	Without<BitsPrimitiveDivAttributes, DrawerHandlePropsWithoutHTML>;

export type DrawerContentPropsWithoutHTML = WithChildren<
	WithoutChildrenOrChild<Omit<DialogContentPropsWithoutHTML, "preventScroll">>
>;

export type DrawerContentProps = DrawerContentPropsWithoutHTML &
	Without<BitsPrimitiveDivAttributes, DrawerContentPropsWithoutHTML>;

export type DrawerOverlayPropsWithoutHTML = WithChildren<
	WithoutChildrenOrChild<DialogOverlayPropsWithoutHTML>
>;
export type DrawerOverlayProps = DrawerOverlayPropsWithoutHTML &
	Without<BitsPrimitiveDivAttributes, DrawerOverlayPropsWithoutHTML>;

export type {
	DialogPortalPropsWithoutHTML as DrawerPortalPropsWithoutHTML,
	DialogPortalProps as DrawerPortalProps,
	DialogTriggerProps as DrawerTriggerProps,
	DialogTitleProps as DrawerTitleProps,
	DialogDescriptionProps as DrawerDescriptionProps,
	DialogCloseProps as DrawerCloseProps,
} from "bits-ui";
