// import { useState, useRef, useEffect } from 'react';
// import {
//     Send,
//     Bot,
//     User,
//     RotateCcw,
//     Clock,
//     Target,
//     TrendingUp,
//     CheckCircle,
//     Sparkles,
//     Info
// } from 'lucide-react';
// import { Layout } from '../components/layout';
// import { Button, Card, CardHeader, CardTitle, ProgressBar } from '../components/ui';
// import { ScoreCircle, StarRating } from '../components/ui/ScoreDisplay';
// import { getAllQuestions, calculateScore, aiFeedbackTemplates } from '../data/interviewQuestions';

// /**
//  * AI Interview Chatbot UI
//  * Simulates automated interview process with real-time feedback
//  */
// const InterviewChatbot = () => {
//     const [messages, setMessages] = useState([]);
//     const [currentInput, setCurrentInput] = useState('');
//     const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
//     const [isTyping, setIsTyping] = useState(false);
//     const [interviewStarted, setInterviewStarted] = useState(false);
//     const [interviewComplete, setInterviewComplete] = useState(false);
//     const [scores, setScores] = useState([]);
//     const messagesEndRef = useRef(null);

//     const questions = getAllQuestions();

//     // Auto-scroll to bottom of messages
//     const scrollToBottom = () => {
//         messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//     };

//     useEffect(() => {
//         scrollToBottom();
//     }, [messages]);

//     // Start interview
//     const startInterview = () => {
//         setInterviewStarted(true);
//         setMessages([
//             {
//                 type: 'bot',
//                 content: "Welcome to the HireFlow AI Interview! I'll be conducting your preliminary interview today. Please answer each question thoughtfully and thoroughly.",
//                 timestamp: new Date(),
//             },
//         ]);

//         // Ask first question after a delay
//         setTimeout(() => {
//             askQuestion(0);
//         }, 1500);
//     };

//     // Ask a question
//     const askQuestion = (index) => {
//         if (index >= questions.length) {
//             completeInterview();
//             return;
//         }

//         setIsTyping(true);
//         setTimeout(() => {
//             setMessages(prev => [...prev, {
//                 type: 'bot',
//                 content: questions[index].question,
//                 questionIndex: index,
//                 category: questions[index].category,
//                 timestamp: new Date(),
//             }]);
//             setIsTyping(false);
//             setCurrentQuestionIndex(index);
//         }, 1000);
//     };

//     // Handle user response
//     const handleSubmit = (e) => {
//         e.preventDefault();
//         if (!currentInput.trim() || isTyping) return;

//         const userMessage = {
//             type: 'user',
//             content: currentInput,
//             timestamp: new Date(),
//         };

//         setMessages(prev => [...prev, userMessage]);
//         setCurrentInput('');

//         // Calculate score for this response
//         const question = questions[currentQuestionIndex];
//         const responseScore = calculateScore(currentInput, question.expectedKeywords);

//         // Add score to scores array
//         setScores(prev => [...prev, {
//             questionIndex: currentQuestionIndex,
//             score: responseScore,
//             category: question.category,
//         }]);

//         // Generate AI feedback
//         setIsTyping(true);
//         setTimeout(() => {
//             const feedbackType = responseScore >= 80 ? 'excellent' :
//                 responseScore >= 60 ? 'good' :
//                     responseScore >= 40 ? 'average' : 'needsImprovement';

//             const feedbackOptions = aiFeedbackTemplates[feedbackType];
//             const feedback = feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];

//             setMessages(prev => [...prev, {
//                 type: 'feedback',
//                 content: feedback,
//                 score: responseScore,
//                 timestamp: new Date(),
//             }]);
//             setIsTyping(false);

//             // Ask next question
//             setTimeout(() => {
//                 askQuestion(currentQuestionIndex + 1);
//             }, 1500);
//         }, 1500);
//     };

//     // Complete interview
//     const completeInterview = () => {
//         setIsTyping(true);
//         setTimeout(() => {
//             setMessages(prev => [...prev, {
//                 type: 'bot',
//                 content: "Thank you for completing the interview! Your responses have been analyzed and recorded. You can view your score summary on the right panel.",
//                 timestamp: new Date(),
//             }]);
//             setIsTyping(false);
//             setInterviewComplete(true);
//         }, 1000);
//     };

//     // Reset interview
//     const resetInterview = () => {
//         setMessages([]);
//         setCurrentQuestionIndex(0);
//         setInterviewStarted(false);
//         setInterviewComplete(false);
//         setScores([]);
//         setCurrentInput('');
//     };

