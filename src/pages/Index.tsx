import { SoftBloomLayout } from "@/layouts/SoftBloomLayout";
import { QuickActions } from "@/components/QuickActions";
// #propertyofbharat
import { AppTour } from "@/components/onboarding/AppTour";

const Index = () => {
  return (
    <div className="relative min-h-screen">
      <SoftBloomLayout />
      <QuickActions />
      {/* #propertyofbharat */}
      <AppTour />
    </div>
  );
};

export default Index;
