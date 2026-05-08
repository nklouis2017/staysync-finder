import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { httpRequest } from "@/services/index";
import provinceService, { ProvinceItem, WardItem, formatLocationLabel } from "@/services/province.service";
import apartmentTypeService, { ApartmentTypeItem } from "@/services/apartmentType.service";
import { filterPrices, filterApartmentSizes } from "@/lib/filter-options";
import { GeoBounds } from "@/lib/geocoding";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSelectedProvince } from "@/hooks/useSelectedProvince";
import { getProvinceBias } from "@/lib/province-geo";

import heroBanner1 from "@/assets/hero-banner-1.jpg";
import heroBanner3 from "@/assets/hero-banner-3.jpg";

const bannerImages = [heroBanner1, heroBanner3];

export const HeroSearch = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { provinceCode, provinceName } = useSelectedProvince();
  const bias = getProvinceBias(provinceCode);
  const [searchKeyword, setSearchKeyword] = useState("");
  // Bounds chỉ được set khi user chọn 1 gợi ý từ Nominatim → mới truyền lat/lng lên search.
  const [geoBounds, setGeoBounds] = useState<GeoBounds | null>(null);
  // provinceId is driven by global selected province (no more in-search dropdown)
  const provinceId = provinceCode || "";
  const [wardId, setWardId] = useState("");
  const [priceUuid, setPriceUuid] = useState("");
  const [sizeUuid, setSizeUuid] = useState("");
  const [apartmentTypeUuid, setApartmentTypeUuid] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [isSticky, setIsSticky] = useState(false);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const heroSectionRef = useRef<HTMLElement>(null);

  // Banner slideshow - 5s interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % bannerImages.length);
    }, 20000);
    return () => clearInterval(timer);
  }, []);

  // Sticky search panel on desktop only
  useEffect(() => {
    if (isMobile) {
      setIsSticky(false);
      return;
    }
    const handleScroll = () => {
      if (heroSectionRef.current && searchPanelRef.current) {
        const heroBottom = heroSectionRef.current.getBoundingClientRect().bottom;
        setIsSticky(heroBottom < 64);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobile]);

  const { data: provinces = [] } = useQuery<ProvinceItem[]>({
    queryKey: ["dropdown-province"],
    queryFn: () =>
      httpRequest({
        isCatalog: true,
        http: provinceService.listProvince({ keyword: "" }),
      }),
  });

  const { data: wards = [], isLoading: wardsLoading } = useQuery<WardItem[]>({
    queryKey: ["dropdown-ward", provinceId],
    queryFn: () =>
      httpRequest({
        isCatalog: true,
        http: provinceService.listWard({
          keyword: "",
          provinceCode: provinceId,
        }),
      }),
    enabled: !!provinceId,
  });

  const { data: apartmentTypes = [] } = useQuery<ApartmentTypeItem[]>({
    queryKey: ["dropdown-apartment-type"],
    queryFn: () =>
      httpRequest({
        isCatalog: true,
        http: apartmentTypeService.listApartmentType({
          isPaging: 0,
          typeFinding: 0,
          page: 1,
          pageSize: 100,
          keyword: "",
          status: 1,
        }),
      }),
  });

  const handleSearch = (boundsOverride?: GeoBounds | null) => {
    const params = new URLSearchParams();
    if (searchKeyword.trim()) params.set("q", searchKeyword.trim());
    if (provinceId) params.set("provinceId", provinceId);
    if (wardId) params.set("wardId", wardId);
    if (apartmentTypeUuid) params.set("apartmentTypeUuid", apartmentTypeUuid);

    const selectedPrice = filterPrices.find((p) => p.uuid === priceUuid);
    if (selectedPrice) {
      if (selectedPrice.value) params.set("priceFrom", String(selectedPrice.value));
      if (selectedPrice.valueTo) params.set("priceTo", String(selectedPrice.valueTo));
    }

    const selectedSize = filterApartmentSizes.find((s) => s.uuid === sizeUuid);
    if (selectedSize) {
      if (selectedSize.value) params.set("apartmentSizeFrom", String(selectedSize.value));
      if (selectedSize.valueTo) params.set("apartmentSizeTo", String(selectedSize.valueTo));
    }

    // Truyền bounding box khi user đã chọn 1 địa điểm từ map/autocomplete.
    const bounds = boundsOverride !== undefined ? boundsOverride : geoBounds;
    if (bounds) {
      params.set("neLat", String(bounds.neLat));
      params.set("neLng", String(bounds.neLng));
      params.set("swLat", String(bounds.swLat));
      params.set("swLng", String(bounds.swLng));
    }

    navigate(`/search?${params.toString()}`);
  };

  const handleSelectLocation = (_result: any, bounds: GeoBounds) => {
    setGeoBounds(bounds);
    // Tự động tìm ngay khi chọn gợi ý, đồng thời truyền bounds vừa chọn.
    handleSearch(bounds);
  };

  // User chọn mục "Tìm …" hoặc nhấn Enter → tìm theo từ khóa, không bbox.
  const handleSubmitKeyword = (text: string) => {
    setSearchKeyword(text);
    setGeoBounds(null);
    handleSearch(null);
  };

  const advancedFilterCount = [wardId, priceUuid, sizeUuid, apartmentTypeUuid].filter(Boolean).length;

  // Ưu tiên nameEn để bias Nominatim chính xác hơn.
  const provinceEnrich =
    provinces.find((p) => p.code === provinceId)?.nameEn ||
    provinces.find((p) => p.code === provinceId)?.name ||
    provinceName ||
    "";

  const searchPanel = (
    <div className="bg-card/95 backdrop-blur-md rounded-2xl shadow-soft border border-border p-3 sm:p-4">
      {/* Main filters - single row */}
      <div className="flex flex-row items-stretch gap-2">
        {/* Search input with autocomplete */}
        <div className="flex-1 min-w-0">
          <LocationAutocomplete
            value={searchKeyword}
            onChange={setSearchKeyword}
            onSelectLocation={handleSelectLocation}
            onSubmitKeyword={handleSubmitKeyword}
            placeholder={t("search.keywordPlaceholder")}
            inputClassName="h-11"
            enrichSuffix={provinceEnrich}
            biasLat={bias?.lat}
            biasLng={bias?.lng}
            biasRadiusKm={bias?.radiusKm}
          />
        </div>

        {/* Filter + Search buttons */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`relative flex items-center justify-center w-11 h-11 rounded-xl transition-colors ${
              showAdvanced
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            }`}
            title={t("hero.advancedFilters")}
          >
            <SlidersHorizontal size={18} />
            {advancedFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {advancedFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => handleSearch()}
            className={cn(
              "bg-primary hover:bg-primary/90 text-primary-foreground h-11 rounded-xl font-medium transition-all active:scale-95 flex items-center justify-center",
              isMobile ? "w-11" : "gap-2 whitespace-nowrap px-6"
            )}
          >
            <Search size={isMobile ? 18 : 20} />
            {!isMobile && <span>{t("hero.searchBtn")}</span>}
          </button>
        </div>
      </div>

      {/* Advanced filters panel */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("hero.advancedFilters")}
                </span>
                <button
                  onClick={() => setShowAdvanced(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {/* Price range */}
                <Select value={priceUuid} onValueChange={(val) => setPriceUuid(val === "__all__" ? "" : val)}>
                  <SelectTrigger className="search-field-select-trigger">
                    <SelectValue placeholder={t("hero.priceRange")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t("hero.priceRange")}</SelectItem>
                    {filterPrices.map((fp) => (
                      <SelectItem key={fp.uuid} value={fp.uuid}>
                        {fp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={wardId}
                  onValueChange={(val) => setWardId(val === "__all__" ? "" : val)}
                  disabled={!provinceId || (wardsLoading && wards.length === 0)}
                >
                  <SelectTrigger className="search-field-select-trigger">
                    <SelectValue
                      placeholder={
                        !provinceId ? t("hero.selectAreaFirst") : wardsLoading ? t("search.loading") : t("hero.ward")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t("hero.ward")}</SelectItem>
                    {wards.map((w) => (
                      <SelectItem key={w.code} value={w.code}>
                        {formatLocationLabel(w)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={apartmentTypeUuid}
                  onValueChange={(val) => setApartmentTypeUuid(val === "__all__" ? "" : val)}
                >
                  <SelectTrigger className="search-field-select-trigger">
                    <SelectValue placeholder={t("hero.roomType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t("hero.roomType")}</SelectItem>
                    {apartmentTypes.map((at) => (
                      <SelectItem key={at.uuid} value={at.uuid}>
                        {at.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sizeUuid} onValueChange={(val) => setSizeUuid(val === "__all__" ? "" : val)}>
                  <SelectTrigger className="search-field-select-trigger">
                    <SelectValue placeholder={t("hero.areaSize")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t("hero.areaSize")}</SelectItem>
                    {filterApartmentSizes.map((fs) => (
                      <SelectItem key={fs.uuid} value={fs.uuid}>
                        {fs.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <>
      <section ref={heroSectionRef} className="relative z-30">
        {/* Banner slideshow background */}
        <div className="absolute inset-0">
          <div className="relative w-full h-full overflow-hidden">
            {bannerImages.map((img, idx) => (
              <div
                key={idx}
                className="absolute inset-0 transition-opacity duration-[1500ms] ease-in-out"
                style={{ opacity: currentBanner === idx ? 1 : 0 }}
              >
                <img src={img} alt="" className="w-full h-full object-cover" loading={idx === 0 ? "eager" : "lazy"} />
              </div>
            ))}
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-black/45" />
            {/* Top gradient for navbar blending */}
            <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/50 to-transparent" />
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end min-h-[420px] md:min-h-[460px] pb-6 md:pb-8" style={{ paddingTop: 'calc(var(--promo-banner-height, 0px) + 5rem)' }}>
          {/* Banner content - changes per slide */}
          <div className="relative mb-5 md:mb-6 min-h-[140px] md:min-h-[160px] flex items-center justify-center">
            {/* Banner 1: Branding */}
            <AnimatePresence mode="wait">
              {currentBanner === 0 && (
                <motion.div
                  key="slide-brand"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                  className="text-center absolute inset-0 flex flex-col items-center justify-center"
                >
                  <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight mb-3 drop-shadow-lg">
                    Xanh<span className="text-primary">Stay</span>
                  </h1>
                  <div className="flex items-center justify-center gap-3 md:gap-4">
                    <span className="h-px w-8 md:w-12 bg-white/40" />
                    <p className="text-white/90 text-base md:text-xl font-light tracking-wide drop-shadow-md italic">
                      {t("slogan")}
                    </p>
                    <span className="h-px w-8 md:w-12 bg-white/40" />
                  </div>
                </motion.div>
              )}

              {/* Banner 2: Repeat branding or different content */}
              {currentBanner === 1 && (
                <motion.div
                  key="slide-brand2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                  className="text-center absolute inset-0 flex flex-col items-center justify-center"
                >
                  <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight mb-3 drop-shadow-lg">
                    Xanh<span className="text-primary">Stay</span>
                  </h1>
                  <div className="flex items-center justify-center gap-3 md:gap-4">
                    <span className="h-px w-8 md:w-12 bg-white/40" />
                    <p className="text-white/90 text-base md:text-xl font-light tracking-wide drop-shadow-md italic">
                      {t("slogan")}
                    </p>
                    <span className="h-px w-8 md:w-12 bg-white/40" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search panel */}
          <motion.div
            ref={searchPanelRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className={`relative z-20 max-w-3xl mx-auto w-full ${!isMobile && isSticky ? "invisible" : ""}`}
          >
            {searchPanel}
          </motion.div>
        </div>
      </section>

      {/* Sticky search panel for desktop */}
      {!isMobile && isSticky && (
        <div className="fixed left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border shadow-sm" style={{ top: 'calc(var(--promo-banner-height, 0px) + 4rem)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">{searchPanel}</div>
        </div>
      )}
    </>
  );
};