//     // Calculate overall statistics
//     const averageScore = scores.length > 0
//         ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
//         : 0;

//     const confidenceScore = scores.length > 0
//         ? Math.round(scores.filter(s => s.score >= 60).length / scores.length * 100)
//         : 0;

//     const relevanceScore = scores.length > 0
//         ? Math.round(scores.reduce((sum, s) => sum + Math.min(s.score + 10, 100), 0) / scores.length)
//         : 0;

//     return (
//         <Layout>
//             <div className="bg-slate-50 min-h-screen">
//                 {/* Page Header */}
//                 <div className="bg-white border-b border-slate-200">
//                     <div className="container-custom py-6">
//                         <div className="flex items-center justify-between">
//                             <div>
//                                 <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
//                                     AI Interview
//                                 </h1>
//                                 <p className="text-slate-600 mt-1">
//                                     Automated preliminary interview with real-time feedback
//                                 </p>
//                             </div>
//                             {interviewStarted && (
//                                 <Button
//                                     variant="secondary"
//                                     onClick={resetInterview}
//                                     icon={RotateCcw}
//                                 >
//                                     Restart
//                                 </Button>
//                             )}
//                         </div>
//                     </div>
//                 </div>

//                 <div className="container-custom py-8">
//                     <div className="grid lg:grid-cols-3 gap-8">
//                         {/* Chat Area - Left Column */}
//                         <div className="lg:col-span-2">
//                             <Card padding="none" className="h-[600px] flex flex-col">
//                                 {!interviewStarted ? (
//                                     // Start Screen
//                                     <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
//                                         <div className="w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary-500/25">
//                                             <Bot className="w-10 h-10 text-white" />
//                                         </div>
//                                         <h2 className="text-2xl font-bold text-slate-800 mb-3">
//                                             Ready for Your AI Interview?
//                                         </h2>
//                                         <p className="text-slate-600 max-w-md mb-8">
//                                             This automated interview will assess your communication skills and
//                                             technical knowledge through a series of questions. Take your time
//                                             and answer thoughtfully.
//                                         </p>
//                                         <div className="flex items-center gap-6 text-sm text-slate-500 mb-8">
//                                             <span className="flex items-center gap-2">
//                                                 <Clock className="w-4 h-4" />
//                                                 ~10 minutes
//                                             </span>
//                                             <span className="flex items-center gap-2">
//                                                 <Target className="w-4 h-4" />
//                                                 6 questions
//                                             </span>
//                                         </div>
//                                         <Button onClick={startInterview} size="lg" icon={Sparkles}>
//                                             Start Interview
//                                         </Button>
//                                     </div>
//                                 ) : (
//                                     <>
//                                         {/* Messages Area */}
//                                         <div className="flex-1 overflow-y-auto p-6 space-y-4">
//                                             {messages.map((message, index) => (
//                                                 <div
//                                                     key={index}
//                                                     className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
//                                                 >
//                                                     <div className={`flex gap-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
//                                                         {/* Avatar */}
//                                                         <div className={`
//                               w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
//                               ${message.type === 'user'
//                                                                 ? 'bg-primary-600'
//                                                                 : message.type === 'feedback'
//                                                                     ? 'bg-green-100'
//                                                                     : 'bg-gradient-primary'
//                                                             }
//                             `}>
//                                                             {message.type === 'user' ? (
//                                                                 <User className="w-4 h-4 text-white" />
//                                                             ) : message.type === 'feedback' ? (
//                                                                 <CheckCircle className="w-4 h-4 text-green-600" />
//                                                             ) : (
//                                                                 <Bot className="w-4 h-4 text-white" />
//                                                             )}
//                                                         </div>

//                                                         {/* Message Bubble */}
//                                                         <div className={`
//                               rounded-2xl px-4 py-3
//                               ${message.type === 'user'
//                                                                 ? 'bg-primary-600 text-white rounded-tr-md'
//                                                                 : message.type === 'feedback'
//                                                                     ? 'bg-green-50 border border-green-200 rounded-tl-md'
//                                                                     : 'bg-white border border-slate-200 rounded-tl-md shadow-sm'
//                                                             }
//                             `}>
//                                                             {message.category && (
//                                                                 <span className="text-xs font-medium text-primary-500 block mb-1">
//                                                                     {message.category}
//                                                                 </span>
//                                                             )}
//                                                             <p className={message.type === 'user' ? 'text-white' : 'text-slate-700'}>
//                                                                 {message.content}
//                                                             </p>
//                                                             {message.type === 'feedback' && message.score !== undefined && (
//                                                                 <div className="mt-2 pt-2 border-t border-green-200 flex items-center gap-2">
//                                                                     <span className="text-xs text-green-600">Response Score:</span>
//                                                                     <span className={`text-sm font-semibold ${message.score >= 80 ? 'text-green-600' :
//                                                                             message.score >= 60 ? 'text-primary-600' :
//                                                                                 'text-amber-600'
//                                                                         }`}>
//                                                                         {message.score}%
//                                                                     </span>
//                                                                 </div>
//                                                             )}
//                                                         </div>
//                                                     </div>
//                                                 </div>
//                                             ))}

