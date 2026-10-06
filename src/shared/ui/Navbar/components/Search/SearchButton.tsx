import { Search } from "lucide-react";
import "./SearchButton.scss";
import LiquidGlassButton from "@/shared/ui/LiquidGlassButton/LiquidGlassButton";

export default function SearchButton() {
  return (
    <LiquidGlassButton icon={<Search size={20}/>}/>
  );
}