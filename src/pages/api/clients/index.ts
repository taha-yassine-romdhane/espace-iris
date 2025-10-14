import prisma from "@/lib/db";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { type } = req.query;

    if (type === "patient") {
      const patients = await prisma.patient.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          diagnostics: {
            select: {
              id: true,
              createdAt: true,
              result: {
                select: {
                  id: true,
                  status: true
                }
              }
            },
            where: {
              result: {
                status: "PENDING" // Only include diagnostics with PENDING status
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1 // Only need the most recent ongoing diagnostic
          }
        },
        orderBy: {
          lastName: "asc",
        },
      });

      return res.status(200).json(
        patients.map((patient) => ({
          id: patient.id,
          name: `${patient.lastName} ${patient.firstName}`,
          hasOngoingDiagnostic: patient.diagnostics && patient.diagnostics.length > 0,
          ongoingDiagnosticId: patient.diagnostics && patient.diagnostics.length > 0 ? patient.diagnostics[0].id : null,
        }))
      );
    } else if (type === "societe") {
      const companies = await prisma.company.findMany({
        select: {
          id: true,
          companyName: true,
        },
        orderBy: {
          companyName: "asc",
        },
      });

      return res.status(200).json(
        companies.map((company) => ({
          id: company.id,
          name: company.companyName,
        }))
      );
    }

    return res.status(400).json({ message: "Invalid client type" });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
