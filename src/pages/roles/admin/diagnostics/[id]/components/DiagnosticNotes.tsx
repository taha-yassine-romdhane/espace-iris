import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Edit, Save, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface DiagnosticNotesProps {
  notes: string | null;
  diagnosticId: string; // Added diagnosticId to allow saving changes
  onNotesUpdated?: (newNotes: string) => void; // Optional callback for when notes are updated
}

export function DiagnosticNotes({ notes, diagnosticId, onNotesUpdated }: DiagnosticNotesProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState(notes || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedNotes(notes || "");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedNotes(notes || "");
  };

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/diagnostics/${diagnosticId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: editedNotes }),
      });

      if (!response.ok) {
        throw new Error('Failed to update notes');
      }

      // Update state with new notes
      if (onNotesUpdated) {
        onNotesUpdated(editedNotes);
      }

      setIsEditing(false);
      toast({
        title: "Succès",
        description: "Les notes ont été mises à jour avec succès",
        variant: "default",
      });
    } catch (error) {
      console.error('Error updating notes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les notes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="bg-gray-50 border-b border-gray-100">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Notes du Diagnostic
          </div>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-blue-600"
              onClick={handleEditClick}
            >
              <Edit className="h-4 w-4 mr-1" />
              Modifier
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {isEditing ? (
          <Textarea
            value={editedNotes}
            onChange={(e) => setEditedNotes(e.target.value)}
            placeholder="Ajouter des notes pour ce diagnostic"
            className="min-h-[150px] w-full p-3"
          />
        ) : notes ? (
          <div className="whitespace-pre-wrap text-gray-700">{notes}</div>
        ) : (
          <div className="text-gray-500 italic">Aucune note disponible pour ce diagnostic</div>
        )}
      </CardContent>
      {isEditing && (
        <CardFooter className="bg-gray-50 border-t border-gray-100 flex justify-end gap-2 p-3">
          <Button
            variant="outline"
            onClick={handleCancelEdit}
            disabled={isSaving}
          >
            <X className="h-4 w-4 mr-1" />
            Annuler
          </Button>
          <Button
            onClick={handleSaveNotes}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="animate-spin mr-1">⟳</span> Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Enregistrer
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export default DiagnosticNotes;
