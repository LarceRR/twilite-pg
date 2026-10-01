import { EditorAnimationTimeline } from "../EditorAnimationTimeline/EditorAnimationTimeline";
import { EditorPixelArtCanvas } from "../EditorPixelArtCanvas/EditorPixelArtCanvas";
import { EditorToolSettiings } from "../EditorToolSettiings/EditorToolSettiings";
import "./EditorMiddleBlock.scss";

type EditorMiddleBlockProps = {
  onStoryboardImport?: () => void;
};

export const EditorMiddleBlock = ({ onStoryboardImport }: EditorMiddleBlockProps) => {
  return (
    <div className="editor-middle-block">
      <EditorToolSettiings />
      <EditorPixelArtCanvas />
      <EditorAnimationTimeline onStoryboardImport={onStoryboardImport} />
    </div>
  );
};
