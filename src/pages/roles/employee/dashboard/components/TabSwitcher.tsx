import React from "react";
import { Button } from "@/components/ui/button";
import { Stethoscope, Building2, ShoppingCart, Calendar } from "lucide-react";

interface TabSwitcherProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  return (
    <div className="mb-6 border-b border-gray-200 bg-white rounded-t-xl p-2">
      {/* Desktop/Tablet Layout */}
      <div className="hidden sm:flex space-x-2">
        <Button
          variant={activeTab === "appointments" ? "default" : "ghost"}
          className={`${
            activeTab === "appointments"
              ? "bg-green-100 text-green-800 hover:bg-green-200"
              : "text-gray-600 hover:text-green-800 hover:bg-gray-50"
          } rounded-lg border-2 ${
            activeTab === "appointments" ? "border-green-800 shadow-sm" : "border-transparent"
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
              ? "bg-green-100 text-green-800 hover:bg-green-200"
              : "text-gray-600 hover:text-green-800 hover:bg-gray-50"
          } rounded-lg border-2 ${
            activeTab === "diagnostics" ? "border-green-800 shadow-sm" : "border-transparent"
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
              ? "bg-green-100 text-green-800 hover:bg-green-200"
              : "text-gray-600 hover:text-green-800 hover:bg-gray-50"
          } rounded-lg border-2 ${
            activeTab === "sales" ? "border-green-800 shadow-sm" : "border-transparent"
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
              ? "bg-green-100 text-green-800 hover:bg-green-200"
              : "text-gray-600 hover:text-green-800 hover:bg-gray-50"
          } rounded-lg border-2 ${
            activeTab === "rentals" ? "border-green-800 shadow-sm" : "border-transparent"
          } px-4 py-2 transition-all duration-200`}
          onClick={() => onTabChange("rentals")}
        >
          <Building2 className="h-4 w-4 mr-2" />
          Locations
        </Button>
      </div>

      {/* Mobile Layout - Grid */}
      <div className="grid grid-cols-2 gap-2 sm:hidden">
        <Button
          variant={activeTab === "appointments" ? "default" : "ghost"}
          className={`${
            activeTab === "appointments"
              ? "bg-green-100 text-green-800 hover:bg-green-200"
              : "text-gray-600 hover:text-green-800 hover:bg-gray-50"
          } rounded-lg border-2 ${
            activeTab === "appointments" ? "border-green-800 shadow-sm" : "border-transparent"
          } px-3 py-2 transition-all duration-200 text-sm flex items-center justify-center`}
          onClick={() => onTabChange("appointments")}
        >
          <Calendar className="h-4 w-4 mr-1" />
          <span className="truncate">RDV</span>
        </Button>

        <Button
          variant={activeTab === "diagnostics" ? "default" : "ghost"}
          className={`${
            activeTab === "diagnostics"
              ? "bg-green-100 text-green-800 hover:bg-green-200"
              : "text-gray-600 hover:text-green-800 hover:bg-gray-50"
          } rounded-lg border-2 ${
            activeTab === "diagnostics" ? "border-green-800 shadow-sm" : "border-transparent"
          } px-3 py-2 transition-all duration-200 text-sm flex items-center justify-center`}
          onClick={() => onTabChange("diagnostics")}
        >
          <Stethoscope className="h-4 w-4 mr-1" />
          <span className="truncate">Diagnostics</span>
        </Button>
        
        <Button
          variant={activeTab === "sales" ? "default" : "ghost"}
          className={`${
            activeTab === "sales"
              ? "bg-green-100 text-green-800 hover:bg-green-200"
              : "text-gray-600 hover:text-green-800 hover:bg-gray-50"
          } rounded-lg border-2 ${
            activeTab === "sales" ? "border-green-800 shadow-sm" : "border-transparent"
          } px-3 py-2 transition-all duration-200 text-sm flex items-center justify-center`}
          onClick={() => onTabChange("sales")}
        >
          <ShoppingCart className="h-4 w-4 mr-1" />
          <span className="truncate">Ventes</span>
        </Button>
        
        <Button
          variant={activeTab === "rentals" ? "default" : "ghost"}
          className={`${
            activeTab === "rentals"
              ? "bg-green-100 text-green-800 hover:bg-green-200"
              : "text-gray-600 hover:text-green-800 hover:bg-gray-50"
          } rounded-lg border-2 ${
            activeTab === "rentals" ? "border-green-800 shadow-sm" : "border-transparent"
          } px-3 py-2 transition-all duration-200 text-sm flex items-center justify-center`}
          onClick={() => onTabChange("rentals")}
        >
          <Building2 className="h-4 w-4 mr-1" />
          <span className="truncate">Locations</span>
        </Button>
      </div>
    </div>
  );
}

export default TabSwitcher;
