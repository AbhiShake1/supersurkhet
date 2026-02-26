// @vitest-environment jsdom

import { toDataURL } from 'qrcode';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DataMatrixCode } from './datamatrix-code';

vi.mock('@barcode-bakery/barcode-react', () => ({
  BakeryColor: class MockBakeryColor {
    constructor(
      public readonly r: number,
      public readonly g: number,
      public readonly b: number,
    ) {}
  },
}));

vi.mock('@barcode-bakery/barcode-react/datamatrix', () => ({
  BakeryDatamatrix: ({ text }: { text: string }) => (
    <canvas data-testid="datamatrix-canvas" data-text={text} />
  ),
}));

vi.mock('qrcode', () => ({
  toDataURL: vi.fn(),
}));

function createDeferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error?: unknown) => void = () => undefined;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

async function flushDomUpdates(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function waitForAssertion(
  assertion: () => void,
  timeoutMs = 2500,
): Promise<void> {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  throw (lastError ?? new Error('Assertion timed out')) as Error;
}

describe('DataMatrixCode', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      root.unmount();
      root = null;
    }

    if (container) {
      container.remove();
      container = null;
    }
  });

  function render(element: JSX.Element) {
    if (!container) {
      throw new Error('Container is not initialized');
    }

    if (!root) {
      root = createRoot(container);
    }

    root.render(element);
  }

  it('keeps the latest QR render when async generations resolve out of order', async () => {
    const first = createDeferred<string>();
    const second = createDeferred<string>();
    const toDataURLMock = vi.mocked(toDataURL);

    toDataURLMock
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    render(<DataMatrixCode value="first" format="qr" />);
    await flushDomUpdates();

    render(<DataMatrixCode value="second" format="qr" />);
    await flushDomUpdates();

    second.resolve('data:image/png;base64,SECOND');

    await waitForAssertion(() => {
      const image = container?.querySelector('img');
      expect(image).not.toBeNull();
      expect(image?.getAttribute('src')).toContain('SECOND');
    });

    first.resolve('data:image/png;base64,FIRST');
    await flushDomUpdates();

    const image = container?.querySelector('img');
    expect(image?.getAttribute('src')).toContain('SECOND');
    expect(toDataURLMock).toHaveBeenNthCalledWith(
      1,
      'first',
      expect.objectContaining({
        width: 200,
        margin: 2,
      }),
    );
    expect(toDataURLMock).toHaveBeenNthCalledWith(
      2,
      'second',
      expect.objectContaining({
        width: 200,
        margin: 2,
      }),
    );
  });

  it('switches cleanly from QR to DataMatrix without stale QR image state', async () => {
    const toDataURLMock = vi.mocked(toDataURL);
    toDataURLMock.mockResolvedValue('data:image/png;base64,QR');

    render(<DataMatrixCode value="payload" format="qr" />);

    await waitForAssertion(() => {
      const image = container?.querySelector('img');
      expect(image).not.toBeNull();
      expect(image?.getAttribute('src')).toContain('QR');
    });

    render(<DataMatrixCode value="payload" format="datamatrix" />);
    await flushDomUpdates();

    expect(container?.querySelector('img')).toBeNull();
    expect(
      container?.querySelector('[data-testid="datamatrix-canvas"]'),
    ).not.toBeNull();
    expect(container?.textContent).toContain('DATAMATRIX');
  });
});
