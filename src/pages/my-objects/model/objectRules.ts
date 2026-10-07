import type { PixelObjectDto } from "@/shared/api/pixelObjects";

import { formatObjectCount } from "./objectFormatters";

export function canOpenObject(item: PixelObjectDto): boolean {
  return item.status === "rejected" || item.status === "published";
}

/** Drafts are erased. A published object leaves the author and stays in the catalog. */
export function objectRemovalKind(item: PixelObjectDto): "erase" | "reassign" | null {
  if (item.status === "pending" || item.status === "rejected") {
    return "erase";
  }
  if (item.status === "published") {
    return "reassign";
  }
  return null;
}

export function canDeleteObject(item: PixelObjectDto): boolean {
  return objectRemovalKind(item) !== null;
}

export function removalConfirm(items: readonly PixelObjectDto[]): {
  title: string;
  description: string;
} {
  const erase = items.filter((item) => objectRemovalKind(item) === "erase").length;
  const reassign = items.filter((item) => objectRemovalKind(item) === "reassign").length;
  const title =
    items.length === 1
      ? `Удалить «${items[0]?.title ?? ""}»?`
      : `Удалить ${formatObjectCount(items.length)}?`;

  if (erase > 0 && reassign === 0) {
    return {
      title,
      description:
        erase === 1
          ? "Черновик удалится безвозвратно, вместе с файлами."
          : "Черновики удалятся безвозвратно, вместе с файлами.",
    };
  }
  if (reassign > 0 && erase === 0) {
    return {
      title,
      description:
        reassign === 1
          ? "Объект пропадёт из ваших проектов, но останется в каталоге Twilite. Размещения на поверхностях сохранятся."
          : "Объекты пропадут из ваших проектов, но останутся в каталоге Twilite. Размещения на поверхностях сохранятся.",
    };
  }
  return {
    title,
    description:
      "Черновики удалятся безвозвратно. Опубликованные пропадут из ваших проектов, но останутся в каталоге Twilite.",
  };
}

export function removalSuccess(erased: number, reassigned: number): {
  title: string;
  description: string;
} {
  if (reassigned === 0) {
    return {
      title: erased === 1 ? "Объект удалён" : "Объекты удалены",
      description: "Файлы тоже удалены.",
    };
  }
  if (erased === 0) {
    return {
      title: reassigned === 1 ? "Объект передан Twilite" : "Объекты переданы Twilite",
      description:
        reassigned === 1
          ? "Он больше не в ваших проектах и остаётся в каталоге."
          : "Они больше не в ваших проектах и остаются в каталоге.",
    };
  }
  return {
    title: "Объекты обработаны",
    description: "Черновики удалены. Опубликованные переданы Twilite и остаются в каталоге.",
  };
}

/** Twilite system user: full removal from the app, any status. */
export function purgeConfirm(items: readonly PixelObjectDto[]): {
  title: string;
  description: string;
} {
  const title =
    items.length === 1
      ? `Удалить «${items[0]?.title ?? ""}» из Twilite App?`
      : `Удалить ${formatObjectCount(items.length)} из Twilite App?`;
  return {
    title,
    description:
      items.length === 1
        ? "Вы действительно хотите удалить объект из Twilite App? Он пропадёт из каталога и с поверхностей пользователей, файлы удалятся безвозвратно."
        : "Вы действительно хотите удалить объекты из Twilite App? Они пропадут из каталога и с поверхностей пользователей, файлы удалятся безвозвратно.",
  };
}

export function purgeSuccess(count: number): { title: string; description: string } {
  return {
    title: count === 1 ? "Объект удалён из Twilite App" : "Объекты удалены из Twilite App",
    description: "Файлы и размещения на поверхностях тоже удалены.",
  };
}
