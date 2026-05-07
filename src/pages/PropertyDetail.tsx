import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PropertyGallery } from "@/components/PropertyGallery";
import { ScheduleForm } from "@/components/ScheduleForm";
import { DepositButton } from "@/components/DepositButton";
import { FloatingCallButton } from "@/components/FloatingCallButton";
import { SEO } from "@/components/SEO";
import { useSavedRooms } from "@/hooks/useSavedRooms";
import { useRecentRooms } from "@/hooks/useRecentRooms";
import { useTranslation } from "react-i18next";
import advertisementService, { AdvertisementDetailData } from "@/services/advertisement.service";
import { formatVNPrice, getImageUrl, httpRequest, formatVNPhone } from "@/services/index";
import { SimilarRooms } from "@/components/SimilarRooms";
import { PropertyReviews } from "@/components/PropertyReviews";
import { ShareButton } from "@/components/ShareButton";
import {
  MapPin,
  Maximize,
  Heart,
  ChevronLeft,
  Check,
  Phone,
  Building,
  Star,
  Eye,
  Zap,
  Droplets,
  Bed,
  Sofa,
  BadgePercent,
} from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSaved, toggleSave } = useSavedRooms();
  const { addRecent } = useRecentRooms();
  const { t } = useTranslation();

  // Track recently viewed
  useEffect(() => {
    if (id) addRecent(id);
  }, [id, addRecent]);

  const {
    data: detail,
    isLoading: loading,
    error: queryError,
  } = useQuery<AdvertisementDetailData>({
    queryKey: ["advertisement-detail", id],
    queryFn: () => httpRequest({ http: advertisementService.getByUuid(id!) }),
    enabled: !!id,
  });

  const error = queryError ? t("detail.loadError") : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-16">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="aspect-[2/1] w-full rounded-2xl" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-background pt-16">
        <Navbar />
        <SEO title={t("detail.notFound")} description={t("detail.notFoundDesc")} />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground text-lg">{error || t("detail.notFoundMsg")}</p>
          <Link to="/search" className="text-primary font-medium mt-4 inline-block hover:underline">
            {t("detail.backToSearch")}
          </Link>
        </div>
      </div>
    );
  }

  const apt = detail.apartmentUu;
  const images = detail.images.map(getImageUrl);
  const address = `${apt.address}, ${apt.ward?.fullName}, ${apt.province?.fullName}`;
  const descriptionText = apt.description || detail.description || detail.title;

  // Parse point "[lat,lng]" from apartmentUu
  const mapCoords = (() => {
    try {
      const parsed = JSON.parse(String(apt.point));
      if (Array.isArray(parsed) && parsed.length >= 2) {
        const [lat, lng] = parsed.map(Number);
        if (isFinite(lat) && isFinite(lng) && !(lat === 0 && lng === 0)) {
          return { lat, lng };
        }
      }
    } catch {}
    return null;
  })();
  const manager = apt.managerUu || apt.ownerUu;
  const managerAvatar = manager?.profileImage ? getImageUrl(manager.profileImage) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: detail.title,
    description: descriptionText,
    image: images[0],
    address: {
      "@type": "PostalAddress",
      streetAddress: apt.address,
      addressLocality: apt.ward?.fullName,
      addressRegion: apt.province?.fullName,
      addressCountry: "VN",
    },
    offers: {
      "@type": "Offer",
      price: detail.price,
      priceCurrency: "VND",
      availability: "https://schema.org/InStock",
    },
    ...(apt.avgStars > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: apt.avgStars,
        reviewCount: apt.numFeedback || 1,
      },
    }),
  };

  return (
    <div className="min-h-screen bg-background pt-16">
      <SEO
        title={`${detail.title} - ${formatVNPrice(detail.price)}${t("listing.perMonth")}`}
        description={`${descriptionText.slice(0, 150)}. ${apt.apartmentSize}m², ${apt.roomCount} ${t("listing.rooms")}. ${address}`}
        ogImage={images[0]}
        ogType="article"
        jsonLd={jsonLd}
      />
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <button
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/search");
            }
          }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ChevronLeft size={16} /> {t("detail.back")}
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <PropertyGallery images={images} title={detail.title} />
        </motion.div>

        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:gap-8 mt-8">
          <div className="lg:col-span-2 space-y-6 flex flex-col contents lg:!block lg:!space-y-6">
            {/* Title, price, stats - always first */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="order-1"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-block text-xs font-bold uppercase tracking-wider text-primary bg-accent px-2 py-1 rounded">
                      {apt.apartmentTypeUu?.name || t("listing.room")}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <ShareButton title={detail.title} />
                      <motion.button
                        onClick={() => toggleSave(detail.uuid)}
                        whileTap={{ scale: 0.7 }}
                        animate={isSaved(detail.uuid) ? { scale: [1, 1.3, 0.9, 1.1, 1] } : { scale: 1 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-full border border-border hover:bg-secondary hover:shadow-md transition-all"
                      >
                        <Heart
                          size={20}
                          className={`transition-colors duration-200 ${isSaved(detail.uuid) ? "fill-destructive text-destructive" : "text-muted-foreground"}`}
                        />
                        <span className="text-sm font-medium text-foreground whitespace-nowrap">
                          {isSaved(detail.uuid) ? t("listing.savedLabel") : t("listing.saveLabel")}
                        </span>
                      </motion.button>
                    </div>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold mt-3 text-foreground break-words">{detail.title}</h1>
                  <p className="text-muted-foreground flex items-center gap-1 mt-2">
                    <MapPin size={16} /> {address}
                  </p>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mt-4">
                <span className="price-display text-3xl">{formatVNPrice(detail.price)}</span>
                <span className="text-muted-foreground text-sm">{t("listing.perMonth")}</span>
              </div>

              <div className="flex flex-wrap gap-6 mt-6 py-4 border-y border-border text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Maximize size={16} /> {apt.apartmentSize}m²
                </span>
                <span className="flex items-center gap-2">
                  <Building size={16} /> {apt.numFloor} {t("listing.floors")}
                </span>
                <span className="flex items-center gap-2">
                  <Eye size={16} /> {detail.viewCount} {t("listing.views")}
                </span>
                {apt.avgStars > 0 && (
                  <span className="flex items-center gap-2">
                    <Star size={16} className="fill-yellow-400 text-yellow-400" /> {apt.avgStars}
                  </span>
                )}
              </div>
            </motion.div>

            {descriptionText && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="order-5 lg:order-none"
              >
                <h2 className="font-semibold text-lg mb-3 text-foreground">{t("detail.description")}</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{descriptionText}</p>
              </motion.div>
            )}

            {apt.roomTypeGroups && apt.roomTypeGroups.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="order-6 lg:order-none"
              >
                <h2 className="font-semibold text-lg mb-3 text-foreground">{t("detail.roomTypes")}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {apt.roomTypeGroups.map((g) => (
                    <div
                      key={g.roomUu.uuid}
                      className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2"
                    >
                      {g.roomUu.iconPath ? (
                        <img src={getImageUrl(g.roomUu.iconPath)} alt={g.roomUu.name} className="w-4 h-4 shrink-0" />
                      ) : (
                        <Bed size={16} className="text-primary shrink-0" />
                      )}
                      {g.roomUu.name} <span className="font-semibold text-foreground">×{g.count}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {apt.furnitureTypeGroups && apt.furnitureTypeGroups.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="order-7 lg:order-none"
              >
                <h2 className="font-semibold text-lg mb-3 text-foreground">{t("detail.furniture")}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {apt.furnitureTypeGroups.map((g) => (
                    <div key={g.furnitureUu.uuid} className="flex items-center gap-2 text-sm text-muted-foreground">
                      {g.furnitureUu.iconPath ? (
                        <img
                          src={getImageUrl(g.furnitureUu.iconPath)}
                          alt={g.furnitureUu.name}
                          className="w-4 h-4 shrink-0"
                        />
                      ) : (
                        <Check size={16} className="text-primary shrink-0" />
                      )}
                      {g.furnitureUu.name} <span className="text-foreground font-medium">×{g.count}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {detail.adPrices && detail.adPrices.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="order-8 lg:order-none"
              >
                <h2 className="font-semibold text-lg mb-3 text-foreground">{t("detail.serviceCost")}</h2>
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-secondary/50">
                        <th className="text-left px-4 py-2.5 font-medium text-foreground">{t("detail.service")}</th>
                        <th className="text-right px-4 py-2.5 font-medium text-foreground">{t("detail.price")}</th>
                        <th className="text-right px-4 py-2.5 font-medium text-foreground">{t("detail.unit")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.adPrices.map((sp) => (
                        <tr key={sp.uuid} className="border-t border-border">
                          <td className="px-4 py-2.5 text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {sp.serviceUu.iconPath ? (
                                <img
                                  src={getImageUrl(sp.serviceUu.iconPath)}
                                  alt={sp.serviceUu.name}
                                  className="w-4 h-4 shrink-0"
                                />
                              ) : sp.serviceUu.type === 0 ? (
                                <Zap size={14} className="text-yellow-500" />
                              ) : sp.serviceUu.type === 1 ? (
                                <Droplets size={14} className="text-blue-500" />
                              ) : (
                                <Sofa size={14} className="text-primary" />
                              )}
                              {sp.serviceUu.name}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-foreground">
                            {formatVNPrice(sp.price)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">/{sp.serviceUu.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="order-9 lg:order-none"
            >
              <div className="bg-accent/50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("listing.deposit")}</span>
                  <span className="font-semibold text-foreground">{formatVNPrice(detail.deposit)}</span>
                </div>
                {detail.preDeposit > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("listing.preDeposit")}</span>
                    <span className="font-semibold text-foreground">{formatVNPrice(detail.preDeposit)}</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="order-3 lg:order-none">
              <h2 className="font-semibold text-lg mb-3 text-foreground">{t("detail.contact")}</h2>
              <div className="flex items-center gap-4 bg-card border border-border rounded-xl p-4">
                <Avatar className="h-12 w-12">
                  {managerAvatar && <AvatarImage src={managerAvatar} alt={manager?.name || ""} />}
                  <AvatarFallback className="bg-accent text-primary font-bold text-lg">
                    {(manager?.name || "X").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{manager?.name}</p>
                  <p className="text-sm text-muted-foreground">{t("detail.manager")}</p>
                </div>
                {detail.phoneNumber && (
                  <a
                    href={`tel:${detail.phoneNumber}`}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <Phone size={16} /> {formatVNPhone(detail.phoneNumber)}
                  </a>
                )}
              </div>
            </motion.div> */}

            {/* Google Maps Embed */}
            {mapCoords && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="order-10 lg:order-none"
              >
                <h2 className="font-semibold text-lg mb-3 text-foreground flex items-center gap-2">
                  <MapPin size={18} className="text-primary" />
                  Bản đồ
                </h2>

                {/* Khung chứa Iframe và Nút bấm */}
                <div className="relative rounded-xl overflow-hidden border border-border">
                  {/* Nút "Chỉ đường" nằm đè lên bản đồ ở góc trên bên phải */}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${mapCoords.lat},${mapCoords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white text-blue-600 px-4 py-2.5 rounded-lg text-sm font-bold shadow-lg hover:bg-gray-50 transition-all border border-gray-200"
                  >
                    <MapPin size={18} />
                    Chỉ đường
                  </a>

                  {/* Iframe bản đồ */}
                  <div style={{ width: "100%", position: "relative", paddingTop: "56.25%" }}>
                    <iframe
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      // URL dành riêng cho iframe (có output=embed)
                      src={`https://maps.google.com/maps?q=${mapCoords.lat},${mapCoords.lng}&hl=vi&z=16&output=embed`}
                    ></iframe>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar: Schedule + Deposit - shown as order-2 on mobile (after title), sticky on desktop */}
          <div className="lg:col-span-1 order-2 lg:order-none">
            <div className="lg:sticky lg:top-20 space-y-4">
              <ScheduleForm propertyTitle={detail.title} apartmentUuid={apt.uuid} advertisementUuid={detail.uuid} />
              <DepositButton />
              {detail.isJoinPromo === 1 && (
                <div className="rounded-xl border border-emerald-600/30 bg-emerald-600/5 p-4 space-y-2">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <BadgePercent size={18} className="text-emerald-600" />
                    {t("detail.promoTitle")}
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-600 mt-1 shrink-0" />
                      <span>{t("detail.promo6m")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-600 mt-1 shrink-0" />
                      <span>{t("detail.promo12m")}</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reviews section */}
        <PropertyReviews apartmentUuid={apt.uuid} />

        {/* Similar rooms section */}
        <SimilarRooms advertisementUuid={detail.uuid} />
      </div>

      {/* Sticky Bottom Bar on Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card border-t border-border px-4 py-3 flex items-center gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="flex-1 min-w-0">
          <p className="price-display text-lg leading-tight">
            {formatVNPrice(detail.price)}
            <span className="text-muted-foreground text-xs font-normal">{t("listing.perMonth")}</span>
          </p>
        </div>
        {detail.phoneNumber && (
          <a
            href={`tel:${detail.phoneNumber}`}
            className="flex items-center gap-1.5 bg-secondary text-foreground px-3 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Phone size={16} />
            Gọi
          </a>
        )}
        <button
          onClick={() => {
            const formEl = document.getElementById("schedule-form");
            if (formEl) formEl.scrollIntoView({ behavior: "smooth" });
          }}
          className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {t("schedule.title")}
        </button>
      </div>
      {/* Bottom padding for sticky bar on mobile */}
      <div className="h-20 lg:hidden" />

      <FloatingCallButton />
      <Footer />
    </div>
  );
};

export default PropertyDetail;
