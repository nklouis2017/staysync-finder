import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import { Navbar } from "@/components/Navbar";
import { AdvertisementCard } from "@/components/AdvertisementCard";
import { Footer } from "@/components/Footer";
import { FloatingCallButton } from "@/components/FloatingCallButton";
import { BackToTopButton } from "@/components/BackToTopButton";
import { filterPrices, filterApartmentSizes } from "@/lib/filter-options";
import advertisementService, { GetListAdvertisementRequest, AdvertisementData } from "@/services/advertisement.service";
import provinceService, { ProvinceItem, WardItem, formatLocationLabel } from "@/services/province.service";
import apartmentTypeService, { ApartmentTypeItem } from "@/services/apartmentType.service";
import { httpRequest } from "@/services/index";
import { useTranslation } from "react-i18next";
import { Search, Map as MapIcon, Loader2, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MiniMapPreview } from "@/components/MiniMapPreview";
import { GeoBounds, RADIUS_OPTIONS, DEFAULT_RADIUS_KM, latLngToBounds } from "@/lib/geocoding";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSelectedProvince } from "@/hooks/useSelectedProvince";
import { getProvinceBias } from "@/lib/province-geo";
import { PAGE_SIZE_DEFAULT } from "@/lib/pagination";

const PAGE_SIZE = PAGE_SIZE_DEFAULT;

