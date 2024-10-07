import type {
	DialogContentPropsWithoutHTML,
	DialogOverlayPropsWithoutHTML,
	Dialog as DrawerPrimitive,
	PrimitiveDivAttributes,
	WithChild,
	WithoutChildrenOrChild,
} from "bits-ui";
import type { WithChildren, Without } from "svelte-toolbelt";
import type { DrawerDirection, OnChangeFn, OnDrag, OnRelease } from "$lib/types.js";

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
	/**
	 * The open state of the Drawer.
	 * @bindable
	 *
	 * @default false
	 */
	open?: boolean;

	/**
	 * A function called when the open state of the Drawer changes.
	 */
	onOpenChange?: OnChangeFn<boolean>;

	/**
	 * When `true` the open state will be controlled, meaning you will be responsible for setting
	 * the open state of the drawer using the `onOpenChange` prop.
	 */
	controlledOpen?: boolean;

	/**
	 * When `true` the open state will be controlled, meaning you will be responsible for setting
	 * the open state of the drawer using the `onOpenChange` prop.
	 */
	controlledActiveSnapPoint?: boolean;

	/**
	 * Number between 0 and 1 that determines when the drawer should be closed.
	 *
	 * Example: threshold of 0.5 would close the drawer if the user swiped for
	 * 50% of the height of the drawer or more.
	 */
	closeThreshold?: number;

	/**
	 * Duration in ms for which the drawer is not draggable after
	 * scrolling  content inside of the drawer.
	 *
	 * @default 500
	 */
	scrollLockTimeout?: number;

	/**
	 * A callback function that is called when the drawer is dragged
	 */
	onDrag?: OnDrag;

	/**
	 * A callback function that is called when the drawer is released
	 */
	onRelease?: OnRelease;

	/**
	 * Whether this drawer is nested inside another drawer.
	 *
	 * @default false
	 */
	nested?: boolean;

	/**
	 * A callback function that is called when the drawer is
	 * about to close.
	 */
	onClose?: () => void;

	/**
	 * Whether the background should scale down when the drawer is open.
	 *
	 * @default false
	 */
	shouldScaleBackground?: boolean;

	/**
	 * The background color of the body when the drawer is open and `shouldScaleBackground` is true.
	 *
	 * @default "black"
	 */
	backgroundColor?: string;

	/**
	 * The active snap point of the drawer. You can bind to this value to
	 * programmatically change the active snap point.
	 */
	activeSnapPoint?: string | number | null;

	/**
	 * A function called when the active snap point of the Drawer changes.
	 */
	onActiveSnapPointChange?: OnChangeFn<number | string | null>;

	/**
	 * Whether the drawer is able to be dismissed naturally.
	 * If `true` the user can swipe or press outside the drawer to close it,
	 * if `false` you must provide another way to close the drawer, via
	 * programmatic control.
	 *
	 * @default true
	 */
	dismissible?: boolean;

	/**
	 * The direction from which the drawer should open.
	 *
	 * @default 'bottom'
	 *
	 */
	direction?: DrawerDirection;

	/**
	 * Whether the drawer should be fixed to the viewport.
	 *
	 * @default false
	 */
	fixed?: boolean;

	/**
	 * When `true` only allows the drawer to be dragged by the `<Drawer.Handle />` component.
	 *
	 * @default false
	 */
	handleOnly?: boolean;

	/**
	 * When `true` it prevents scroll restoration when the drawer is closed after a navigation
	 * happens inside of it.
	 *
	 * @default true
	 */
	preventScrollRestoration?: boolean;

	/**
	 * When `true` the Vaul-Svelte styles are not applied to the body.
	 *
	 * @default false
	 */
	noBodyStyles?: boolean;

	/**
	 * When false we don't change body's background color when the drawer is open.
	 *
	 * @default true
	 */
	setBackgroundColorOnScale?: boolean;

	/**
	 * When `true` scroll will not be prevented outside the drawer.
	 *
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
	 *
	 * @default false
	 */
	snapToSequentialPoint?: boolean;

	container?: HTMLElement | null;

	/**
	 * Gets triggered after the open or close animation ends, it receives an `open` argument with the `open` state of the drawer by the time the function was triggered.
	 * Useful to revert any state changes for example.
	 */
	onAnimationEnd?: (open: boolean) => void;

	autoFocus?: boolean;

	modal?: boolean;
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
	Without<PrimitiveDivAttributes, DrawerHandlePropsWithoutHTML>;

export type DrawerContentPropsWithoutHTML = Omit<
	WithChildren<WithoutChildrenOrChild<DialogContentPropsWithoutHTML>>,
	"preventScroll"
>;

export type DrawerContentProps = DrawerContentPropsWithoutHTML &
	Without<PrimitiveDivAttributes, DrawerContentPropsWithoutHTML>;

export type DrawerOverlayPropsWithoutHTML = WithChildren<
	WithoutChildrenOrChild<DialogOverlayPropsWithoutHTML>
>;
export type DrawerOverlayProps = DrawerOverlayPropsWithoutHTML &
	Without<PrimitiveDivAttributes, DrawerOverlayPropsWithoutHTML>;

export type {
	DialogPortalPropsWithoutHTML as DrawerPortalPropsWithoutHTML,
	DialogPortalProps as DrawerPortalProps,
	DialogTriggerProps as DrawerTriggerProps,
	DialogTitleProps as DrawerTitleProps,
	DialogDescriptionProps as DrawerDescriptionProps,
	DialogCloseProps as DrawerCloseProps,
} from "bits-ui";
