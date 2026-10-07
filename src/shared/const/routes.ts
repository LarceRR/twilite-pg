import {
  Book,
  Box,
  Folder,
  Grid2x2,
  Home,
  ImageIcon,
  ListChecks,
  LogIn,
  Palette,
  Plus,
  Search,
  Star,
} from "lucide-react";

export const AppRoutes = [
  {
    label: 'Общее',
    inSideBar: true,
    routes: {
      HOME: {
        path: "/",
        name: "Главная",
        inPagesList: true,
        icon: Home
      },
      MYPROJECTS: {
        path: "/my-projects",
        name: "Мои проекты",
        inPagesList: true,
        icon: Folder
      },
      MYOBJECTS: {
        path: "/my-objects",
        name: "Мои объекты",
        inPagesList: true,
        icon: Box
      },
      DISCOVER: {
        path: "/discover",
        name: "Обзор",
        inPagesList: true,
        icon: Search
      },
      NEWPROJECT: {
        path: "/new-project",
        name: "Редактор",
        inPagesList: true,
        icon: Plus
      },
      ICONS: {
        path: "/lucide-icons",
        name: "Иконки Lucide",
        inPagesList: true,
        icon: Grid2x2
      }
    }
  },
  {
    label: 'Библиотека',
    inSideBar: false,
    routes: {
      FAVORITES: {
        path: "/favorites",
        name: "Избранное",
        inPagesList: true,
        icon: Star
      },
      COLLECTIONS: {
        path: "/collections",
        name: "Коллекция",
        inPagesList: true,
        icon: Box
      },
      TEMPLATES: {
        path: "/templates",
        name: "Шаблоны",
        inPagesList: true,
        icon: Book
      },
    }
  },
  {
    label: 'Инструменты',
    inSideBar: true,
    routes: {
      IMAGEIMPORT: {
        path: "/image-import",
        name: "Импорт изображения",
        inPagesList: true,
        icon: ImageIcon
      },
      COLPALETTES: {
        path: "/theme-studio",
        name: "Студия тем",
        inPagesList: true,
        icon: Palette
      },
      THEMEMODERATION: {
        path: "/theme-moderation",
        name: "Модерация тем",
        inPagesList: true,
        icon: Book
      },
      OBJECTMODERATION: {
        path: "/pixel-object-moderation",
        name: "Модерация объектов",
        inPagesList: true,
        icon: ListChecks
      },
    }
  },
  {
    label: 'Системное',
    inSideBar: false,
    routes: {
      CABINET: {
        path: "/cabinet",
        name: "Личный кабинет",
        inPagesList: false,
        icon: ImageIcon
      },
      EDITOR: {
        path: "/editor",
        name: "Редактор",
        inPagesList: false,
        icon: Palette
      },
      LOGIN: {
        path: "/log-in",
        name: "Авторизация",
        inPagesList: false,
        icon: LogIn
      },
    }
  },

] as const;
