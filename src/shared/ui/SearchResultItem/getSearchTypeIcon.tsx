import type { SearchItemType } from "@/shared/lib/search";
import { Box, FolderKanban, Hash, User } from "lucide-react";
import type { ReactNode } from "react";

const ICONS: Record<SearchItemType, ReactNode> = {
  project: <FolderKanban size={20} />,
  object: <Box size={20} />,
  user: <User size={20} />,
  tag: <Hash size={20} />,
};

export function getSearchTypeIcon(type: SearchItemType): ReactNode {
  return ICONS[type];
}
