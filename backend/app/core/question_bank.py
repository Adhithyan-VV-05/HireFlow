"""Role-specific fallback interview question bank for HireFlow AI.

Provides structured, curated Multiple Choice Question (MCQ) sets across major
technical, behavioral, and situational engineering domains. Used directly or as an
infallible fallback if external LLM generation is unavailable.
"""

from typing import Dict, List, Any, Optional

# Structured MCQ questions mapped by normalized role name
QUESTION_BANK: Dict[str, List[Dict[str, Any]]] = {
    "Senior ML Engineer": [
        {
            "question": "Which statistical method is most appropriate for proactively detecting data drift in production continuous feature distributions before model performance degrades?",
            "options": {
                "A": "Kolmogorov-Smirnov (KS) test or Population Stability Index (PSI)",
                "B": "Mean Squared Error (MSE) computed against training labels",
                "C": "Cosine similarity between serialized model weights",
                "D": "Pearson correlation coefficient between input features and latency"
            },
            "correct_option": "A",
            "explanation": "The Kolmogorov-Smirnov test and Population Stability Index compare reference vs inference feature distributions without requiring immediate ground truth labels.",
            "type": "technical",
            "difficulty": "advanced",
            "skill": "MLOps",
            "expected_focus": ["KS-test/PSI statistics", "drift detection metrics", "automated retraining pipelines", "feature stores"]
        },
        {
            "question": "When serving a 70B parameter Transformer model with high concurrent throughput, what optimization provides the largest reduction in GPU memory overhead from the attention mechanism?",
            "options": {
                "A": "Increasing mini-batch size to maximum VRAM capacity",
                "B": "PagedAttention with KV cache quantization (FP8 / INT8)",
                "C": "Disabling positional embeddings during autoregressive decoding",
                "D": "Converting all feed-forward network layers to CPU offload"
            },
            "correct_option": "B",
            "explanation": "PagedAttention manages KV cache memory dynamically like virtual memory pages, eliminating fragmentation and enabling efficient KV cache quantization.",
            "type": "technical",
            "difficulty": "advanced",
            "skill": "Model Optimization",
            "expected_focus": ["quantization (INT8/FP16)", "TensorRT/ONNX", "pruning", "batching strategies", "KV caching"]
        },
        {
            "question": "In a Continuous Deployment for Machine Learning (CD4ML) pipeline, what is the safest deployment pattern for verifying a newly trained model against live user traffic without impacting end users?",
            "options": {
                "A": "Direct in-place replacement on all worker nodes during low-traffic hours",
                "B": "Shadow (dark) deployment where incoming requests are mirrored to the new model asynchronously",
                "C": "Blue-Green deployment switching 100% of traffic immediately",
                "D": "Re-training the model directly on live production cluster nodes"
            },
            "correct_option": "B",
            "explanation": "Shadow deployments duplicate real production traffic to the candidate model without exposing users to its responses, allowing safe latency and accuracy evaluation.",
            "type": "technical",
            "difficulty": "advanced",
            "skill": "MLOps & CI/CD",
            "expected_focus": ["data validation (Great Expectations)", "automated model evaluation gates", "shadow deployments", "canary releases"]
        },
        {
            "question": "A product stakeholder insists on launching a computer vision model immediately, despite the model failing fairness and recall benchmarks on underrepresented demographic groups. How should you proceed?",
            "options": {
                "A": "Deploy the model as requested and file an unassigned backlog ticket for future retraining",
                "B": "Present quantitative risk analysis comparing business downside and reputation risk to the stakeholder and establish a phased mitigation plan",
                "C": "Refuse to communicate further with the product team and escalate directly to human resources",
                "D": "Artificially adjust the classification threshold for all groups to force uniform metric numbers"
            },
            "correct_option": "B",
            "explanation": "A principal ML engineer balances business velocity with ethical stewardship by demonstrating business risk objectively and collaborating on actionable mitigations.",
            "type": "behavioral",
            "difficulty": "intermediate",
            "skill": "Communication & Ethics",
            "expected_focus": ["stakeholder management", "translating technical risk to business impact", "fairness trade-offs", "collaborative resolution"]
        },
        {
            "question": "When defining the interface contract between an upstream data engineering team and downstream ML inference services, what architectural pattern best prevents schema drift?",
            "options": {
                "A": "Direct querying of raw production database replicas without schema contracts",
                "B": "Shared Schema Registry with strict Protobuf/Avro schema versioning and automated CI validation",
                "C": "Relying on ad-hoc CSV exports sent via Slack or object storage drops",
                "D": "Having the ML service parse untyped JSON strings with permissive fallback defaults"
            },
            "correct_option": "B",
            "explanation": "A central Schema Registry with backward-compatible Protobuf or Avro schemas guarantees structural integrity and prevents silent upstream breaking changes.",
            "type": "situational",
            "difficulty": "intermediate",
            "skill": "Leadership & Collaboration",
            "expected_focus": ["API contracts", "containerization (Docker)", "shared metrics definition", "documentation standards"]
        }
    ],
    "Machine Learning Engineer": [
        {
            "question": "When training a model on a dataset with an extreme 1:1000 class imbalance (such as fraud detection), which evaluation metric provides the most reliable indicator of real performance?",
            "options": {
                "A": "Raw Classification Accuracy",
                "B": "Area Under the Precision-Recall Curve (PR-AUC / Average Precision)",
                "C": "Mean Squared Error on predicted probabilities",
                "D": "Receiver Operating Characteristic Area (ROC-AUC) regardless of false positive distribution"
            },
            "correct_option": "B",
            "explanation": "When the positive class is rare, PR-AUC focuses on true positives relative to false alarms, whereas ROC-AUC can present an overly optimistic score due to the large true negative volume.",
            "type": "technical",
            "difficulty": "intermediate",
            "skill": "Feature Engineering & Sampling",
            "expected_focus": ["SMOTE / ADASYN", "focal loss / class weighting", "PR-AUC vs ROC-AUC", "stratified sampling"]
        },
        {
            "question": "In PyTorch distributed training across multiple GPU nodes, what is the primary operational difference between DistributedDataParallel (DDP) and DataParallel (DP)?",
            "options": {
                "A": "DP spawns a separate OS process per GPU, whereas DDP runs in a single multi-threaded process",
                "B": "DDP spawns an isolated Python process per GPU avoiding Python GIL contention and uses ring-AllReduce for gradients",
                "C": "DDP can only run on a single machine, while DP is strictly for multi-node clusters",
                "D": "DDP splits model layers across GPUs, while DP replicates model weights across GPUs"
            },
            "correct_option": "B",
            "explanation": "PyTorch DDP spawns separate processes per GPU, avoids the Python GIL bottle-neck, and leverages optimized collective communication (like NCCL ring-AllReduce).",
            "type": "technical",
            "difficulty": "advanced",
            "skill": "Distributed Training",
            "expected_focus": ["DistributedDataParallel (DDP)", "Pipeline Parallelism / DeepSpeed", "memory limits", "gradient synchronization"]
        },
        {
            "question": "If your deep neural network achieves 99.2% accuracy on the training set but only 71.4% accuracy on the validation set, which intervention is most effective?",
            "options": {
                "A": "Increasing model capacity by doubling the depth and width of hidden layers",
                "B": "Applying dropout, weight decay (L2 regularization), and data augmentation",
                "C": "Removing batch normalization layers to let gradients flow unrestricted",
                "D": "Reducing training epochs and removing validation early stopping"
            },
            "correct_option": "B",
            "explanation": "High training accuracy paired with poor validation accuracy indicates severe overfitting (high variance). Regularization and data augmentation directly penalize model complexity.",
            "type": "technical",
            "difficulty": "intermediate",
            "skill": "Model Diagnostics",
            "expected_focus": ["training vs validation curves", "regularization (dropout, L2)", "data augmentation", "architecture capacity"]
        },
        {
            "question": "A deployed model shows an instantaneous 40% performance drop immediately after release, despite 95% cross-validation accuracy during offline training. What is the most likely root cause?",
            "options": {
                "A": "The GPU driver version on the inference server is too new",
                "B": "Data leakage in offline preprocessing (e.g. normalizing training data using test set statistics or future timestamps)",
                "C": "The model has too few trainable parameters",
                "D": "Cross-entropy loss was used instead of mean absolute error"
            },
            "correct_option": "B",
            "explanation": "Train-serve skew and data leakage (such as leaking target-correlated features or future data into training features) create artificially high offline scores that collapse in production.",
            "type": "situational",
            "difficulty": "intermediate",
            "skill": "Problem Solving",
            "expected_focus": ["target leakage", "train-serve skew", "time-series lookahead bias", "monitoring logs"]
        },
        {
            "question": "When an initial neural network architecture fails to beat a basic gradient-boosted decision tree baseline on tabular customer data, how should you iterate?",
            "options": {
                "A": "Keep tuning the neural network hyperparameters for weeks until it marginally beats the baseline",
                "B": "Conduct systematic feature importance analysis on the tree baseline and engineer domain features before deciding whether deep learning is warranted",
                "C": "Scrap the tree model immediately because deep learning is mandatory for modern systems",
                "D": "Blame the dataset quality and request the data collection pipeline be redesigned"
            },
            "correct_option": "B",
            "explanation": "Pragmatic ML engineering favors empirical results over complexity. Tabular data often excels with tree models, and feature engineering yields higher ROI than force-fitting deep learning.",
            "type": "behavioral",
            "difficulty": "intermediate",
            "skill": "Resilience & Adaptability",
            "expected_focus": ["rapid hypothesis testing", "error analysis", "pivot strategy", "pragmatic engineering"]
        }
    ],
    "Data Scientist": [
        {
            "question": "In an A/B test on a two-sided marketplace (e.g. ride-sharing or delivery) where treatment drivers interact with control riders, how do you prevent network interference / SUTVA violations?",
            "options": {
                "A": "Standard user-level Bernoulli randomization across all platform users",
                "B": "Cluster-based randomization by geographical market or time-sliced switchback experiments",
                "C": "Increasing the sample size by running the test for 6 consecutive months",
                "D": "Running the A/B test strictly on weekends when user behavior is identical"
            },
            "correct_option": "B",
            "explanation": "Cluster randomization (by region or market) or switchback experiments (alternating treatment/control in time windows) isolate markets to preserve the stable unit treatment value assumption.",
            "type": "technical",
            "difficulty": "advanced",
            "skill": "Experimentation & Causal Inference",
            "expected_focus": ["cluster-based randomization", "switchback experiments", "synthetic controls", "interference modeling"]
        },
        {
            "question": "When interpreting feature contributions for an ensemble tree model (LightGBM/XGBoost) in a regulated banking environment, why are SHAP (Shapley Additive exPlanations) values preferred over gain-based feature importance?",
            "options": {
                "A": "Gain-based importance is consistent across model variations, while SHAP is not",
                "B": "SHAP satisfies local accuracy and consistency properties based on cooperative game theory, preventing bias toward high-cardinality features",
                "C": "SHAP values can only be computed for linear models",
                "D": "Gain-based importance requires exponential runtime complexity compared to SHAP"
            },
            "correct_option": "B",
            "explanation": "Tree SHAP provides fair, mathematically consistent attributions with local accuracy, unlike impurity/gain metrics which disproportionately inflate continuous or high-cardinality variables.",
            "type": "technical",
            "difficulty": "intermediate",
            "skill": "Model Selection",
            "expected_focus": ["SHAP values", "feature interactions", "sample size constraints", "regulatory explainability"]
        },
        {
            "question": "In medical screening for a rare, life-threatening condition where a false negative is catastrophic but a false positive requires only a routine confirmatory test, which threshold optimization is correct?",
            "options": {
                "A": "Optimize for maximum specificity at the cost of sensitivity",
                "B": "Lower the classification threshold to maximize Recall / True Positive Rate while maintaining an acceptable False Positive tolerance",
                "C": "Set the threshold strictly at 0.50 probability",
                "D": "Optimize solely for Accuracy to maximize total correct classifications"
            },
            "correct_option": "B",
            "explanation": "When false negatives have high costs, lowering the decision threshold increases recall, ensuring nearly all true cases are flagged for follow-up testing.",
            "type": "technical",
            "difficulty": "intermediate",
            "skill": "Evaluation Metrics",
            "expected_focus": ["Precision-Recall curves", "Cost-sensitive matrix", "Expected Value framework", "Recall at Fixed False Positive Rate"]
        },
        {
            "question": "When presenting statistical conclusions that contradict executive intuition, what approach most effectively drives data-informed alignment?",
            "options": {
                "A": "Present raw mathematical equations and dismiss executive concerns as non-technical bias",
                "B": "Anchor the presentation on business outcomes, visualize confidence intervals, explain underlying mechanisms, and propose a small-scale pilot test",
                "C": "Silently alter the findings to conform to executive expectations",
                "D": "Refuse to share intermediate findings until the project is completely finalized"
            },
            "correct_option": "B",
            "explanation": "Effective data science pairs rigorous statistical integrity with empathetic business translation and low-risk empirical validation.",
            "type": "behavioral",
            "difficulty": "intermediate",
            "skill": "Stakeholder Communication",
            "expected_focus": ["data storytelling", "confidence intervals", "empathy for domain intuition", "low-risk pilot tests"]
        },
        {
            "question": "Your team receives five high-priority ad-hoc analysis requests from different departments simultaneously. How do you triage them effectively?",
            "options": {
                "A": "Fulfill requests on a first-come, first-served basis regardless of business impact",
                "B": "Evaluate each request based on strategic alignment with company OKRs, decision urgency, and expected ROI, then communicate clear timelines",
                "C": "Work overtime to complete all five simultaneously without quality checks",
                "D": "Delegate all requests to junior team members without guidance"
            },
            "correct_option": "B",
            "explanation": "Strategic prioritization weighs business value against effort and aligns delivery with core organizational objectives transparently.",
            "type": "situational",
            "difficulty": "intermediate",
            "skill": "Prioritization & Strategy",
            "expected_focus": ["business impact vs effort matrix", "alignment with company OKRs", "transparent communication"]
        }
    ],
    "Data Analyst": [
        {
            "question": "Which SQL technique is most effective for calculating a 7-day rolling average of user transactions across a table with millions of rows?",
            "options": {
                "A": "Correlated subqueries inside the SELECT clause for each row",
                "B": "Window function: AVG(amount) OVER (PARTITION BY user_id ORDER BY transaction_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)",
                "C": "Self-joining the table on transaction_date = transaction_date - 7",
                "D": "Using a CROSS JOIN between transactions and a date dimension table"
            },
            "correct_option": "B",
            "explanation": "Window functions compute rolling aggregates over partitioned data in a single scan without the quadratic overhead of correlated subqueries or cartesian joins.",
            "type": "technical",
            "difficulty": "intermediate",
            "skill": "SQL Optimization",
            "expected_focus": ["execution plan analysis (EXPLAIN)", "indexing strategies", "partitioning", "avoiding Cartesian joins"]
        },
        {
            "question": "When conducting a cohort retention analysis, what constitutes the fundamental definition of a 'cohort'?",
            "options": {
                "A": "Any random sample of users active on the platform today",
                "B": "A group of users who experienced a common event (such as sign-up or first purchase) within a specific time window",
                "C": "Users who generate more than the average monthly revenue",
                "D": "The subset of users who never submit customer support tickets"
            },
            "correct_option": "B",
            "explanation": "A cohort is defined by a shared characteristic or lifecycle event (e.g. signup month) tracked longitudinally to observe behavioral patterns.",
            "type": "technical",
            "difficulty": "intermediate",
            "skill": "Cohort Analysis",
            "expected_focus": ["cohort grouping by signup date", "retention curves", "behavioral segmentation", "actionable insights"]
        },
        {
            "question": "When designing an executive dashboard in Power BI or Tableau, which design choice best reduces cognitive load for decision-makers?",
            "options": {
                "A": "Placing 25 small charts with vibrant 3D pie charts on a single dense canvas",
                "B": "Establishing a clear visual hierarchy with top-line KPIs prominently positioned, followed by trend lines and drill-down filters",
                "C": "Omitting axis labels to preserve whitespace",
                "D": "Using a different custom color palette for every single chart"
            },
            "correct_option": "B",
            "explanation": "Effective visual hierarchy guides the eye from high-level operational health metrics down to root causes with purposeful color and layout consistency.",
            "type": "technical",
            "difficulty": "intermediate",
            "skill": "Data Visualization",
            "expected_focus": ["visual hierarchy", "top-line KPIs vs drill-downs", "color theory for data", "fast load performance"]
        },
        {
            "question": "You discover that a weekly marketing dashboard reports a 200% surge in user signups, but transaction counts are unchanged. What is your first investigative step?",
            "options": {
                "A": "Publish a press release celebrating the sudden influx of signups",
                "B": "Inspect the ETL pipeline logs and raw sign-up records for bot traffic, duplicate accounts, or upstream database tracking changes",
                "C": "Delete the dashboard and start over from scratch",
                "D": "Modify the visual display to manually divide the signup count by two"
            },
            "correct_option": "B",
            "explanation": "Auditing data lineage, tracking mechanisms, and raw database logs identifies whether the anomaly is a data quality issue or bot activity before publishing.",
            "type": "situational",
            "difficulty": "intermediate",
            "skill": "Data Quality & Auditing",
            "expected_focus": ["root cause analysis", "data lineage tracking", "alerting mechanisms", "collaborating with engineering"]
        },
        {
            "question": "How do you explain the difference between correlation and causation to business stakeholders who want to alter product strategy based on an observational correlation?",
            "options": {
                "A": "Tell them that statistical theory is too difficult for non-technical managers to comprehend",
                "B": "Use an intuitive real-world analogy (e.g. ice cream sales and sunburns) and suggest an A/B test to isolate the causal mechanism",
                "C": "Agree with their proposal because strong correlations always imply causation in business",
                "D": "Insist on shutting down all marketing initiatives until a PhD statistician reviews it"
            },
            "correct_option": "B",
            "explanation": "Accessible analogies convey confounding variables clearly and lead naturally to recommending randomized controlled experiments.",
            "type": "behavioral",
            "difficulty": "entry",
            "skill": "Communication",
            "expected_focus": ["clear analogies", "avoiding jargon", "focusing on business decision boundaries"]
        }
    ],
    "Software Engineer": [
        {
            "question": "Which algorithm is best suited for implementing a distributed API rate limiter that smoothly handles bursts while strictly enforcing an average rate limit in Redis?",
            "options": {
                "A": "Round Robin DNS routing",
                "B": "Token Bucket or Leaky Bucket with sliding window counters",
                "C": "Linear probing hash map in local server memory",
                "D": "Two-phase commit locking on the user record"
            },
            "correct_option": "B",
            "explanation": "The Token Bucket algorithm allows configurable burst capacity while constraining the average consumption rate efficiently using Redis Lua scripts.",
            "type": "technical",
            "difficulty": "advanced",
            "skill": "System Design",
            "expected_focus": ["token bucket / leaky bucket", "Redis sliding window", "concurrency & race conditions", "graceful degradation"]
        },
        {
            "question": "What is the key functional difference between optimistic locking and pessimistic locking in relational database transactions?",
            "options": {
                "A": "Pessimistic locking relies on record version numbers; optimistic locking acquires exclusive database locks immediately",
                "B": "Optimistic locking checks version/timestamp columns at commit time; pessimistic locking locks records (e.g. SELECT FOR UPDATE) for the duration of the transaction",
                "C": "Optimistic locking cannot be used in PostgreSQL or MySQL",
                "D": "Pessimistic locking never causes deadlock conditions"
            },
            "correct_option": "B",
            "explanation": "Optimistic locking assumes conflicts are rare and verifies record version on write, while pessimistic locking holds exclusive row locks to prevent concurrent modifications.",
            "type": "technical",
            "difficulty": "intermediate",
            "skill": "Databases & Concurrency",
            "expected_focus": ["version numbers", "SELECT ... FOR UPDATE", "contention overhead", "deadlock prevention"]
        },
        {
            "question": "Under high load, a backend microservice experiences a gradual memory leak that eventually triggers the Linux OOM (Out Of Memory) killer. What is the most systematic diagnosis workflow?",
            "options": {
                "A": "Add more RAM to the server without investigating application code",
                "B": "Capture heap dumps during steady-state and under load, analyze object retention graphs with a profiler, and inspect unclosed connections or unbounded caches",
                "C": "Restart the container every 10 minutes using a cron job",
                "D": "Disable logging and garbage collection entirely"
            },
            "correct_option": "B",
            "explanation": "Differential heap dump analysis and profiling identify the exact object classes, caches, or unclosed resource handles preventing garbage collection.",
            "type": "technical",
            "difficulty": "advanced",
            "skill": "Debugging & Performance",
            "expected_focus": ["profilers (pprof/py-spy)", "heap dumps", "APM distributed tracing", "thread pools and GC analysis"]
        },
        {
            "question": "During a pull request review, a teammate strongly prefers their own coding style over the team's established architecture pattern. How should you resolve the disagreement?",
            "options": {
                "A": "Reject the pull request without explanation until they yield",
                "B": "Refer to the team's documented style guide and architectural principles, focus comments on maintainability and testability, and discuss synchronously if needed",
                "C": "Approve the code immediately to avoid interpersonal friction",
                "D": "Complain about the developer in an all-hands channel"
            },
            "correct_option": "B",
            "explanation": "Anchoring code reviews in established standards, focusing objectively on maintainability, and fostering open dialogue prevents subjective debates.",
            "type": "behavioral",
            "difficulty": "intermediate",
            "skill": "Teamwork & Code Review",
            "expected_focus": ["objective benchmarks", "separation of style vs architecture", "focusing on maintainability", "respectful discourse"]
        },
        {
            "question": "Your engineering manager asks you to bypass automated unit tests to hit an aggressive Friday deployment deadline. How do you respond?",
            "options": {
                "A": "Silently disable all tests and deploy immediately",
                "B": "Transparently articulate the regression risk, identify the non-negotiable critical test suite for core business logic, and propose scoping down secondary features instead",
                "C": "Threaten to resign on the spot",
                "D": "Falsify test reports to indicate 100% code coverage"
            },
            "correct_option": "B",
            "explanation": "Pragmatic engineers communicate trade-offs honestly, safeguard critical business pathways, and offer constructive alternatives like scope reduction.",
            "type": "situational",
            "difficulty": "intermediate",
            "skill": "Pragmatic Engineering",
            "expected_focus": ["testing critical business logic first", "test automation in CI", "refactoring debt management"]
        }
    ],
    "Full Stack Developer": [
        {
            "question": "In a modern React application, what is the primary architectural benefit of utilizing server-state libraries like TanStack Query (React Query) over global Redux state?",
            "options": {
                "A": "React Query eliminates the need for any CSS styling files",
                "B": "It natively manages asynchronous caching, background invalidation, request deduplication, and stale-while-revalidate lifecycles out of the box",
                "C": "React Query executes all component rendering on the backend Node.js server only",
                "D": "It replaces REST APIs with WebSockets automatically"
            },
            "correct_option": "B",
            "explanation": "TanStack Query decouples server cache management (deduplication, polling, caching, error states) from client-only UI state, eliminating massive Redux boilerplate.",
            "type": "technical",
            "difficulty": "intermediate",
            "skill": "Frontend Architecture",
            "expected_focus": ["React Query / SWR / Redux Toolkit", "memoization (useMemo/useCallback)", "cache invalidation", "optimistic updates"]
        },
        {
            "question": "When storing authentication tokens in web applications, why are HttpOnly, Secure, SameSite=Strict cookies generally considered safer than browser localStorage?",
            "options": {
                "A": "HttpOnly cookies are immune to Cross-Site Scripting (XSS) token extraction because JavaScript cannot read them",
                "B": "localStorage tokens expire automatically after 15 minutes",
                "C": "Cookies cannot be sent across HTTPS connections",
                "D": "localStorage does not support storing string values"
            },
            "correct_option": "A",
            "explanation": "The HttpOnly flag blocks client-side scripts from reading the cookie, directly protecting the authentication token if an XSS vulnerability exists.",
            "type": "technical",
            "difficulty": "intermediate",
            "skill": "Authentication & Security",
            "expected_focus": ["XSS vs CSRF mitigation", "token expiration & refresh tokens", "SameSite attribute", "statelessness"]
        },
        {
            "question": "When executing a zero-downtime database migration that involves renaming a production database column used by an active API, what pattern should you follow?",
            "options": {
                "A": "Run an immediate ALTER TABLE RENAME COLUMN query during peak hours",
                "B": "The Expand and Contract pattern: add new column, dual-write to both, backfill historical data, switch reads, and finally remove the old column",
                "C": "Take the database offline for 4 hours while running data scripts",
                "D": "Store all new values in an unstructured JSON column instead"
            },
            "correct_option": "B",
            "explanation": "The Expand-and-Contract (Parallel Run) pattern ensures both old and new code versions run concurrently with zero downtime and safe rollback capabilities.",
            "type": "technical",
            "difficulty": "advanced",
            "skill": "Backend Architecture & DB",
            "expected_focus": ["expand and contract pattern", "non-breaking field additions", "blue/green or rolling deploys", "deprecation cycles"]
        },
        {
            "question": "A frontend search input triggers a backend SQL query on every keystroke, resulting in severe database connection saturation. What is the immediate frontend remediation?",
            "options": {
                "A": "Increase backend server count to 100 instances",
                "B": "Debounce the input event (e.g. 300ms) and cancel stale in-flight HTTP requests using AbortController",
                "C": "Convert the input to a password field",
                "D": "Disable user search capabilities"
            },
            "correct_option": "B",
            "explanation": "Debouncing postpones query execution until the user pauses typing, and AbortController terminates obsolete prior requests, protecting backend capacity.",
            "type": "situational",
            "difficulty": "intermediate",
            "skill": "End-to-End Problem Solving",
            "expected_focus": ["query profiling", "indexing & pagination", "server-side filtering vs client rendering", "perceived latency"]
        },
        {
            "question": "How do you establish seamless collaboration between frontend and backend developers working concurrently on an unreleased feature?",
            "options": {
                "A": "Have frontend developers wait until backend developers have completely finished and deployed code before starting",
                "B": "Define and agree upon an OpenAPI / TypeScript contract specification upfront and generate mock endpoints for client development",
                "C": "Allow each engineer to implement whatever property names they prefer and fix mismatches in production",
                "D": "Eliminate API contracts and pass all data as raw text blobs"
            },
            "correct_option": "B",
            "explanation": "Contract-first development with OpenAPI / JSON Schema unblocks frontend work through automated mocks and shared types while backend builds the implementation.",
            "type": "behavioral",
            "difficulty": "intermediate",
            "skill": "Collaboration & Standards",
            "expected_focus": ["OpenAPI / Swagger specs", "TypeScript shared types", "contract testing", "early mock endpoints"]
        }
    ],
    "Backend Developer": [
        {
            "question": "When consuming messages from an Apache Kafka topic, which mechanism guarantees idempotency and exactly-once processing semantics at the consumer application layer?",
            "options": {
                "A": "Relying solely on Kafka auto-commit intervals without database transaction tracking",
                "B": "Maintaining an idempotent consumer tracking table with unique message IDs / transactional outbox pattern",
                "C": "Setting consumer concurrency to zero",
                "D": "Deleting the topic after reading each message"
            },
            "correct_option": "B",
            "explanation": "Consumer-side deduplication using unique message keys inside an ACID transaction ensures that reprocessing duplicates produces no adverse side effects.",
            "type": "technical",
            "difficulty": "advanced",
            "skill": "Distributed Messaging",
            "expected_focus": ["partition keys", "idempotent consumer keys", "outbox pattern", "dead letter queues"]
        },
        {
            "question": "What is the most effective approach for mitigating a 'thundering herd' (cache stampede) event when a popular cache key expires in Redis?",
            "options": {
                "A": "Setting the cache key TTL to 1 second so it expires rapidly",
                "B": "Using distributed mutex locks or probabilistic early expiration algorithms (like XFetch) to recompute before expiration",
                "C": "Restarting Redis every time an alert triggers",
                "D": "Disabling caching entirely so queries hit the database directly"
            },
            "correct_option": "B",
            "explanation": "Mutex locks allow only one worker to refresh the expired key while others wait, and probabilistic early expiration recalculates hot keys before expiration occurs.",
            "type": "technical",
            "difficulty": "advanced",
            "skill": "Caching Strategies",
            "expected_focus": ["probabilistic early expiration (XFetch)", "mutex locks", "bloom filters", "cache warming"]
        },
        {
            "question": "Under PostgreSQL, which transaction isolation level prevents both non-repeatable reads and phantom reads?",
            "options": {
                "A": "Read Uncommitted",
                "B": "Read Committed",
                "C": "Serializable",
                "D": "Auto-Commit"
            },
            "correct_option": "C",
            "explanation": "Serializable isolation guarantees that concurrent execution yields the exact same state as if transactions executed serially, preventing phantom reads and anomalies.",
            "type": "technical",
            "difficulty": "intermediate",
            "skill": "Databases & Concurrency",
            "expected_focus": ["pool sizing vs CPU cores", "Read Committed vs Repeatable Read", "avoiding long-running transactions", "PGBouncer/HikariCP"]
        },
        {
            "question": "A production microservice encounters a sudden database deadlock storm during an unexpected traffic spike. What is the immediate recovery priority?",
            "options": {
                "A": "Drop all database foreign key constraints immediately",
                "B": "Enable circuit breakers, apply aggressive query timeouts, shed non-essential load, and analyze lock graph traces to fix lock acquisition ordering",
                "C": "Increase database connection pool size to 10,000",
                "D": "Power down the entire datacenter"
            },
            "correct_option": "B",
            "explanation": "Failing fast via circuit breakers and timeouts arrests cascading failure, while enforcing consistent lock ordering eliminates cyclical deadlock wait chains.",
            "type": "situational",
            "difficulty": "advanced",
            "skill": "Incident Response",
            "expected_focus": ["circuit breakers", "lock ordering", "query timeouts", "graceful degradation under load"]
        },
        {
            "question": "When refactoring a legacy monolithic backend application into decoupled microservices, which strategy minimizes business disruption?",
            "options": {
                "A": "The 'Big Bang' rewrite: pause feature development for 18 months and replace everything at once",
                "B": "The Strangler Fig pattern: incrementally route specific domain bounded contexts to new services behind an API gateway",
                "C": "Copy the monolithic code into 20 repositories without separating data stores",
                "D": "Rewrite the codebase in an obscure programming language"
            },
            "correct_option": "B",
            "explanation": "The Strangler Fig pattern replaces functional slices incrementally behind a reverse proxy, preserving business continuity and validating each step.",
            "type": "behavioral",
            "difficulty": "intermediate",
            "skill": "Architecture & Strategy",
            "expected_focus": ["strangler fig pattern", "domain-driven design", "incremental verification", "metric observability"]
        }
    ],
    "Frontend Developer": [
        {
            "question": "To optimize Largest Contentful Paint (LCP) in a web application where the LCP element is a high-resolution hero image, which optimization is most effective?",
            "options": {
                "A": "Inject the hero image via dynamic JavaScript after window.onload fires",
                "B": "Use `<link rel='preload' as='image'>` with modern image formats (WebP/AVIF), proper `srcset`, and fetchpriority='high'",
                "C": "Convert the image to an uncompressed 20MB PNG file",
                "D": "Place the image inside an invisible iframe"
            },
            "correct_option": "B",
            "explanation": "Preloading with priority='high' and responsive modern image formats enables the browser to discover and render the critical visual asset immediately in the waterfall.",
            "type": "technical",
            "difficulty": "intermediate",
            "skill": "Web Performance",
            "expected_focus": ["DOM/CSSOM construction", "code splitting & lazy loading", "image optimization / modern formats", "font display swap"]
        },
        {
            "question": "When building an accessible modal dialog in React (WCAG 2.1 AA compliant), which requirement is mandatory for screen reader and keyboard accessibility?",
            "options": {
                "A": "Trap focus inside the modal while open, assign role='dialog', link aria-labelledby, and restore focus on close with Escape key support",
                "B": "Ensure the modal cannot be closed using the Escape key",
                "C": "Use only `<div>` tags with custom onClick handlers and avoid tabindex",
                "D": "Display the modal with opacity: 0.01 instead of unmounting"
            },
            "correct_option": "A",
            "explanation": "Accessible modal dialogs require proper ARIA roles, focus management (trapping while open, restoring on dismiss), and keyboard event handlers (ESC).",
            "type": "technical",
            "difficulty": "intermediate",
            "skill": "Accessibility (a11y)",
            "expected_focus": ["ARIA roles and attributes", "keyboard navigation & focus trapping", "screen reader announcements", "semantic HTML"]
        },
        {
            "question": "What is the primary trade-off of Server-Side Rendering (SSR) compared to Static Site Generation (SSG)?",
            "options": {
                "A": "SSR renders pages once at build time; SSG renders on every HTTP request",
                "B": "SSR generates dynamic HTML on every request requiring server compute and TTFB overhead, whereas SSG serves pre-rendered assets instantly from CDN edges",
                "C": "SSR cannot be indexed by search engines",
                "D": "SSG applications cannot utilize JavaScript for client-side interactivity"
            },
            "correct_option": "B",
            "explanation": "SSG produces static files at build time for instant CDN delivery, while SSR executes on-demand on the server for each request to render live user-specific data.",
            "type": "technical",
            "difficulty": "intermediate",
            "skill": "Frontend Architecture",
            "expected_focus": ["hydration overhead", "SEO implications", "time to first byte (TTFB)", "caching at CDN edge"]
        },
        {
            "question": "How should you implement a React Error Boundary to prevent an uncaught rendering error in a secondary sidebar component from crashing the entire app?",
            "options": {
                "A": "Wrap the sidebar in a class component implementing static getDerivedStateFromError and componentDidCatch to render a graceful fallback UI",
                "B": "Wrap the sidebar in a standard try/catch block inside the component return statement",
                "C": "Use window.onerror to suppress all console errors silently",
                "D": "Avoid using React components altogether"
            },
            "correct_option": "A",
            "explanation": "React Error Boundaries catch JavaScript errors anywhere in their child component tree, log errors, and display a fallback UI instead of crashing the tree.",
            "type": "situational",
            "difficulty": "intermediate",
            "skill": "Reliability & Error Handling",
            "expected_focus": ["componentDidCatch / ErrorBoundary", "fallback UIs", "error reporting (Sentry)", "state recovery"]
        },
        {
            "question": "A product designer submits a layout featuring extensive real-time blur and backdrop filters that causes mobile devices to drop to 15 frames per second. How do you resolve this?",
            "options": {
                "A": "Implement the design verbatim and disregard mobile performance",
                "B": "Demonstrate the frame rate telemetry to the designer, explain GPU compositing limits, and collaboratively design a clean alternative with CSS variables or simplified styling",
                "C": "Silently redesign the feature without informing the design team",
                "D": "Delete the designer's mockup files"
            },
            "correct_option": "B",
            "explanation": "Constructive cross-functional collaboration pairs empirical performance evidence with viable design compromises to preserve both UX aesthetics and fluid frame rates.",
            "type": "behavioral",
            "difficulty": "intermediate",
            "skill": "Design Collaboration",
            "expected_focus": ["constructive technical feedback", "visual fidelity vs frame rates", "interactive prototypes", "shared design systems"]
        }
    ],
    "AI Engineer": [
        {
            "question": "When designing a production Retrieval-Augmented Generation (RAG) system, which strategy best mitigates hallucinations and addresses retrieval gaps?",
            "options": {
                "A": "Relying solely on a single dense vector search without chunking",
                "B": "Hybrid search (combining dense embeddings with BM25 keyword search), semantic re-ranking (e.g. Cross-Encoder), and citation grounding",
                "C": "Increasing the model temperature to 1.5",
                "D": "Removing the system prompt entirely"
            },
            "correct_option": "B",
            "explanation": "Hybrid search captures both semantic similarity and exact keyword matches, while cross-encoder rerankers prioritize the most relevant context chunks for generation.",
            "type": "technical",
            "difficulty": "advanced",
            "skill": "RAG Architectures",
            "expected_focus": ["hybrid dense/sparse retrieval", "chunking strategies", "reranking models (Cohere/BGE)", "Ragas/TruLens evaluation"]
        },
        {
            "question": "Which inference serving technique enables continuous batching of LLM requests with variable input and output token lengths without padding waste?",
            "options": {
                "A": "Static batching with fixed maximum sequence length padding",
                "B": "Cellular Automata scheduling",
                "C": "Iteration-level scheduling (continuous batching) with PagedAttention (as implemented in vLLM)",
                "D": "Serial single-request processing with CPU threading"
            },
            "correct_option": "C",
            "explanation": "Iteration-level continuous batching schedules requests at each generation token iteration rather than request completion, dramatically elevating GPU utilization.",
            "type": "technical",
            "difficulty": "advanced",
            "skill": "LLM Serving & Latency",
            "expected_focus": ["vLLM / continuous batching", "PagedAttention", "speculative decoding", "streaming responses"]
        },
        {
            "question": "For high-speed similarity search across 10 million 1536-dimensional embedding vectors, which vector index balances fast query latency with high recall?",
            "options": {
                "A": "Flat / Exact exhaustive L2 search",
                "B": "Hierarchical Navigable Small World (HNSW) graph index with IVF (Inverted File) quantization",
                "C": "Binary search tree on the first dimension",
                "D": "B-Tree index in SQLite"
            },
            "correct_option": "B",
            "explanation": "HNSW constructs multi-layer proximity graphs providing logarithmic search complexity with high recall (>95%) for multi-million vector datasets.",
            "type": "technical",
            "difficulty": "intermediate",
            "skill": "Vector Databases",
            "expected_focus": ["normalized vectors vs dot product", "index build time vs query recall", "memory footprint", "HNSW graph parameters"]
        },
        {
            "question": "An external user attempts an indirect prompt injection attack by embedding malicious instructions inside a PDF analyzed by your LLM app. How do you defend against it?",
            "options": {
                "A": "Trust the LLM to ignore user instructions automatically",
                "B": "Implement multi-layered defense: input content sanitization, clear delimiter framing, separate system vs data roles, and an independent validator / guardrail model",
                "C": "Increase the maximum token output limit",
                "D": "Execute all user-supplied prompt code directly in an unconstrained shell"
            },
            "correct_option": "B",
            "explanation": "Indirect prompt injections require defense in depth: semantic guardrails (NeMo Guardrails, Llama Guard), structured message isolation, and least-privilege tool execution.",
            "type": "situational",
            "difficulty": "intermediate",
            "skill": "AI Safety & Security",
            "expected_focus": ["input guardrails (NeMo)", "output sanitization", "system prompt isolation", "least privilege tooling"]
        },
        {
            "question": "Every week brings dozens of new AI framework releases and paper preprints. How do you decide which innovations to introduce into company production stacks?",
            "options": {
                "A": "Re-architect production immediately whenever a trending tweet announces a new library",
                "B": "Evaluate against concrete production benchmarks (latency, cost per token, reliability), build rapid prototypes in a sandbox, and verify ROI before adoption",
                "C": "Refuse to adopt any model or technology released after 2018",
                "D": "Outsource all architectural decisions to social media polls"
            },
            "correct_option": "B",
            "explanation": "Senior AI engineers evaluate cutting-edge models rigorously against business metrics, token economics, and operational stability before migrating production workloads.",
            "type": "behavioral",
            "difficulty": "intermediate",
            "skill": "Continuous Learning & Pragmatism",
            "expected_focus": ["evaluating SOTA against production realities", "prototyping before adopting", "knowledge sharing with the team"]
        }
    ],
    "DevOps Engineer": [
        {
            "question": "In Kubernetes, which combination of configuration settings ensures that pods terminate gracefully without dropping active long-lived HTTP or WebSocket connections during a deployment rollout?",
            "options": {
                "A": "Setting replicas to 0 immediately without probes",
                "B": "Configuring a readinessProbe, a preStop hook with a sleep buffer, and setting terminationGracePeriodSeconds appropriately",
                "C": "Using kill -9 immediately in the container startup script",
                "D": "Disabling kube-proxy across all worker nodes"
            },
            "correct_option": "B",
            "explanation": "A preStop hook delays SIGTERM until service endpoints remove the pod from routing tables, allowing active in-flight requests to complete within the grace period.",
            "type": "technical",
            "difficulty": "advanced",
            "skill": "Kubernetes & Orchestration",
            "expected_focus": ["readiness/liveness probes", "preStop lifecycle hooks", "terminationGracePeriodSeconds", "PodDisruptionBudgets"]
        },
        {
            "question": "When managing multi-environment infrastructure with Terraform, which practice best prevents state file corruption and accidental production destruction?",
            "options": {
                "A": "Storing terraform.tfstate on developer laptops and committing it to git",
                "B": "Remote state backend (e.g. AWS S3 with DynamoDB state locking or Terraform Cloud) with isolated state files per environment and strict IAM permissions",
                "C": "Running terraform apply with auto-approve on production from local terminal windows",
                "D": "Writing all infrastructure in shell scripts instead of declarative code"
            },
            "correct_option": "B",
            "explanation": "Remote state backends with atomic locking prevent concurrent race conditions, while isolated environments ensure stage modifications cannot mutate production.",
            "type": "technical",
            "difficulty": "intermediate",
            "skill": "Infrastructure as Code",
            "expected_focus": ["remote state with locking (S3/DynamoDB)", "reusable modules", "least privilege IAM", "automated drift detection"]
        },
        {
            "question": "Which alerting strategy best mitigates on-call engineer alert fatigue while maintaining high production reliability?",
            "options": {
                "A": "Paging on-call engineers for every single CPU spike above 70% or 404 response",
                "B": "Alerting primarily on Service Level Objective (SLO) error budget burn rates and user-impacting symptoms rather than noisy infrastructure causes",
                "C": "Silencing all monitoring alerts permanently",
                "D": "Routing all alerts to an unattended mailing list"
            },
            "correct_option": "B",
            "explanation": "SRE best practices advocate for Symptom-based alerting (e.g. elevated 5xx error rate or latency breaches threatening SLOs) rather than volatile cause metrics.",
            "type": "technical",
            "difficulty": "intermediate",
            "skill": "Observability & SRE",
            "expected_focus": ["OpenTelemetry", "Prometheus & Grafana", "SLI/SLO definition", "alert fatigue mitigation"]
        },
        {
            "question": "A critical database cluster suffers a complete failover failure at 2 AM on a Saturday, bringing down the core product. What is your first priority?",
            "options": {
                "A": "Find the engineer who wrote the last commit and publicly blame them",
                "B": "Mitigate user impact (promote a healthy replica, restore traffic), communicate transparent status updates, and postpone root-cause analysis until service is restored",
                "C": "Wait until Monday morning stand-up to report the incident",
                "D": "Shut down the application without informing customers"
            },
            "correct_option": "B",
            "explanation": "Incident management prioritizes mitigation and customer restoration first, followed by clear stakeholder communication and a blameless post-mortem.",
            "type": "situational",
            "difficulty": "advanced",
            "skill": "Incident Management",
            "expected_focus": ["mitigation before root-cause", "status page communication", "blameless post-mortem", "actionable preventive tickets"]
        },
        {
            "question": "How do you foster a collaborative culture where software developers take proactive ownership of deployments and operational quality?",
            "options": {
                "A": "Restrict developers from ever viewing production logs or deployment metrics",
                "B": "Build developer self-service deployment platforms with automated CI guardrails, provide clear observability tooling, and practice blameless incident reviews",
                "C": "Force DevOps engineers to manually deploy all software code for all teams",
                "D": "Implement financial penalties whenever a deployment fails"
            },
            "correct_option": "B",
            "explanation": "Empowering engineers through self-service platforms, automated safety guardrails, and psychological safety creates shared accountability for operational health.",
            "type": "behavioral",
            "difficulty": "intermediate",
            "skill": "Culture & Leadership",
            "expected_focus": ["developer self-service platforms", "automated guardrails in CI", "pair debugging", "celebrating reliability"]
        }
    ]
}

