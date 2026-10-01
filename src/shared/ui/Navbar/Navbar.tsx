import "./Navbar.scss";
import Logo from "../logo/Logo";
import { AppRoutes } from "@/shared/const/routes";
import LiquidGlassButton from "../LiquidGlassButton/LiquidGlassButton";
import { Bell, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import Input from "../Input/Input";
import SearchResults from "./components/SearchResults/SearchResults";
import { CounterBadge } from "../CounterBadge/CounterBadge";
import { useNavbarSearch } from "./useNavbarSearch";
import SearchOverlay from "./components/SearchOverlay/SearchOverlay";
import { APP_HOTKEYS } from "@/shared/const/hotkeys";
import { useSessionStore } from "@/shared/store/session";
import { userInitials } from "@/shared/lib/auth/userInitials";

export default function Navbar() {
  const search = useNavbarSearch();
  const user = useSessionStore((state) => state.user);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const avatarUrl =
    typeof user?.avatarUrl === "string" && user.avatarUrl.length > 0 ? user.avatarUrl : null;

  useEffect(() => {
    setAvatarBroken(false);
  }, [avatarUrl]);

  return (
    <header className="navbar" data-testid="navbar">
      <NavLink
        className="navbar__brand"
        to={AppRoutes[0].routes.HOME.path}
        aria-label="Twilite Pixelart Generator"
      >
        <Logo width={34} height={34} />
        <span className="navbar__brand-text">
          <strong className="navbar__brand-title">twilite</strong>
          <small className="navbar__brand-subtitle">pixelart generator</small>
        </span>
      </NavLink>

      <div className="navbar__middle">
        <div className="navbar__buttons">
          <Input
            icon={<Search size={20} />}
            value={search.query}
            onChange={search.handleQueryChange}
            onFocus={search.openSearch}
            placeholder="Поиск по проектам, объектам и тегам..."
            className="navbar__buttons-search_input"
            keybind={APP_HOTKEYS.OPEN_SEARCH}
            inputRef={search.inputRef}
          >
            {search.isMounted ? (
              <SearchResults
                query={search.query}
                isVisible={search.isVisible}
                onSelect={search.handleSelect}
              />
            ) : null}
          </Input>
          <SearchOverlay
            isMounted={search.isMounted}
            isVisible={search.isVisible}
            onClose={search.closeSearch}
          />
        </div>
      </div>

      <div className="navbar__actions">
        <LiquidGlassButton
          icon={<Bell size={16} />}
          action={() => alert("Уведомления")}
          children={<CounterBadge count={99} />}
        />
        <NavLink to="/cabinet" className="navbar__avatar" aria-label="Открыть профиль">
          {avatarUrl && !avatarBroken ? (
            <img
              src={avatarUrl}
              alt=""
              className="navbar__avatar-photo"
              onError={() => setAvatarBroken(true)}
            />
          ) : (
            <div className="navbar__avatar-userslug">{userInitials(user?.displayName ?? "TP")}</div>
          )}
          <div className="navbar__avatar-userinfo">
            <span className="navbar__avatar-userinfo_name">{user?.displayName ?? "Аккаунт"}</span>
            <span className="navbar__avatar-userinfo_role">{user?.email ?? "Twilite"}</span>
          </div>
        </NavLink>
      </div>
    </header>
  );
}
