import { Diagnostic } from "./Diagnostic";

export interface DiagnosticResult {
    id: string;
    iah: number;
    idValue: number;
    remarque: string;
    status: string;
    diagnosticId: string;
    diagnostic: Diagnostic;
    createdAt: Date;
    updatedAt: Date;
}