# Generic fallback questions if role is not strictly in the dictionary
DEFAULT_QUESTIONS: List[Dict[str, Any]] = [
    {
        "question": "When designing high-throughput distributed architectures, which trade-off describes the CAP theorem's fundamental constraint during a network partition?",
        "options": {
            "A": "You must choose between Consistency and Availability; you cannot guarantee both simultaneously",
            "B": "You must choose between Speed and Security",
            "C": "You can achieve 100% Consistency, Availability, and Partition Tolerance by adding more memory",
            "D": "Network partitions can be completely eliminated using fiber optic cables"
        },
        "correct_option": "A",
        "explanation": "The CAP theorem states that in the event of a network partition (P), a distributed system must choose between remaining consistent (C) or available (A).",
        "type": "technical",
        "difficulty": "intermediate",
        "skill": "System Architecture",
        "expected_focus": ["component boundaries", "trade-offs", "scalability", "failure modes"]
    },
    {
        "question": "When troubleshooting an intermittent production failure with incomplete log traces, what is the most disciplined approach?",
        "options": {
            "A": "Randomly change code lines in production until the problem disappears",
            "B": "Formulate testable hypotheses, enhance structured logging and distributed tracing at component boundaries, and isolate failure reproduction steps",
            "C": "Ignore the bug because it only occurs intermittently",
            "D": "Reboot the servers repeatedly"
        },
        "correct_option": "B",
        "explanation": "Disciplined debugging relies on the scientific method: formulating hypotheses, gathering telemetry with distributed tracing, and verifying root causes systematically.",
        "type": "technical",
        "difficulty": "intermediate",
        "skill": "Problem Solving",
        "expected_focus": ["reproduction strategy", "log enhancement", "scientific hypothesis testing", "safeguarding state"]
    },
    {
        "question": "When required to master a new technology stack rapidly to deliver a critical project, how do you balance speed with architectural quality?",
        "options": {
            "A": "Read manuals for six months before writing a single line of code",
            "B": "Build rapid proof-of-concept prototypes to validate core assumptions, establish automated test suites, and schedule refactoring iterations",
            "C": "Copy code snippets blindly from web forums without understanding security implications",
            "D": "Refuse to use new technologies under any circumstance"
        },
        "correct_option": "B",
        "explanation": "Pragmatic learning combines fast hands-on prototyping to identify constraints with strong automated testing to ensure safety.",
        "type": "behavioral",
        "difficulty": "intermediate",
        "skill": "Adaptability",
        "expected_focus": ["learning strategy", "hands-on prototyping", "delivering while learning"]
    },
    {
        "question": "How do you effectively advocate to business stakeholders for dedicating engineering bandwidth to pay down accumulated technical debt?",
        "options": {
            "A": "Complain that the codebase is poorly written without providing business context",
            "B": "Quantify technical debt in terms of business impact (slower feature velocity, incident outage costs, customer churn) and propose incremental refactoring within roadmap sprints",
            "C": "Secretly refactor the entire application without telling anyone",
            "D": "Ignore technical debt completely"
        },
        "correct_option": "B",
        "explanation": "Framing technical debt in business metrics (velocity loss, incident risk, infrastructure costs) enables executive stakeholders to prioritize engineering investments.",
        "type": "behavioral",
        "difficulty": "intermediate",
        "skill": "Ownership & Initiative",
        "expected_focus": ["quantifying business cost of debt", "incremental refactoring", "team alignment"]
    },
    {
        "question": "A production deployment introduces an edge-case regression affecting 2% of users. What is the standard operational response?",
        "options": {
            "A": "Roll back the deployment or toggle the feature flag off immediately, stabilize users, and conduct an analysis in staging before redeploying",
            "B": "Leave the bug in production for a month to see if users notice",
            "C": "Delete the affected user accounts",
            "D": "Disable all customer support channels"
        },
        "correct_option": "A",
        "explanation": "Rapid rollback via deployment rollback or feature flags minimizes customer blast radius immediately, allowing safe root-cause investigation in staging.",
        "type": "situational",
        "difficulty": "intermediate",
        "skill": "Quality Standards",
        "expected_focus": ["automated testing", "peer reviews", "linting/static analysis", "defensive programming"]
    }
]

