import { getOptionUpdater } from '$lib/internal/helpers/options.js';
import { createVaul, type CreateVaulProps } from '$lib/internal/vaul.js';
import { getContext, setContext } from 'svelte';

const VAUL_ROOT = Symbol('VAUL_ROOT');

export function setCtx(props: CreateVaulProps = {}) {
	const vaul = createVaul(props);
	const updateOption = getOptionUpdater(vaul.options);

	setContext(VAUL_ROOT, { ...vaul, updateOption });

	return {
		...vaul,
		updateOption
	};
}

export function getCtx() {
	return getContext<ReturnType<typeof setCtx>>(VAUL_ROOT);
}
