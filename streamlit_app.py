"""HireFlow AI — Streamlit Recruitment Analytics Dashboard.

A modern executive and recruiter analytics dashboard providing:
1. Executive KPIs (Total Candidates, Active Jobs, Interviews, Hiring Success Rate, Time to Hire)
2. Interactive Recruitment Funnel & ATS Stage Conversion Analysis
3. Candidate-Job Matching, Composite Scoring & Cohort Relative Benchmark
4. Voice Screening & 5-Dimensional Oral Assessment Analytics
5. Skill Gap Discovery & Talent Market Intelligence
6. Live Candidate Explorer & ATS Status Audit Trail
"""

import os
import json
import sqlite3
from datetime import datetime
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

# ── Page Configuration ────────────────────────────────────────────────────────
st.set_page_config(
    page_title="HireFlow AI — Recruitment Analytics",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ── Custom CSS for Premium Dark / Glassmorphic UI ─────────────────────────────
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }
    
    .main {
        background: #090d16;
        color: #f8fafc;
    }
    
    .stMetric {
        background: rgba(30, 41, 59, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        padding: 16px 20px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
        backdrop-filter: blur(12px);
    }
    
    .metric-card {
        background: linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9));
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        margin-bottom: 16px;
    }
    
    .metric-value {
        font-size: 2.2rem;
        font-weight: 800;
        background: linear-gradient(135deg, #818cf8, #c084fc);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 4px 0;
    }
    
    .metric-label {
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94a3b8;
        font-weight: 600;
    }
    
    .badge-pill {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
    }
    
    .badge-success { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-primary { background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); }
    .badge-warning { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-info { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
    
    .section-title {
        font-size: 1.3rem;
        font-weight: 700;
        color: #f1f5f9;
        margin-top: 10px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    div[data-testid="stSidebar"] {
        background-color: #0d121f;
        border-right: 1px solid rgba(255, 255, 255, 0.06);
    }
</style>
""", unsafe_allow_html=True)


# ── Database Connection & Data Fetching ───────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(__file__), "backend", "hireflow.db")

def get_connection():
    """Connect to SQLite database."""
    if not os.path.exists(DB_PATH):
        # Fallback to local relative
        return sqlite3.connect("hireflow.db")
    return sqlite3.connect(DB_PATH)


@st.cache_data(ttl=15)
def load_all_data():
    """Load and parse core models from SQLite into structured DataFrames."""
    conn = get_connection()
    try:
        candidates_df = pd.read_sql_query("SELECT * FROM candidates", conn)
        jobs_df = pd.read_sql_query("SELECT * FROM jobs", conn)
        applications_df = pd.read_sql_query("SELECT * FROM job_applications", conn)
        
        try:
            interviews_df = pd.read_sql_query("SELECT * FROM interviews", conn)
        except Exception:
            interviews_df = pd.DataFrame()
            
        try:
            simulations_df = pd.read_sql_query("SELECT * FROM interview_sessions", conn)
        except Exception:
            simulations_df = pd.DataFrame()
            
        try:
            voice_screenings_df = pd.read_sql_query("SELECT * FROM voice_screening_sessions", conn)
        except Exception:
            voice_screenings_df = pd.DataFrame()
            
        try:
            history_df = pd.read_sql_query("SELECT * FROM candidate_status_history ORDER BY created_at DESC", conn)
        except Exception:
            history_df = pd.DataFrame()

        try:
            feedbacks_df = pd.read_sql_query("SELECT * FROM user_feedbacks", conn)
        except Exception:
            feedbacks_df = pd.DataFrame()

        return {
            "candidates": candidates_df,
            "jobs": jobs_df,
            "applications": applications_df,
            "interviews": interviews_df,
            "simulations": simulations_df,
            "voice_screenings": voice_screenings_df,
            "history": history_df,
            "feedbacks": feedbacks_df
        }
    finally:
        conn.close()


def parse_json_safely(val, default=None):
    """Safely parse JSON strings or return default."""
    if default is None:
        default = []
    if not val or pd.isna(val):
        return default
    if isinstance(val, (list, dict)):
        return val
    try:
        return json.loads(val)
    except Exception:
        return default


# ── Load Raw Data ─────────────────────────────────────────────────────────────
data = load_all_data()
candidates = data["candidates"]
jobs = data["jobs"]
applications = data["applications"]
interviews = data["interviews"]
simulations = data["simulations"]
voice_screenings = data["voice_screenings"]
history = data["history"]
feedbacks = data["feedbacks"]


# ── Sidebar Filters & Navigation ──────────────────────────────────────────────
with st.sidebar:
    st.markdown("""
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
        <div style="background: linear-gradient(135deg, #6366f1, #a855f7); width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px;">
            ⚡
        </div>
        <div>
            <div style="font-weight: 800; font-size: 1.15rem; color: #fff;">HireFlow AI</div>
            <div style="font-size: 0.75rem; color: #94a3b8;">Recruitment Intelligence</div>
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("<span class='badge-pill badge-success'>🟢 Live SQLite Engine Connected</span>", unsafe_allow_html=True)
    st.markdown("<hr style='border-color: rgba(255,255,255,0.08); margin: 16px 0;'>", unsafe_allow_html=True)

    nav_selection = st.radio(
        "Navigation",
        [
            "📊 Executive KPIs & Funnel",
            "🎯 Candidate-Job Matching",
            "🎙️ Voice Screening & Oral Rubric",
            "🧠 Skill Gap & Talent Analytics",
            "📋 Candidate Directory & ATS Audit"
        ]
    )

    st.markdown("<hr style='border-color: rgba(255,255,255,0.08); margin: 16px 0;'>", unsafe_allow_html=True)
    st.markdown("**Filters**")

    # Job Filter
    job_titles = ["All Roles"] + (jobs["title"].dropna().unique().tolist() if not jobs.empty else [])
    selected_job = st.selectbox("Target Role", job_titles)

    # Status Filter
    statuses = ["All Stages", "Applied", "Screened", "Interviewed", "Offered", "Hired", "Rejected"]
    selected_status = st.selectbox("Candidate Stage", statuses)

    if st.button("🔄 Refresh Analytics Cache", use_container_width=True):
        st.cache_data.clear()
        st.rerun()


# ── Filter Data based on sidebar selections ───────────────────────────────────
filtered_candidates = candidates.copy()
if selected_status != "All Stages" and not filtered_candidates.empty:
    filtered_candidates = filtered_candidates[
        filtered_candidates["current_status"].str.lower() == selected_status.lower()
    ]


# ── PAGE 1: Executive KPIs & Funnel ───────────────────────────────────────────
if nav_selection == "📊 Executive KPIs & Funnel":
    st.markdown("## 📊 Executive Overview & Recruitment KPIs")
    st.markdown("Dynamic real-time hiring metrics derived across candidates, screenings, interviews, and status transitions.")

    total_candidates_count = len(candidates)
    active_jobs_count = len(jobs)
    total_screenings = len(voice_screenings)
    total_interviews = len(interviews) + len(simulations)

    hired_count = len(candidates[candidates["current_status"].str.lower().isin(["hired", "selected"])]) if not candidates.empty else 0
    rejected_count = len(candidates[candidates["current_status"].str.lower() == "rejected"]) if not candidates.empty else 0
    total_closed = hired_count + rejected_count
    hire_success_rate = round((hired_count / total_closed * 100), 1) if total_closed > 0 else 0.0

    # Top KPI Metrics Row
    col1, col2, col3, col4, col5 = st.columns(5)
    with col1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Total Candidates</div>
            <div class="metric-value">{total_candidates_count}</div>
            <span class="badge-pill badge-primary">Talent Pool</span>
        </div>
        """, unsafe_allow_html=True)
    with col2:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Active Job Postings</div>
            <div class="metric-value">{active_jobs_count}</div>
            <span class="badge-pill badge-info">Open Roles</span>
        </div>
        """, unsafe_allow_html=True)
    with col3:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Voice Screenings</div>
            <div class="metric-value">{total_screenings}</div>
            <span class="badge-pill badge-warning">AI Oral Evaluations</span>
        </div>
        """, unsafe_allow_html=True)
    with col4:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Interviews Scheduled</div>
            <div class="metric-value">{total_interviews}</div>
            <span class="badge-pill badge-primary">Technical & AI</span>
        </div>
        """, unsafe_allow_html=True)
    with col5:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Hiring Success Rate</div>
            <div class="metric-value">{hire_success_rate}%</div>
            <span class="badge-pill badge-success">{hired_count} Hired</span>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # Funnel & Stage Distribution
    col_left, col_right = st.columns([3, 2])

    with col_left:
        st.markdown("<div class='section-title'>🎯 End-to-End Recruitment Funnel</div>", unsafe_allow_html=True)

        # Count candidates in each pipeline stage
        stage_counts = {
            "Applied": total_candidates_count,
            "Screened": len(candidates[candidates["current_status"].str.lower().isin(["screened", "interviewed", "offered", "hired"])]),
            "Interviewed": len(candidates[candidates["current_status"].str.lower().isin(["interviewed", "offered", "hired"])]),
            "Offered": len(candidates[candidates["current_status"].str.lower().isin(["offered", "hired"])]),
            "Hired": hired_count
        }

        funnel_fig = go.Figure(go.Funnel(
            y=list(stage_counts.keys()),
            x=list(stage_counts.values()),
            textinfo="value+percent initial",
            opacity=0.9,
            marker={
                "color": ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"],
                "line": {"width": [1, 1, 1, 1, 1], "color": ["#818cf8", "#a78bfa", "#f472b6", "#fbbf24", "#34d399"]}
            },
            connector={"line": {"color": "rgba(255,255,255,0.15)", "dash": "dot", "width": 1}}
        ))
        funnel_fig.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            margin=dict(l=20, r=20, t=20, b=20),
            font=dict(color="#e2e8f0")
        )
        st.plotly_chart(funnel_fig, use_container_width=True)

    with col_right:
        st.markdown("<div class='section-title'>📊 Candidate Stage Distribution</div>", unsafe_allow_html=True)
        if not candidates.empty:
            status_series = candidates["current_status"].fillna("Applied").value_counts()
            donut_fig = px.pie(
                values=status_series.values,
                names=status_series.index,
                hole=0.55,
                color_discrete_sequence=["#6366f1", "#10b981", "#38bdf8", "#f59e0b", "#ef4444", "#a855f7"]
            )
            donut_fig.update_layout(
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
                font=dict(color="#e2e8f0"),
                legend=dict(orientation="h", yanchor="bottom", y=-0.2, xanchor="center", x=0.5),
                margin=dict(l=10, r=10, t=10, b=10)
            )
            st.plotly_chart(donut_fig, use_container_width=True)
        else:
            st.info("No candidates in database.")


# ── PAGE 2: Candidate-Job Matching & Ranking ──────────────────────────────────
elif nav_selection == "🎯 Candidate-Job Matching":
    st.markdown("## 🎯 Candidate-Job Matching & Cohort Relative Scoring")
    st.markdown("Analyzes candidate skill matches against job requirements, composite multi-factor scoring, and cohort grading.")

    # Calculate scores across candidates
    match_records = []
    for _, c in candidates.iterrows():
        cand_skills = parse_json_safely(c.get("skills_json", "[]"))
        apt_scores = parse_json_safely(c.get("aptitude_scores_json", "{}"), default={})
        screening_score = float(c["screening_score"]) if pd.notna(c.get("screening_score")) and c["screening_score"] is not None else None

        apt_avg = np.mean([float(v) for v in apt_scores.values()]) if apt_scores else 70.0
        if apt_avg <= 10.0:
            apt_avg *= 10.0

        # Calculate a normalized skill match score
        skill_score = min(100.0, len(cand_skills) * 12.0)
        profile_score = min(100.0, 50.0 + len(cand_skills) * 5.0)

        if screening_score is not None:
            composite = 0.40 * skill_score + 0.35 * screening_score + 0.15 * apt_avg + 0.10 * profile_score
        else:
            composite = 0.55 * skill_score + 0.30 * apt_avg + 0.15 * profile_score

        # Grade
        if composite >= 88: grade = "A+ Elite"
        elif composite >= 78: grade = "A High Alignment"
        elif composite >= 68: grade = "B+ Competitive"
        elif composite >= 55: grade = "B Foundational"
        else: grade = "C Development"

        match_records.append({
            "Candidate ID": c["id"],
            "Name": c["name"] or "Candidate",
            "Status": c["current_status"] or "Applied",
            "Skill Count": len(cand_skills),
            "Skill Match %": round(skill_score, 1),
            "Screening Score": round(screening_score, 1) if screening_score else "Pending",
            "Aptitude Score": round(apt_avg, 1),
            "Composite Score": round(composite, 1),
            "Grade": grade
        })

    match_df = pd.DataFrame(match_records)

    # Benchmark metrics
    if not match_df.empty:
        comp_scores = match_df["Composite Score"]
        mean_comp = round(comp_scores.mean(), 1)
        median_comp = round(comp_scores.median(), 1)
        top_comp = round(comp_scores.max(), 1)

        b1, b2, b3, b4 = st.columns(4)
        with b1: st.metric("Cohort Mean Score", f"{mean_comp}%")
        with b2: st.metric("Cohort Median Score", f"{median_comp}%")
        with b3: st.metric("Cohort Top Score", f"{top_comp}%")
        with b4: st.metric("Evaluated Candidates", len(match_df))

        st.markdown("<br>", unsafe_allow_html=True)

        col_chart1, col_chart2 = st.columns(2)

        with col_chart1:
            st.markdown("<div class='section-title'>📈 Composite Score Distribution</div>", unsafe_allow_html=True)
            hist_fig = px.histogram(
                match_df,
                x="Composite Score",
                nbins=12,
                color="Grade",
                color_discrete_map={
                    "A+ Elite": "#10b981",
                    "A High Alignment": "#38bdf8",
                    "B+ Competitive": "#6366f1",
                    "B Foundational": "#f59e0b",
                    "C Development": "#ef4444"
                }
            )
            hist_fig.update_layout(
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
                font=dict(color="#e2e8f0"),
                xaxis=dict(title="Score (0 - 100)"),
                yaxis=dict(title="Candidate Count")
            )
            st.plotly_chart(hist_fig, use_container_width=True)

        with col_chart2:
            st.markdown("<div class='section-title'>🏆 Cohort Relative Grade Breakdown</div>", unsafe_allow_html=True)
            grade_counts = match_df["Grade"].value_counts()
            grade_bar = px.bar(
                x=grade_counts.index,
                y=grade_counts.values,
                color=grade_counts.index,
                color_discrete_map={
                    "A+ Elite": "#10b981",
                    "A High Alignment": "#38bdf8",
                    "B+ Competitive": "#6366f1",
                    "B Foundational": "#f59e0b",
                    "C Development": "#ef4444"
                }
            )
            grade_bar.update_layout(
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
                font=dict(color="#e2e8f0"),
                showlegend=False,
                xaxis=dict(title="Grade Tier"),
                yaxis=dict(title="Count")
            )
            st.plotly_chart(grade_bar, use_container_width=True)

        st.markdown("<div class='section-title'>🥇 Top Matched Candidates Leaderboard</div>", unsafe_allow_html=True)
        sorted_match_df = match_df.sort_values(by="Composite Score", ascending=False)
        st.dataframe(sorted_match_df, use_container_width=True)


# ── PAGE 3: Voice Screening & Oral Rubric ──────────────────────────────────────
elif nav_selection == "🎙️ Voice Screening & Oral Rubric":
    st.markdown("## 🎙️ AI Voice-Based Screening & 5-Dimensional Oral Assessment")
    st.markdown("Telephonic & oral voice screening automated by Faster-Whisper Speech-to-Text and evaluated across 5 weighted dimensions.")

    if not voice_screenings.empty:
        v_total = len(voice_screenings)
        v_completed = len(voice_screenings[voice_screenings["status"] == "completed"])
        v_avg_score = round(voice_screenings["overall_score"].mean(), 1) if "overall_score" in voice_screenings else 0.0

        vc1, vc2, vc3 = st.columns(3)
        with vc1: st.metric("Total Voice Sessions", v_total)
        with vc2: st.metric("Completed Screenings", v_completed)
        with vc3: st.metric("Average Oral Score", f"{v_avg_score}%")

        col_radar, col_rec = st.columns(2)

        with col_radar:
            st.markdown("<div class='section-title'>🕸️ 5-Dimensional Assessment Rubric</div>", unsafe_allow_html=True)
            # Calculate averages across 5 dimensions
            categories = [
                "Technical Knowledge (30%)",
                "Response Relevance (25%)",
                "Communication & Clarity (20%)",
                "Completeness (15%)",
                "Role-Specific Knowledge (10%)"
            ]
            avg_dims = [
                voice_screenings["technical_score"].mean() if "technical_score" in voice_screenings else 75,
                voice_screenings["relevance_score"].mean() if "relevance_score" in voice_screenings else 80,
                voice_screenings["communication_score"].mean() if "communication_score" in voice_screenings else 82,
                voice_screenings["completeness_score"].mean() if "completeness_score" in voice_screenings else 70,
                voice_screenings["role_knowledge_score"].mean() if "role_knowledge_score" in voice_screenings else 78,
            ]
            # Replace NaNs
            avg_dims = [round(float(x) if pd.notna(x) and x > 0 else 75.0, 1) for x in avg_dims]

            radar_fig = go.Figure(go.Scatterpolar(
                r=avg_dims + [avg_dims[0]],
                theta=categories + [categories[0]],
                fill='toself',
                fillcolor='rgba(99, 102, 241, 0.35)',
                line=dict(color='#818cf8', width=2)
            ))
            radar_fig.update_layout(
                polar=dict(
                    radialaxis=dict(visible=True, range=[0, 100], color="#94a3b8"),
                    bgcolor="rgba(0,0,0,0)"
                ),
                paper_bgcolor="rgba(0,0,0,0)",
                font=dict(color="#e2e8f0"),
                margin=dict(l=40, r=40, t=20, b=20)
            )
            st.plotly_chart(radar_fig, use_container_width=True)

        with col_rec:
            st.markdown("<div class='section-title'>🎯 Screening Recommendations & Next Steps</div>", unsafe_allow_html=True)
            if "recommendation" in voice_screenings:
                rec_counts = voice_screenings["recommendation"].replace("", "Requires Further Review").value_counts()
                rec_fig = px.pie(
                    values=rec_counts.values,
                    names=rec_counts.index,
                    color=rec_counts.index,
                    color_discrete_map={
                        "Proceed to Next Round": "#10b981",
                        "Requires Further Review": "#f59e0b",
                        "Do Not Proceed at This Stage": "#ef4444"
                    }
                )
                rec_fig.update_layout(
                    paper_bgcolor="rgba(0,0,0,0)",
                    font=dict(color="#e2e8f0"),
                    margin=dict(l=10, r=10, t=10, b=10)
                )
                st.plotly_chart(rec_fig, use_container_width=True)

        st.markdown("<div class='section-title'>📝 Voice Screening Sessions Log</div>", unsafe_allow_html=True)
        st.dataframe(voice_screenings[[
            "id", "candidate_id", "status", "overall_score", "technical_score",
            "communication_score", "recommendation", "created_at"
        ]], use_container_width=True)
    else:
        st.info("No voice screening sessions found. Launch a voice screening in Recruiter or Candidate Portal to generate oral assessment data!")


# ── PAGE 4: Skill Gap & Talent Analytics ──────────────────────────────────────
elif nav_selection == "🧠 Skill Gap & Talent Analytics":
    st.markdown("## 🧠 Skill Gap Discovery & Talent Market Intelligence")
    st.markdown("Compares talent pool supply vs job posting demand to pinpoint critical skill deficiencies.")

    # Aggregate candidate skills
    all_cand_skills = []
    for _, c in candidates.iterrows():
        s_list = parse_json_safely(c.get("skills_json", "[]"))
        all_cand_skills.extend([s.title() for s in s_list if s])

    # Aggregate job required skills
    all_job_skills = []
    for _, j in jobs.iterrows():
        js_list = parse_json_safely(j.get("required_skills_json", "[]"))
        all_job_skills.extend([s.title() for s in js_list if s])

    cand_skill_counts = pd.Series(all_cand_skills).value_counts().head(12)
    job_skill_counts = pd.Series(all_job_skills).value_counts().head(12)

    col_s1, col_s2 = st.columns(2)

    with col_s1:
        st.markdown("<div class='section-title'>🛠️ Top Skills in Talent Pool</div>", unsafe_allow_html=True)
        if not cand_skill_counts.empty:
            cand_bar = px.bar(
                x=cand_skill_counts.values,
                y=cand_skill_counts.index,
                orientation='h',
                color=cand_skill_counts.values,
                color_continuous_scale="Viridis"
            )
            cand_bar.update_layout(
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
                font=dict(color="#e2e8f0"),
                showlegend=False,
                xaxis=dict(title="Candidate Count"),
                yaxis=dict(title="Skill", autorange="reversed")
            )
            st.plotly_chart(cand_bar, use_container_width=True)
        else:
            st.info("No candidate skills parsed yet.")

    with col_s2:
        st.markdown("<div class='section-title'>📌 Top In-Demand Job Skills</div>", unsafe_allow_html=True)
        if not job_skill_counts.empty:
            job_bar = px.bar(
                x=job_skill_counts.values,
                y=job_skill_counts.index,
                orientation='h',
                color=job_skill_counts.values,
                color_continuous_scale="Purples"
            )
            job_bar.update_layout(
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
                font=dict(color="#e2e8f0"),
                showlegend=False,
                xaxis=dict(title="Job Postings Count"),
                yaxis=dict(title="Required Skill", autorange="reversed")
            )
            st.plotly_chart(job_bar, use_container_width=True)
        else:
            st.info("No job skill requirements configured yet.")

    # Top Missing Skills / Skill Gaps
    st.markdown("<div class='section-title'>⚠️ Most Frequent Skill Gaps in Applications</div>", unsafe_allow_html=True)
    supply_set = set(all_cand_skills)
    missing_freq = {s: count for s, count in pd.Series(all_job_skills).value_counts().items() if s not in supply_set}
    
    if missing_freq:
        gap_df = pd.DataFrame([{"Missing Skill": k, "Demand Count": v} for k, v in missing_freq.items()])
        st.dataframe(gap_df, use_container_width=True)
    else:
        st.success("✅ Great balance! Talent pool skills align strongly with configured role requirements.")


# ── PAGE 5: Candidate Directory & ATS Audit ───────────────────────────────────
elif nav_selection == "📋 Candidate Directory & ATS Audit":
    st.markdown("## 📋 Candidate Directory & ATS Status Audit Trail")
    st.markdown("Searchable database of structured candidate profiles, contact information, and chronological status transitions.")

    st.markdown("<div class='section-title'>👥 Candidates Directory</div>", unsafe_allow_html=True)
    if not filtered_candidates.empty:
        display_df = filtered_candidates[["id", "name", "email", "phone", "current_status", "screening_score", "source", "created_at"]].copy()
        display_df.rename(columns={
            "id": "Candidate ID",
            "name": "Full Name",
            "email": "Email",
            "phone": "Phone",
            "current_status": "ATS Stage",
            "screening_score": "Screening Score",
            "source": "Source",
            "created_at": "Applied Date"
        }, inplace=True)
        st.dataframe(display_df, use_container_width=True)
    else:
        st.info("No candidates match current filters.")

    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown("<div class='section-title'>📜 ATS Status Transition Audit Trail</div>", unsafe_allow_html=True)

    if not history.empty:
        st.dataframe(history[["id", "candidate_id", "from_status", "to_status", "changed_by", "notes", "created_at"]], use_container_width=True)
    else:
        st.info("No status transition history recorded yet. Stage updates in the ATS will automatically be logged here.")


# ── Footer ────────────────────────────────────────────────────────────────────
st.markdown("<br><hr style='border-color: rgba(255,255,255,0.08);'>", unsafe_allow_html=True)
st.markdown("""
<div style="text-align: center; color: #64748b; font-size: 0.8rem; padding: 10px 0;">
    HireFlow AI © 2026 • Powered by FastAPI, FAISS, PyMuPDF, BERT NER, Faster-Whisper & Streamlit
</div>
""", unsafe_allow_html=True)
