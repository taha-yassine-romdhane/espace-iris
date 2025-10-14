import React from "react";
import Link from "next/link";
import { 
  Heart, 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Instagram,
  Stethoscope,
  Shield,
  Clock,
  Award,
  Code
} from "lucide-react";

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-12">
          {/* Company Info */}
          <div className="lg:col-span-1">
            {/* Partnership Branding */}
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-3">
                <Code className="w-8 h-8 text-gray-300" />
                <div className="text-white/80">
                  <div className="text-lg font-bold">
                    <span className="text-white">cubix</span>
                    <span className="text-blue-400">.</span>
                  </div>
                  <div className="text-xs text-blue-300">Technology Partner</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Stethoscope className="w-8 h-8 text-purple-300" />
                <div className="text-white/80">
                  <div className="text-sm font-bold">Iris Medical Services</div>
                  <div className="text-xs text-purple-300">Medical Partner</div>
                </div>
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed mb-6">
              Partenariat stratégique entre cubix. et Iris Medical Services pour développer 
              la solution de référence en Tunisie pour la gestion des appareils médicaux.
            </p>
            
            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">RGPD Compliant</span>
              </div>
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-300">ISO 27001</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-300">Support 24/7</span>
              </div>
              <div className="flex items-center space-x-2">
                <Stethoscope className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-300">Certifié Médical</span>
              </div>
            </div>
          </div>

          {/* Solutions */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Solutions</h3>
            <ul className="space-y-3">
              <li><Link href="#features" className="text-gray-300 hover:text-white transition-colors">Gestion Patients</Link></li>
              <li><Link href="#features" className="text-gray-300 hover:text-white transition-colors">Appareils CPAP/VNI</Link></li>
              <li><Link href="#features" className="text-gray-300 hover:text-white transition-colors">Paiements CNAM</Link></li>
              <li><Link href="#features" className="text-gray-300 hover:text-white transition-colors">Analytics & Rapports</Link></li>
              <li><Link href="#features" className="text-gray-300 hover:text-white transition-colors">Gestion Commerciale</Link></li>
              <li><Link href="#features" className="text-gray-300 hover:text-white transition-colors">API & Intégrations</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Ressources</h3>
            <ul className="space-y-3">
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors">Documentation</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors">Guide d'utilisation</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors">Formation</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors">Webinaires</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="#" className="text-gray-300 hover:text-white transition-colors">Centre d'aide</Link></li>
            </ul>
          </div>

          {/* Contact & Social */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Contact</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                <div className="text-gray-300">
                  <div>Avenue Habib Bourguiba</div>
                  <div>Tunis, Tunisie</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-gray-300">+216 71 123 456</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-purple-400 flex-shrink-0" />
                <span className="text-gray-300">contact@espace-elite.tn</span>
              </div>
            </div>

            {/* Social Media */}
            <div className="mt-8">
              <h4 className="font-semibold mb-4">Suivez-nous</h4>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-blue-400 transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <Heart className="h-4 w-4 text-red-400" />
              <span className="text-gray-400">
                © {currentYear} cubix. × Iris Medical Services. Tous droits réservés. Fait avec passion à Tunis.
              </span>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-end space-x-6 text-sm">
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                Politique de confidentialité
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                Conditions d'utilisation
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                Mentions légales
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                Cookies
              </Link>
            </div>
          </div>
          
          {/* Additional Trust Line */}
          <div className="mt-4 pt-4 border-t border-gray-800 text-center">
            <p className="text-xs text-gray-500">
              Solution certifiée pour la gestion médicale • Hébergement sécurisé en Tunisie • Conformité RGPD garantie
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
