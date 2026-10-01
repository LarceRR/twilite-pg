import { NavLink } from 'react-router';
import './Sidebar.scss'
import { AppRoutes } from "@/shared/const/routes";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSidebarStore } from '@/shared/store/sidebar';
import { TPG_PERMISSIONS, usePermissions } from '@/shared/lib/rbac';

export interface SidebarProps {
    isCollapsed: boolean
}

export default function Sidebar({isCollapsed}: SidebarProps) {

    const sidebarMode = useSidebarStore((state) => state.isSidebarOpen)
    const setSidebarOpen = useSidebarStore((state) => state.setSidebarOpen)
    const { hasPermission } = usePermissions()
    const canCreateProject = hasPermission(TPG_PERMISSIONS.EDITOR_CREATE_PROJECT)
    const canModerateThemes = hasPermission(TPG_PERMISSIONS.THEMES_MODERATE)
    const canModerateObjects = hasPermission(TPG_PERMISSIONS.PIXEL_OBJECTS_MODERATE)

    const handleExpand = () => {
        console.log('animation started')
            setSidebarOpen(!sidebarMode)
        setTimeout(() => {
            console.log('animation finished')
        }, 300)
    }

    return (
        <div className={`sidebar ${sidebarMode ? "" : "collapsed"}`}>
            <div className="sidebar__routes">
                {AppRoutes.map((routeObj, i) => (
                    routeObj.inSideBar ? <div className='sidebar__routes-wrapper' key={i}>
                        <span className='sidebar__routes-wrapper__label'>{routeObj.label}</span>
                        <div className='sidebar__routes-wrapper__links'>
                            {Object.values(routeObj.routes).map((item, i) => {
                                const isNewProject =
                                    item.path === AppRoutes[0].routes.NEWPROJECT.path

                                if (isNewProject && !canCreateProject) {
                                    return null
                                }

                                if (
                                    item.path === AppRoutes[2].routes.THEMEMODERATION.path &&
                                    !canModerateThemes
                                ) {
                                    return null
                                }

                                if (
                                    item.path === AppRoutes[2].routes.OBJECTMODERATION.path &&
                                    !canModerateObjects
                                ) {
                                    return null
                                }

                                return (
                                    <NavLink to={item.path} className='sidebar__routes-wrapper__links-link' key={i}>
                                        <item.icon size={20}/>
                                        <span>{item.name}</span>
                                    </NavLink>
                                )
                            })}
                        </div>
                    </div> : ""
                ))}
            </div>
            {/* <div className="sidebar__promotion">
                <img src='./sidebar-promotion-image.png' alt='promotion image'/>
                <div className="sidebar__promotion-text">
                    <span>Создавай. Делись.</span>
                    <span>Вдохни жизнь в твои идеи!</span>
                </div>
            </div> */}
            <div className="sidebar__version">
                <span>Twilite Pixel Generator v0.1.0</span>
                
                <div className='sidebar__routes-wrapper__links-link' onClick={handleExpand}>
                    {sidebarMode ? <ChevronLeft size={20}/> : <ChevronRight size={20} />}
                    <span>Свернуть</span>
                </div>
            </div>
        </div>
    )
}