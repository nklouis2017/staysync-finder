import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { RADIUS_OPTIONS, DEFAULT_RADIUS_KM, NominatimResult, GeoBounds, getUserLocation } from "@/lib/geocoding";
import { useQuery } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import { Navbar } from "@/components/Navbar";
import { AdvertisementCard } from "@/components/AdvertisementCard";
import { MapView } from "@/components/MapView";
import { Skeleton } from "@/components/ui/skeleton";
import { filterPrices, filterApartmentSizes } from "@/lib/filter-options";
import advertisementService, {
  GetAdvertisementsForMapRequest,
  AdvertisementData,
  MapLocationGroup,
} from "@/services/advertisement.service";
import provinceService, { ProvinceItem, WardItem, formatLocationLabel } from "@/services/province.service";
import apartmentTypeService, { ApartmentTypeItem } from "@/services/apartmentType.service";
import { httpRequest } from "@/services/index";
import { PAGE_SIZE_DEFAULT } from "@/lib/pagination";
import { useTranslation } from "react-i18next";
import { Search, SlidersHorizontal, Loader2, X, ArrowLeft } from "lucide-react";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSelectedProvince } from "@/hooks/useSelectedProvince";
import { getProvinceBias } from "@/lib/province-geo";

const parsePoint = (point: string): [number, number] | null => {
  try {
    const parsed = JSON.parse(point);
    if (Array.isArray(parsed) && parsed.length >= 2) {
      const [lat, lng] = parsed.map(Number);
      if (isFinite(lat) && isFinite(lng) && !(lat === 0 && lng === 0)) return [lat, lng];
    }
  } catch {}
  return null;
};

const MapSearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { provinceCode: selectedProvinceCode, provinceName: selectedProvinceName } = useSelectedProvince();
  const bias = getProvinceBias(selectedProvinceCode);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [mobileShowList, setMobileShowList] = useState(false);

  const PAGE_SIZE = PAGE_SIZE_DEFAULT;
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Filter states from URL
  // Province driven by global selected province
  const provinceId = selectedProvinceCode || "";
  const [wardId, setWardId] = useState(searchParams.get("wardId") || "");
  const [apartmentTypeUuid, setApartmentTypeUuid] = useState(searchParams.get("apartmentTypeUuid") || "");
  const [priceFrom, setPriceFrom] = useState(searchParams.get("priceFrom") || "");
  const [priceTo, setPriceTo] = useState(searchParams.get("priceTo") || "");
  const [apartmentSizeFrom, setApartmentSizeFrom] = useState(searchParams.get("apartmentSizeFrom") || "");
  const [apartmentSizeTo, setApartmentSizeTo] = useState(searchParams.get("apartmentSizeTo") || "");
  // `keyword` = text trong ô input (không trigger query).
  // `appliedKeyword` = từ khóa đã được user submit (chọn "Tìm …" hoặc Enter).
  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [appliedKeyword, setAppliedKeyword] = useState(searchParams.get("q") || "");
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);

  const handleKeywordChange = useCallback((next: string) => {
    setKeyword(next);
    if (!next.trim()) setAppliedKeyword("");
  }, []);

  const handleSubmitKeyword = useCallback((text: string) => {
    setAppliedKeyword(text);
  }, []);

  // Yêu cầu vị trí người dùng sớm để bias kết quả tìm kiếm
  useEffect(() => {
    getUserLocation().catch(() => {});
  }, []);

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number; zoom: number; label?: string } | null>(null);
  const [centerPoint, setCenterPoint] = useState<{ lat: number; lng: number } | null>(null);

  // Init center: user GPS first, fallback to province bias so radius lock always applies
  useEffect(() => {
    let cancelled = false;
    getUserLocation()
      .then((loc) => {
        if (cancelled) return;
        if (loc && isFinite(loc.lat) && isFinite(loc.lng)) {
          setCenterPoint({ lat: loc.lat, lng: loc.lng });
        } else if (bias) {
          setCenterPoint({ lat: bias.lat, lng: bias.lng });
        }
      })
      .catch(() => {
        if (!cancelled && bias) setCenterPoint({ lat: bias.lat, lng: bias.lng });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bias?.lat, bias?.lng]);

  const lockToRadius = useMemo(
    () => (centerPoint ? { centerLat: centerPoint.lat, centerLng: centerPoint.lng, radiusKm } : null),
    [centerPoint, radiusKm],
  );

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

  // Build enriched suffix for autocomplete
  const enrichSuffix = useMemo(() => {
    const parts: string[] = [];
    if (wardId) {
      const ward = wards.find((w) => w.code === wardId);
      if (ward) parts.push(ward.name);
    }
    if (provinceId) {
      const province = provinces.find((p) => p.code === provinceId);
      if (province) parts.push(province.name);
    } else if (selectedProvinceName) {
      parts.push(selectedProvinceName);
    }
    return parts.join(" ");
  }, [provinceId, wardId, provinces, wards, selectedProvinceName]);

  // Handle autocomplete selection: pan map + update search overlay
  const handleLocationSelect = useCallback((result: NominatimResult, bounds: GeoBounds) => {
    const label = result.display_name;
    setMapCenter({ lat: bounds.centerLat, lng: bounds.centerLng, zoom: 16, label });
    setCenterPoint({ lat: bounds.centerLat, lng: bounds.centerLng });
  }, []);

  // Viewport bounds (NE/SW) cập nhật từ Map; debounce 300ms
  const [viewportBounds, setViewportBounds] = useState<{
    neLat: number;
    neLng: number;
    swLat: number;
    swLng: number;
  } | null>(null);
  const boundsDebounceRef = useRef<number | null>(null);
  const handleBoundsChange = useCallback(
    (b: { neLat: number; neLng: number; swLat: number; swLng: number }) => {
      if (boundsDebounceRef.current) window.clearTimeout(boundsDebounceRef.current);
      boundsDebounceRef.current = window.setTimeout(() => {
        setViewportBounds(b);
      }, 300);
    },
    [],
  );
  useEffect(
    () => () => {
      if (boundsDebounceRef.current) window.clearTimeout(boundsDebounceRef.current);
    },
    [],
  );

  const buildMapRequest = (): GetAdvertisementsForMapRequest => {
    const req: GetAdvertisementsForMapRequest = {
      isPaging: 0,
      page: 1,
      pageSize: 500,
      isHot: 0,
      typeOrder: 0,
    };
    if (appliedKeyword) req.keyword = appliedKeyword;
    if (provinceId) req.provinceId = provinceId;
    if (wardId) req.wardId = wardId;
    if (apartmentTypeUuid) req.apartmentTypeUuid = apartmentTypeUuid;
    if (priceFrom) req.priceFrom = Number(priceFrom);
    if (priceTo) req.priceTo = Number(priceTo);
    if (apartmentSizeFrom) req.apartmentSizeFrom = Number(apartmentSizeFrom);
    if (apartmentSizeTo) req.apartmentSizeTo = Number(apartmentSizeTo);
    if (viewportBounds) {
      req.neLat = viewportBounds.neLat;
      req.neLng = viewportBounds.neLng;
      req.swLat = viewportBounds.swLat;
      req.swLng = viewportBounds.swLng;
    } else {
      req.neLat = null;
      req.neLng = null;
      req.swLat = null;
      req.swLng = null;
    }
    return req;
  };

  const { data: mapData, isLoading: mapLoading, isFetching: mapFetching } = useQuery({
    queryKey: [
      "map-advertisements",
      appliedKeyword,
      provinceId,
      wardId,
      apartmentTypeUuid,
      priceFrom,
      priceTo,
      apartmentSizeFrom,
      apartmentSizeTo,
      viewportBounds?.neLat,
      viewportBounds?.neLng,
      viewportBounds?.swLat,
      viewportBounds?.swLng,
    ],
    queryFn: () => httpRequest({ http: advertisementService.getForMap(buildMapRequest()) }),
    keepPreviousData: true,
  } as any);

  const incomingLocations = useMemo<MapLocationGroup[]>(() => (mapData as any)?.items ?? [], [mapData]);

  // Tích lũy các nhóm vị trí đã load trước. Mỗi lần load thêm chỉ merge vào kho,
  // không xoá marker cũ → bản đồ không "load lại" những căn đã hiển thị.
  // Khi filter (keyword/province/ward/type/price/size) thay đổi → reset kho.
  const accumulatedRef = useRef<Map<string, MapLocationGroup>>(new Map());
  const [accumulatedLocations, setAccumulatedLocations] = useState<MapLocationGroup[]>([]);

  // Reset khi đổi filter (không reset khi chỉ đổi viewport)
  useEffect(() => {
    accumulatedRef.current = new Map();
    setAccumulatedLocations([]);
  }, [
    appliedKeyword,
    provinceId,
    wardId,
    apartmentTypeUuid,
    priceFrom,
    priceTo,
    apartmentSizeFrom,
    apartmentSizeTo,
  ]);

  // Merge dữ liệu mới vào kho đã tích lũy (dedupe theo point + ad uuid)
  useEffect(() => {
    if (!incomingLocations.length) return;
    const store = accumulatedRef.current;
    let changed = false;
    for (const loc of incomingLocations) {
      const key = loc.point;
      const existing = store.get(key);
      if (!existing) {
        store.set(key, { ...loc, ads: [...loc.ads] });
        changed = true;
        continue;
      }
      const seenAds = new Set(existing.ads.map((a) => a.uuid));
      const merged = [...existing.ads];
      for (const ad of loc.ads) {
        if (ad?.uuid && !seenAds.has(ad.uuid)) {
          seenAds.add(ad.uuid);
          merged.push(ad);
          changed = true;
        }
      }
      if (changed) {
        store.set(key, { ...existing, ads: merged, totalAds: merged.length, address: loc.address || existing.address });
      }
    }
    if (changed) setAccumulatedLocations(Array.from(store.values()));
  }, [incomingLocations]);

  const mapLocations = accumulatedLocations;

  // Danh sách + count chỉ tính các phòng nằm trong viewport hiện tại của bản đồ.
  // Marker thì vẫn dùng `mapLocations` tích lũy để không "load lại" khi pan/zoom.
  const visibleLocations = useMemo<MapLocationGroup[]>(() => {
    if (!viewportBounds) return mapLocations;
    const { neLat, neLng, swLat, swLng } = viewportBounds;
    const minLat = Math.min(neLat, swLat);
    const maxLat = Math.max(neLat, swLat);
    const crossesAntimeridian = swLng > neLng;
    const lngInBounds = (lng: number) =>
      crossesAntimeridian ? lng >= swLng || lng <= neLng : lng >= swLng && lng <= neLng;
    return mapLocations.filter((loc) => {
      const pt = parsePoint(loc.point);
      if (!pt) return false;
      const [lat, lng] = pt;
      return lat >= minLat && lat <= maxLat && lngInBounds(lng);
    });
  }, [mapLocations, viewportBounds]);

  const allAds = useMemo<AdvertisementData[]>(() => {
    const seen = new Set<string>();
    const result: AdvertisementData[] = [];
    for (const loc of visibleLocations) {
      for (const ad of loc.ads) {
        if (ad?.uuid && !seen.has(ad.uuid)) {
          seen.add(ad.uuid);
          result.push(ad);
        }
      }
    }
    return result;
  }, [visibleLocations]);

  // Client-side infinite scroll cho danh sách bên trái
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [allAds]);
  const visibleAds = useMemo(() => allAds.slice(0, visibleCount), [allAds, visibleCount]);
  const hasMore = visibleCount < allAds.length;

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, allAds.length));
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, allAds.length]);

  const isFetchingNextPage = false;
  const hasNextPage = hasMore;
  const fetchNextPage = () => setVisibleCount((c) => Math.min(c + PAGE_SIZE, allAds.length));
  void fetchNextPage; // (giữ để rõ ý đồ; sentinel bên dưới đã trigger trực tiếp)

  // Sync to URL
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

  const activeFilterCount = [apartmentTypeUuid, selectedPriceUuid, selectedSizeUuid].filter(Boolean).length;

  const filterContent = (
    <div className="space-y-5 p-1">
      {/* Keyword */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          {t("search.keyword")}
        </label>
        <LocationAutocomplete
          value={keyword}
          onChange={handleKeywordChange}
          onSelectLocation={handleLocationSelect}
          onSubmitKeyword={handleSubmitKeyword}
          enrichSuffix={enrichSuffix}
          radiusKm={radiusKm}
          placeholder={t("search.keywordPlaceholder")}
          biasLat={bias?.lat}
          biasLng={bias?.lng}
          biasRadiusKm={bias?.radiusKm}
        />
      </div>

      {/* Ward */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          {t("hero.ward")}
        </label>
        <Select
          value={wardId || "__all__"}
          onValueChange={(val) => setWardId(val === "__all__" ? "" : val)}
          disabled={!provinceId}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={!provinceId ? t("hero.selectAreaFirst") : t("search.all")} />
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

      {/* Room type */}
      {apartmentTypes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t("hero.roomType")}
          </p>
          <div className="flex flex-col gap-1.5">
            {apartmentTypes.map((at) => (
              <button
                key={at.uuid}
                onClick={() => setApartmentTypeUuid((prev) => (prev === at.uuid ? "" : at.uuid))}
                className={cn(
                  "px-3 py-2 rounded-lg border text-sm text-left transition-colors",
                  apartmentTypeUuid === at.uuid
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-background text-foreground hover:bg-secondary",
                )}
              >
                {at.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          {t("hero.priceRange")}
        </p>
        <div className="flex flex-col gap-1.5">
          {filterPrices.map((fp) => (
            <button
              key={fp.uuid}
              onClick={() => handlePriceSelect(fp.uuid)}
              className={cn(
                "px-3 py-2 rounded-lg border text-sm text-left transition-colors",
                selectedPriceUuid === fp.uuid
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-background text-foreground hover:bg-secondary",
              )}
            >
              {fp.name}
            </button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          {t("hero.areaSize")}
        </p>
        <div className="flex flex-col gap-1.5">
          {filterApartmentSizes.map((fs) => (
            <button
              key={fs.uuid}
              onClick={() => handleSizeSelect(fs.uuid)}
              className={cn(
                "px-3 py-2 rounded-lg border text-sm text-left transition-colors",
                selectedSizeUuid === fs.uuid
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-background text-foreground hover:bg-secondary",
              )}
            >
              {fs.name}
            </button>
          ))}
        </div>
      </div>

      {/* Radius */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bán kính tìm kiếm</p>
        <div className="flex flex-col gap-1.5">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setRadiusKm(r.value)}
              className={cn(
                "px-3 py-2 rounded-lg border text-sm text-left transition-colors",
                radiusKm === r.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-background text-foreground hover:bg-secondary",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col pt-16 bg-background">
      <SEO title={t("mapPage.title")} description={t("search.desc")} />
      <Navbar />

      {/* Split layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Room list panel */}
        <div
          className={cn(
            "flex flex-col border-r border-border bg-card",
            isMobile
              ? "w-full fixed inset-x-0 top-16 bottom-[4rem] z-[1100] transition-transform duration-300"
              : "w-[380px] shrink-0",
          )}
          style={isMobile ? { transform: mobileShowList ? "translateX(0)" : "translateX(-100%)" } : undefined}
        >
          {/* Header */}
          <div className="p-3 border-b border-border flex items-center gap-2">
            {isMobile ? (
              <button
                onClick={() => setMobileShowList(false)}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
              >
                <X size={18} />
              </button>
            ) : (
              <button
                onClick={() => navigate(-1)}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <p className="text-sm font-medium text-foreground flex-1">
              {allAds.length} {t("search.found")}
            </p>
            <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
              <SheetTrigger asChild>
                <button className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors">
                  <SlidersHorizontal size={14} />
                  {t("search.filter")}
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[320px] overflow-y-auto z-[1300]" overlayClassName="z-[1250]">
                <SheetHeader>
                  <SheetTitle>{t("search.filter")}</SheetTitle>
                </SheetHeader>
                <div className="mt-4">{filterContent}</div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Room cards list — infinite scroll + skeleton */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {mapLoading && visibleAds.length === 0 && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-2xl overflow-hidden border border-border">
                    <Skeleton className="aspect-[3/2] w-full" />
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-5 w-1/2" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {visibleAds.map((ad, i) => (
              <div key={ad.uuid} onMouseEnter={() => setHoveredId(ad.uuid)} onMouseLeave={() => setHoveredId(null)}>
                <AdvertisementCard data={ad} index={i} priority={i < 4} />
              </div>
            ))}
            {visibleAds.length > 0 && (
              <div ref={loadMoreRef} className="py-4 flex justify-center items-center min-h-[40px]">
                {isFetchingNextPage && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 size={16} className="animate-spin" />
                    <span>{t("search.loadingMore")}</span>
                  </div>
                )}
                {!hasNextPage && !isFetchingNextPage && visibleAds.length >= PAGE_SIZE && (
                  <span className="text-sm text-muted-foreground">{t("search.endOfResults")}</span>
                )}
              </div>
            )}
            {!mapLoading && visibleAds.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search size={32} className="text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">{t("search.noResult")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("search.noResultMapHint")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Map */}
        <div className="flex-1 relative">
          {/* Floating search bar on map */}
          <div className="absolute top-4 left-4 z-[1000] w-[calc(100%-2rem)] md:w-80">
            <LocationAutocomplete
              value={keyword}
              onChange={handleKeywordChange}
              onSelectLocation={handleLocationSelect}
              onSubmitKeyword={handleSubmitKeyword}
              enrichSuffix={enrichSuffix}
              radiusKm={radiusKm}
              placeholder={t("search.keywordPlaceholder")}
              className="w-full"
              inputClassName="bg-card shadow-lg border-border"
            />
          </div>

          <MapView
            locations={mapLocations}
            hoveredId={hoveredId}
            loading={mapLoading && mapLocations.length === 0}
            onMarkerClick={(id) => navigate(`/advertisement/${id}`)}
            flyTo={mapCenter}
            lockToRadius={lockToRadius}
            onBoundsChange={handleBoundsChange}
          />

          {/* Mobile: toggle list button */}
          {isMobile && (
            <button
              onClick={() => setMobileShowList((v) => !v)}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-primary text-primary-foreground px-4 py-2.5 rounded-full shadow-lg text-sm font-medium"
            >
              {mobileShowList ? t("search.showMap") : t("search.showList")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapSearchPage;
