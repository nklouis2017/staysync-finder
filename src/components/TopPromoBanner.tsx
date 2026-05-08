import { useState, useEffect, useRef } from "react";
import { X, Megaphone } from "lucide-react";

const promoMessages = [
  "🎉 Chào mừng đại lễ 30/04 và Quốc tế lao động 01/05!",
  "📱 Tải app XanhStay để nhận thông báo phòng mới ngay lập tức!",
  "🏠 Đăng phòng miễn phí trên XanhStay — Tiếp cận hàng nghìn người thuê!",
];

export const TopPromoBanner = () => {
  const [visible, setVisible] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  // Set CSS variable for banner height so Navbar can offset itself
  useEffect(() => {
    const update = () => {
      const h = visible && ref.current ? ref.current.offsetHeight : 0;
      document.documentElement.style.setProperty("--promo-banner-height", `${h}px`);
    };
    update();
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      document.documentElement.style.setProperty("--promo-banner-height", "0px");
    };
  }, [visible]);

  if (!visible) return null;

  // Duplicate messages for seamless loop
  const marqueeText = promoMessages.join("     ·     ");

  return (
    <div
      ref={ref}
      className="fixed top-0 left-0 right-0 z-[60] bg-primary text-primary-foreground text-xs sm:text-sm overflow-hidden"
    >
      <div className="flex items-center py-2 px-2">
        <Megaphone size={14} className="shrink-0 opacity-80 ml-2 mr-2" />
        <div className="flex-1 overflow-hidden relative">
          <div className="animate-marquee-promo whitespace-nowrap inline-block" style={{ animationDuration: "50s" }}>
            <span className="font-medium">{marqueeText}</span>
            <span className="font-medium ml-16">{marqueeText}</span>
          </div>
        </div>
        <button
          onClick={() => setVisible(true)}
          className="shrink-0 ml-2 mr-1 p-0.5 rounded hover:bg-primary-foreground/20 transition-colors"
          aria-label="Đóng"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
