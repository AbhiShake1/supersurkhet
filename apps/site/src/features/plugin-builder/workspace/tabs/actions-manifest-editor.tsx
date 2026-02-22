import type { ActionManifestDoc, WorkflowDoc } from '@/lib/plugins/types';
import {
  type ActionCapabilityValidationDiagnostic,
  validateWorkflowActionCapabilities,
} from '../../domain/validation/action-capability-validator';

export type ActionsManifestEditorRuntimeTarget = 'sandbox-worker' | 'core';

export type ActionsManifestEditorState = {
  actionManifest: ActionManifestDoc[];
  workflows: WorkflowDoc[];
  capabilityEnvelope: string[];
  runtimeTarget: ActionsManifestEditorRuntimeTarget;
};

export type CreateActionsManifestEditorStateInput = {
  actionManifest: readonly ActionManifestDoc[];
  workflows: readonly WorkflowDoc[];
  capabilityEnvelope: readonly string[];
  runtimeTarget: ActionsManifestEditorRuntimeTarget;
};

function cloneAction(action: ActionManifestDoc): ActionManifestDoc {
  return {
    actionId: action.actionId,
    description: action.description,
    capabilities: action.capabilities ? [...action.capabilities] : undefined,
    runtime: action.runtime,
  };
}

function normalizeCapabilities(
  capabilities?: readonly string[],
): string[] | undefined {
  if (!capabilities) {
    return undefined;
  }

  return [...new Set(capabilities)];
}

export function createActionsManifestEditorState(
  input: CreateActionsManifestEditorStateInput,
): ActionsManifestEditorState {
  return {
    actionManifest: input.actionManifest.map((action) => ({
      ...cloneAction(action),
      capabilities: normalizeCapabilities(action.capabilities),
    })),
    workflows: input.workflows.map((workflow) => ({
      ...workflow,
      nodes: workflow.nodes.map((node) => ({ ...node })),
      edges: workflow.edges.map((edge) => ({ ...edge })),
    })),
    capabilityEnvelope: [...new Set(input.capabilityEnvelope)],
    runtimeTarget: input.runtimeTarget,
  };
}

export function addActionToManifest(
  state: ActionsManifestEditorState,
  action: ActionManifestDoc,
): ActionsManifestEditorState {
  if (
    state.actionManifest.some((entry) => entry.actionId === action.actionId)
  ) {
    throw new Error(`Action already exists: ${action.actionId}`);
  }

  return {
    ...state,
    actionManifest: [...state.actionManifest, cloneAction(action)],
  };
}

export function updateActionInManifest(
  state: ActionsManifestEditorState,
  actionId: string,
  patch: Partial<ActionManifestDoc>,
): ActionsManifestEditorState {
  const index = state.actionManifest.findIndex(
    (entry) => entry.actionId === actionId,
  );
  if (index === -1) {
    throw new Error(`Cannot update unknown action: ${actionId}`);
  }

  const nextActionId = patch.actionId ?? actionId;
  if (
    nextActionId !== actionId &&
    state.actionManifest.some((entry) => entry.actionId === nextActionId)
  ) {
    throw new Error(`Action already exists: ${nextActionId}`);
  }

  const current = state.actionManifest[index];
  const nextAction: ActionManifestDoc = {
    ...current,
    ...patch,
    actionId: nextActionId,
    capabilities: normalizeCapabilities(
      patch.capabilities ?? current.capabilities,
    ),
  };

  return {
    ...state,
    actionManifest: state.actionManifest.map((entry, entryIndex) =>
      entryIndex === index ? nextAction : entry,
    ),
  };
}

export function removeActionFromManifest(
  state: ActionsManifestEditorState,
  actionId: string,
): ActionsManifestEditorState {
  const exists = state.actionManifest.some(
    (entry) => entry.actionId === actionId,
  );
  if (!exists) {
    throw new Error(`Cannot remove unknown action: ${actionId}`);
  }

  return {
    ...state,
    actionManifest: state.actionManifest.filter(
      (entry) => entry.actionId !== actionId,
    ),
  };
}

export function validateActionsManifestEditorState(
  state: ActionsManifestEditorState,
): ActionCapabilityValidationDiagnostic[] {
  return validateWorkflowActionCapabilities({
    workflows: state.workflows,
    actionManifest: state.actionManifest,
    capabilityEnvelope: state.capabilityEnvelope,
    runtimeTarget: state.runtimeTarget,
  }).diagnostics;
}

export type ActionsManifestEditorProps = CreateActionsManifestEditorStateInput;

export function ActionsManifestEditor(props: ActionsManifestEditorProps) {
  const state = createActionsManifestEditorState(props);
  const diagnostics = validateActionsManifestEditorState(state);

  return (
    <section aria-label="Actions manifest editor">
      <h2>Actions Manifest</h2>

      <article>
        <h3>Runtime target</h3>
        <label>
          <input
            type="radio"
            name="runtime-target"
            value="sandbox-worker"
            checked={state.runtimeTarget === 'sandbox-worker'}
            readOnly
          />{' '}
          sandbox-worker
        </label>
        <label>
          <input
            type="radio"
            name="runtime-target"
            value="core"
            checked={state.runtimeTarget === 'core'}
            readOnly
          />{' '}
          core
        </label>
      </article>

      <article>
        <h3>Actions</h3>
        {state.actionManifest.length === 0 ? (
          <p>No actions configured</p>
        ) : (
          <ul>
            {state.actionManifest.map((action) => (
              <li key={action.actionId}>
                <strong>{action.actionId}</strong>
                <div>Runtime: {action.runtime ?? 'sandbox-worker'}</div>
                <div>
                  Capabilities:{' '}
                  {action.capabilities && action.capabilities.length > 0
                    ? action.capabilities.join(', ')
                    : 'none'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article>
        {diagnostics.length === 0 ? (
          <p>No validation issues</p>
        ) : (
          <aside role="alert" aria-live="polite">
            <h3>Validation issues</h3>
            <ul>
              {diagnostics.map((diagnostic, index) => (
                <li key={`${diagnostic.code}-${index}`}>
                  {diagnostic.message}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </article>
    </section>
  );
}
