import { ReactNode } from 'react';
import { Lock, ChevronLeft, ChevronRight, RotateCw, Share, Star, MoreHorizontal, Plus, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export type SimulationTab = 'home' | 'decisions';

interface SimulationShellProps {
  activeTab: SimulationTab;
  onTabChange: (tab: SimulationTab) => void;
  homeContent: ReactNode;
  decisionsContent: ReactNode;
}

export function SimulationShell({
  activeTab,
  onTabChange,
  homeContent,
  decisionsContent,
}: SimulationShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-6 px-4 md:py-10 md:px-8">
      {/* Browser window container */}
      <div className="max-w-7xl mx-auto">
        <div 
          className="relative bg-white dark:bg-slate-900 rounded-xl overflow-hidden"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            height: 'calc(100vh - 80px)',
            minHeight: '650px',
            maxHeight: '900px',
          }}
        >
          {/* ========== BROWSER CHROME ========== */}
          
          {/* Title bar / Tab bar (Chrome-style) */}
          <div className="bg-[#dee1e6] dark:bg-[#202124] flex items-center h-9 px-2 gap-2">
            {/* Window controls (traffic lights) */}
            <div className="flex items-center gap-2 pl-1">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff5f57]/80 cursor-pointer flex items-center justify-center group">
                <X className="w-2 h-2 text-[#4a0002] opacity-0 group-hover:opacity-100" strokeWidth={3} />
              </div>
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:bg-[#ffbd2e]/80 cursor-pointer" />
              <div className="w-3 h-3 rounded-full bg-[#28c940] hover:bg-[#28c940]/80 cursor-pointer" />
            </div>
            
            {/* Browser tab */}
            <div className="flex items-center ml-4">
              <div className="flex items-center gap-2 bg-white dark:bg-[#35363a] px-4 py-1.5 rounded-t-lg min-w-[200px] max-w-[280px]">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[8px] font-bold">
                  L
                </div>
                <span className="text-xs text-slate-700 dark:text-slate-200 truncate flex-1">
                  LumbarPro Marketing Simulator
                </span>
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-pointer" />
              </div>
              <button className="p-1.5 hover:bg-slate-400/20 rounded ml-1">
                <Plus className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          </div>
          
          {/* Address bar / Navigation bar */}
          <div className="bg-white dark:bg-[#35363a] border-b border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center gap-2">
            {/* Navigation buttons */}
            <div className="flex items-center gap-0.5">
              <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-slate-400">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-slate-400">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-slate-500 ml-1">
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
            
            {/* Address bar */}
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#202124] px-4 py-1.5 rounded-full text-sm w-full max-w-xl">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-600 dark:text-slate-300 select-all">
                  https://lumbar-pro-simulator.app
                </span>
              </div>
            </div>
            
            {/* Right side actions */}
            <div className="flex items-center gap-0.5">
              <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-slate-400">
                <Share className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-slate-400">
                <Star className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-slate-400">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* ========== WEBPAGE CONTENT (inside browser) ========== */}
          <ScrollArea 
            className="bg-slate-50 dark:bg-slate-950"
            style={{
              height: 'calc(100% - 85px)',
            }}
          >
            {/* Website header/navigation - styled as a webpage header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
              <div className="max-w-6xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                  {/* Logo */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      L
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-slate-900 dark:text-white">LumbarPro</h1>
                      <p className="text-xs text-slate-500">Marketing Simulator</p>
                    </div>
                  </div>
                  
                  {/* Website navigation (NOT browser tabs) */}
                  <nav className="flex items-center gap-1">
                    <button
                      onClick={() => onTabChange('home')}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        activeTab === 'home'
                          ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}
                    >
                      Home
                    </button>
                    <button
                      onClick={() => onTabChange('decisions')}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        activeTab === 'decisions'
                          ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}
                    >
                      My Decisions
                    </button>
                  </nav>
                </div>
              </div>
            </header>
            
            {/* Page content */}
            <main className="max-w-6xl mx-auto px-6 py-8">
              {activeTab === 'home' && homeContent}
              {activeTab === 'decisions' && decisionsContent}
            </main>
            
            {/* Website footer */}
            <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-8">
              <div className="max-w-6xl mx-auto px-6 py-4">
                <p className="text-xs text-slate-500 text-center">
                  © 2024 LumbarPro Learning Platform • Educational Marketing Simulation
                </p>
              </div>
            </footer>
          </ScrollArea>
        </div>
        
        {/* Caption outside browser (the "real" page) */}
        <p className="text-center text-xs text-slate-500 mt-4">
          ↑ Interactive simulation preview
        </p>
      </div>
    </div>
  );
}
