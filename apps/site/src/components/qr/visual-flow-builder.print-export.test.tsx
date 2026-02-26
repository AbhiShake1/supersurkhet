// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getExportableCodeBlob,
  getExportableCodeDataUrl,
  resolveExportableCodeElement,
} from './visual-flow-builder';

function mockCanvasExports(
  canvas: HTMLCanvasElement,
  dataUrl: string,
  blob: Blob,
) {
  const toDataURL = vi.fn(() => dataUrl);
  const toBlob = vi.fn((callback: BlobCallback | null) => {
    callback?.(blob);
  });

  Object.defineProperty(canvas, 'toDataURL', {
    configurable: true,
    value: toDataURL,
  });
  Object.defineProperty(canvas, 'toBlob', {
    configurable: true,
    value: toBlob,
  });

  return { toDataURL, toBlob };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('visual-flow-builder preview export targeting', () => {
  it('uses the scoped preview export root instead of the first page canvas', async () => {
    const outsideCanvas = document.createElement('canvas');
    const outsideBlob = new Blob(['outside'], { type: 'image/png' });
    const outsideMocks = mockCanvasExports(
      outsideCanvas,
      'data:image/png;base64,OUTSIDE',
      outsideBlob,
    );

    const previewWrapper = document.createElement('div');
    const codeExportRoot = document.createElement('div');
    codeExportRoot.setAttribute('data-code-export-root', 'true');
    const previewCanvas = document.createElement('canvas');
    const previewBlob = new Blob(['preview'], { type: 'image/png' });
    const previewMocks = mockCanvasExports(
      previewCanvas,
      'data:image/png;base64,PREVIEW',
      previewBlob,
    );

    codeExportRoot.appendChild(previewCanvas);
    previewWrapper.appendChild(codeExportRoot);
    document.body.appendChild(outsideCanvas);
    document.body.appendChild(previewWrapper);

    expect(resolveExportableCodeElement(previewWrapper)).toBe(previewCanvas);
    expect(getExportableCodeDataUrl(previewWrapper)).toBe(
      'data:image/png;base64,PREVIEW',
    );

    const exportedBlob = await getExportableCodeBlob(previewWrapper);
    expect(exportedBlob).toBe(previewBlob);

    expect(previewMocks.toDataURL).toHaveBeenCalledTimes(1);
    expect(previewMocks.toBlob).toHaveBeenCalledTimes(1);
    expect(outsideMocks.toDataURL).not.toHaveBeenCalled();
    expect(outsideMocks.toBlob).not.toHaveBeenCalled();
  });

  it('returns null when no renderable code element is available', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    expect(resolveExportableCodeElement(container)).toBeNull();
    expect(getExportableCodeDataUrl(container)).toBeNull();
    await expect(getExportableCodeBlob(container)).resolves.toBeNull();
  });
});