//                                             {/* Typing Indicator */}
//                                             {isTyping && (
//                                                 <div className="flex justify-start">
//                                                     <div className="flex gap-3">
//                                                         <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
//                                                             <Bot className="w-4 h-4 text-white" />
//                                                         </div>
//                                                         <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md px-4 py-3">
//                                                             <div className="flex gap-1">
//                                                                 <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
//                                                                 <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce animation-delay-200" />
//                                                                 <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce animation-delay-400" />
//                                                             </div>
//                                                         </div>
//                                                     </div>
//                                                 </div>
//                                             )}

//                                             <div ref={messagesEndRef} />
//                                         </div>

//                                         {/* Input Area */}
//                                         <div className="p-4 border-t border-slate-200 bg-white">
//                                             <form onSubmit={handleSubmit} className="flex gap-3">
//                                                 <input
//                                                     type="text"
//                                                     value={currentInput}
//                                                     onChange={(e) => setCurrentInput(e.target.value)}
//                                                     placeholder={interviewComplete ? "Interview complete" : "Type your response..."}
//                                                     disabled={isTyping || interviewComplete}
//                                                     className="input flex-1"
//                                                 />
//                                                 <Button
//                                                     type="submit"
//                                                     disabled={!currentInput.trim() || isTyping || interviewComplete}
//                                                     icon={Send}
//                                                 >
//                                                     Send
//                                                 </Button>
//                                             </form>
//                                         </div>
//                                     </>
//                                 )}
//                             </Card>
//                         </div>

//                         {/* Feedback Panel - Right Column */}
//                         <div className="space-y-6">
//                             {/* Progress */}
//                             <Card>
//                                 <CardHeader>
//                                     <CardTitle className="flex items-center gap-2">
//                                         <Target className="w-5 h-5 text-primary-600" />
//                                         Interview Progress
//                                     </CardTitle>
//                                 </CardHeader>
//                                 <div className="px-6 pb-6">
//                                     <div className="flex items-center justify-between mb-2">
//                                         <span className="text-sm text-slate-600">Questions Completed</span>
//                                         <span className="font-semibold text-slate-800">
//                                             {scores.length} / {questions.length}
//                                         </span>
//                                     </div>
//                                     <ProgressBar
//                                         value={scores.length}
//                                         max={questions.length}
//                                         color="primary"
//                                         showLabel={false}
//                                     />
//                                 </div>
//                             </Card>

//                             {/* Real-time Scores */}
//                             {interviewStarted && (
//                                 <Card>
//                                     <CardHeader>
//                                         <CardTitle className="flex items-center gap-2">
//                                             <TrendingUp className="w-5 h-5 text-primary-600" />
//                                             Live Scores
//                                         </CardTitle>
//                                     </CardHeader>
//                                     <div className="px-6 pb-6 space-y-4">
//                                         <ProgressBar
//                                             value={confidenceScore}
//                                             label="Confidence Score"
//                                             color="auto"
//                                         />
//                                         <ProgressBar
//                                             value={relevanceScore}
//                                             label="Relevance Score"
//                                             color="auto"
//                                         />
//                                     </div>
//                                 </Card>
//                             )}

//                             {/* Overall Rating */}
//                             {scores.length > 0 && (
//                                 <Card>
//                                     <CardHeader>
//                                         <CardTitle>Overall Rating</CardTitle>
//                                     </CardHeader>
//                                     <div className="px-6 pb-6">
//                                         <div className="flex flex-col items-center">
//                                             <ScoreCircle score={averageScore} size="lg" />
//                                             <div className="mt-4">
//                                                 <StarRating rating={Math.round(averageScore / 20)} />
//                                             </div>
//                                             <p className={`mt-3 font-medium ${averageScore >= 80 ? 'text-green-600' :
//                                                     averageScore >= 60 ? 'text-primary-600' :
//                                                         'text-amber-600'
//                                                 }`}>
//                                                 {averageScore >= 80 ? 'Excellent Performance' :
//                                                     averageScore >= 60 ? 'Good Performance' :
//                                                         'Needs Improvement'}
//                                             </p>
//                                         </div>
//                                     </div>
//                                 </Card>
//                             )}

