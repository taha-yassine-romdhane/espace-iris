import React from 'react';
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Pencil, Trash2, User as UserIcon, Mail, Phone, Shield } from "lucide-react";
import { User } from "../index";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const columns = (
  handleEdit: (user: User) => void,
  handleDelete: (id: string) => void
): ColumnDef<User>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold text-gray-700 hover:text-blue-600"
        >
          <UserIcon className="mr-2 h-4 w-4" />
          Nom
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-gray-900">{user.name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <div className="flex items-center gap-2 font-semibold text-gray-700">
        <Mail className="h-4 w-4" />
        Email
      </div>
    ),
    cell: ({ row }) => {
      const user = row.original;
      return (
        <a href={`mailto:${user.email}`} className="text-blue-600 hover:text-blue-800 hover:underline">
          {user.email}
        </a>
      );
    },
  },
  {
    accessorKey: "telephone",
    header: ({ column }) => (
      <div className="flex items-center gap-2 font-semibold text-gray-700">
        <Phone className="h-4 w-4" />
        Téléphone
      </div>
    ),
    cell: ({ row }) => {
      const user = row.original;
      return user.telephone ? (
        <span className="text-gray-700">{user.telephone}</span>
      ) : (
        <span className="text-gray-400 italic">Non renseigné</span>
      );
    },
  },
  {
    accessorKey: "role",
    header: ({ column }) => (
      <div className="flex items-center gap-2 font-semibold text-gray-700">
        <Shield className="h-4 w-4" />
        Rôle
      </div>
    ),
    cell: ({ row }) => {
      const user = row.original;
      const roleColors = {
        ADMIN: 'bg-blue-600 text-white',
        MANAGER: 'bg-purple-600 text-white',
        DOCTOR: 'bg-red-600 text-white',
        EMPLOYEE: 'bg-green-600 text-white',
      };
      const roleLabels = {
        ADMIN: 'Admin',
        MANAGER: 'Manager',
        DOCTOR: 'Docteur',
        EMPLOYEE: 'Employé',
      };
      return (
        <Badge 
          className={`font-medium ${roleColors[user.role as keyof typeof roleColors] || 'bg-gray-600 text-white'}`}
        >
          {roleLabels[user.role as keyof typeof roleLabels] || user.role}
        </Badge>
      );
    },
  },
  {
    accessorKey: "isActive",
    header: "Statut",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex items-center">
          <div className={`h-2 w-2 rounded-full mr-2 ${user.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
          <Badge
            variant={user.isActive ? "default" : "secondary"}
            className={user.isActive 
              ? "bg-green-100 text-green-700 border-green-200" 
              : "bg-gray-100 text-gray-600 border-gray-200"}
          >
            {user.isActive ? 'Actif' : 'Inactif'}
          </Badge>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <TooltipProvider>
          <div className="flex items-center justify-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(user)}
                  className="h-8 w-8 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Modifier l'utilisateur</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(user.id)}
                  className="h-8 w-8 hover:bg-red-100 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Supprimer l'utilisateur</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      );
    },
  },
];

// This is not a page, but Next.js requires a default export
// for any file in the pages directory.
const ColumnsPage = () => null;
export default ColumnsPage;
