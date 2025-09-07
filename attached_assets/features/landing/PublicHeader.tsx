
import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LogoIcon } from '../../components/icons/Icons';
import Button from '../../components/ui/Button';

const PublicHeader: React.FC = () => {
    return (
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-secondary-200">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link to="/" className="flex items-center space-x-2">
                        <LogoIcon className="h-8 w-8 text-primary" />
                        <span className="text-2xl font-bold text-secondary-800">SIRIM</span>
                    </Link>
                    <nav className="hidden md:flex items-center space-x-8">
                        <NavLink to="/precios" className={({ isActive }) => `text-sm font-medium ${isActive ? 'text-primary' : 'text-secondary-600'} hover:text-primary transition-colors`}>
                            Planes y Precios
                        </NavLink>
                    </nav>
                    <div className="flex items-center space-x-4">
                         <Link to="/login" className="text-sm font-medium text-secondary-600 hover:text-primary transition-colors">
                            Iniciar Sesión
                        </Link>
                        <Link to="/registro">
                            <Button>Prueba gratis</Button>
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default PublicHeader;
