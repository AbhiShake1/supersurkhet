export const opinionatedArtifacts = [
  'admin',
  'table',
  'permission',
  'kanban',
] as const;

export function getInstallPreview(opinionated: boolean) {
  return {
    package: opinionated ? 'supersurkhet-opinionated' : 'supersurkhet-base',
    addsOptionalVitePlugin: true,
    downloadedFiles: opinionated ? [...opinionatedArtifacts] : [],
  };
}
