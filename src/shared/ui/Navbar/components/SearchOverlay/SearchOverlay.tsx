interface SearchOverlayProps {
  isMounted: boolean;
  isVisible: boolean;
  onClose: () => void;
}

export default function SearchOverlay({
  isMounted,
  isVisible,
  onClose,
}: SearchOverlayProps) {
  if (!isMounted) return null;

  const className = [
    "navbar__buttons-input_overlay",
    isVisible ? "navbar__buttons-input_overlay--open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={className} onMouseDown={onClose} aria-hidden />;
}
