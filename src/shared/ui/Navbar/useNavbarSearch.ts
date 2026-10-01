import { useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router";
import { useHotkey } from "@/shared/hooks/useHotkey";
import { useMountTransition } from "@/shared/hooks/useMountTransition";
import { APP_HOTKEYS } from "@/shared/const/hotkeys";
import type { SearchHit } from "@/shared/lib/search";

export function useNavbarSearch() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const transition = useMountTransition({
    isOpen: isSearchOpen,
    durationMs: 220,
  });

  const openSearch = () => {
    setIsSearchOpen(true);
    queueMicrotask(() => inputRef.current?.focus());
  };

  const closeSearch = () => setIsSearchOpen(false);

  useHotkey(APP_HOTKEYS.OPEN_SEARCH, openSearch, {
    ignoreInputs: false,
    preventDefault: true,
  });

  useHotkey(APP_HOTKEYS.CLOSE_OVERLAY, closeSearch, {
    enabled: isSearchOpen,
    ignoreInputs: false,
    preventDefault: true,
  });

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setIsSearchOpen(true);
  };

  const handleSelect = (hit: SearchHit) => {
    closeSearch();
    if (hit.item.href) navigate(hit.item.href);
  };

  return {
    query,
    inputRef,
    isSearchOpen,
    setIsSearchOpen,
    openSearch,
    closeSearch,
    handleQueryChange,
    handleSelect,
    ...transition,
  };
}
