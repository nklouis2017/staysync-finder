import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { httpRequest } from "@/services/index";
import provinceService, { ProvinceItem, formatLocationLabel } from "@/services/province.service";
import { useSelectedProvince } from "@/hooks/useSelectedProvince";
import { DEFAULT_PROVINCE_CODE, DEFAULT_PROVINCE_NAME } from "@/lib/province-geo";
import { cn } from "@/lib/utils";

const QUICK_PICKS: { code: string; name: string }[] = [
  { code: "01", name: "Hà Nội" },
  { code: "79", name: "TP. Hồ Chí Minh" },
  { code: "48", name: "Đà Nẵng" },
  { code: "31", name: "Hải Phòng" },
];

interface ProvincePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true (first-visit), close button is hidden — user must pick or skip. */
  forced?: boolean;
}

export const ProvincePickerModal = ({
  open,
  onOpenChange,
  forced = false,
}: ProvincePickerModalProps) => {
  const { t } = useTranslation();
  const { provinceCode, setProvince } = useSelectedProvince();
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<{ code: string; name: string } | null>(
    null,
  );

  // Preselect: existing > Hà Nội default
  useEffect(() => {
    if (!open) return;
    if (provinceCode) {
      const found = QUICK_PICKS.find((p) => p.code === provinceCode);
      setSelected(
        found ?? { code: provinceCode, name: provinceCode === DEFAULT_PROVINCE_CODE ? DEFAULT_PROVINCE_NAME : "" },
      );
    } else {
      setSelected({ code: DEFAULT_PROVINCE_CODE, name: DEFAULT_PROVINCE_NAME });
    }
    setKeyword("");
  }, [open, provinceCode]);

  const { data: provinces = [] } = useQuery<ProvinceItem[]>({
    queryKey: ["dropdown-province"],
    queryFn: () =>
      httpRequest({
        isCatalog: true,
        http: provinceService.listProvince({ keyword: "" }),
      }),
    enabled: open,
  });

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return provinces;
    return provinces.filter(
      (p) =>
        p.name.toLowerCase().includes(k) ||
        (p.nameEn || "").toLowerCase().includes(k),
    );
  }, [provinces, keyword]);

  const handleConfirm = () => {
    const choice = selected ?? { code: DEFAULT_PROVINCE_CODE, name: DEFAULT_PROVINCE_NAME };
    // If name was empty (provinceCode without lookup), try resolving from list
    let name = choice.name;
    if (!name) {
      const found = provinces.find((p) => p.code === choice.code);
      name = found?.name || DEFAULT_PROVINCE_NAME;
    }
    setProvince(choice.code, name);
    onOpenChange(false);
  };

  const handleSkip = () => {
    setProvince(DEFAULT_PROVINCE_CODE, DEFAULT_PROVINCE_NAME);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Block close on outside click when forced
        if (forced && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className={cn(
          "sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl",
          forced && "[&>button.absolute]:hidden",
        )}
        onEscapeKeyDown={(e) => {
          if (forced) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (forced) e.preventDefault();
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-2 text-left">
          <DialogTitle className="text-xl font-semibold">
            {t("provincePicker.title", "Bạn muốn tìm nhà ở đâu?")}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t(
              "provincePicker.desc",
              "Chọn tỉnh/thành phố để chúng tôi gợi ý địa điểm chính xác hơn.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pt-3 pb-2">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t(
                "provincePicker.searchPlaceholder",
                "Tìm tỉnh/thành phố...",
              )}
              className="w-full h-11 pl-9 pr-3 rounded-xl bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Quick picks */}
        <div className="px-6 pt-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {t("provincePicker.popular", "Phổ biến")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_PICKS.map((qp) => {
              const active = selected?.code === qp.code;
              return (
                <button
                  key={qp.code}
                  type="button"
                  onClick={() => setSelected(qp)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:bg-secondary",
                  )}
                >
                  <MapPin size={14} className="shrink-0" />
                  <span className="truncate">{qp.name}</span>
                  {active && <Check size={14} className="ml-auto shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Full list */}
        <div className="px-6 pt-4 pb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {t("provincePicker.all", "Tất cả tỉnh/thành phố")}
          </p>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-border divide-y divide-border bg-background">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                {t("provincePicker.empty", "Không tìm thấy")}
              </div>
            ) : (
              filtered.map((p) => {
                const active = selected?.code === p.code;
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setSelected({ code: p.code, name: p.name })}
                    className={cn(
                      "w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors",
                      active
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-secondary text-foreground",
                    )}
                  >
                    <MapPin size={14} className="shrink-0 text-muted-foreground" />
                    <span className="truncate">{formatLocationLabel(p)}</span>
                    {active && <Check size={14} className="ml-auto shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-6 py-4 border-t border-border mt-2">
          {forced && (
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
            >
              {t("provincePicker.skip", "Bỏ qua")}
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selected}
            className="ml-auto px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("provincePicker.confirm", "Xác nhận")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