//                             {/* Tips */}
//                             <Card className="bg-blue-50 border-blue-200">
//                                 <div className="p-4">
//                                     <div className="flex items-start gap-3">
//                                         <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
//                                         <div>
//                                             <h4 className="font-medium text-blue-900 mb-1">Interview Tips</h4>
//                                             <ul className="text-sm text-blue-700 space-y-1">
//                                                 <li>• Be specific and provide examples</li>
//                                                 <li>• Use relevant technical terms</li>
//                                                 <li>• Structure your answers clearly</li>
//                                                 <li>• Take your time to think</li>
//                                             </ul>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </Card>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </Layout>
//     );
// };

// export default InterviewChatbot;



import { useState, useRef, useEffect } from 'react';
import {
    Send,
    Bot,
    User,
    RotateCcw,
    Clock,
    Target,
    TrendingUp,
    CheckCircle,
    Sparkles,
    Info
} from 'lucide-react';
import { Layout } from '../components/layout';
import { Button, Card, CardHeader, CardTitle, ProgressBar } from '../components/ui';
import { ScoreCircle, StarRating } from '../components/ui/ScoreDisplay';
import { getAllQuestions, calculateScore } from '../data/interviewQuestions';

/* -------------------------
   Helper: Greeting Detection
-------------------------- */
const isGreeting = (text) => {
    const greetings = [
        "hi", "hello", "hey",
        "good morning", "good afternoon",
        "good evening", "hii"
    ];
    return greetings.some(greet =>
        text.toLowerCase().includes(greet)
    );
};

/* -------------------------
   Helper: Structured Feedback
-------------------------- */
const generateStructuredFeedback = (score) => {
    let level = "";
    let tips = [];

    if (score >= 80) {
        level = "Excellent Response";
        tips = [
            "Strong clarity in explanation",
            "Relevant technical keywords used",
            "Well structured answer",
            "Demonstrates confidence"
        ];
    } else if (score >= 60) {
        level = "Good Response";
        tips = [
            "Answer is mostly relevant",
            "Could include more technical depth",
            "Add one real-world example",
            "Improve structure slightly"
        ];
    } else if (score >= 40) {
        level = "Average Response";
        tips = [
            "Needs clearer structure",
            "Missing key technical keywords",
            "Add examples to support your points",
            "Be more specific"
        ];
    } else {
        level = "Needs Improvement";
        tips = [
            "Answer is too brief or vague",
            "Missing relevant keywords",
            "Structure response in points",
            "Provide technical explanation"
        ];
    }

    return `
${level}

Key Evaluation Points:
1. ${tips[0]}
2. ${tips[1]}
3. ${tips[2]}
4. ${tips[3]}

Overall Score: ${score}%
`;
};

/* -------------------------
   MAIN COMPONENT
-------------------------- */

