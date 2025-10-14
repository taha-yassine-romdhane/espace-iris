import React from 'react';
import { User, Patient, Company } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { 
  UsersIcon, 
  ExternalLinkIcon 
} from 'lucide-react';

interface UserRelationsProps {
  user: User & {
    assignedPatients?: Patient[];
    assignedCompanies?: Company[];
    technicianPatients?: Patient[];
    technicianCompanies?: Company[];
  };
}

export const UserRelations: React.FC<UserRelationsProps> = ({ user }) => {
  const hasAssignedPatients = user.assignedPatients && user.assignedPatients.length > 0;
  const hasAssignedCompanies = user.assignedCompanies && user.assignedCompanies.length > 0;
  const hasTechnicianPatients = user.technicianPatients && user.technicianPatients.length > 0;
  const hasTechnicianCompanies = user.technicianCompanies && user.technicianCompanies.length > 0;
  
  const hasAnyRelations = hasAssignedPatients || hasAssignedCompanies || 
                          hasTechnicianPatients || hasTechnicianCompanies;

  if (!hasAnyRelations) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <UsersIcon className="mr-2 h-5 w-5" />
            Relations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aucune relation assignée à cet utilisateur.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <UsersIcon className="mr-2 h-5 w-5" />
          Relations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="patients">
          <TabsList className="mb-4">
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="companies">Sociétés</TabsTrigger>
          </TabsList>
          
          <TabsContent value="patients">
            {(hasAssignedPatients || hasTechnicianPatients) ? (
              <div className="space-y-6">
                {hasAssignedPatients && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Patients assignés</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Téléphone</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {user.assignedPatients?.map((patient) => (
                          <TableRow key={patient.id}>
                            <TableCell>
                              {patient.firstName} {patient.lastName}
                            </TableCell>
                            <TableCell>{patient.telephone || 'Non spécifié'}</TableCell>
                            <TableCell>
                              <Badge variant={'default'}>
                                Actif
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Link 
                                href={`/roles/admin/renseignement/patient/${patient.id}`}
                                className="flex items-center text-blue-600 hover:underline"
                              >
                                Voir <ExternalLinkIcon className="ml-1 h-3 w-3" />
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                {hasTechnicianPatients && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Patients technicien</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Téléphone</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {user.technicianPatients?.map((patient) => (
                          <TableRow key={patient.id}>
                            <TableCell>
                              {patient.firstName} {patient.lastName}
                            </TableCell>
                            <TableCell>{patient.telephone || 'Non spécifié'}</TableCell>
                            <TableCell>
                              <Badge variant={'default'}>
                                Actif
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Link 
                                href={`/roles/admin/renseignement/patient/${patient.id}`}
                                className="flex items-center text-blue-600 hover:underline"
                              >
                                Voir <ExternalLinkIcon className="ml-1 h-3 w-3" />
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Aucun patient assigné à cet utilisateur.</p>
            )}
          </TabsContent>
          
          <TabsContent value="companies">
            {(hasAssignedCompanies || hasTechnicianCompanies) ? (
              <div className="space-y-6">
                {hasAssignedCompanies && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Sociétés assignées</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {user.assignedCompanies?.map((company) => (
                          <TableRow key={company.id}>
                            <TableCell className="font-medium">{company.companyName}</TableCell>
                            <TableCell>{company.companyName.split(' ')[0]}</TableCell>
                            <TableCell>
                              <Badge variant={'default'}>
                                Active
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Link 
                                href={`/roles/admin/renseignement/societe/${company.id}`}
                                className="flex items-center text-blue-600 hover:underline"
                              >
                                Voir <ExternalLinkIcon className="ml-1 h-3 w-3" />
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                {hasTechnicianCompanies && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Sociétés technicien</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {user.technicianCompanies?.map((company) => (
                          <TableRow key={company.id}>
                            <TableCell className="font-medium">{company.companyName}</TableCell>
                            <TableCell>{company.companyName.split(' ')[0]}</TableCell>
                            <TableCell>
                              <Badge variant={'default'}>
                                Active
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Link 
                                href={`/roles/admin/renseignement/societe/${company.id}`}
                                className="flex items-center text-blue-600 hover:underline"
                              >
                                Voir <ExternalLinkIcon className="ml-1 h-3 w-3" />
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Aucune société assignée à cet utilisateur.</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
