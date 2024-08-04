import type { ReadableBoxedValues, WithRefProps, WritableBoxedValues } from "svelte-toolbelt";

const CLOSE_THRESHOLD = 0.25;
const SCROLL_LOCK_TIMEOUT = 100;
const BORDER_RADIUS = 8;
const NESTED_DISPLACEMENT = 16;
const WINDOW_TOP_OFFSET = 26;
const DRAG_CLASS = "vaul-dragging";

export type DrawerDirection = "left" | "right" | "top" | "bottom";

export type OnDragEvent = PointerEvent | TouchEvent;
export type OnDrag = (event: OnDragEvent, percentageDragged: number) => void;
export type OnReleaseEvent = PointerEvent | MouseEvent | TouchEvent;
export type OnRelease = (event: OnReleaseEvent, open: boolean) => void;

type DrawerRootStateProps = ReadableBoxedValues<{
	closeThreshold: number;
	shouldScaleBackground: boolean;
	scrollLockTimeout: number;
	snapPoints: (string | number)[] | undefined;
	fadeFromIndex: number | undefined;
	fixed: boolean;
	dismissible: boolean;
	direction: DrawerDirection;
	onDrag: OnDrag;
	onRelease: OnRelease;
	nested: boolean;
	onClose: () => void;
	activeSnapPoint: number | string | null | undefined;
}> &
	WritableBoxedValues<{
		open: boolean;
	}>;

class DrawerRootState {
	open: DrawerRootStateProps["open"];
	closeThreshold: DrawerRootStateProps["closeThreshold"];
	shouldScaleBackground: DrawerRootStateProps["shouldScaleBackground"];
	scrollLockTimeout: DrawerRootStateProps["scrollLockTimeout"];
	snapPoints: DrawerRootStateProps["snapPoints"];
	fadeFromIndex: DrawerRootStateProps["fadeFromIndex"];
	fixed: DrawerRootStateProps["fixed"];
	dismissible: DrawerRootStateProps["dismissible"];
	direction: DrawerRootStateProps["direction"];
	onDrag: DrawerRootStateProps["onDrag"];
	onRelease: DrawerRootStateProps["onRelease"];
	nested: DrawerRootStateProps["nested"];
	onClose: DrawerRootStateProps["onClose"];
	activeSnapPoint: DrawerRootStateProps["activeSnapPoint"];
	triggerNode = $state<HTMLElement | null>(null);
	overlayNode = $state<HTMLElement | null>(null);

	hasBeenOpened = $state(false);
	openTime = $state<Date | null>(null);
	keyboardIsOpen = $state(false);
	drawerNode = $state<HTMLElement | null>(null);
	drawerId = $state<string | null>(null);
	isDragging = false;
	dragStartTime: Date | null = null;
	isClosing = false;
	pointerStart = 0;
	dragEndTime: Date | null = null;
	lastTimeDragPrevented: Date | null = null;
	isAllowedToDrag = false;
	drawerHeight = 0;
	previousDiffFromInitial = 0;
	initialDrawerHeight = 0;
	nestedOpenChangeTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(props: DrawerRootStateProps) {
		this.open = props.open;
		this.closeThreshold = props.closeThreshold;
		this.shouldScaleBackground = props.shouldScaleBackground;
		this.scrollLockTimeout = props.scrollLockTimeout;
		this.snapPoints = props.snapPoints;
		this.fadeFromIndex = props.fadeFromIndex;
		this.fixed = props.fixed;
		this.dismissible = props.dismissible;
		this.direction = props.direction;
		this.onDrag = props.onDrag;
		this.onRelease = props.onRelease;
		this.nested = props.nested;
		this.onClose = props.onClose;
		this.activeSnapPoint = props.activeSnapPoint;
	}
}
