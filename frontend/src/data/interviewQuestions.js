/**
 * Mock interview questions for AI Interview Chatbot
 */

export const interviewQuestions = {
    hr: [
        {
            id: 1,
            question: "Tell me about yourself and your background.",
            type: "hr",
            category: "Introduction",
            expectedKeywords: ["experience", "skills", "background", "education", "motivation"],
            maxScore: 10
        },
        {
            id: 2,
            question: "Why are you interested in this position?",
            type: "hr",
            category: "Motivation",
            expectedKeywords: ["growth", "opportunity", "passion", "challenge", "learning", "company"],
            maxScore: 10
        },
        {
            id: 3,
            question: "Describe a challenging situation you faced at work and how you handled it.",
            type: "hr",
            category: "Problem Solving",
            expectedKeywords: ["challenge", "solution", "team", "result", "learned", "approach"],
            maxScore: 10
        },
        {
            id: 4,
            question: "Where do you see yourself in 5 years?",
            type: "hr",
            category: "Career Goals",
            expectedKeywords: ["growth", "leadership", "skills", "contribution", "development"],
            maxScore: 10
        },
        {
            id: 5,
            question: "How do you handle pressure and tight deadlines?",
            type: "hr",
            category: "Stress Management",
            expectedKeywords: ["prioritize", "organize", "communicate", "focused", "calm", "plan"],
            maxScore: 10
        }
    ],
    technical: [
        {
            id: 6,
            question: "Explain the difference between REST and GraphQL APIs.",
            type: "technical",
            category: "API Design",
            expectedKeywords: ["REST", "GraphQL", "endpoints", "query", "flexibility", "overfetching"],
            maxScore: 15
        },
        {
            id: 7,
            question: "How would you optimize a slow database query?",
            type: "technical",
            category: "Database",
            expectedKeywords: ["index", "explain", "query plan", "cache", "normalize", "denormalize"],
            maxScore: 15
        },
        {
            id: 8,
            question: "Describe the concept of microservices architecture.",
            type: "technical",
            category: "System Design",
            expectedKeywords: ["services", "decoupled", "scalable", "independent", "API", "container"],
            maxScore: 15
        },
        {
            id: 9,
            question: "What is your approach to writing clean, maintainable code?",
            type: "technical",
            category: "Best Practices",
            expectedKeywords: ["testing", "documentation", "naming", "SOLID", "refactor", "review"],
            maxScore: 15
        },
        {
            id: 10,
            question: "Explain how you would handle authentication and authorization in a web application.",
            type: "technical",
            category: "Security",
            expectedKeywords: ["JWT", "OAuth", "session", "token", "roles", "permissions", "secure"],
            maxScore: 15
        }
    ]
};

// AI response templates for feedback
export const aiFeedbackTemplates = {
    excellent: [
        "Excellent response! You demonstrated comprehensive understanding of the topic.",
        "Outstanding answer showing deep knowledge and practical experience.",
        "Very impressive response with clear examples and structured thinking."
    ],
    good: [
        "Good response covering the key points effectively.",
        "Solid answer demonstrating relevant knowledge.",
        "Nice explanation with good examples."
    ],
    average: [
        "Adequate response but could benefit from more specific examples.",
        "Basic understanding shown, but more depth would strengthen the answer.",
        "Fair response. Consider elaborating on key concepts."
    ],
    needsImprovement: [
        "Response could be improved with more relevant details.",
        "Try to provide more specific examples from your experience.",
        "Consider structuring your answer with clearer points."
    ]
};

// Get all questions in order
export const getAllQuestions = () => {
    return [...interviewQuestions.hr.slice(0, 3), ...interviewQuestions.technical.slice(0, 3)];
};

// Calculate score based on keyword matching (simulated AI scoring)
export const calculateScore = (answer, expectedKeywords) => {
    const lowerAnswer = answer.toLowerCase();
    const matchedKeywords = expectedKeywords.filter(keyword =>
        lowerAnswer.includes(keyword.toLowerCase())
    );

    const keywordScore = (matchedKeywords.length / expectedKeywords.length) * 100;
    const lengthBonus = Math.min(answer.length / 50, 1) * 10; // Bonus for detailed answers

    return Math.min(Math.round(keywordScore + lengthBonus), 100);
};

export default interviewQuestions;
