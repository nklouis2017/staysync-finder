import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { FloatingCallButton } from "@/components/FloatingCallButton";
import { BadgePercent, Check, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";

type Promotion = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  benefits: string[];
  validity: string;
  conditions: string[];
};

const promotions: Promotion[] = [
  {
    id: "long-term-rental",
    title: "Ưu đãi thuê dài hạn",
    subtitle: "Tiết kiệm nhiều hơn khi thanh toán theo chu kỳ dài",
    description:
      "Áp dụng cho các phòng có gắn nhãn Khuyến mại trên XanhStay. Giảm trực tiếp vào tiền thuê khi bạn thanh toán theo chu kỳ 6 tháng hoặc 12 tháng.",
    benefits: [
      "Giảm 3% tiền thuê khi thanh toán theo chu kỳ 6 tháng",
      "Giảm 5% tiền thuê khi thanh toán theo chu kỳ 12 tháng",
      "Áp dụng cho tất cả phòng có nhãn Khuyến mại",
    ],
    validity: "Áp dụng đến khi có thông báo mới",
    conditions: [
      "Chỉ áp dụng cho phòng có gắn nhãn Khuyến mại",
      "Thanh toán một lần theo chu kỳ tương ứng tại thời điểm ký hợp đồng",
      "Không áp dụng đồng thời với các chương trình khuyến mại khác",
    ],
  },
];

const PromotionsPage = () => {
  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <SEO
        title="Khuyến mại - XanhStay"
        description="Các chương trình khuyến mại đang áp dụng tại XanhStay: ưu đãi thuê dài hạn, giảm giá theo chu kỳ thanh toán."
      />
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Hero */}
        <header className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 text-white p-6 sm:p-10 mb-8">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <BadgePercent size={14} /> Chương trình ưu đãi
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Khuyến mại tại XanhStay</h1>
          <p className="text-sm sm:text-base text-white/90 max-w-2xl">
            Khám phá các chương trình ưu đãi đang áp dụng để tiết kiệm chi phí thuê phòng và căn hộ.
          </p>
        </header>

        {/* Promotions list */}
        <div className="space-y-6">
          {promotions.map((p) => (
            <article
              key={p.id}
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              <div className="p-5 sm:p-7">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <BadgePercent size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold">{p.title}</h2>
                    <p className="text-sm text-muted-foreground">{p.subtitle}</p>
                  </div>
                </div>

                <p className="text-sm sm:text-base mb-5 text-foreground/90">{p.description}</p>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Quyền lợi</h3>
                    <ul className="space-y-2">
                      {p.benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Điều kiện áp dụng</h3>
                    <ul className="space-y-2">
                      {p.conditions.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 shrink-0" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3 pt-4 border-t border-border">
                  <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays size={14} /> {p.validity}
                  </div>
                  <Link
                    to="/search"
                    className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline"
                  >
                    Xem phòng áp dụng →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      <FloatingCallButton />
      <Footer />
    </div>
  );
};

export default PromotionsPage;
