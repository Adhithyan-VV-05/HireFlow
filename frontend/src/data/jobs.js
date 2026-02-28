/**
 * Mock job postings data for HireFlow AI
 */

export const jobs = [
    {
        id: 1,
        title: "Full Stack Developer",
        department: "Engineering",
        location: "San Francisco, CA",
        type: "Full-time",
        salary: "$120,000 - $160,000",
        postedDate: "2024-01-10",
        closingDate: "2024-02-10",
        status: "active",
        applicantCount: 45,
        shortlistedCount: 12,
        interviewCount: 5,
        description: "We are looking for an experienced Full Stack Developer to join our engineering team. You will be responsible for developing and maintaining web applications using modern technologies.",
        requiredSkills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS"],
        preferredSkills: ["Docker", "Kubernetes", "GraphQL"],
        minExperience: 3,
        responsibilities: [
            "Design and implement scalable web applications",
            "Collaborate with cross-functional teams",
            "Write clean, maintainable code",
            "Participate in code reviews",
            "Mentor junior developers"
        ],
        benefits: [
            "Competitive salary",
            "Health insurance",
            "401(k) matching",
            "Flexible work hours",
            "Remote work options"
        ]
    },
    {
        id: 2,
        title: "Machine Learning Engineer",
        department: "AI/ML",
        location: "New York, NY",
        type: "Full-time",
        salary: "$140,000 - $180,000",
        postedDate: "2024-01-12",
        closingDate: "2024-02-12",
        status: "active",
        applicantCount: 32,
        shortlistedCount: 8,
        interviewCount: 3,
        description: "Join our AI team to build cutting-edge machine learning solutions. You'll work on NLP, computer vision, and recommendation systems.",
        requiredSkills: ["Python", "TensorFlow", "PyTorch", "SQL", "Machine Learning"],
        preferredSkills: ["NLP", "Computer Vision", "MLOps", "Spark"],
        minExperience: 4,
        responsibilities: [
            "Develop and deploy ML models",
            "Research and implement new algorithms",
            "Optimize model performance",
            "Collaborate with data engineers",
            "Present findings to stakeholders"
        ],
        benefits: [
            "Competitive salary",
            "Research budget",
            "Conference attendance",
            "Publication support",
            "GPU access"
        ]
    },
    {
        id: 3,
        title: "Senior Backend Developer",
        department: "Engineering",
        location: "Los Angeles, CA",
        type: "Full-time",
        salary: "$130,000 - $170,000",
        postedDate: "2024-01-14",
        closingDate: "2024-02-14",
        status: "active",
        applicantCount: 28,
        shortlistedCount: 6,
        interviewCount: 2,
        description: "We need a Senior Backend Developer to architect and build our core platform services. Focus on scalability and performance.",
        requiredSkills: ["Java", "Spring Boot", "Microservices", "PostgreSQL", "Redis"],
        preferredSkills: ["Kafka", "Docker", "Kubernetes"],
        minExperience: 5,
        responsibilities: [
            "Design microservices architecture",
            "Build high-performance APIs",
            "Implement caching strategies",
            "Lead technical discussions",
            "Ensure system reliability"
        ],
        benefits: [
            "Competitive salary",
            "Stock options",
            "Health insurance",
            "Unlimited PTO",
            "Learning budget"
        ]
    },
    {
        id: 4,
        title: "Cloud Infrastructure Engineer",
        department: "DevOps",
        location: "Seattle, WA",
        type: "Full-time",
        salary: "$125,000 - $165,000",
        postedDate: "2024-01-16",
        closingDate: "2024-02-16",
        status: "active",
        applicantCount: 22,
        shortlistedCount: 5,
        interviewCount: 2,
        description: "Manage and scale our cloud infrastructure. Focus on automation, reliability, and cost optimization.",
        requiredSkills: ["AWS", "Terraform", "Docker", "Kubernetes", "Python"],
        preferredSkills: ["GCP", "Azure", "Ansible", "Prometheus"],
        minExperience: 4,
        responsibilities: [
            "Design cloud architecture",
            "Implement infrastructure as code",
            "Build CI/CD pipelines",
            "Monitor and optimize systems",
            "Ensure security compliance"
        ],
        benefits: [
            "Competitive salary",
            "Certification support",
            "Remote work",
            "Health insurance",
            "Annual bonus"
        ]
    },
    {
        id: 5,
        title: "QA Automation Engineer",
        department: "Quality Assurance",
        location: "Denver, CO",
        type: "Full-time",
        salary: "$100,000 - $130,000",
        postedDate: "2024-01-18",
        closingDate: "2024-02-18",
        status: "active",
        applicantCount: 18,
        shortlistedCount: 4,
        interviewCount: 1,
        description: "Build and maintain our test automation framework. Ensure quality across all products.",
        requiredSkills: ["Selenium", "Python", "JavaScript", "API Testing", "CI/CD"],
        preferredSkills: ["Cypress", "Jest", "Performance Testing"],
        minExperience: 3,
        responsibilities: [
            "Develop test automation scripts",
            "Maintain test frameworks",
            "Integrate tests with CI/CD",
            "Report quality metrics",
            "Collaborate with developers"
        ],
        benefits: [
            "Competitive salary",
            "Health insurance",
            "Flexible hours",
            "Remote work",
            "Training budget"
        ]
    }
];

// Job statistics
export const jobStats = {
    totalJobs: jobs.length,
    activeJobs: jobs.filter(j => j.status === 'active').length,
    totalApplicants: jobs.reduce((sum, j) => sum + j.applicantCount, 0),
    avgApplicantsPerJob: Math.round(jobs.reduce((sum, j) => sum + j.applicantCount, 0) / jobs.length),
};

export default jobs;
