import { Box, Car, Home, Package, Smartphone, TreePine, User, type LucideIcon } from "lucide-react";

import type { ObjectCategoryId } from "../model/objectCategories";

export const OBJECT_CATEGORY_ICONS: Record<ObjectCategoryId, LucideIcon> = {
  all: Box,
  characters: User,
  items: Package,
  buildings: Home,
  nature: TreePine,
  transport: Car,
  other: Smartphone,
};
