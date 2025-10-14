import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Stethoscope, Monitor, Syringe, Wrench, MapPin } from "lucide-react";

interface TabSwitcherProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="medical-devices">
          <Stethoscope className="inline-block mr-2 h-4 w-4" /> Appareils Médicaux
        </TabsTrigger>
        <TabsTrigger value="diagnostic-devices">
          <Monitor className="inline-block mr-2 h-4 w-4" /> Équipements Diagnostic
        </TabsTrigger>
        <TabsTrigger value="accessories">
          <Syringe className="inline-block mr-2 h-4 w-4" /> Accessoires
        </TabsTrigger>
        <TabsTrigger value="spare-parts">
          <Wrench className="inline-block mr-2 h-4 w-4" /> Pièces de Rechange
        </TabsTrigger>
        <TabsTrigger value="locations">
          <MapPin className="inline-block mr-2 h-4 w-4" /> Emplacements
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

export default TabSwitcher;