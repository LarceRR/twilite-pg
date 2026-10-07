import { apiFetch } from "@/shared/api/http";
import { putApiUpload } from "@/shared/api/putApiUpload";

export type ProjectDto = {
  id: string;
  title: string;
  description: string;
  ownerUserId: string;
  ownerDisplayName: string;
  avatarUrl: string | null;
  objectCount: number;
  isReassignmentInbox?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProjectListResponse = {
  items: ProjectDto[];
};

export type ProjectLimits = {
  projectsPerUser: number;
  objectsPerProject: number;
  titleMax: number;
};

export type ProjectAvatarContentType = "image/jpeg" | "image/png" | "image/webp";

export type ProjectAvatarUploadTicket = {
  assetId: string;
  uploadUrl: string;
  storageKey: string;
  expiresAt: string;
  headers: {
    "Content-Type": string;
    "Cache-Control": string;
  };
};

export type BatchDeleteResponse = {
  deleted: number;
};

export type BatchPurgeResponse = {
  purged: number;
};

export async function listMyProjects(): Promise<ProjectDto[]> {
  const response = await apiFetch("/v1/tpg/projects/mine");
  const data = (await response.json()) as ProjectListResponse;
  return Array.isArray(data.items) ? data.items : [];
}

export async function getProject(id: string): Promise<ProjectDto> {
  const response = await apiFetch(`/v1/tpg/projects/${id}`);
  return response.json() as Promise<ProjectDto>;
}

export async function createProject(
  title: string,
  idempotencyKey?: string,
  description?: string | null,
): Promise<ProjectDto> {
  const trimmedDescription = description?.trim() || null;
  const response = await apiFetch("/v1/tpg/projects", {
    method: "POST",
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
    body: JSON.stringify({
      title,
      ...(trimmedDescription ? { description: trimmedDescription } : {}),
    }),
  });
  return response.json() as Promise<ProjectDto>;
}

export async function updateProject(
  id: string,
  input: { title?: string; description?: string | null; clearAvatar?: boolean },
): Promise<ProjectDto> {
  const response = await apiFetch(`/v1/tpg/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return response.json() as Promise<ProjectDto>;
}

/** Soft delete: the project is handed to the Twilite system user. */
export async function deleteProject(id: string): Promise<ProjectDto> {
  const response = await apiFetch(`/v1/tpg/projects/${id}`, { method: "DELETE" });
  return response.json() as Promise<ProjectDto>;
}

/** Hard delete (admin, `tpg.editor.purge`): project, all its objects and files are erased (204). */
export async function purgeProject(id: string): Promise<void> {
  await apiFetch(`/v1/tpg/projects/${id}/permanent`, { method: "DELETE" });
}

/** Soft delete multiple projects at once. */
export async function bulkDeleteProjects(projectIds: string[]): Promise<BatchDeleteResponse> {
  if (projectIds.length === 0) {
    return { deleted: 0 };
  }
  const response = await apiFetch("/v1/tpg/projects/batch/delete", {
    method: "POST",
    body: JSON.stringify({ projectIds }),
  });
  return response.json() as Promise<BatchDeleteResponse>;
}

/** Hard delete multiple projects at once (admin only). */
export async function bulkPurgeProjects(projectIds: string[]): Promise<BatchPurgeResponse> {
  if (projectIds.length === 0) {
    return { purged: 0 };
  }
  const response = await apiFetch("/v1/tpg/projects/batch/purge", {
    method: "POST",
    body: JSON.stringify({ projectIds }),
  });
  return response.json() as Promise<BatchPurgeResponse>;
}

export async function reassignProject(id: string, toUserId: string): Promise<ProjectDto> {
  const response = await apiFetch(`/v1/tpg/projects/${id}/reassign`, {
    method: "POST",
    body: JSON.stringify({ toUserId }),
  });
  return response.json() as Promise<ProjectDto>;
}

export async function createProjectAvatarUpload(input: {
  projectId: string;
  contentType: ProjectAvatarContentType;
  byteSize: number;
}): Promise<ProjectAvatarUploadTicket> {
  const response = await apiFetch(`/v1/tpg/projects/${input.projectId}/avatar`, {
    method: "POST",
    body: JSON.stringify({
      contentType: input.contentType,
      byteSize: input.byteSize,
    }),
  });
  return response.json() as Promise<ProjectAvatarUploadTicket>;
}

export async function confirmProjectAvatar(
  projectId: string,
  assetId: string,
): Promise<ProjectDto> {
  const response = await apiFetch(`/v1/tpg/projects/${projectId}/avatar/${assetId}/confirm`, {
    method: "POST",
  });
  return response.json() as Promise<ProjectDto>;
}

export async function uploadProjectAvatarFile(
  projectId: string,
  file: File,
): Promise<ProjectDto> {
  const contentType = file.type as ProjectAvatarContentType;
  const ticket = await createProjectAvatarUpload({
    projectId,
    contentType,
    byteSize: file.size,
  });
  await putApiUpload(ticket.uploadUrl, file, ticket.headers);
  return confirmProjectAvatar(projectId, ticket.assetId);
}

export async function fetchProjectLimits(): Promise<ProjectLimits> {
  const response = await apiFetch("/v1/tpg/projects/limits");
  return response.json() as Promise<ProjectLimits>;
}
