import type {
	DialogClosePropsWithoutHTML,
	DialogContentPropsWithoutHTML,
	DialogDescriptionPropsWithoutHTML,
	DialogOverlayPropsWithoutHTML,
	Dialog as DialogPrimitive,
	DialogTitlePropsWithoutHTML,
	PrimitiveDivAttributes,
	WithChild,
} from "bits-ui";
import type { WithChildren, Without } from "svelte-toolbelt";
import type { DrawerDirection, OnChangeFn } from "$lib/types.js";
import type { OnDrag, OnRelease } from "$lib/vaul.svelte.js";

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
	 * Array of numbers from 0 to 100 that corresponds to % of the screen a given
	 * snap point should take up. Should go from least visible.
	 *
	 * Example [0.2, 0.5, 0.8]. You can also use px values, which doesn't take
	 * screen height into account.
	 */
	snapPoints?: (number | string)[] | null;

	/**
	 * Index of a `snapPoint` from which the overlay fade should be applied.
	 *
	 * @default snapPoints[snapPoints.length - 1] (last snap point)
	 */
	fadeFromIndex?: number | null;

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
	 * programatically change the active snap point.
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
}>;

export type DrawerRootPropsWithoutHTML = BaseDrawerRootPropsWithoutHTML &
	Without<DialogPrimitive.RootProps, BaseDrawerRootPropsWithoutHTML>;

export type DrawerRootProps = DrawerRootPropsWithoutHTML;

export type DrawerOverlayPropsWithoutHTML = DialogOverlayPropsWithoutHTML;

export type DrawerOverlayProps = DialogPrimitive.OverlayProps;

export type DrawerTitlePropsWithoutHTML = DialogTitlePropsWithoutHTML;

export type DrawerTitleProps = DialogPrimitive.TitleProps;

export type DrawerDescriptionPropsWithoutHTML = DialogDescriptionPropsWithoutHTML;

export type DrawerDescriptionProps = DialogPrimitive.DescriptionProps;

export type DrawerClosePropsWithoutHTML = DialogClosePropsWithoutHTML;

export type DrawerCloseProps = DialogPrimitive.CloseProps;

export type DrawerContentPropsWithoutHTML = DialogContentPropsWithoutHTML;

export type DrawerContentProps = DialogPrimitive.ContentProps;

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
