import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: ["dist", "node_modules"]
    },
    {
        extends: [
            js.configs.recommended,
            ...tseslint.configs.recommended,
        ],
        files: ["**/*.ts"],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: "module",
            globals: {
                ...globals.node,
            },
            parserOptions: {
                project: "./tsconfig.json",
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "error", // Prohibido usar any explícito
            "@typescript-eslint/no-unused-vars": ["warn", {
                "argsIgnorePattern": "^_",
                "varsIgnorePattern": "^_"
            }],
            "@typescript-eslint/no-unsafe-assignment": "warn", // Evita asignar un any a algo tipado
            "@typescript-eslint/no-unsafe-member-access": "warn", // Evita entrar a propiedades de un any
            "no-console": "off",
            "prefer-const": "error", // Obliga usar const si la variable no se reasigna
        },
    }
);
