import React from 'react';
import { logoutUser } from '../utils';

const LogoutButton: React.FC = () => {
  return (
    <button
      onClick={logoutUser}
      className="flex items-center gap-2 text-slate-500 hover:text-red-600 font-bold text-xs md:text-sm px-3 py-2 transition-colors"
      title="Sair / Trocar Usuário"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      <span className="hidden md:inline">Trocar Usuário</span>
    </button>
  );
};

export default LogoutButton;