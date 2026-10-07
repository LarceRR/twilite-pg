import "./MyObjectsHeader.scss";

import type { ReactNode } from "react";

import { formatObjectCount } from "../../../model/objectFormatters";

export type MyObjectsHeaderProps = {
  title: string;
  objectCount: number;
  toolbar: ReactNode;
};

export function MyObjectsHeader({ title, objectCount, toolbar }: MyObjectsHeaderProps) {
  return (
    <header className="my-objects-header">
      <div className="my-objects-header__text">
        <h1>{title}</h1>
        <span className="my-objects-header__count">{formatObjectCount(objectCount)}</span>
      </div>
      {toolbar}
    </header>
  );
}
