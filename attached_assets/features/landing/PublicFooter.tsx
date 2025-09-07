
import React from 'react';
import { LogoIcon } from '../../components/icons/Icons';
import { Link } from 'react-router-dom';

const PublicFooter: React.FC = () => {
    return (
        <footer className="bg-secondary-100 border-t border-secondary-200">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left space-y-4 md:space-y-0">
                    <div className="flex items-center space-x-2">
                        <LogoIcon className="h-6 w-6 text-primary" />
                        <span className="text-lg font-bold text-secondary-800">SIRIM</span>
                    </div>
                    <div className="flex space-x-6 text-sm text-secondary-600">
                        <Link to="/precios" className="hover:text-primary">Planes y Precios</Link>
                        <a href="#" className="hover:text-primary">Términos de Servicio</a>
                        <a href="#" className="hover:text-primary">Política de Privacidad</a>
                    </div>
                    <div>
                        <p className="text-sm text-secondary-500">&copy; {new Date().getFullYear()} SIRIM. Todos los derechos reservados.</p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default PublicFooter;
