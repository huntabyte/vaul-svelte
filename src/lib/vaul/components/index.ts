import { Dialog as DialogPrimitive } from 'bits-ui';
export { default as Root } from './root.svelte';
export { default as Content } from './content.svelte';
export { default as Overlay } from './overlay.svelte';
export { default as NestedRoot } from './nested-root.svelte';

const Trigger = DialogPrimitive.Trigger;
const Portal = DialogPrimitive.Portal;
const Close = DialogPrimitive.Close;
const Title = DialogPrimitive.Title;
const Description = DialogPrimitive.Description;

export { Trigger, Portal, Close, Title, Description };

export * from './types.js';
