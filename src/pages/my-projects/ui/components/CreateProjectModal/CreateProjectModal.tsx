import "./CreateProjectModal.scss";

import { useRef } from "react";

import Input from "@/shared/ui/Input/Input";
import { Modal } from "@/shared/ui/Modal";

export type CreateProjectModalProps = {
  open: boolean;
  title: string;
  description: string;
  creating: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function CreateProjectModal({
  open,
  title,
  description,
  creating,
  onTitleChange,
  onDescriptionChange,
  onClose,
  onSubmit,
}: CreateProjectModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Новый проект"
      description="Дайте проекту имя — остальное можно настроить позже."
      initialFocusRef={inputRef}
      className="create-project-modal"
    >
      <form
        className="create-project-modal__form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label className="create-project-modal__field">
          <span className="create-project-modal__label">
            Название проекта <span aria-hidden="true">*</span>
          </span>
          <Input
            inputRef={inputRef}
            variant="field"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Например, Forest Pack"
            maxLength={80}
            aria-label="Название проекта"
            disabled={creating}
            className="create-project-modal__input"
          />
        </label>

        <label className="create-project-modal__field">
          <span className="create-project-modal__label">Описание (необязательно)</span>
          <textarea
            className="create-project-modal__textarea"
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Короткое описание проекта..."
            rows={3}
            maxLength={280}
            disabled={creating}
          />
        </label>

        <div className="create-project-modal__actions">
          <button
            type="button"
            className="my-projects__secondary"
            onClick={onClose}
            disabled={creating}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="my-projects__primary"
            disabled={creating || title.trim().length === 0}
          >
            {creating ? "Создание…" : "Создать"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