BEHAVIORAL_QUESTIONS: List[Dict[str, Any]] = [
    {
        "question": "When collaborating in a cross-functional team where engineering priorities conflict with product deadlines, what is the best path forward?",
        "options": {
            "A": "Escalate into an adversarial deadlock and refuse to compromise",
            "B": "Align on common customer and business goals, evaluate technical tradeoffs transparently, and negotiate a phased delivery milestone",
            "C": "Surreptitiously cut corners on system security to hit the deadline",
            "D": "Abandon the project entirely"
        },
        "correct_option": "B",
        "explanation": "Strong engineering collaboration establishes shared business goals and negotiates transparent scope milestones without compromising reliability.",
        "type": "behavioral",
        "difficulty": "intermediate",
        "skill": "Cross-Functional Collaboration",
        "expected_focus": ["stakeholder alignment", "trade-off negotiation", "phased releases"]
    },
    {
        "question": "How do you handle receiving critical architectural feedback on a system design that you spent weeks crafting?",
        "options": {
            "A": "Take the feedback personally and defend your original design aggressively",
            "B": "Separate your ego from the technical artifacts, actively listen to understand alternative perspectives, and objectively evaluate benchmarks",
            "C": "Discard the entire project in frustration",
            "D": "Ignore all peer comments and proceed without changes"
        },
        "correct_option": "B",
        "explanation": "A mature engineer welcomes technical scrutiny as a collaborative mechanism to elevate system resilience and catch blind spots early.",
        "type": "behavioral",
        "difficulty": "intermediate",
        "skill": "Growth Mindset",
        "expected_focus": ["de-personalizing critique", "growth mindset", "architectural evaluation"]
    }
]