const SORT_OPTIONS = [
  { value: "0", label: "Mới nhất" },
  { value: "1", label: "Giá thấp → cao" },
  { value: "2", label: "Giá cao → thấp" },
  { value: "3", label: "Xem nhiều nhất" },
  { value: "4", label: "Đánh giá cao nhất" },
];

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { provinceCode: selectedProvinceCode, provinceName: selectedProvinceName } = useSelectedProvince();
  const bias = getProvinceBias(selectedProvinceCode);

  const listRef = useRef<HTMLDivElement>(null);

  // Filter states from URL
  // Province is driven by global selected province (no in-page picker)
  const provinceId = selectedProvinceCode || "";
  const [wardId, setWardId] = useState(searchParams.get("wardId") || "");
  const [apartmentTypeUuid, setApartmentTypeUuid] = useState(searchParams.get("apartmentTypeUuid") || "");
  const [priceFrom, setPriceFrom] = useState(searchParams.get("priceFrom") || "");
  const [priceTo, setPriceTo] = useState(searchParams.get("priceTo") || "");
  const [apartmentSizeFrom, setApartmentSizeFrom] = useState(searchParams.get("apartmentSizeFrom") || "");
  const [apartmentSizeTo, setApartmentSizeTo] = useState(searchParams.get("apartmentSizeTo") || "");
  // `keyword` = text trong ô input, KHÔNG đi vào query.
  // `appliedKeyword` = từ khóa đã được user submit (chọn mục "Tìm …" hoặc Enter).
  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [appliedKeyword, setAppliedKeyword] = useState(searchParams.get("q") || "");
  const [typeOrder, setTypeOrder] = useState(searchParams.get("typeOrder") || "0");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  // Mặc định center là null khi vào trang. Chỉ set khi user chọn 1 gợi ý từ autocomplete.
  // Bounds được tính lại từ center + radiusKm để khi user đổi bán kính sẽ áp dụng ngay.
  const [geoCenter, setGeoCenter] = useState<{ lat: number; lng: number } | null>(null);
  const geoBounds = useMemo<GeoBounds | null>(
    () => (geoCenter ? latLngToBounds(geoCenter.lat, geoCenter.lng, radiusKm) : null),
    [geoCenter, radiusKm],
  );
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const selectedPriceUuid =
    filterPrices.find((fp) => String(fp.value || "") === priceFrom && String(fp.valueTo || "") === priceTo)?.uuid || "";

  const selectedSizeUuid =
    filterApartmentSizes.find(
      (fs) => String(fs.value || "") === apartmentSizeFrom && String(fs.valueTo || "") === apartmentSizeTo,
    )?.uuid || "";

  // API data
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

  // Build enriched suffix for autocomplete — dùng nameEn để bias Nominatim chính xác hơn.
  const enrichSuffix = useMemo(() => {
    const parts: string[] = [];
    if (wardId) {
      const ward = wards.find((w) => w.code === wardId);
      if (ward) parts.push(ward.nameEn || ward.name);
    }
    const provinceFromList = provinceId ? provinces.find((p) => p.code === provinceId) : undefined;
    const provinceLabel = provinceFromList?.nameEn || provinceFromList?.name || selectedProvinceName || "";
    if (provinceLabel) parts.push(provinceLabel);
    return parts.join(" ");
  }, [provinceId, wardId, provinces, wards, selectedProvinceName]);

  const handleLocationSelect = useCallback((result: any, _bounds: GeoBounds) => {
    const lat = parseFloat(result?.lat);
    const lng = parseFloat(result?.lon);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setGeoCenter({ lat, lng });
      // Tìm theo địa điểm → bỏ keyword cũ
      setAppliedKeyword("");
    }
  }, []);

  // Khi user submit từ khóa (chọn mục "Tìm …" hoặc Enter): tìm theo text, bỏ điểm cũ.
  const handleSubmitKeyword = useCallback((text: string) => {
    setAppliedKeyword(text);
    setGeoCenter(null);
  }, []);

  // Cập nhật text trong ô; nếu user xoá trắng → reset filter để load lại danh sách mặc định.
  const handleKeywordChange = useCallback((next: string) => {
    setKeyword(next);
    if (!next.trim()) {
      setAppliedKeyword("");
      setGeoCenter(null);
    }
  }, []);

  const buildListRequest = (pageParam: number): GetListAdvertisementRequest => {
    const req: GetListAdvertisementRequest = {
      isPaging: 1,
      page: pageParam,
      pageSize: PAGE_SIZE,
      isHot: 0,
      typeOrder: Number(typeOrder),
    };
    if (appliedKeyword) req.keyword = appliedKeyword;
    if (provinceId) req.provinceId = provinceId;
    if (wardId) req.wardId = wardId;
    if (apartmentTypeUuid) req.apartmentTypeUuid = apartmentTypeUuid;
    if (priceFrom) req.priceFrom = Number(priceFrom);
    if (priceTo) req.priceTo = Number(priceTo);
    if (apartmentSizeFrom) req.apartmentSizeFrom = Number(apartmentSizeFrom);
    if (apartmentSizeTo) req.apartmentSizeTo = Number(apartmentSizeTo);
    if (geoBounds) {
      req.neLat = geoBounds.neLat;
      req.neLng = geoBounds.neLng;
      req.swLat = geoBounds.swLat;
      req.swLng = geoBounds.swLng;
    } else {
      req.neLat = null;
      req.neLng = null;
      req.swLat = null;
      req.swLng = null;
    }
    return req;
  };

  const {
    data: listData,
    isLoading: loading,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "advertisements-list",
      appliedKeyword,
      provinceId,
      wardId,
      apartmentTypeUuid,
      priceFrom,
      priceTo,
      apartmentSizeFrom,
      apartmentSizeTo,
      typeOrder,
      geoBounds?.neLat,
      geoBounds?.swLat,
    ],
    queryFn: ({ pageParam }) =>
      httpRequest({ http: advertisementService.getListPaged(buildListRequest(pageParam as number)) }),
    initialPageParam: 1,
    // totalCount API không ổn định — dùng độ dài trang để biết có trang kế tiếp.
    getNextPageParam: (lastPage: any, allPages) => {
      const items = lastPage?.items ?? [];
      return items.length >= PAGE_SIZE ? allPages.length + 1 : undefined;
    },
  });

  const advertisements = useMemo(() => {
    return (listData?.pages ?? []).flatMap((p: any) => p?.items ?? []);
  }, [listData]);
  const totalCount = useMemo(() => {
    const firstPage: any = listData?.pages?.[0];
    const apiTotal = Number(firstPage?.pagination?.totalCount ?? 0);
    return apiTotal > 0 ? apiTotal : advertisements.length;
  }, [listData, advertisements.length]);
  const error = queryError ? t("search.serverError") : null;

  // Sentinel: tự fetch trang sau khi gần chạm đáy.
  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage && !loading) {
          fetchNextPage();
        }
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, loading, fetchNextPage, advertisements.length]);


  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (appliedKeyword) params.set("q", appliedKeyword);
    if (provinceId) params.set("provinceId", provinceId);
    if (wardId) params.set("wardId", wardId);
    if (apartmentTypeUuid) params.set("apartmentTypeUuid", apartmentTypeUuid);
    if (priceFrom) params.set("priceFrom", priceFrom);
    if (priceTo) params.set("priceTo", priceTo);
    if (apartmentSizeFrom) params.set("apartmentSizeFrom", apartmentSizeFrom);
    if (apartmentSizeTo) params.set("apartmentSizeTo", apartmentSizeTo);
    if (typeOrder !== "0") params.set("typeOrder", typeOrder);
    if (geoBounds) {
      params.set("neLat", String(geoBounds.neLat));
      params.set("neLng", String(geoBounds.neLng));
      params.set("swLat", String(geoBounds.swLat));
      params.set("swLng", String(geoBounds.swLng));
    }
    setSearchParams(params, { replace: true });
  }, [
    appliedKeyword,
    provinceId,
    wardId,
    apartmentTypeUuid,
    priceFrom,
    priceTo,
    apartmentSizeFrom,
    apartmentSizeTo,
    typeOrder,
    geoBounds,
    setSearchParams,
  ]);

  const handlePriceSelect = (uuid: string) => {
    if (uuid === "__all__" || uuid === selectedPriceUuid) {
      setPriceFrom("");
      setPriceTo("");
    } else {
      const fp = filterPrices.find((p) => p.uuid === uuid);
      if (fp) {
        setPriceFrom(fp.value ? String(fp.value) : "");
        setPriceTo(fp.valueTo ? String(fp.valueTo) : "");
      }
    }
  };

  const handleSizeSelect = (uuid: string) => {
    if (uuid === "__all__" || uuid === selectedSizeUuid) {
      setApartmentSizeFrom("");
      setApartmentSizeTo("");
    } else {
      const fs = filterApartmentSizes.find((s) => s.uuid === uuid);
      if (fs) {
        setApartmentSizeFrom(fs.value ? String(fs.value) : "");
        setApartmentSizeTo(fs.valueTo ? String(fs.valueTo) : "");
      }
    }
  };

  // Navigate to map view preserving all filters
  const goToMapView = () => {
    const params = new URLSearchParams();
    if (keyword) params.set("q", keyword);
    if (provinceId) params.set("provinceId", provinceId);
    if (wardId) params.set("wardId", wardId);
    if (apartmentTypeUuid) params.set("apartmentTypeUuid", apartmentTypeUuid);
    if (priceFrom) params.set("priceFrom", priceFrom);
    if (priceTo) params.set("priceTo", priceTo);
    if (apartmentSizeFrom) params.set("apartmentSizeFrom", apartmentSizeFrom);
    if (apartmentSizeTo) params.set("apartmentSizeTo", apartmentSizeTo);
    navigate(`/search/map?${params.toString()}`);
  };

  const activeFilterCount = [apartmentTypeUuid, selectedPriceUuid, selectedSizeUuid, wardId].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background flex flex-col pt-16">
      <SEO title={t("search.title")} description={t("search.desc")} />
      <Navbar />

      {/* Sticky top search & filter bar - single row */}
      <div className="sticky top-16 z-40 border-b border-border bg-card/95 backdrop-blur-xl shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Desktop: single row */}
          <div className="hidden md:flex flex-wrap gap-2 items-center">
            {/* Search input with autocomplete */}
            <LocationAutocomplete
              value={keyword}
              onChange={handleKeywordChange}
              onSelectLocation={handleLocationSelect}
              onSubmitKeyword={handleSubmitKeyword}
              
              enrichSuffix={enrichSuffix}
              radiusKm={radiusKm}
              placeholder={t("search.keywordPlaceholder")}
              className="flex-1 min-w-[200px] max-w-md"
              inputClassName="h-11"
              biasLat={bias?.lat}
              biasLng={bias?.lng}
              biasRadiusKm={bias?.radiusKm}
            />

            {/* Sort */}
            <Select value={typeOrder} onValueChange={setTypeOrder}>
              <SelectTrigger className="w-auto shrink-0 h-11 text-sm">
                <div className="flex items-center gap-1.5">
                  <ArrowUpDown size={14} />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Result count */}
            <div className="flex items-center gap-2 ml-auto shrink-0">
              <p className="text-sm text-foreground font-medium whitespace-nowrap">
                {totalCount} {t("search.found")}
              </p>
              {loading && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
            </div>
          </div>

          {/* Mobile: search + icon buttons inline, then result count */}
          <div className="flex flex-col gap-3 md:hidden">
            {/* Row 1: Search input + Sort icon + Filter icon */}
            <div className="flex items-center gap-2">
              <LocationAutocomplete
                value={keyword}
                onChange={handleKeywordChange}
                onSelectLocation={handleLocationSelect}
                onSubmitKeyword={handleSubmitKeyword}
                enrichSuffix={enrichSuffix}
                radiusKm={radiusKm}
                placeholder={t("search.keywordPlaceholder")}
                className="flex-1 min-w-0"
                inputClassName="h-10"
                biasLat={bias?.lat}
                biasLng={bias?.lng}
                biasRadiusKm={bias?.radiusKm}
              />

              {/* Sort - icon only */}
              <Select value={typeOrder} onValueChange={setTypeOrder}>
                <SelectTrigger
                  aria-label="Sắp xếp"
                  className="w-10 h-10 shrink-0 p-0 justify-center rounded-lg bg-secondary/50 border border-border [&>svg:last-child]:hidden"
                >
                  <ArrowUpDown size={16} />
                </SelectTrigger>
                <SelectContent align="end">
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Advanced filter - icon only */}
              <button
                onClick={() => setAdvancedOpen(true)}
                aria-label={t("hero.advancedFilters")}
                className={cn(
                  "relative flex items-center justify-center w-10 h-10 shrink-0 rounded-lg transition-colors",
                  activeFilterCount > 0
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-secondary/50 border border-border text-foreground hover:bg-secondary",
                )}
              >
                <SlidersHorizontal size={16} />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Row 2: Result count */}
            <div className="flex items-center gap-2 text-left">
              <p className="text-sm text-muted-foreground font-medium">
                {totalCount} {t("search.found")}
              </p>
              {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
            </div>
          </div>
        </div>
      </div>

      {/* Reusable advanced filter content */}
      {(() => null)()}

      {/* Advanced filter dialog (mobile only) */}
      <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl lg:hidden">
          <DialogHeader>
            <DialogTitle>{t("hero.advancedFilters")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <FilterFields
              t={t}
              provinceId={provinceId}
              wards={wards}
              wardsLoading={wardsLoading}
              wardId={wardId}
              setWardId={setWardId}
              apartmentTypes={apartmentTypes}
              apartmentTypeUuid={apartmentTypeUuid}
              setApartmentTypeUuid={setApartmentTypeUuid}
              selectedPriceUuid={selectedPriceUuid}
              handlePriceSelect={handlePriceSelect}
              selectedSizeUuid={selectedSizeUuid}
              handleSizeSelect={handleSizeSelect}
              radiusKm={radiusKm}
              setRadiusKm={setRadiusKm}
            />
            <button
              onClick={() => setAdvancedOpen(false)}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              {t("search.applyFilters")}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main content */}
      <div className="flex-1">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-4">
            {/* Left sidebar: Advanced filter (desktop only, own scroll) */}
            <aside className="hidden lg:block w-[280px] shrink-0">
              <div className="sticky top-[calc(4rem+5rem)] rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">{t("hero.advancedFilters")}</h2>
                  {activeFilterCount > 0 && (
                    <span className="ml-auto w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
                  <FilterFields
                    t={t}
                    provinceId={provinceId}
                    wards={wards}
                    wardsLoading={wardsLoading}
                    wardId={wardId}
                    setWardId={setWardId}
                    apartmentTypes={apartmentTypes}
                    apartmentTypeUuid={apartmentTypeUuid}
                    setApartmentTypeUuid={setApartmentTypeUuid}
                    selectedPriceUuid={selectedPriceUuid}
                    handlePriceSelect={handlePriceSelect}
                    selectedSizeUuid={selectedSizeUuid}
                    handleSizeSelect={handleSizeSelect}
                    radiusKm={radiusKm}
                    setRadiusKm={setRadiusKm}
                  />
                </div>
              </div>
            </aside>

            {/* Right: Room list */}
            <div className="flex-1 min-w-0" ref={listRef}>
              {error && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                  {error}
                </div>
              )}

              {loading && advertisements.length === 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                  {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <div key={i} className="bg-card rounded-2xl overflow-hidden border border-border">
                      <Skeleton className="aspect-[3/2] w-full" />
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {advertisements.length > 0 && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                    {advertisements.map((ad: any, i: number) => (
                      <AdvertisementCard key={ad.uuid} data={ad} index={i} priority={i < 6} />
                    ))}
                  </div>

                  {/* Sentinel + trạng thái load thêm */}
                  <div ref={loadMoreRef} className="mt-8 flex justify-center items-center min-h-[40px]">
                    {isFetchingNextPage && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 size={16} className="animate-spin" />
                        <span>{t("search.loadingMore")}</span>
                      </div>
                    )}
                    {!hasNextPage && !isFetchingNextPage && advertisements.length >= PAGE_SIZE && (
                      <span className="text-sm text-muted-foreground">{t("search.endOfResults")}</span>
                    )}
                  </div>
                </>
              )}

              {!loading && advertisements.length === 0 && (
                <EmptyState
                  icon={Search}
                  title={t("search.noResult")}
                  description={t("search.noResultHint")}
                  actionLabel={t("nav.searchNow")}
                  actionTo="/search"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <BackToTopButton />
      <FloatingCallButton />
      <Footer />
    </div>
  );
};

type FilterFieldsProps = {
  t: any;
  provinceId: string;
  wards: WardItem[];
  wardsLoading: boolean;
  wardId: string;
  setWardId: (v: string) => void;
  apartmentTypes: ApartmentTypeItem[];
  apartmentTypeUuid: string;
  setApartmentTypeUuid: (v: string) => void;
  selectedPriceUuid: string;
  handlePriceSelect: (uuid: string) => void;
  selectedSizeUuid: string;
  handleSizeSelect: (uuid: string) => void;
  radiusKm: number;
  setRadiusKm: (v: number) => void;
};

const FilterFields = ({
  t,
  provinceId,
  wards,
  wardsLoading,
  wardId,
  setWardId,
  apartmentTypes,
  apartmentTypeUuid,
  setApartmentTypeUuid,
  selectedPriceUuid,
  handlePriceSelect,
  selectedSizeUuid,
  handleSizeSelect,
  radiusKm,
  setRadiusKm,
}: FilterFieldsProps) => (
  <>
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{t("hero.ward")}</label>
      <Select
        value={wardId || "__all__"}
        onValueChange={(val) => setWardId(val === "__all__" ? "" : val)}
        disabled={!provinceId || (wardsLoading && wards.length === 0)}
      >
        <SelectTrigger className="w-full h-11">
          <SelectValue
            placeholder={
              !provinceId ? t("hero.selectAreaFirst") : wardsLoading ? t("search.loading") : t("search.all")
            }
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t("search.all")}</SelectItem>
          {wards.map((w) => (
            <SelectItem key={w.code} value={w.code}>
              {formatLocationLabel(w)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {apartmentTypes.length > 0 && (
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">{t("hero.roomType")}</label>
        <Select
          value={apartmentTypeUuid || "__all__"}
          onValueChange={(val) => setApartmentTypeUuid(val === "__all__" ? "" : val)}
        >
          <SelectTrigger className="w-full h-11">
            <SelectValue placeholder={t("hero.allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("hero.allTypes")}</SelectItem>
            {apartmentTypes.map((at) => (
              <SelectItem key={at.uuid} value={at.uuid}>
                {at.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )}

    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{t("hero.priceRange")}</label>
      <Select value={selectedPriceUuid || "__all__"} onValueChange={handlePriceSelect}>
        <SelectTrigger className="w-full h-11">
          <SelectValue placeholder={t("hero.allPrices")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t("hero.allPrices")}</SelectItem>
          {filterPrices.map((fp) => (
            <SelectItem key={fp.uuid} value={fp.uuid}>
              {fp.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{t("hero.areaSize")}</label>
      <Select value={selectedSizeUuid || "__all__"} onValueChange={handleSizeSelect}>
        <SelectTrigger className="w-full h-11">
          <SelectValue placeholder={t("hero.allSizes")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t("hero.allSizes")}</SelectItem>
          {filterApartmentSizes.map((fs) => (
            <SelectItem key={fs.uuid} value={fs.uuid}>
              {fs.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">Bán kính tìm kiếm</label>
      <Select value={String(radiusKm)} onValueChange={(val) => setRadiusKm(Number(val))}>
        <SelectTrigger className="w-full h-11">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RADIUS_OPTIONS.map((r) => (
            <SelectItem key={r.value} value={String(r.value)}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </>
);

export default SearchPage;
