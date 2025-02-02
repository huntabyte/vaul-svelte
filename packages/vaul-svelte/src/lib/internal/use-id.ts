globalThis.vaulIdCounter ??= { current: 0 };

/**
 * Generates a unique ID based on a global counter.
 */
export function useId(prefix = "vaul-svelte") {
	globalThis.vaulIdCounter.current++;
	return `${prefix}-${globalThis.vaulIdCounter.current}`;
}
