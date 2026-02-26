import type { FallbackProps } from 'react-error-boundary';

function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(typeof value === 'string' ? value : 'Unknown error');
}

export function ErrorFallback({ error }: FallbackProps) {
  const resolvedError = toError(error);
  // Call resetErrorBoundary() to reset the error boundary and retry the render.

  return (
    <div className="p-4 border border-red-500 bg-red-100 text-red-700 rounded flex-grow w-full">
      <h3 className="font-bold mb-2">Component Error</h3>
      <p>Error: {resolvedError.message}</p>
      <details className="mt-2">
        <summary className="cursor-pointer">Stack trace</summary>
        <pre className="mt-2 text-xs whitespace-pre-wrap">
          {resolvedError.stack}
        </pre>
      </details>
    </div>
  );
}
