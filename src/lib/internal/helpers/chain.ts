// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function chain(...callbacks: any[]): (...args: any[]) => void {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (...args: any[]) => {
		for (const callback of callbacks) {
			if (typeof callback === 'function') {
				callback(...args);
			}
		}
	};
}
