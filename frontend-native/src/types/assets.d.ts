/**
 * TypeScript module declarations for non-JS asset files.
 * Allows TypeScript to understand require() calls for binary assets.
 */

declare module '*.gz' {
  const content: number;
  export default content;
}

declare module '*.json.gz' {
  const content: number;
  export default content;
}

declare module '*.ttf' {
  const content: number;
  export default content;
}

declare module '*.png' {
  const content: number;
  export default content;
}

declare module '*.jpg' {
  const content: number;
  export default content;
}

declare module '*.svg' {
  const content: number;
  export default content;
}

declare module '*.txt' {
  const content: number;
  export default content;
}
