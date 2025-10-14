"use client";

import React from 'react';
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";

export type Diagnostic = {
  id: string;
  client: string;
  device: string;
  status: 'PENDING' | 'COMPLETED' | 'FOLLOW-UP-REQUIRED';
  createdAt: string;
  resultDate?: string;
  hasResult: boolean;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return <Badge variant="success">Complété</Badge>;
    case 'PENDING':
      return <Badge variant="secondary">En attente</Badge>;
    case 'FOLLOW-UP-REQUIRED':
        return <Badge variant="warning">Suivi requis</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

export const columns: ColumnDef<Diagnostic>[] = [
  {
    accessorKey: "client",
    header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Patient/Client
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
    },
  },
  {
    accessorKey: "device",
    header: "Appareil",
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) => getStatusBadge(row.original.status),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Date de création
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
    },
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
  {
    accessorKey: "resultDate",
    header: "Date des résultats",
    cell: ({ row }) => row.original.resultDate ? new Date(row.original.resultDate).toLocaleDateString() : 'N/A',
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const diagnostic = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/roles/employee/diagnostics/${diagnostic.id}`}>Voir les détails</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

// This is not a page, but Next.js requires a default export
// for any file in the pages directory.
const ColumnsPage = () => null;
export default ColumnsPage;