import type { Dialog as DialogPrimitive } from "bits-ui";
import type { CreateVaulProps } from "$lib/internal/vaul.js";
import type { DrawerDirection, OnChangeFn } from "$lib/internal/types.js";

export type Props = {
	/**
	 * The open state of the Drawer. You can bind to this value
	 * to programatically open/close the Drawer.
	 *
	 * @default false
	 */
	open?: (CreateVaulProps["defaultOpen"] & {}) | undefined;

	/**
	 * A function called when the open state of the Drawer changes.
	 */
	onOpenChange?: OnChangeFn<boolean> | undefined;

	/**
	 * Number between 0 and 1 that determines when the drawer should be closed.
	 *
	 * Example: threshold of 0.5 would close the drawer if the user swiped for
	 * 50% of the height of the drawer or more.
	 */
	closeThreshold?: (CreateVaulProps["closeThreshold"] & {}) | undefined;

	/**
	 * Duration in ms for which the drawer is not draggable after
	 * scrolling  content inside of the drawer.
	 *
	 * @default 500
	 */
	scrollLockTimeout?: (CreateVaulProps["scrollLockTimeout"] & {}) | undefined;

	/**
	 * Array of numbers from 0 to 100 that corresponds to % of the screen a given
	 * snap point should take up. Should go from least visible.
	 *
	 * Example [0.2, 0.5, 0.8]. You can also use px values, which doesn't take
	 * screen height into account.
	 */
	snapPoints?: (CreateVaulProps["snapPoints"] & {}) | undefined;

	/**
	 * Index of a `snapPoint` from which the overlay fade should be applied.
	 *
	 * @default snapPoints[snapPoints.length - 1] (last snap point)
	 */
	fadeFromIndex?: (CreateVaulProps["fadeFromIndex"] & {}) | undefined;

	/**
	 * A callback function that is called when the drawer is dragged
	 */
	onDrag?: (CreateVaulProps["onDrag"] & {}) | undefined;

	/**
	 * A callback function that is called when the drawer is released
	 */
	onRelease?: (CreateVaulProps["onRelease"] & {}) | undefined;

	/**
	 * Whether this drawer is nested inside another drawer.
	 *
	 * @default false
	 */
	nested?: (CreateVaulProps["nested"] & {}) | undefined;

	/**
	 * A callback function that is called when the drawer is
	 * about to close.
	 */
	onClose?: (CreateVaulProps["onClose"] & {}) | undefined;

	/**
	 * Whether the background should scale down when the drawer is open.
	 *
	 * @default false
	 */
	shouldScaleBackground?: (CreateVaulProps["shouldScaleBackground"] & {}) | undefined;

	/**
	 * The background color of the body when the drawer is open and `shouldScaleBackground` is true.
	 *
	 * @default "black"
	 */
	backgroundColor?: (CreateVaulProps["backgroundColor"] & {}) | undefined;

	/**
	 * The active snap point of the drawer. You can bind to this value to
	 * programatically change the active snap point.
	 */
	activeSnapPoint?: CreateVaulProps["defaultActiveSnapPoint"] | undefined;

	/**
	 * A function called when the active snap point of the Drawer changes.
	 */
	onActiveSnapPointChange?: OnChangeFn<number | string | null> | undefined;

	/**
	 * Whether the drawer is able to be dismissed naturally.
	 * If `true` the user can swipe or press outside the drawer to close it,
	 * if `false` you must provide another way to close the drawer, via
	 * programmatic control.
	 *
	 * @default true
	 */
	dismissible?: boolean | undefined;

	/**
	 * The direction from which the drawer should open.
	 *
	 * @default 'bottom'
	 *
	 */
	direction?: DrawerDirection | undefined;
} & DialogPrimitive.Props;

export type OverlayProps = DialogPrimitive.OverlayProps;
export type ContentProps = DialogPrimitive.ContentProps;
export type TitleProps = DialogPrimitive.TitleProps;
export type DescriptionProps = DialogPrimitive.DescriptionProps;
export type CloseProps = DialogPrimitive.CloseProps;