const InterviewChatbot = () => {
    const [messages, setMessages] = useState([]);
    const [currentInput, setCurrentInput] = useState('');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isTyping, setIsTyping] = useState(false);
    const [interviewStarted, setInterviewStarted] = useState(false);
    const [interviewComplete, setInterviewComplete] = useState(false);
    const [scores, setScores] = useState([]);
    const messagesEndRef = useRef(null);

    const questions = getAllQuestions();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    /* -------------------------
       Start Interview
    -------------------------- */
    const startInterview = () => {
        setInterviewStarted(true);

        setMessages([
            {
                type: 'bot',
                content:
                    "👋 Welcome to HireFlow AI Interview!\n\nI will ask you a series of structured questions.\n\nPlease answer clearly and in points wherever possible.",
                timestamp: new Date(),
            }
        ]);

        setTimeout(() => askQuestion(0), 1500);
    };

    /* -------------------------
       Ask Question
    -------------------------- */
    const askQuestion = (index) => {
        if (index >= questions.length) {
            completeInterview();
            return;
        }

        setIsTyping(true);

        setTimeout(() => {
            setMessages(prev => [
                ...prev,
                {
                    type: 'bot',
                    content:
                        `Question ${index + 1}:\n\n${questions[index].question}\n\nPlease answer in clear points.`,
                    category: questions[index].category,
                    timestamp: new Date(),
                }
            ]);
            setCurrentQuestionIndex(index);
            setIsTyping(false);
        }, 1000);
    };

    /* -------------------------
       Handle Submit
    -------------------------- */
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!currentInput.trim() || isTyping) return;

        const userText = currentInput.trim();

        // Greeting Handling
        if (isGreeting(userText)) {
            setMessages(prev => [
                ...prev,
                { type: 'user', content: userText },
                {
                    type: 'bot',
                    content:
                        "Hello 👋\n\nI am your AI Interview Assistant.\n\nClick 'Start Interview' when you are ready.",
                }
            ]);
            setCurrentInput('');
            return;
        }

        const userMessage = {
            type: 'user',
            content: userText,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setCurrentInput('');

        const question = questions[currentQuestionIndex];
        const responseScore = calculateScore(userText, question.expectedKeywords);

        setScores(prev => [
            ...prev,
            {
                questionIndex: currentQuestionIndex,
                score: responseScore,
                category: question.category,
            }
        ]);

        setIsTyping(true);

        setTimeout(() => {
            const structuredFeedback = generateStructuredFeedback(responseScore);

            setMessages(prev => [
                ...prev,
                {
                    type: 'feedback',
                    content: structuredFeedback,
                    score: responseScore,
                    timestamp: new Date(),
                }
            ]);

            setIsTyping(false);

            setTimeout(() => {
                askQuestion(currentQuestionIndex + 1);
            }, 1500);

        }, 1500);
    };

    /* -------------------------
       Complete Interview
    -------------------------- */
    const completeInterview = () => {
        setIsTyping(true);
        setTimeout(() => {
            setMessages(prev => [
                ...prev,
                {
                    type: 'bot',
                    content:
                        "🎉 Interview Completed Successfully!\n\nYour performance summary is displayed on the right panel.\n\nThank you for participating.",
                }
            ]);
            setInterviewComplete(true);
            setIsTyping(false);
        }, 1000);
    };

    /* -------------------------
       Reset Interview
    -------------------------- */
    const resetInterview = () => {
        setMessages([]);
        setCurrentQuestionIndex(0);
        setInterviewStarted(false);
        setInterviewComplete(false);
        setScores([]);
        setCurrentInput('');
    };

    const averageScore = scores.length
        ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
        : 0;

    const confidenceScore = scores.length
        ? Math.round(scores.filter(s => s.score >= 60).length / scores.length * 100)
        : 0;

    const relevanceScore = scores.length
        ? Math.round(scores.reduce((sum, s) => sum + Math.min(s.score + 10, 100), 0) / scores.length)
        : 0;

    /* -------------------------
       UI RENDER
    -------------------------- */

    return (
        <Layout>
            <div className="bg-slate-50 min-h-screen">
                <div className="container-custom py-8">
                    <div className="grid lg:grid-cols-3 gap-8">

                        {/* CHAT SECTION */}
                        <div className="lg:col-span-2">
                            <Card padding="none" className="h-[600px] flex flex-col">

                                {!interviewStarted ? (
                                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                        <Bot className="w-12 h-12 mb-4 text-primary-600" />
                                        <h2 className="text-xl font-bold mb-3">
                                            Ready for Your AI Interview?
                                        </h2>
                                        <Button onClick={startInterview} icon={Sparkles}>
                                            Start Interview
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                            {messages.map((msg, index) => (
                                                <div key={index} className="flex">
                                                    <div className="max-w-[80%] whitespace-pre-line bg-white border rounded-xl p-4 shadow-sm">
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            ))}
                                            {isTyping && <div>AI is typing...</div>}
                                            <div ref={messagesEndRef} />
                                        </div>

                                        <div className="p-4 border-t bg-white">
                                            <form onSubmit={handleSubmit} className="flex gap-3">
                                                <input
                                                    type="text"
                                                    value={currentInput}
                                                    onChange={(e) => setCurrentInput(e.target.value)}
                                                    placeholder={interviewComplete ? "Interview Complete" : "Type your answer..."}
                                                    disabled={isTyping || interviewComplete}
                                                    className="input flex-1"
                                                />
                                                <Button type="submit" icon={Send}>
                                                    Send
                                                </Button>
                                            </form>
                                        </div>
                                    </>
                                )}
                            </Card>
                        </div>

                        {/* SCORE PANEL */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Live Scores</CardTitle>
                                </CardHeader>
                                <div className="p-6 space-y-4">
                                    <ProgressBar value={confidenceScore} label="Confidence" />
                                    <ProgressBar value={relevanceScore} label="Relevance" />
                                </div>
                            </Card>

                            {scores.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Overall Rating</CardTitle>
                                    </CardHeader>
                                    <div className="p-6 text-center">
                                        <ScoreCircle score={averageScore} size="lg" />
                                        <StarRating rating={Math.round(averageScore / 20)} />
                                    </div>
                                </Card>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default InterviewChatbot;