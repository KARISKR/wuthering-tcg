/**
 * [메뉴 최적화 2026-11] 덱 화면 공통 탭.
 *
 * "마이 덱"(덱 빌더 목록), "덱 프리셋 & 코드 보관함", "공유된 덱 리스트"가 서로 다른 메뉴로 흩어져 있어
 * 어디서 무엇을 하는지 헷갈렸다. 세 화면 맨 위에 같은 탭 줄을 두어 한 곳처럼 오가게 한다.
 * 화면 자체는 그대로 두고, 탭을 누르면 각 화면을 연 쪽(로비 또는 덱 빌더)이 전환을 처리한다.
 */
import React from 'react';
import { Layers, BookmarkCheck, Share2 } from 'lucide-react';

export type DeckHubTab = 'mine' | 'preset' | 'shared';

const TABS: { id: DeckHubTab; label: string; short: string; Icon: typeof Layers }[] = [
  { id: 'mine', label: '내 덱', short: '내 덱', Icon: Layers },
  { id: 'preset', label: '추천 덱 · 덱 코드', short: '추천 덱', Icon: BookmarkCheck },
  { id: 'shared', label: '공유 덱', short: '공유 덱', Icon: Share2 },
];

interface DeckHubTabsProps {
  active: DeckHubTab;
  onSwitch: (tab: DeckHubTab) => void;
  className?: string;
}

export const DeckHubTabs: React.FC<DeckHubTabsProps> = ({ active, onSwitch, className = '' }) => (
  <nav
    aria-label="덱 메뉴"
    className={`relative z-20 shrink-0 w-full px-3 sm:px-6 py-2 border-b border-white/[0.08] bg-[#080b14]/90 backdrop-blur-md ${className}`}
  >
    <div className="flex items-center gap-1.5 sm:gap-2 max-w-[1600px] mx-auto">
      {TABS.map(({ id, label, short, Icon }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            type="button"
            onClick={() => !isActive && onSwitch(id)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex-1 sm:flex-initial h-10 px-3 sm:px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm font-black whitespace-nowrap transition cursor-pointer border ${
              isActive
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-slate-900/80 text-slate-300 border-slate-700/70 hover:text-white hover:border-amber-400/60'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="sm:hidden">{short}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);

export default DeckHubTabs;
