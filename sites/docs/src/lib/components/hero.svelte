<script lang="ts">
	import { Drawer } from "vaul-svelte";
	import CenteredContent from "./centered-content.svelte";
</script>

<div class="relative">
	<div
		aria-hidden="true"
		class="pointer-events-none absolute left-1/2 top-0 z-10 h-[400px] w-[1000px] -translate-x-1/2 -translate-y-1/2 opacity-[0.15]"
		style:--background-image="radial-gradient(#A4A4A3, transparent 50%)"
	></div>
	<svg
		class="pointer-events-none absolute inset-0 h-full w-full stroke-gray-200 opacity-50 [mask-image:radial-gradient(100%_100%_at_top_center,white,transparent)]"
		aria-hidden="true"
	>
		<defs>
			<pattern
				id="83fd4e5a-9d52-42fc-97b6-718e5d7ee527"
				width={200}
				height={200}
				x="50%"
				y={-1}
				patternUnits="userSpaceOnUse"
			>
				<path d="M100 200V.5M.5 .5H200" fill="none" />
			</pattern>
		</defs>
		<svg x="50%" y={-1} class="overflow-visible fill-gray-50">
			<path
				d="M-100.5 0h201v201h-201Z M699.5 0h201v201h-201Z M499.5 400h201v201h-201Z M-300.5 600h201v201h-201Z"
				stroke-width={0}
			/>
		</svg>
		<rect
			width="100%"
			height="100%"
			stroke-width={0}
			fill="url(#83fd4e5a-9d52-42fc-97b6-718e5d7ee527)"
		/>
	</svg>
	<div class="mx-auto max-w-2xl pt-64 text-center">
		<div class="relative flex flex-col">
			<h1 class="relative mb-4 text-7xl font-semibold">Vaul Svelte</h1>
			<p class="text-xl text-gray-600">Drawer component for Svelte.</p>
		</div>
		<div class="mt-6 flex justify-center gap-4">
			<Drawer.Root shouldScaleBackground>
				<Drawer.Trigger
					class="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
				>
					Open Drawer
				</Drawer.Trigger>
				<Drawer.Portal>
					<Drawer.Overlay class="fixed inset-0 bg-black/40" />
					<Drawer.Content
						class="fixed bottom-0 left-0 right-0 mt-24 flex h-full max-h-[96%] flex-col rounded-t-[10px] bg-gray-100"
					>
						<div class="flex-1 rounded-t-[10px] bg-white p-4">
							<div
								class="mx-auto mb-8 h-1.5 w-12 flex-shrink-0 rounded-full bg-gray-300"
							></div>
							<CenteredContent>
								<p class="mb-8 text-gray-600">
									Here are
									<a href="/examples" class="underline">some more examples</a>
									of the component in action.
								</p>
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
										<path
											d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"
										></path>
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
										<path
											d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"
										></path>
										<path d="M15 3h6v6"></path>
										<path d="M10 14L21 3"></path>
									</svg>
								</a>
							</div>
						</div>
					</Drawer.Content>
				</Drawer.Portal>
			</Drawer.Root>
			<a
				href="https://github.com/huntabyte/vaul-svelte"
				class="rounded-full px-4 py-2.5 text-sm font-semibold hover:bg-gray-100"
				target="_blank"
			>
				GitHub <span aria-hidden="true">→</span>
			</a>
		</div>
	</div>
</div>
