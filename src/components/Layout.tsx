import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AlertTriangle, Search, BookOpen } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="flex bg-[#1a1a2e] h-screen w-screen overflow-hidden text-gray-100 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#12121a] border-r border-[#2a2a35] flex flex-col shrink-0">
        <div className="h-16 flex items-center px-5 border-b border-[#2a2a35] gap-3">
          <img src="/oscar-logo.png" alt="OSCAR Logo" className="w-8 h-8 shrink-0" />
          <div className="leading-tight">
            <span className="font-bold text-sm tracking-tight text-gray-100 block">OSCAR</span>
            <span className="text-[10px] text-gray-500 tracking-wide block">Dependency Graph Observatory</span>
          </div>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2">
          <NavLink 
            to="/" 
            className={() => {
              const isActive = location.pathname === '/' || location.pathname.startsWith('/package/');
              return `flex items-center px-4 py-3 rounded-md transition-colors ${
                isActive ? 'bg-indigo-900/30 text-indigo-400 font-medium' : 'text-gray-500 hover:bg-[#2a2a35]'
              }`;
            }}
          >
            <Search className="w-5 h-5 mr-3" />
            Explore
          </NavLink>
          
          <NavLink 
            to="/analytics" 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-md transition-colors ${
                isActive ? 'bg-indigo-900/30 text-indigo-400 font-medium' : 'text-gray-500 hover:bg-[#2a2a35]'
              }`
            }
          >
            <AlertTriangle className="w-5 h-5 mr-3" />
            Ecosystem Risks
          </NavLink>

          <div className="border-t border-[#2a2a35] my-3" />

          <NavLink 
            to="/glossary" 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-md transition-colors ${
                isActive ? 'bg-indigo-900/30 text-indigo-400 font-medium' : 'text-gray-500 hover:bg-[#2a2a35]'
              }`
            }
          >
            <BookOpen className="w-5 h-5 mr-3" />
            Reference
          </NavLink>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {children}
      </main>
    </div>
  );
}
