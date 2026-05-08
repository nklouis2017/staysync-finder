import { HeroSearch } from "@/components/HeroSearch";
import { PromoBannersSection } from "@/components/PromoBannersSection";
import { AdvertisementCard } from "@/components/AdvertisementCard";
import { CoreValues } from "@/components/CoreValues";
import { CustomerReviews } from "@/components/CustomerReviews";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { FloatingCallButton } from "@/components/FloatingCallButton";

import { SEO } from "@/components/SEO";
import { useQuery } from "@tanstack/react-query";
import { httpRequest } from "@/services/index";
import apartmentTypeService, { ApartmentTypeItem } from "@/services/apartmentType.service";
import advertisementService, { AdvertisementData } from "@/services/advertisement.service";
import { filterPrices } from "@/lib/filter-options";
import { PAGE_SIZE_DEFAULT } from "@/lib/pagination";

import { ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { useSelectedProvince } from "@/hooks/useSelectedProvince";

/** Fisher-Yates shuffle */
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { provinceCode } = useSelectedProvince();
  const provinceId = provinceCode || "";
  const [activeTab, setActiveTab] = useState<"recommended" | "latest">("recommended");

  const { data: apartmentTypesRaw = [] } = useQuery({
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

  // Phòng đề xuất (IsHot=1, shuffle)
  const { data: recommendedData, isLoading: recommendedLoading } = useQuery<{
    items: AdvertisementData[];
  }>({
    queryKey: ["recommended-advertisements", provinceId],
    queryFn: () =>
      httpRequest({
        http: advertisementService.getListPaged({
          isPaging: 1,
          page: 1,
          pageSize: PAGE_SIZE_DEFAULT,
          isHot: 1,
          ...(provinceId ? { provinceId } : {}),
          typeOrder: 0,
        }),
      }),
  });

  // Phòng mới cập nhật (future: Phòng có khuyến mại)
  const { data: latestData, isLoading: latestLoading } = useQuery<{
    items: AdvertisementData[];
  }>({
    queryKey: ["latest-advertisements"],
    queryFn: () =>
      httpRequest({
        http: advertisementService.getListPaged({
          isPaging: 1,
          page: 1,
          pageSize: PAGE_SIZE_DEFAULT,
          isHot: 0,
          typeOrder: 0,
        }),
      }),
  });

  // Shuffle recommended ads
  const recommendedAds = useMemo(() => shuffleArray((recommendedData?.items ?? []).filter(Boolean)), [recommendedData]);
  const latestAds = (latestData?.items ?? []).filter(Boolean);

  const currentAds = activeTab === "recommended" ? recommendedAds : latestAds;
  const currentLoading = activeTab === "recommended" ? recommendedLoading : latestLoading;

  const handleFilterClick = (params: Record<string, string>) => {
    const searchParams = new URLSearchParams(params);
    navigate(`/search?${searchParams.toString()}`);
  };

  const quickFilters = [
    ...apartmentTypesRaw.map((at: ApartmentTypeItem) => ({
      label: at.name,
      params: { apartmentTypeUuid: at.uuid },
    })),
    ...filterPrices.slice(0, 3).map((fp) => ({
      label: fp.name,
      params: {
        ...(fp.value ? { priceFrom: String(fp.value) } : {}),
        ...(fp.valueTo ? { priceTo: String(fp.valueTo) } : {}),
      },
    })),
  ];

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <SEO
        title="XanhStay - Tìm phòng, căn hộ cho thuê"
        description="Nền tảng tìm phòng và căn hộ cho thuê thông minh tại Việt Nam."
      />
      <Navbar />
      <HeroSearch />

      <PromoBannersSection />

      {/* Listings */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            {/* Tabs: Phòng đề xuất / Phòng mới cập nhật */}
            <div className="flex gap-1 bg-secondary rounded-xl p-1">
              <button
                onClick={() => setActiveTab("recommended")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors w-fit ${
                  activeTab === "recommended"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("listing.recommended")}
              </button>
              {/* NOTE: This tab can be renamed to "Phòng có khuyến mại" in the future */}
              <button
                onClick={() => setActiveTab("latest")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors w-fit ${
                  activeTab === "latest"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("listing.latest")}
              </button>
            </div>
          </div>
          <Link
            to="/search"
            className="hidden md:flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {t("listing.viewAll")} <ArrowRight size={16} />
          </Link>
        </div>

        {/* Quick filter chips */}

        <div className="mt-6">
          {currentLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card rounded-2xl overflow-hidden border border-border">
                  <Skeleton className="aspect-[3/2] w-full" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-full mt-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentAds.map((ad, i) => (
                <AdvertisementCard key={ad.uuid} data={ad} index={i} />
              ))}
            </div>
          )}
        </div>
        <div className="mt-8 text-center md:hidden">
          <Link
            to="/search"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {t("listing.viewAll")} <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <CustomerReviews />
      <CoreValues />
      <FloatingCallButton />
      <Footer />
    </div>
  );
};

export default Index;
