<script lang="ts">
	import { Drawer } from "$lib/index.js";
	import CenteredContent from "../(components)/centered-content.svelte";
</script>

<Drawer.Root>
	<Drawer.Trigger
		class="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
	>
		Open non-draggable drawer
	</Drawer.Trigger>
	<Drawer.Portal>
		<Drawer.Overlay class="fixed inset-0 bg-black/40" />
		<Drawer.Content
			class="fixed bottom-0 left-0 right-0 mt-24 flex h-full max-h-[96%] flex-col rounded-t-[10px] bg-gray-100"
		>
			<div class="flex-1 rounded-t-[10px] bg-white p-4">
				<div class="mx-auto mb-8 h-1.5 w-12 flex-shrink-0 rounded-full bg-gray-300" />
				<CenteredContent>
					<p class="mb-8 text-gray-600">
						Here are
						<a href="/examples" class="underline">some more examples</a>
						of the component in action.
					</p>

					<section
						data-vaul-no-drag
						class="grid min-h-16 place-items-center gap-4 rounded-lg bg-gray-400 p-4"
					>
						<p>Try dragging me</p>

						<figure>
							<blockquote>
								<p>Here I Am, Here I Remain.</p>
							</blockquote>
							<figcaption>
								<cite>- Duke Leto Atreides</cite>
							</figcaption>
						</figure>
					</section>
				</CenteredContent>
			</div>
			<div class="mt-auto border-t border-gray-200 bg-gray-100 p-4">
				<div class="mx-auto flex max-w-md justify-end gap-6">
					<a
						class="gap-0.25 flex items-center text-xs text-gray-600"
						href="https://github.com/huntabyte/vaul-svelte"
						target="_blank"
					>
						GitHub
						<svg
							fill="none"
							height="16"
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							viewBox="0 0 24 24"
							width="16"
							aria-hidden="true"
							class="ml-1 h-3 w-3"
						>
							<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path>
							<path d="M15 3h6v6"></path>
							<path d="M10 14L21 3"></path>
						</svg>
					</a>
					<a
						class="gap-0.25 flex items-center text-xs text-gray-600"
						href="https://twitter.com/huntabyte"
						target="_blank"
					>
						Twitter
						<svg
							fill="none"
							height="16"
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							viewBox="0 0 24 24"
							width="16"
							aria-hidden="true"
							class="ml-1 h-3 w-3"
						>
							<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path>
							<path d="M15 3h6v6"></path>
							<path d="M10 14L21 3"></path>
						</svg>
					</a>
				</div>
			</div>
		</Drawer.Content>
	</Drawer.Portal>
</Drawer.Root>
