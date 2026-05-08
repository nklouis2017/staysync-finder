import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Heart, Building2, MapPin, BadgePercent } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const navItems = [
  { to: '/', icon: Home, labelKey: 'nav.home' },
  { to: '/search', icon: Search, labelKey: 'nav.search' },
  { to: '/search/map', icon: MapPin, labelKey: 'nav.map' },
  { to: '/promotions', icon: BadgePercent, labelKey: 'nav.promotions', defaultLabel: 'Ưu đãi' },
  { to: '/saved', icon: Heart, labelKey: 'nav.saved' },
  { to: '/policy?tab=about', icon: Building2, labelKey: 'nav.about' },
];

export const MobileBottomNav = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const isActive = (to: string) => {
    if (to.includes('?')) {
      return location.pathname + location.search === to || location.pathname === to.split('?')[0];
    }
    return location.pathname === to;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon size={18} />
              <span className="text-[10px] font-medium leading-tight">{t(item.labelKey, item.defaultLabel ?? '')}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
