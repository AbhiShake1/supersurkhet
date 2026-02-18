export type OverviewTabStatus = 'draft' | 'review' | 'published' | 'archived';

export type OverviewTabMetadata = {
  pluginId: string;
  pluginName: string;
  namespace: string;
  status: OverviewTabStatus;
};

export type OverviewTabCollaborator = {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
};

export type OverviewTabDraftSummary = {
  draftId: string;
  updatedAt: string;
  updatedBy?: string;
};

export type OverviewTabRevisionSummary = {
  revisionId: string;
  publishedAt: string;
  publishedBy?: string;
  note?: string;
};

export type OverviewTabProps = {
  metadata: OverviewTabMetadata;
  collaborators: OverviewTabCollaborator[];
  activeDraft: OverviewTabDraftSummary | null;
  latestImmutableRevision: OverviewTabRevisionSummary | null;
};

export function OverviewTab({
  metadata,
  collaborators,
  activeDraft,
  latestImmutableRevision,
}: OverviewTabProps) {
  return (
    <section aria-label="Overview tab">
      <h2>Overview</h2>

      <article>
        <h3>Plugin Metadata</h3>
        <dl>
          <dt>Name</dt>
          <dd>{metadata.pluginName}</dd>
          <dt>Plugin ID</dt>
          <dd>{metadata.pluginId}</dd>
          <dt>Namespace</dt>
          <dd>{metadata.namespace}</dd>
          <dt>Status</dt>
          <dd>{metadata.status}</dd>
        </dl>
      </article>

      <article>
        <h3>Collaborators</h3>
        {collaborators.length === 0 ? (
          <p>No collaborators yet</p>
        ) : (
          <ul>
            {collaborators.map((collaborator) => (
              <li key={collaborator.id}>
                <span>{collaborator.name}</span>{' '}
                <span>{collaborator.role}</span>{' '}
                <span>{collaborator.isActive ? 'Active' : 'Offline'}</span>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article>
        <h3>Active Draft</h3>
        {activeDraft ? (
          <dl>
            <dt>Draft ID</dt>
            <dd>{activeDraft.draftId}</dd>
            <dt>Updated At</dt>
            <dd>{activeDraft.updatedAt}</dd>
            {activeDraft.updatedBy ? (
              <>
                <dt>Updated By</dt>
                <dd>{activeDraft.updatedBy}</dd>
              </>
            ) : null}
          </dl>
        ) : (
          <p>No active draft</p>
        )}
      </article>

      <article>
        <h3>Latest Immutable Revision</h3>
        {latestImmutableRevision ? (
          <dl>
            <dt>Revision ID</dt>
            <dd>{latestImmutableRevision.revisionId}</dd>
            <dt>Published At</dt>
            <dd>{latestImmutableRevision.publishedAt}</dd>
            {latestImmutableRevision.publishedBy ? (
              <>
                <dt>Published By</dt>
                <dd>{latestImmutableRevision.publishedBy}</dd>
              </>
            ) : null}
            {latestImmutableRevision.note ? (
              <>
                <dt>Summary</dt>
                <dd>{latestImmutableRevision.note}</dd>
              </>
            ) : null}
          </dl>
        ) : (
          <p>No immutable revision published yet</p>
        )}
      </article>
    </section>
  );
}
