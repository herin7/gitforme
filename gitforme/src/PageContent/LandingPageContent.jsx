import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState,useEffect } from 'react';
import apiClient from '../api/axiosConfig';
import {
    SparkleIcon,
    BrainCircuitIcon,
    FileTextIcon,
    CodeIcon,
    TargetIcon,
    BarChartIcon,
} from '../components/Iconsfile';
import FeatureCard from '../cards/FeatureCard';
import StepCard from '../cards/StepCard';

const LandingPageContent = () => {
    const [userCount, setUserCount] = useState(null);
    const [isCountLoading, setIsCountLoading] = useState(true);
    // Fetch the dynamic user count from the backend when the component mounts.
    useEffect(() => {
        const fetchUserCount = async () => {
            try {
                // The VITE_API_URL is handled by the default axios config
                const response = await apiClient.get('/api/stats/user-count');
                if (response.data && typeof response.data.count === 'number') {
                    setUserCount(response.data.count);
                }
            } catch (error) {
                console.error("Failed to fetch user count:", error);
                // On error, userCount remains null, so we can show a fallback.
            } finally {
                setIsCountLoading(false);
            }
        };

        fetchUserCount();
    }, []); 

    
    const renderUserCount = () => {
        if (isCountLoading) {
            return '...'; // Simple loading state
        }
        if (userCount !== null) {
            // Format number with commas, e.g., 2,500
            return `${userCount.toLocaleString()}+`;
        }
        // Fallback for API errors
        return '2,000+';
    };

    const sectionVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
                duration: 0.7,
                ease: "easeOut"
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
    };

    return (
        <motion.div initial="hidden" animate="visible" exit={{ opacity: 0, transition: { duration: 0.5 } }}>
            <motion.div
                variants={itemVariants}
                className="max-w-4xl mx-auto mt-4 mb-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-md shadow-md animate-pulse"
                role="status"
            >
                <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L15 8h6l-4.9 3.6L18 18l-6-4.4L6 18l1.9-6.4L3 8h6z" />
                    </svg>
                    <span className="font-semibold text-sm">🎉 Thanks for the overwhelming response — we have {renderUserCount()} users now!</span>
                </div>
            </motion.div>
            {/* --- Updated Service Paused Notification --- */}
  
         {/* <motion.div
                variants={itemVariants}
                className="max-w-4xl mx-auto mt-8 mb-4 p-4 bg-blue-100 border-l-4 border-blue-500 text-blue-800 rounded-md shadow-lg"
                role="alert"
            >
                <div className="flex items-center">
                    <div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="font-bold">Service Temporarily Paused</p>
                        <p className="text-sm">This is a student project and the free hosting credits have run out. I'm working to get it back online. Thanks for your understanding!</p>
                    </div>
                </div>
            </motion.div> */}

            <main className="flex flex-col items-center justify-center pt-16 md:pt-24 px-4 text-center relative overflow-hidden">
                <div className="relative z-10">
                    <SparkleIcon className="absolute top-[-3rem] left-[-5rem] w-20 h-20 text-red-300 rotate-[-15deg] opacity-50 -z-10" />
                    <SparkleIcon className="absolute top-[-1rem] right-[-5rem] w-24 h-24 text-teal-300 rotate-[20deg] opacity-50 -z-10" />

                    <motion.h1
                        variants={itemVariants}
                        className="text-5xl md:text-7xl font-bold tracking-tighter font-space-mono text-gray-900"
                    >
                        Dive into Open Source.
                    </motion.h1>
                    <motion.h1
                        variants={itemVariants}
                        className="text-5xl md:text-7xl font-bold tracking-tighter mt-1 bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-red-500 pb-2 font-space-mono"
                    >
                        Master Any Repo. Instantly.
                    </motion.h1>

                    <motion.p
                        variants={itemVariants}
                        className="mt-6 text-lg md:text-xl text-gray-700 max-w-lg mx-auto font-semibold"
                    >
                        Transform any GitHub repository into an <span className="font-bold text-gray-900">AI-powered guide</span> for newcomers and seasoned developers alike. Get structured insights, understand code, and contribute with confidence.
                    </motion.p>
                </div>
            </main>

            <motion.section variants={sectionVariants} initial="hidden" animate="visible" className="py-24 px-4">
                <div className="text-center mb-12">
                    <motion.h2
                        variants={itemVariants}
                        className="text-4xl font-bold tracking-tighter font-space-mono text-gray-900"
                    >
                        Your Journey in Three Simple Steps
                    </motion.h2>
                    <motion.p
                        variants={itemVariants}
                        className="mt-3 text-lg text-gray-700 font-medium"
                    >
                        Unlock the secrets of any codebase, ready for your next big contribution.
                    </motion.p>
                </div>
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-center items-stretch gap-8">
                    <motion.div variants={itemVariants}>
                        <StepCard number="1" title="Input & Initialize">
                            Simply paste any public GitHub repository URL. GitForme intelligently processes the codebase.
                        </StepCard>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <StepCard number="2" title="AI Analysis">
                            Our LLM-powered engine dives deep, analyzing structure, dependencies, and core logic.
                        </StepCard>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <StepCard number="3" title="Access Instant Context">
                            Receive a clear, actionable summary tailored for quick understanding or direct LLM prompting.
                        </StepCard>
                    </motion.div>
                </div>
            </motion.section>

            <motion.section variants={sectionVariants} initial="hidden" animate="visible" className="py-24 px-4 bg-white/50 backdrop-blur-sm border-y-2 border-black">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <motion.h2
                            variants={itemVariants}
                            className="text-4xl font-bold tracking-tighter font-space-mono text-gray-900"
                        >
                            Powerful Insights at Your Fingertips
                        </motion.h2>
                        <motion.p
                            variants={itemVariants}
                            className="mt-3 text-lg text-gray-700 font-medium"
                        >
                            Go from complex code to clear understanding, instantly.
                        </motion.p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <motion.div variants={itemVariants}>
                            <FeatureCard
                                icon={<BrainCircuitIcon />}
                                title="AI-Driven Architecture Overviews"
                                description="Quickly grasp the high-level design, main components, and how they interact, even without prior knowledge."
                            />
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <FeatureCard
                                icon={<FileTextIcon />}
                                title="LLM-Ready Context Summaries"
                                description="Get crisp, concise summaries perfectly formatted for pasting directly into ChatGPT, Gemini, or any other LLM."
                            />
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <FeatureCard
                                icon={<CodeIcon />}
                                title="Core Logic Extraction"
                                description="Automatically pinpoint and explain critical functions, algorithms, and the heart of the repository's operations."
                            />
                        </motion.div>
                    </div>
                </div>
            </motion.section>

            <motion.section variants={sectionVariants} initial="hidden" animate="visible" className="py-24 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <motion.h2
                            variants={itemVariants}
                            className="text-4xl font-bold tracking-tighter font-space-mono text-gray-900"
                        >
                            Empowering Your Open Source Journey
                        </motion.h2>
                        <motion.p
                            variants={itemVariants}
                            className="mt-3 text-lg text-gray-700 font-medium"
                        >
                            We're here to help you make your first pull request, faster and with confidence. 🚀
                        </motion.p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <motion.div variants={itemVariants}>
                            <FeatureCard
                                icon={<TargetIcon />}
                                title="Discover Beginner-Friendly Issues"
                                description="Navigate directly to 'good first issues' and other approachable tasks to kickstart your open source contributions."
                            />
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <FeatureCard
                                icon={<BarChartIcon />}
                                title="Comprehensive Project Metrics"
                                description="Dive into language breakdowns, active commit patterns, and key project health indicators to choose your next project wisely."
                            />
                        </motion.div>
                    </div>
                </div>
            </motion.section>

            <motion.div variants={itemVariants} className="mt-20 py-16 text-center bg-[#F9C79A]/50 border-t-2 border-b-2 border-black">
                <h3 className="text-3xl font-bold text-gray-900 mb-6 font-space-mono">Ready to Contribute?</h3>
                <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
                    Paste a GitHub repository URL in the header search bar and let GitForme illuminate your path.
                </p>
            </motion.div>
        </motion.div>
    );
}

export default LandingPageContent;