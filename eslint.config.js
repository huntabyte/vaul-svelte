import eslint from "@eslint/js";
import prettier from "eslint-config-prettier";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	...svelte.configs["flat/recommended"],
	prettier,
	...svelte.configs["flat/prettier"],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
	},
	{
		files: ["**/*.svelte"],
		languageOptions: {
			parserOptions: {
				parser: tseslint.parser,
			},
		},
	},
	{
		rules: {
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
			"@typescript-eslint/no-unused-expressions": "off",
			"@typescript-eslint/no-empty-object-type": "off",
			"prefer-const": "off",
		},
	},
	{
		ignores: [
			"build/",
			".svelte-kit/",
			"dist/",
			".svelte-kit/**/*",
			"sites/docs/.svelte-kit/**/*",
			".svelte-kit",
			"packages/vaul-svelte/dist/**/*",
			"packages/vaul-svelte/.svelte-kit/**/*",
		],
	}
);
