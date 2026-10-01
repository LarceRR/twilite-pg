import { useState } from "react";
import "./HomePageChart.scss";

interface IDashboardObjectItem {
    id: number,
    name?: string,
    icon?: string,
    selected: boolean,
    onSelect: (id: number) => void
}

const DashboardObjectItem = ({ id, name, icon, selected, onSelect }: IDashboardObjectItem) => {
    return (
        <div
            className={`DashboardObjectItem${selected ? '--active' : ''}`}
            onClick={() => onSelect(id)}
        >
            <img
                src={`https://api.dicebear.com/10.x/pixel-art/svg?seed=${id}&size=24`}
                alt="avatar"
            />
            <span>{name}</span>
        </div>
    )
}

export default function HomePageChart() {
    const [selectedId, setSelectedId] = useState<number | null>(null)

    return (
        <div className="homepagechart">
            <div className="homepagechart__popular">
                <span className="homepagechart__popular-title">Популярные объекты</span>
                <div className="homepagechart__popular-list">
                    {[0,1,2,3,4].map((item, i) => (
                        <DashboardObjectItem
                            name={`Popular object ${i}`}
                            key={i}
                            selected={selectedId === i}
                            onSelect={setSelectedId}
                            id={i}
                        />)
                    )}
                </div>
            </div>
            <div className="homepagechart__chart">
                <span className="homepagechart__popular-title">График</span>
            </div>
        </div>
    );
}