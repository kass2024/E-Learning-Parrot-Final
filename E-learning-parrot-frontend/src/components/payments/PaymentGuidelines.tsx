import { Building2, Smartphone, MessageCircle, GraduationCap, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type PaymentGuidelinesData = {
  packs?: Array<{
    name: string;
    online?: string;
    in_person?: string;
    from?: string;
    duration?: string;
    featured?: boolean;
  }>;
  methods?: Array<{
    type: string;
    label: string;
    account_name?: string;
    account_number?: string;
    phone?: string;
    ussd?: string;
    note?: string;
  }>;
  note?: string;
};

export const DEFAULT_PAYMENT_GUIDELINES: PaymentGuidelinesData = {
  methods: [
    {
      type: "card",
      label: "Card (Stripe)",
      note: "Pay securely with Visa, Mastercard, or Amex.",
    },
    {
      type: "momo",
      label: "MTN / Airtel Mobile Money",
      account_name: "parrotglobalstudyacademy",
      phone: "",
      ussd: "*182#",
    },
  ],
  note: "Use Stripe card or Mobile Money. Set parrotglobalstudyacademy's receiver number in Settings → Payments.",
};

/** @deprecated Prefer DEFAULT_PAYMENT_GUIDELINES */
const DEFAULT_GUIDELINES = DEFAULT_PAYMENT_GUIDELINES;

function methodIcon(type: string) {
  if (type === "bank") return Building2;
  if (type === "whatsapp") return MessageCircle;
  if (type === "card") return CreditCard;
  return Smartphone;
}

export function PaymentGuidelines({ data }: { data?: PaymentGuidelinesData | null }) {
  const guidelines = data ?? DEFAULT_GUIDELINES;
  const packs = guidelines.packs ?? [];
  const methods = guidelines.methods ?? DEFAULT_GUIDELINES.methods!;

  return (
    <Card className="rounded-2xl border-[#38761D]/20 overflow-hidden">
      <CardHeader className="bg-[#38761D] text-white pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/15 flex items-center justify-center">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg tracking-wide">parrotglobalstudyacademy</CardTitle>
            <p className="text-xs text-white/80">Course payment options</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {packs.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[#38761D] mb-2">Packs & pricing</h3>
            <ul className="space-y-2 text-sm">
              {packs.map((pack) => (
                <li key={pack.name} className="flex gap-2">
                  <span className="text-[#38761D]">•</span>
                  <span>
                    <span className="font-medium">
                      {pack.name}
                      {pack.featured ? " ★" : ""}
                    </span>
                    {pack.from ? (
                      <> — From {pack.from}</>
                    ) : (
                      <>
                        {pack.online ? <> — Online {pack.online}</> : null}
                        {pack.in_person ? <> · In person {pack.in_person}</> : null}
                      </>
                    )}
                    {pack.duration ? <> ({pack.duration})</> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-[#38761D] mb-2">How to pay</h3>
          <ul className="space-y-3 text-sm">
            {methods.map((method) => {
              const Icon = methodIcon(method.type);
              return (
                <li key={`${method.type}-${method.label}`} className="flex gap-3">
                  <Icon className="h-4 w-4 mt-0.5 shrink-0 text-[#38761D]" />
                  <div>
                    <p className="font-medium">{method.label}</p>
                    {method.account_name ? (
                      <p className="text-muted-foreground">{method.account_name}</p>
                    ) : null}
                    {method.account_number ? (
                      <p className="font-mono text-xs">{method.account_number}</p>
                    ) : null}
                    {method.phone ? (
                      <p className="font-mono text-xs">
                        {method.phone}
                        {method.ussd ? ` · USSD ${method.ussd}` : ""}
                      </p>
                    ) : null}
                    {method.note ? <p className="text-muted-foreground text-xs">{method.note}</p> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {guidelines.note ? (
          <p className="text-xs text-muted-foreground border-t pt-3">{guidelines.note}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
