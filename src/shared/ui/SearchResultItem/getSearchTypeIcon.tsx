import type { SearchItemType } from "@/shared/lib/search";
import { Box, FolderKanban, Hash, User } from "lucide-react";
import type { ReactNode } from "react";

const ICONS: Record<SearchItemType, ReactNode> = {
  project: <FolderKanban size={16} />,
  object: <Box size={16} />,
  user: <User size={16} />,
  tag: <Hash size={16} />,
};

export function getSearchTypeIcon(type: SearchItemType): ReactNode {
  return ICONS[type];
}
