import { SignInButton, useUser } from "@clerk/clerk-react";
import { Authenticated, Unauthenticated, useAction } from "convex/react";
import { CheckCircle } from "lucide-react";
import { useCallback } from "react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";

export function Credits({ price }: any) {
  const { isLoaded } = useUser();
  const getImageCheckoutUrl = useAction(api.transactions.getImagePackCheckoutUrl);

  const handleCheckout = useCallback(async () => {
    try {
      const checkoutUrl = await getImageCheckoutUrl({ priceId: price.id });
      if (checkoutUrl) window.location.href = checkoutUrl;
    } catch (error) {
      console.error("Failed to get checkout URL:", error);
    }
  }, [getImageCheckoutUrl, price.id]);

  return (
    <div className="group border relative rounded-[32px] bg-white p-8 transition-all hover:scale-[1.01] hover:shadow-lg">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white to-neutral-50 rounded-[32px] -z-10" />

      <div className="inline-flex items-center gap-2 rounded-[20px] bg-[#0066CC]/10 px-4 py-2 mb-6">
        <span className="text-sm font-medium text-[#0066CC]">
          One-time Purchase
        </span>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-2xl font-semibold text-[#1D1D1F] mb-2">
            5 Image Generations
          </h3>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-medium text-[#1D1D1F]">
              ${(price.amount / 100).toFixed(2)}
            </span>
          </div>
        </div>

        <p className="text-base text-[#86868B] leading-relaxed">
          One-time payment for 5 cartoon image transformations
        </p>

        <ul className="space-y-4">
          <li className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-[#0066CC]" />
            <span className="text-base text-[#1D1D1F]">
              5 high-quality cartoon transformations
            </span>
          </li>
          <li className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-[#0066CC]" />
            <span className="text-base text-[#1D1D1F]">
              Download in full resolution
            </span>
          </li>
        </ul>

        {isLoaded && (
          <Authenticated>
            <Button
              className="w-full h-12 text-base rounded-[14px] bg-[#0066CC] hover:bg-[#0077ED] text-white shadow-sm transition-all"
              onClick={handleCheckout}
            >
              Buy Now
            </Button>
          </Authenticated>
        )}
        <Unauthenticated>
          <SignInButton mode="modal" signUpFallbackRedirectUrl="/">
            <Button className="w-full h-12 text-base rounded-[14px] bg-[#0066CC] hover:bg-[#0077ED] text-white shadow-sm transition-all">
              Buy Now
            </Button>
          </SignInButton>
        </Unauthenticated>
      </div>
    </div>
  );
}