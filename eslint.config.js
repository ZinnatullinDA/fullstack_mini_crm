import antfu from '@antfu/eslint-config'
import prettierConfig from 'eslint-config-prettier/flat'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import unusedImports from 'eslint-plugin-unused-imports'

export default antfu({
  isInEditor: true,
  typescript: true,
  react: false,
  jsx: true,
  markdown: true,
  formatters: { css: true, html: true, markdown: true },
  stylistic: { indent: 2, quotes: 'single', semi: false },
  ignores: [
'dist/**',
'coverage/**',
'node_modules/**',
'playwright-report/**',
'test-results/**'
],
}, {
  files: ['**/*.{js,jsx,ts,tsx}'],
  plugins: { react, 'react-hooks': reactHooks, 'unused-imports': unusedImports },
  settings: {
react: { version: 'detect' }
},
  rules: {
    ...react.configs.recommended.rules,
    ...reactHooks.configs.recommended.rules,
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'style/jsx-self-closing-comp': 'error',
    'react/jsx-boolean-value': ['error', 'never'],
    'react/jsx-pascal-case': [
'error',
{
allowAllCaps: true,
allowNamespace: true,
ignore: ['apexchart']
}
],
    'react/jsx-max-props-per-line': [
'error',
{ maximum: 1, when: 'multiline' }
],
    'react/jsx-first-prop-new-line': ['error', 'multiline'],
    'react/jsx-sort-props': [
'error',
{ ignoreCase: true }
],
    'react/jsx-one-expression-per-line': [
'error',
{ allow: 'none' }
],
    'react/no-array-index-key': 'warn',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
'error',
{ args: 'after-used', argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
],
    '@typescript-eslint/no-non-null-assertion': 'error',
  },
}, prettierConfig, {
  rules: {
    'format/prettier': 'off',
    'import/consistent-type-specifier-style': 'off',
    '@stylistic/lines-between-class-members': ['error', 'always'],
    '@stylistic/padding-line-between-statements': [
      'error',
      { blankLine: 'always', prev: '*', next: 'return' },
      { blankLine: 'always', prev: '*', next: 'export' },
    ],
  },
})
