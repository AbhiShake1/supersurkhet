import { describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Tests for the handleReviewPlugins logic used in CreateBusinessPageFlow.
// Replicated as a standalone function so we can unit-test all branches
// without rendering the full page component.
//
// Real implementation (create-business.tsx):
//   const handleReviewPlugins = async () => {
//     if (saveProviderCredentialRef.current) {
//       await saveProviderCredentialRef.current();
//     }
//     setStep(3);
//   };
// ---------------------------------------------------------------------------

function makeHandleReviewPlugins(
  saveRef: { current: (() => Promise<void>) | null },
  setStep: (step: number) => void,
) {
  return async function handleReviewPlugins() {
    if (saveRef.current) {
      await saveRef.current();
    }
    setStep(3);
  };
}

describe('handleReviewPlugins', () => {
  it('calls the save ref then navigates to step 3', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const setStep = vi.fn();

    const handleReviewPlugins = makeHandleReviewPlugins(
      { current: mockSave },
      setStep,
    );

    await handleReviewPlugins();

    expect(mockSave).toHaveBeenCalledOnce();
    expect(setStep).toHaveBeenCalledWith(3);
  });

  it('calls save before navigating — order matters', async () => {
    const callOrder: string[] = [];
    const mockSave = vi.fn().mockImplementation(async () => {
      callOrder.push('save');
    });
    const setStep = vi.fn().mockImplementation(() => {
      callOrder.push('setStep');
    });

    const handleReviewPlugins = makeHandleReviewPlugins(
      { current: mockSave },
      setStep,
    );

    await handleReviewPlugins();

    expect(callOrder).toEqual(['save', 'setStep']);
  });

  it('still navigates to step 3 when save ref is null', async () => {
    const setStep = vi.fn();

    const handleReviewPlugins = makeHandleReviewPlugins(
      { current: null },
      setStep,
    );

    await handleReviewPlugins();

    expect(setStep).toHaveBeenCalledWith(3);
  });

  it('does not navigate if save ref throws', async () => {
    const mockSave = vi.fn().mockRejectedValue(new Error('Network error'));
    const setStep = vi.fn();

    const handleReviewPlugins = makeHandleReviewPlugins(
      { current: mockSave },
      setStep,
    );

    await expect(handleReviewPlugins()).rejects.toThrow('Network error');
    expect(setStep).not.toHaveBeenCalled();
  });

  it('always navigates to step 3, not any other step', async () => {
    const setStep = vi.fn();

    const handleReviewPlugins = makeHandleReviewPlugins(
      { current: null },
      setStep,
    );

    await handleReviewPlugins();

    expect(setStep).toHaveBeenCalledWith(3);
    expect(setStep).not.toHaveBeenCalledWith(1);
    expect(setStep).not.toHaveBeenCalledWith(2);
  });
});
