import React from 'react';
import { LogoIcon, WhatsappIcon, EnvelopeIcon } from '../../components/icons/Icons.tsx';
import { Link } from 'react-router-dom';

const PublicFooter: React.FC = () => {
    return (
        <footer className="bg-secondary-100 border-t border-secondary-200">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="space-y-4">
                        <Link to="/" className="flex items-center space-x-2">
                            <LogoIcon className="h-8 w-8 text-primary" />
                            <span className="text-xl font-bold text-secondary-800">SIRIM</span>
                        </Link>
                        <p className="text-sm text-secondary-600">Simplificando la contabilidad y los impuestos en República Dominicana.</p>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-secondary-900">Navegación</h3>
                        <ul className="mt-4 space-y-2 text-sm">
                            <li><Link to="/precios" className="text-secondary-600 hover:text-primary">Planes y Precios</Link></li>
                            <li><Link to="/registro" className="text-secondary-600 hover:text-primary">Crear Cuenta</Link></li>
                            <li><Link to="/login" className="text-secondary-600 hover:text-primary">Iniciar Sesión</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-secondary-900">Legal</h3>
                        <ul className="mt-4 space-y-2 text-sm">
                            <li><a href="#" className="text-secondary-600 hover:text-primary">Términos de Servicio</a></li>
                            <li><a href="#" className="text-secondary-600 hover:text-primary">Política de Privacidad</a></li>
                        </ul>
                    </div>
                    <div>
                         <h3 className="text-sm font-semibold text-secondary-900">Contacto</h3>
                         <ul className="mt-4 space-y-2 text-sm">
                             <li><a href="https://wa.me/18495642269" target="_blank" rel="noopener noreferrer" className="text-secondary-600 hover:text-primary flex items-center"><WhatsappIcon className="h-5 w-5 mr-2"/> +1 (849) 564-2269</a></li>
                             <li><a href="mailto:Info@sirim.site" className="text-secondary-600 hover:text-primary flex items-center"><EnvelopeIcon className="h-5 w-5 mr-2"/> Info@sirim.site</a></li>
                         </ul>
                    </div>
                </div>
                <div className="mt-12 border-t border-secondary-300 pt-8">
                     <p className="text-sm text-secondary-500 text-center">&copy; {new Date().getFullYear()} SIRIM. Todos los derechos reservados.</p>
                </div>
            </div>
        </footer>
    );
};

export default PublicFooter;