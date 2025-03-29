import { createFileRoute } from '@tanstack/react-router';
import { useAction } from 'convex/react';
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../convex/_generated/api';
import { Credits } from '../components/credits';

export const Route = createFileRoute('/credits')({
    component: CreditsPage,
    ssr: true,
})

function CreditsPage() {
    const getPlansAction = useAction(api.transactions.getPlansPolar);
    const [plans, setPlans] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
  
    useEffect(() => {
      const fetchPlans = async () => {
        setIsLoading(true);
        try {
          const plansData = await getPlansAction();
          setPlans(plansData);
        } catch (error) {
          console.error("Error fetching plans:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchPlans();
    }, [getPlansAction]);
  
    return (
        <div className="px-4 py-12 sm:py-16 lg:py-20 max-w-6xl mx-auto">
            <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#0066CC]/10 px-4 py-2 mb-4">
                    <Sparkles className="h-4 w-4 text-[#0066CC]" />
                    <span className="text-sm font-medium text-[#0066CC]">Flexible Plans</span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold text-[#1D1D1F] mb-4">
                    Choose Your Perfect Plan
                </h1>
                <p className="text-xl text-[#86868B] max-w-2xl mx-auto">
                    Transform your photos into stunning cartoon art with our AI-powered platform. 
                    Select the plan that works best for you.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {isLoading ? (
                    <div className="col-span-2 flex justify-center py-12">
                        <div className="animate-spin h-8 w-8 border-4 border-[#0066CC] border-t-transparent rounded-full"></div>
                    </div>
                ) : (
                    plans?.items?.map((product: any) => (
                        product.prices.map((price: any) => (
                            <Credits
                                key={price.id}
                                price={price}
                            />
                        ))
                    ))
                )}
            </div>

            <div className="mt-16 bg-gradient-to-br from-[#F5F5F7] to-white rounded-3xl p-8 max-w-4xl mx-auto">
                <h2 className="text-2xl font-semibold text-[#1D1D1F] mb-4">Why Choose CartoonAI?</h2>
                <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium text-[#1D1D1F]">State-of-the-Art Technology</h3>
                        <p className="text-[#86868B]">Our AI algorithms produce the highest quality cartoon transformations available anywhere.</p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium text-[#1D1D1F]">Fast Processing</h3>
                        <p className="text-[#86868B]">Get your cartoonized images in seconds, not minutes or hours like other services.</p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium text-[#1D1D1F]">Secure & Private</h3>
                        <p className="text-[#86868B]">Your images are processed securely and never shared with third parties.</p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium text-[#1D1D1F]">Cancel Anytime</h3>
                        <p className="text-[#86868B]">No long-term commitments. Change or cancel your subscription whenever you need.</p>
                    </div>
                </div>
            </div>

            <div className="mt-12 text-center">
                <p className="text-sm text-[#86868B]">
                    All plans include our core features. Upgrade anytime to access premium capabilities.
                    <br />
                    Questions? <a href="mailto:support@cartoonai.com" className="text-[#0066CC] hover:underline">Contact our support team</a>
                </p>
            </div>
        </div>
    );
}