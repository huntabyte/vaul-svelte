import type { Dialog as DialogPrimitive } from 'bits-ui';
import type { CreateVaulProps } from '$lib/internal/vaul.js';
import type { OnChangeFn } from '$lib/internal/types.js';

export type RootProps = {
	open?: CreateVaulProps['defaultOpen'];
	onOpenChange?: OnChangeFn<boolean>;
	closeThreshold?: CreateVaulProps['closeThreshold'];
	scrollLockTimeout?: CreateVaulProps['scrollLockTimeout'];
	snapPoints?: CreateVaulProps['snapPoints'];
	fadeFromIndex?: CreateVaulProps['fadeFromIndex'];
	modal?: CreateVaulProps['modal'];
	onDrag?: CreateVaulProps['onDrag'];
	onRelease?: CreateVaulProps['onRelease'];
	nested?: CreateVaulProps['nested'];
	onClose?: CreateVaulProps['onClose'];
	shouldScaleBackground?: CreateVaulProps['shouldScaleBackground'];
} & DialogPrimitive.Props;

export type OverlayProps = DialogPrimitive.OverlayProps;

export type ContentProps = DialogPrimitive.ContentProps;
