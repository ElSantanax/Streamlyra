import { FaTwitch, FaYoutube, FaTiktok } from "react-icons/fa";
import { SiKick } from "react-icons/si";

const Hero = () => {
    return (
        <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 px-6 lg:px-8 overflow-hidden flex flex-col items-center">
            {/* Background Gradient Effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 flex justify-center pointer-events-none">
                <div className="absolute top-[-20%] w-200 h-150 bg-primary/20 rounded-full blur-[120px]"></div>
            </div>

            <div className="mx-auto flex flex-col items-center text-center max-w-4xl gap-8 z-10">
                <h1 className="text-white text-5xl md:text-7xl font-black leading-tight tracking-tight font-display">
                    Un chat.
                    <br />
                    <span className="text-primary">Múltiples plataformas.</span>
                </h1>

                <p className="text-slate-400 text-lg md:text-xl font-normal leading-relaxed max-w-2xl font-body flex gap-3 flex-wrap justify-center">
                    <span className="text-[#A970FF] font-semibold inline-flex items-center gap-1"><FaTwitch className="size-5" /> Twitch</span>
                    <span className="text-[#FF4B4B] font-semibold inline-flex items-center gap-1"><FaYoutube className="size-5" /> YouTube</span>
                    <span className="text-[#53FC18] font-semibold inline-flex items-center gap-1"><SiKick className="size-5" /> Kick</span>
                    <span className="text-white font-semibold inline-flex items-center gap-1"><FaTiktok className="size-5" /> TikTok</span>
                </p>
            </div>

            <div className="mt-16 md:mt-24 w-full max-w-6xl mx-auto relative z-10 px-4">
                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] bg-[#0A0A0A]/50 backdrop-blur-sm">
                    {/* Mockup Top Bar like Kiro */}
                    <div className="h-10 bg-black/80 border-b border-white/10 flex items-center px-4 gap-2 backdrop-blur-md">
                        <div className="size-3 rounded-full bg-[#FF5F56] border border-[#E0443E]"></div>
                        <div className="size-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]"></div>
                        <div className="size-3 rounded-full bg-[#27C93F] border border-[#1AAB29]"></div>
                    </div>
                    {/* Image */}
                    <div className="w-full bg-surface-dark overflow-hidden">
                        <img
                            src="/hero.png"
                            alt="Streamlyra Dashboard Preview"
                            className="w-full h-auto object-cover block"
                            width={1920}
                            height={1080}
                            fetchPriority="high"
                        />
                    </div>
                </div>

                {/* Background glow for the image */}
                <div className="absolute -inset-4 bg-primary/20 blur-[100px] -z-10 rounded-[3rem] opacity-0 md:opacity-70"></div>
            </div>
        </section>
    );
};

export default Hero;
