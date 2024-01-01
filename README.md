Vaul-Svelte is an unstyled drawer component for Svelte that can be used as a Dialog replacement on tablet and mobile devices. It uses [Bits' Dialog primitive](https://www.bits-ui.com/docs/components/dialog) under the hood and is inspired by [this tweet](https://twitter.com/devongovett/status/1674470185783402496).

This is a port of [Vaul](https://github.com/emilkowalski/vaul) for React, which was created by [Emil Kowalski](https://twitter.com/emilkowalski_).

## Usage

To start using the library, install it in your project:

```bash
npm install vaul-svelte
```

Use the drawer in your app.

```svelte
<script>
	import { Drawer } from 'vaul-svelte';
</script>

<Drawer.Root>
	<Drawer.Trigger>Open</Drawer.Trigger>
	<Drawer.Portal>
		<Drawer.Content>
			<p>Content</p>
		</Drawer.Content>
		<Drawer.Overlay />
	</Drawer.Portal>
</Drawer.Root>
```

## Examples

Play around with the examples on StackBlitz:

- [With scaled background](https://stackblitz.com/edit/vaul-svelte-scaled?file=src%2Froutes%2F%2Bpage.svelte)
- [Without scaled background](https://stackblitz.com/edit/vaul-svelte-without-scale?file=src%2Froutes%2F%2Bpage.svelte)
- [With snap points](https://stackblitz.com/edit/vaul-svelte-snap-points?file=src%2Froutes%2F%2Bpage.svelte)
- [Scrollable with inputs](https://stackblitz.com/edit/vaul-svelte-scrollable-with-inputs?file=src%2Froutes%2F%2Bpage.svelte)
- [Nested drawers](https://stackblitz.com/edit/vaul-svelte-nested-drawers?file=src%2Froutes%2F%2Bpage.svelte)
- [Non-dismissible](https://stackblitz.com/edit/vaul-svelte-non-dismissible?file=src%2Froutes%2F%2Bpage.svelte)

## API Reference

### Root

Contains all parts of a dialog. Use `shouldScaleBackground` to enable background scaling, it requires an element with `[data-vaul-drawer-wrapper]` data attribute to scale its background.
Can be controlled by binding to the `open` prop, or using the`onOpenChange` prop.

Additional props:

`closeThreshold`: Number between 0 and 1 that determines when the drawer should be closed. Example: threshold of 0.5 would close the drawer if the user swiped for 50% of the height of the drawer or more.

`scrollLockTimeout`: Duration for which the drawer is not draggable after scrolling content inside of the drawer. Defaults to 500ms

`snapPoints`: Array of numbers from 0 to 100 that corresponds to % of the screen a given snap point should take up. Should go from least visible. Example `[0.2, 0.5, 0.8]`. You can also use px values, which doesn't take screen height into account.

`fadeFromIndex`: Index of a `snapPoint` from which the overlay fade should be applied. Defaults to the last snap point.

### Trigger

The button that opens the dialog. [Props](https://www.bits-ui.com/docs/components/dialog#trigger).

### Content

Content that should be rendered in the drawer. [Props](https://www.bits-ui.com/docs/components/dialog#content).

### Overlay

A layer that covers the inert portion of the view when the dialog is open. [Props](https://www.bits-ui.com/docs/components/dialog#overlay).

### Title

An accessible title to be announced when the dialog is opened. [Props](https://www.bits-ui.com/docs/components/dialog#title).

### Description

An optional accessible description to be announced when the dialog is opened. [Props](https://www.bits-ui.com/docs/components/dialog#description).

### Close

The button that closes the dialog. [Props](https://www.bits-ui.com/docs/components/dialog#close).

### Portal

Portals your drawer into the body.
