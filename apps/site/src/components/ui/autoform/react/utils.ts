// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
export function getPathInObject(obj: any, path: string[]): any {
  let current = obj;
  for (const key of path) {
    current = current[key];

    if (current === undefined) {
      return undefined;
    }
  }
  return current;
}

export function formatTestId(path: string[]) {
  return path.join('__').replace(/[^a-zA-Z0-9_-]/g, '_');
}
