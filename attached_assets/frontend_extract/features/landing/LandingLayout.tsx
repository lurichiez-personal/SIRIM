
import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';

const LandingLayout: React.FC = () => {
    return (
        <div className="flex flex-col min-h-screen bg-white font-sans">
            <PublicHeader />
            <main className="flex-grow">
                <Outlet />
            </main>
            <PublicFooter />
        </div>
    );
};

export default LandingLayout;