HR_QUESTIONS: List[Dict[str, Any]] = [
    {
        "question": "What core characteristic of an engineering team culture most directly correlates with sustained technical innovation and team retention?",
        "options": {
            "A": "A hyper-competitive atmosphere where developers work in isolation",
            "B": "Psychological safety, open technical discourse, continuous learning, and clear ownership",
            "C": "Eliminating all code reviews to speed up commits",
            "D": "A strict top-down hierarchy where individual contributors never speak to leadership"
        },
        "correct_option": "B",
        "explanation": "Psychological safety and continuous learning empower team members to take calculated technical risks, voice concerns, and maintain high engagement.",
        "type": "hr",
        "difficulty": "entry",
        "skill": "Cultural Alignment",
        "expected_focus": ["autonomy", "collaboration", "work-life balance", "continuous learning"]
    },
    {
        "question": "When working in an asynchronous, remote-first environment, what communication habit is most vital for team success?",
        "options": {
            "A": "Communicating solely through urgent direct phone calls without documentation",
            "B": "Proactive written documentation, clear context in pull requests, and transparent status updates",
            "C": "Remaining silent unless explicitly called upon in meetings",
            "D": "Deleting Slack channels to avoid reading updates"
        },
        "correct_option": "B",
        "explanation": "Asynchronous excellence depends on thorough documentation, self-contained PRs, and clear context that enables peers to make progress autonomously.",
        "type": "hr",
        "difficulty": "intermediate",
        "skill": "Remote Communication",
        "expected_focus": ["open-mindedness", "de-personalizing critique", "growth mindset"]
    },
    {
        "question": "What is the most effective approach for personal career advancement in a modern engineering organization?",
        "options": {
            "A": "Focusing solely on individual lines of code while ignoring team outcomes",
            "B": "Consistently solving high-impact business problems, mentoring colleagues, and elevating overall team velocity and reliability",
            "C": "Hoarding domain knowledge to make oneself irreplaceable",
            "D": "Changing teams every three weeks"
        },
        "correct_option": "B",
        "explanation": "Engineering growth is measured by force-multiplying impact: solving critical bottlenecks, uplifting team capability, and delivering sustained business value.",
        "type": "hr",
        "difficulty": "entry",
        "skill": "Career Goals & Motivation",
        "expected_focus": ["alignment with company mission", "clear career aspirations", "enthusiasm"]
    }
]


