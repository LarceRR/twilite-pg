import "./MyProjectsHeader.scss";

import type { ReactNode } from "react";

import { formatProjectCount } from "../../../model/projectFormatters";

export type MyProjectsHeaderProps = {
  projectCount: number;
  toolbar: ReactNode;
};

export function MyProjectsHeader({ projectCount, toolbar }: MyProjectsHeaderProps) {
  return (
    <header className="my-projects-header">
      <div className="my-projects-header__text">
        <h1>Мои проекты</h1>
        <span className="my-projects-header__count">{formatProjectCount(projectCount)}</span>
      </div>
      {toolbar}
    </header>
  );
}
