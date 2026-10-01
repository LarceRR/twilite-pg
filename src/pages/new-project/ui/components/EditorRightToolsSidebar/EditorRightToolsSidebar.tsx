import { Download, Layers, Sparkle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { EditorEffects } from "./EditorEffects/EditorEffects";
import { EditorExport } from "./EditorExport/EditorExport";
import { EditorLayers } from "./EditorLayers/EditorLayers";
import "./EditorRightToolsSidebar.scss";

type RightToolTabId = "layers" | "effects" | "export";

const RIGHT_TOOL_TABS: ReadonlyArray<{
    id: RightToolTabId
    icon: ReactNode
    name: string
    children?: ReactNode
}> = [
    {
        id: 'layers',
        icon: <Layers />,
        name: "Слои",
        children: <EditorLayers />,
    },
    {
        id: "effects",
        icon: <Sparkle />,
        name: "Эффекты",
        children: <EditorEffects />,
    },
    {
        id: "export",
        icon: <Download />,
        name: "Экспорт",
        children: <EditorExport />,
    },
]

export const EditorRightToolsSidebar = () => {
    const [selectedTab, setSelectedTab] = useState<RightToolTabId>('layers')
    const selectedTabContent = RIGHT_TOOL_TABS.find((tab) => tab.id === selectedTab)?.children ?? null

    return (
        <div className="editor-right-tools-sidebar">
            <div className='editor-right-tools-sidebar__tabs'>
                {RIGHT_TOOL_TABS.map((tab) => (
                        <div key={tab.id} className={`editor-right-tools-sidebar__tabs-tab${tab.id === selectedTab ? " editor-right-tools-sidebar__tabs-tab--active" : ""}`} onClick={() => setSelectedTab(tab.id)}>
                            {/* {tab.icon} */}
                            {tab.name}
                        </div>
                    )
                )}
            </div>
            <div className='editor-right-tools-sidebar__tabs-body'>
                {selectedTabContent}
            </div>
        </div>
    )
}
