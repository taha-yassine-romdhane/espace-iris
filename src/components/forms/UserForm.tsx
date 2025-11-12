import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Role } from '@prisma/client';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, User, Mail, Phone, Shield, Briefcase, MapPin, Stethoscope } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FormData {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  telephone?: string;
  role: Role;
  isActive: boolean;
  address?: string;
  speciality?: string;
}

interface UserFormProps {
  formData: FormData;
  isEditMode?: boolean;
  onChange: (name: string, value: string | boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const UserForm: React.FC<UserFormProps> = ({
  formData,
  isEditMode = false,
  onChange,
  onSubmit,
  onCancel
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.name, e.target.value);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100/50">
          <TabsTrigger value="general" className="data-[state=active]:bg-white data-[state=active]:text-[#1e3a8a]">
            <User className="w-4 h-4 mr-2" />
            Informations
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-white data-[state=active]:text-[#1e3a8a]">
            <Shield className="w-4 h-4 mr-2" />
            Sécurité
          </TabsTrigger>
          <TabsTrigger value="professional" className="data-[state=active]:bg-white data-[state=active]:text-[#1e3a8a]">
            <Briefcase className="w-4 h-4 mr-2" />
            Professionnel
          </TabsTrigger>
        </TabsList>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto">
            <TabsContent value="general" className="m-0">
              <Card className="border-0 shadow-none">
                <CardHeader className="pb-4 px-6 pt-6">
                  <CardTitle className="text-lg font-semibold text-[#1e3a8a]">
                    Informations Générales
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        Prénom
                      </Label>
                      <Input
                        id="firstName"
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="Entrer le prénom"
                        className="border-gray-200 focus:border-[#1e3a8a] focus:ring-[#1e3a8a]"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        Nom
                      </Label>
                      <Input
                        id="lastName"
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Entrer le nom"
                        className="border-gray-200 focus:border-[#1e3a8a] focus:ring-[#1e3a8a]"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      Adresse Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="exemple@elite-medical.tn"
                      className="border-gray-200 focus:border-[#1e3a8a] focus:ring-[#1e3a8a]"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telephone" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      Téléphone
                    </Label>
                    <Input
                      id="telephone"
                      type="tel"
                      name="telephone"
                      value={formData.telephone || ''}
                      onChange={handleInputChange}
                      placeholder="+216 XX XXX XXX"
                      className="border-gray-200 focus:border-[#1e3a8a] focus:ring-[#1e3a8a]"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="m-0">
              <Card className="border-0 shadow-none">
                <CardHeader className="pb-4 px-6 pt-6">
                  <CardTitle className="text-lg font-semibold text-[#1e3a8a]">
                    Sécurité & Accès
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-400" />
                      {isEditMode ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="••••••••"
                        className="border-gray-200 focus:border-[#1e3a8a] focus:ring-[#1e3a8a] pr-10"
                        required={!isEditMode}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {!isEditMode && (
                      <p className="text-xs text-gray-500 mt-1">
                        Le mot de passe doit contenir au moins 8 caractères
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      Rôle
                    </Label>
                    <Select 
                      name="role" 
                      value={formData.role} 
                      onValueChange={(value) => onChange('role', value)}
                    >
                      <SelectTrigger className="border-gray-200 focus:border-[#1e3a8a] focus:ring-[#1e3a8a]">
                        <SelectValue placeholder="Sélectionner un rôle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            Administrateur
                          </div>
                        </SelectItem>
                        <SelectItem value="MANAGER">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            Manager
                          </div>
                        </SelectItem>
                        <SelectItem value="DOCTOR">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            Médecin
                          </div>
                        </SelectItem>
                        <SelectItem value="EMPLOYEE">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Employé
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                          <Shield className={`w-5 h-5 ${formData.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <Label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                            Compte Actif
                          </Label>
                          <p className="text-xs text-gray-500">
                            {formData.isActive ? 'L\'utilisateur peut se connecter' : 'L\'utilisateur ne peut pas se connecter'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => onChange('isActive', checked)}
                        className="data-[state=checked]:bg-[#1e3a8a]"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="professional" className="m-0">
              <Card className="border-0 shadow-none">
                <CardHeader className="pb-4 px-6 pt-6">
                  <CardTitle className="text-lg font-semibold text-[#1e3a8a]">
                    Informations Professionnelles
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-4">
                  {formData.role === 'DOCTOR' ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="speciality" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-gray-400" />
                          Spécialité
                        </Label>
                        <Input
                          id="speciality"
                          type="text"
                          name="speciality"
                          value={formData.speciality || ''}
                          onChange={handleInputChange}
                          placeholder="Ex: Cardiologie, Neurologie, Pneumologie..."
                          className="border-gray-200 focus:border-[#1e3a8a] focus:ring-[#1e3a8a]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          Adresse du Cabinet
                        </Label>
                        <Input
                          id="address"
                          type="text"
                          name="address"
                          value={formData.address || ''}
                          onChange={handleInputChange}
                          placeholder="Adresse complète du cabinet médical"
                          className="border-gray-200 focus:border-[#1e3a8a] focus:ring-[#1e3a8a]"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">
                        Les informations professionnelles supplémentaires sont disponibles uniquement pour les médecins.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          {/* Footer with buttons - Always visible */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                onClick={onSubmit}
                className="bg-gradient-to-r from-[#1e3a8a] to-blue-700 hover:from-blue-700 hover:to-[#1e3a8a] text-white"
              >
                {isEditMode ? 'Mettre à jour' : 'Créer l\'utilisateur'}
              </Button>
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default UserForm;