def get_fallback_questions(
    role_title: str,
    required_skills: List[str] = None,
    num_questions: int = 5,
    interview_type: str = "mixed",
    technical_count: Optional[int] = None,
    behavioral_count: Optional[int] = None,
    situational_count: Optional[int] = None,
    hr_count: Optional[int] = None,
    resume_based_count: Optional[int] = None
) -> List[Dict[str, Any]]:
    """Retrieve curated fallback MCQ questions tailored to the closest matching role and category distribution."""
    role_normalized = (role_title or "Software Engineer").strip().lower()
    
    # Check for direct or partial match
    matched_role = None
    for role_name in QUESTION_BANK.keys():
        if role_name.lower() in role_normalized or role_normalized in role_name.lower():
            matched_role = role_name
            break

    # Skill-based match if role wasn't directly found
    if not matched_role and required_skills:
        skills_lower = [s.lower() for s in required_skills]
        if any(s in ["mlops", "pytorch", "tensorflow", "drift", "inference"] for s in skills_lower):
            matched_role = "Senior ML Engineer"
        elif any(s in ["kubernetes", "docker", "terraform", "ci/cd", "jenkins", "aws"] for s in skills_lower):
            matched_role = "DevOps Engineer"
        elif any(s in ["react", "vue", "css", "html", "javascript", "frontend"] for s in skills_lower):
            matched_role = "Frontend Developer"
        elif any(s in ["rag", "llm", "faiss", "embedding", "vector"] for s in skills_lower):
            matched_role = "AI Engineer"
        elif any(s in ["sql", "power bi", "tableau", "excel", "analytics"] for s in skills_lower):
            matched_role = "Data Analyst"
        elif any(s in ["node", "express", "mongodb", "postgres", "sql", "fullstack", "full stack"] for s in skills_lower):
            matched_role = "Full Stack Developer"

    source_pool = QUESTION_BANK.get(matched_role, DEFAULT_QUESTIONS)
    tech_pool = [q for q in source_pool if q.get("type") == "technical"] or source_pool
    behav_pool = [q for q in source_pool if q.get("type") == "behavioral"] or BEHAVIORAL_QUESTIONS
    sit_pool = [q for q in source_pool if q.get("type") == "situational"] or BEHAVIORAL_QUESTIONS
    hr_pool = HR_QUESTIONS

    # If specific category counts were requested by HR configuration:
    has_specific_counts = any(c is not None and c > 0 for c in [
        technical_count, behavioral_count, situational_count, hr_count, resume_based_count
    ])

    if has_specific_counts:
        selected = []
        tc = technical_count or 0
        bc = behavioral_count or 0
        sc = situational_count or 0
        hc = hr_count or 0
        rc = resume_based_count or 0

        for i in range(tc):
            q = tech_pool[i % len(tech_pool)].copy()
            q["type"] = "technical"
            selected.append(q)

        for i in range(bc):
            q = behav_pool[i % len(behav_pool)].copy()
            q["type"] = "behavioral"
            selected.append(q)

        for i in range(sc):
            q = sit_pool[i % len(sit_pool)].copy()
            q["type"] = "situational"
            selected.append(q)

        for i in range(hc):
            q = hr_pool[i % len(hr_pool)].copy()
            q["type"] = "hr"
            selected.append(q)

        for i in range(rc):
            q = tech_pool[(tc + i) % len(tech_pool)].copy()
            q["type"] = "resume-based"
            selected.append(q)

        # Assign numbers & guarantee standard fields
        for idx, item in enumerate(selected):
            item["number"] = idx + 1
            item["skills"] = [item.get("skill", "General")]
            item["expected_topics"] = item.get("expected_focus", [])
            item["maximum_score"] = 10
            # Ensure MCQ fields exist
            if "options" not in item:
                item["options"] = {
                    "A": "Option A: Standard baseline approach",
                    "B": "Option B: Optimized architectural approach",
                    "C": "Option C: Deprecated pattern",
                    "D": "Option D: Incompatible method"
                }
            if "correct_option" not in item:
                item["correct_option"] = "B"
            if "explanation" not in item:
                item["explanation"] = "Option B is the correct engineering standard."

        return selected

    # Filter by general interview_type if requested
    filtered = source_pool
    if interview_type == "technical":
        filtered = tech_pool
    elif interview_type == "behavioral":
        filtered = behav_pool

    selected = []
    for i in range(num_questions):
        q = filtered[i % len(filtered)].copy()
        q["number"] = i + 1
        q["skills"] = [q.get("skill", "General")]
        q["expected_topics"] = q.get("expected_focus", [])
        q["maximum_score"] = 10
        if "options" not in q:
            q["options"] = {
                "A": "Option A: Standard baseline approach",
                "B": "Option B: Optimized architectural approach",
                "C": "Option C: Deprecated pattern",
                "D": "Option D: Incompatible method"
            }
        if "correct_option" not in q:
            q["correct_option"] = "B"
        if "explanation" not in q:
            q["explanation"] = "Option B represents optimal production practice."
        selected.append(q)

    return selected
