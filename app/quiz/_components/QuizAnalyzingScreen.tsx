"use client";

export default function QuizAnalyzingScreen() {
  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom max-w-2xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[40vh] md:min-h-[40vh] reveal-screen-in">
          {/* Animated analyzing spinner */}
          <div className="relative w-12 h-12 md:w-16 md:h-16 mb-4 md:mb-6">
            <div className="absolute inset-0 rounded-full border-3 md:border-4 border-slate-200" />
            <div className="absolute inset-0 rounded-full border-3 md:border-4 border-transparent border-t-amber-500 analyzing-ring-spin" />
          </div>

          <h2 className="text-base md:text-xl font-bold mb-1 md:mb-2 reveal-text-in">
            Analyzing your answers...
          </h2>
          <p className="text-slate-500 text-xs md:text-sm reveal-text-in-delay">
            Matching you with the best platforms
          </p>

          {/* Animated progress dots */}
          <div className="flex gap-1.5 md:gap-2 mt-4 md:mt-6">
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500 analyzing-dot-1" />
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500 analyzing-dot-2" />
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500 analyzing-dot-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
