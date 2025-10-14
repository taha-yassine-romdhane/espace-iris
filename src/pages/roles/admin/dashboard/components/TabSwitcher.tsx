import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Stethoscope, ShoppingCart, Building2 } from "lucide-react";

interface TabSwitcherProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  return (
    <div className="flex space-x-2 mb-6 border-b border-gray-200 bg-white rounded-t-xl p-2">
      <Button
        variant={activeTab === "appointments" ? "default" : "ghost"}
        className={`${
          activeTab === "appointments"
            ? "bg-blue-100 text-[#1e3a8a] hover:bg-blue-200"
            : "text-gray-600 hover:text-[#1e3a8a] hover:bg-gray-50"
        } rounded-lg border-2 ${
          activeTab === "appointments" ? "border-[#1e3a8a] shadow-sm" : "border-transparent"
        } px-4 py-2 transition-all duration-200`}
        onClick={() => onTabChange("appointments")}
      >
        <Calendar className="h-4 w-4 mr-2" />
        Rendez-vous
      </Button>
      
      <Button
        variant={activeTab === "diagnostics" ? "default" : "ghost"}
        className={`${
          activeTab === "diagnostics"
            ? "bg-blue-100 text-[#1e3a8a] hover:bg-blue-200"
            : "text-gray-600 hover:text-[#1e3a8a] hover:bg-gray-50"
        } rounded-lg border-2 ${
          activeTab === "diagnostics" ? "border-[#1e3a8a] shadow-sm" : "border-transparent"
        } px-4 py-2 transition-all duration-200`}
        onClick={() => onTabChange("diagnostics")}
      >
        <Stethoscope className="h-4 w-4 mr-2" />
        Diagnostics
      </Button>
      
      <Button
        variant={activeTab === "sales" ? "default" : "ghost"}
        className={`${
          activeTab === "sales"
            ? "bg-blue-100 text-[#1e3a8a] hover:bg-blue-200"
            : "text-gray-600 hover:text-[#1e3a8a] hover:bg-gray-50"
        } rounded-lg border-2 ${
          activeTab === "sales" ? "border-[#1e3a8a] shadow-sm" : "border-transparent"
        } px-4 py-2 transition-all duration-200`}
        onClick={() => onTabChange("sales")}
      >
        <ShoppingCart className="h-4 w-4 mr-2" />
        Ventes
      </Button>
      
      <Button
        variant={activeTab === "rentals" ? "default" : "ghost"}
        className={`${
          activeTab === "rentals"
            ? "bg-blue-100 text-[#1e3a8a] hover:bg-blue-200"
            : "text-gray-600 hover:text-[#1e3a8a] hover:bg-gray-50"
        } rounded-lg border-2 ${
          activeTab === "rentals" ? "border-[#1e3a8a] shadow-sm" : "border-transparent"
        } px-4 py-2 transition-all duration-200`}
        onClick={() => onTabChange("rentals")}
      >
        <Building2 className="h-4 w-4 mr-2" />
        Locations
      </Button>
    </div>
  );
}

export default TabSwitcher;
