// Instead of importing all of chalk, import only what we need
export { default as chalk } from 'chalk';

// Re-export commonly used functions
export { default as prompt } from 'inquirer';
export type { QuestionCollection } from 'inquirer';
