import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import useEmblaCarousel from "embla-carousel-react";
import { useTranslation } from "react-i18next";
import bannerHoliday from "@/assets/promo-banner-holiday.jpg";
import bannerXanhStay from "@/assets/promo-banner-xanhstay.jpg";
import bannerDiscount from "@/assets/promo-banner-discount.jpg";

type PromoBanner = {
  image: string;
  title: string;
  description: string;
  cta: string;
  link: string;
  badge?: string;
  tone: "red" | "green" | "amber";
};

const useBanners = (): PromoBanner[] => {
  const { t } = useTranslation();
  return [
    {
      image: bannerHoliday,
      title: t("promo.holiday.title", "Mừng đại lễ 30/4 & 1/5"),
      description: t(
        "promo.holiday.desc",
        "Chào mừng ngày Giải phóng miền Nam và Quốc tế Lao động — chúc bạn kỳ nghỉ an lành!",
      ),
      cta: t("promo.holiday.cta", "Khám phá ưu đãi"),
      link: "/promotions",
      badge: t("promo.holiday.badge", "Lễ hội"),
      tone: "red",
    },
    {
      image: bannerXanhStay,
      title: t("promo.intro.title", "Chào mừng đến với XanhStay"),
      description: t(
        "promo.intro.desc",
        "Nền tảng tìm phòng & căn hộ cho thuê thông minh, minh bạch, tiện lợi tại Việt Nam.",
      ),
      cta: t("promo.intro.cta", "Tìm hiểu thêm"),
      link: "/policy?tab=about",
      badge: t("promo.intro.badge", "XanhStay"),
      tone: "green",
    },
    {
      image: bannerDiscount,
      title: t("promo.discount.title", "Ưu đãi thuê dài hạn"),
      description: t(
        "promo.discount.desc",
        "Giảm 3% khi thanh toán 6 tháng, giảm 5% khi thanh toán 12 tháng.",
      ),
      cta: t("promo.discount.cta", "Xem phòng khuyến mại"),
      link: "/promotions",
      badge: t("promo.discount.badge", "Khuyến mại"),
      tone: "amber",
    },
  ];
};

const toneClasses: Record<PromoBanner["tone"], string> = {
  red: "bg-red-600 text-white",
  green: "bg-emerald-600 text-white",
  amber: "bg-amber-500 text-white",
};

const BannerCard = ({ b }: { b: PromoBanner }) => (
  <Link
    to={b.link}
    className="group relative rounded-2xl overflow-hidden aspect-[8/3] block border border-border"
  >
    <img
      src={b.image}
      alt={b.title}
      loading="lazy"
      width={1408}
      height={512}
      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
    {b.badge && (
      <span
        className={`absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full ${toneClasses[b.tone]}`}
      >
        {b.badge}
      </span>
    )}
    <div className="absolute bottom-0 left-0 right-0 p-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h3 className="text-xs sm:text-sm font-bold text-white drop-shadow-md whitespace-nowrap">{b.title}</h3>
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-white drop-shadow-sm group-hover:underline shrink-0">
          {b.cta} <ArrowRight size={10} />
        </span>
      </div>
      <p className="text-[10px] sm:text-xs text-white/90 drop-shadow-sm">{b.description}</p>
    </div>
  </Link>
);

export const PromoBannersSection = () => {
  const isMobile = useIsMobile();
  const banners = useBanners();
  const { t } = useTranslation();

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-bold">
          {t("promo.sectionTitle", "Khuyến mại & Sự kiện")}
        </h2>
      </div>
      {isMobile ? (
        <MobileCarousel banners={banners} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {banners.map((b, i) => (
            <BannerCard key={i} b={b} />
          ))}
        </div>
      )}
    </section>
  );
};

const MobileCarousel = ({ banners }: { banners: PromoBanner[] }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    const timer = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [emblaApi]);

  return (
    <div>
      <div ref={emblaRef} className="overflow-hidden rounded-2xl">
        <div className="flex">
          {banners.map((b, i) => (
            <div key={i} className="flex-[0_0_100%] min-w-0">
              <BannerCard b={b} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-center gap-1.5 mt-3">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2 rounded-full transition-all ${
              i === selectedIndex ? "bg-primary w-5" : "bg-muted-foreground/30 w-2"
            }`}
          />
        ))}
      </div>
    </div>
  );
};
