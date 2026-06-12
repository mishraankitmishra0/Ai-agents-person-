import { useState, useRef, useEffect } from "react";

const AGENT_MODES = [
  {
    id: "analyze",
    icon: "🔍",
    label: "Analyze Data",
    color: "#6366f1",
    desc: "Paste raw data or describe your dataset. Get instant analysis, patterns, and insights.",
    placeholder: "Paste your raw data here (CSV, JSON, table) or describe your dataset and what you want to analyze...\n\nExample:\nName, Sales, Region\nAlpha, 45000, North\nBeta, 32000, South\nGamma, 67000, East\n\nWhat trends should I look for?",
    systemPrompt: `You are an expert data analyst. The user will provide raw data (CSV, JSON, table format, or description). Your job is to:
1. Understand the data structure and quality
2. Identify key metrics, trends, outliers, and patterns
3. Provide actionable insights in clear, concise language
4. Suggest next steps or deeper analysis opportunities
5. Flag data quality issues if any
Format your response with clear sections: Data Overview, Key Findings, Patterns & Trends, Anomalies, Recommendations.
Use numbers, percentages, and specifics wherever possible. Be direct and business-focused.`
  },
  {
    id: "dashboard",
    icon: "📊",
    label: "Dashboard Design",
    color: "#10b981",
    desc: "Describe your data or goal. Get a ready-to-use dashboard layout with charts and KPIs.",
    placeholder: "Describe what you want to visualize:\n\nExample: I have monthly sales data by region (North, South, East, West) for 2024. I need a dashboard for the sales team showing performance vs target, top products, and churn risk areas.",
    systemPrompt: `You are a data visualization and dashboard expert. The user will describe their data or business need. Your job is to:
1. Design a clear dashboard layout (list the sections and charts)
2. Recommend the best chart types for each metric and WHY
3. Define the top 5 KPI cards to show at a glance
4. Suggest filters and drill-down options
5. Provide the exact chart configuration (axes, groupings, colors)
6. Write mock data examples to illustrate the layout
7. If data is given, produce a working HTML/JS chart description

Structure: KPI Cards → Primary Charts → Secondary Analysis → Filters & Controls → Alerts.
Be specific: "Use a stacked bar chart grouped by Region on X-axis, Month on Y-axis, colored by Product Category" not just "use a bar chart".`
  },
  {
    id: "ppt",
    icon: "📑",
    label: "PPT Outline",
    color: "#f59e0b",
    desc: "Turn your analysis or findings into a structured, presentation-ready slide deck outline.",
    placeholder: "Tell me what the presentation is about:\n\nExample: I need to present Q1 2024 performance to leadership. Sales are up 12% but margins dropped 3%. We lost 2 key clients but gained 5 new ones. Headcount is 10% over budget.",
    systemPrompt: `You are an expert business presenter and data storyteller. The user will describe their analysis, findings, or topic. Your job is to:
1. Create a complete slide-by-slide outline (10–15 slides typically)
2. For each slide: Title, Key Message (1 sentence), Bullet Points (3–5), Chart/Visual recommendation
3. Structure the story arc: Problem → Data → Insight → Recommendation → Next Steps
4. Write the "So What" for each slide — the business implication
5. Suggest speaker notes for complex slides
6. Highlight which slides need visuals vs text-only

Format as:
Slide N: [Title]
Key Message: [One punchy line]
Content: [Bullets]
Visual: [What chart/image to use]
Speaker Note: [Optional guidance]

Make it boardroom-ready: concise, assertive, data-backed.`
  },
  {
    id: "risk",
    icon: "⚠️",
    label: "Risk & Strategy",
    color: "#ef4444",
    desc: "Describe a business challenge. Get risk assessment, root cause analysis, and mitigation strategies.",
    placeholder: "Describe the business problem or risk:\n\nExample: Our customer churn rate jumped from 4% to 9% in Q3. We suspect it's linked to a pricing change in July but also had a product outage in August. Revenue impact is ~₹18L/month.",
    systemPrompt: `You are a senior business analyst and risk consultant. The user will describe a business challenge, risk, or problem. Your job is to:
1. Identify and categorize risks (Operational, Financial, Strategic, Compliance)
2. Rate each risk: Likelihood (High/Med/Low) × Impact (High/Med/Low) = Priority
3. Perform root cause analysis (use 5-Why or Fishbone logic)
4. Recommend mitigation strategies for top 3 risks — short term AND long term
5. Define success metrics to track recovery
6. Suggest data cuts / reports needed to monitor this risk going forward
7. Flag any hidden risks the user may not have mentioned

Format: Executive Summary → Risk Register (table) → Root Cause Analysis → Mitigation Plan → Monitoring KPIs.
Be direct, quantified, and actionable. Think like a consultant presenting to a CFO.`
  },
  {
    id: "database",
    icon: "🗄️",
    label: "Database & SQL",
    color: "#8b5cf6",
    desc: "Describe your data need or upload a raw/dump file description. Get schema design, SQL queries, and optimization tips.",
    placeholder: "Describe what you need:\n\nExample: I have a raw dump of sales transactions (50 columns, ~2M rows). I need to: 1) Clean it, 2) Create a normalized schema, 3) Write queries for monthly revenue by region, top 10 products, and customer lifetime value.\n\nOr paste your table structure / sample data below:",
    systemPrompt: `You are a senior database engineer and SQL expert. The user will describe a data requirement, raw file, or dump. Your job is to:
1. Analyze or design the schema (normalized, optimized)
2. Identify data quality issues and write cleaning steps
3. Write production-ready SQL queries for their use case
4. Add indexes and optimization tips for large datasets
5. Suggest the right database engine (MySQL, PostgreSQL, BigQuery, etc.) with reasoning
6. Provide a data dictionary for complex schemas
7. Write ETL pipeline steps if transformation is needed

Always:
- Write complete, runnable SQL (not pseudocode)
- Include comments in the SQL explaining each section
- Show BEFORE/AFTER for data cleaning transformations
- Flag performance risks for large datasets

Format: Schema Design → Data Cleaning Steps → SQL Queries → Optimization Tips → Notes.`
  }
];

const QUICK_PROMPTS = {
  analyze: [
    "Find outliers and anomalies in this data",
    "What are the top 3 trends I should report to management?",
    "Compare this month vs last month performance",
    "Which segments are underperforming and why?"
  ],
  dashboard: [
    "Design a sales performance dashboard",
    "Create an HR headcount & attrition dashboard",
    "Build a financial P&L overview dashboard",
    "Design an operations efficiency dashboard"
  ],
  ppt: [
    "Monthly business review presentation",
    "Project status update for stakeholders",
    "Data-driven strategy proposal deck",
    "Risk and mitigation report for leadership"
  ],
  risk: [
    "Analyze revenue decline risk",
    "Assess vendor dependency risk",
    "Evaluate team capacity vs workload risk",
    "Identify customer churn drivers and mitigation"
  ],
  database: [
    "Design schema for a sales reporting database",
    "Write SQL for customer segmentation analysis",
    "Optimize slow queries on large transaction tables",
    "Create ETL pipeline from raw CSV to analytics DB"
  ]
};

const createRateLimiter = (maxRequests = 5, windowMs = 60000) => {
  let requests = [];
  return {
    isAllowed: () => {
      const now = Date.now();
      requests = requests.filter(t => now - t < windowMs);
      if (requests.length < maxRequests) {
        requests.push(now);
        return true;
      }
      return false;
    },
    getRemainingTime: () => {
      if (requests.length === 0) return 0;
      return Math.ceil((requests[0] + 60000 - Date.now()) / 1000);
    }
  };
};

const rateLimiter = createRateLimiter(5, 60000);

const sanitizeInput = (text) => {
  return text.trim().slice(0, 5000).replace(/[<>]/g, '').replace(/javascript:/gi, '');
};

export default function DataAnalystAgent() {
  const [activeMode, setActiveMode] = useState("analyze");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [rateLimitError, setRateLimitError] = useState(null);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  const mode = AGENT_MODES.find(m => m.id === activeMode);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleModeChange = (id) => {
    setActiveMode(id);
    setInput("");
    setMessages([]);
    setError(null);
  };

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const callAgent = async () => {
    if (!input.trim()) {
      setError("Please enter a message");
      return;
    }

    if (loading) {
      setError("Please wait for the current request to complete");
      return;
    }

    if (!rateLimiter.isAllowed()) {
      const remainingTime = rateLimiter.getRemainingTime();
      setRateLimitError(`Too many requests. Please wait ${remainingTime} seconds.`);
      setTimeout(() => setRateLimitError(null), 3000);
      return;
    }

    const sanitizedInput = sanitizeInput(input);
    const userMsg = { role: "user", content: sanitizedInput };
    const newHistory = [...history, userMsg];
    
    setMessages(prev => [...prev, { type: "user", text: sanitizedInput }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: activeMode,
          messages: newHistory,
          systemPrompt: mode.systemPrompt
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.content || typeof data.content !== 'string') {
        throw new Error("Invalid response format");
      }

      const assistantMsg = { role: "assistant", content: data.content };
      setHistory([...newHistory, assistantMsg]);
      setMessages(prev => [...prev, { type: "assistant", text: data.content, mode: activeMode }]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";
      setError(errorMessage);
      setMessages(prev => [...prev, { type: "error", text: errorMessage }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      callAgent();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setHistory([]);
    setInput("");
    setError(null);
  };

  const formatText = (text) => {
    const escaped = document.createElement('div');
    escaped.textContent = text;
    const safe = escaped.innerHTML;
    return safe
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^#{1,3}\s+(.+)$/gm, '<div class="msg-heading">$1</div>')
      .replace(/^[-•]\s+(.+)$/gm, '<div class="msg-bullet">• $1</div>')
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0f13",
      color: "#e2e8f0",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      display: "flex",
      flexDirection: "column"
    }}>
      <div style={{
        padding: "20px 28px 16px",
        borderBottom: "1px solid #1e1e2e",
        background: "#0f0f13",
        position: "sticky",
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${mode.color}33, ${mode.color}66)`,
            border: `1px solid ${mode.color}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18
          }}>🤖</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.3px" }}>InsightPilot AI</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Personal Data Analyst · {mode.label} mode active
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={clearChat} aria-label="Clear chat" style={{
              marginLeft: "auto", padding: "5px 12px",
              background: "#1e1e2e", border: "1px solid #2d2d40",
              borderRadius: 7, color: "#94a3b8", fontSize: 12, cursor: "pointer"
            }}>Clear</button>
          )}
        </div>
      </div>

      {(error || rateLimitError) && (
        <div style={{
          padding: "12px 28px",
          background: "#ef444410",
          border: "1px solid #ef444440",
          color: "#fca5a5",
          fontSize: 13,
          display: "flex",
          justifyContent: "space-between"
        }}>
          <span>⚠️ {error || rateLimitError}</span>
          <button onClick={() => { setError(null); setRateLimitError(null); }} style={{
            background: "transparent", border: "none", color: "inherit", cursor: "pointer"
          }}>✕</button>
        </div>
      )}

      <div style={{
        display: "flex", gap: 8, padding: "14px 28px",
        overflowX: "auto", borderBottom: "1px solid #1e1e2e"
      }}>
        {AGENT_MODES.map(m => (
          <button key={m.id} onClick={() => handleModeChange(m.id)} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 16px", borderRadius: 10, whiteSpace: "nowrap",
            border: activeMode === m.id ? `1px solid ${m.color}88` : "1px solid #2d2d40",
            background: activeMode === m.id ? `${m.color}18` : "#16161f",
            color: activeMode === m.id ? m.color : "#94a3b8",
            fontSize: 13, fontWeight: activeMode === m.id ? 600 : 400,
            cursor: "pointer"
          }}>
            <span>{m.icon}</span> {m.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
          {messages.length === 0 ? (
            <div>
              <div style={{
                background: "#16161f", border: `1px solid ${mode.color}33`,
                borderRadius: 14, padding: "20px 22px", marginBottom: 20
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{mode.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: mode.color, marginBottom: 6 }}>
                  {mode.label}
                </div>
                <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>{mode.desc}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#475569", marginBottom: 10, textTransform: "uppercase" }}>
                  Quick Starters
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {QUICK_PROMPTS[activeMode].map((q, i) => (
                    <button key={i} onClick={() => handleQuickPrompt(q)} style={{
                      textAlign: "left", padding: "11px 16px",
                      background: "#16161f", border: "1px solid #2d2d40",
                      borderRadius: 10, color: "#cbd5e1", fontSize: 13,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 10
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = mode.color + "66";
                      e.currentTarget.style.color = "#f1f5f9";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "#2d2d40";
                      e.currentTarget.style.color = "#cbd5e1";
                    }}>
                      <span style={{ color: mode.color }}>→</span> {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: msg.type === "user" ? "flex-end" : "flex-start"
                }}>
                  {msg.type !== "user" && (
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: msg.type === "error" ? "#ef444420" : `${mode.color}20`,
                      border: `1px solid ${msg.type === "error" ? "#ef444440" : mode.color + "40"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, marginRight: 10, marginTop: 2
                    }}>
                      {msg.type === "error" ? "⚠" : "🤖"}
                    </div>
                  )}
                  <div style={{
                    maxWidth: "82%",
                    padding: msg.type === "user" ? "10px 16px" : "14px 18px",
                    borderRadius: msg.type === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: msg.type === "user" ? `${mode.color}22` : "#16161f",
                    border: msg.type === "user" ? `1px solid ${mode.color}44` : msg.type === "error" ? "1px solid #ef444440" : "1px solid #2d2d40",
                    fontSize: 14, lineHeight: 1.7, color: "#e2e8f0"
                  }}>
                    {msg.type === "assistant" ? (
                      <div dangerouslySetInnerHTML={{ __html: formatText(msg.text) }} />
                    ) : (
                      <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: `${mode.color}20`, border: `1px solid ${mode.color}40`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14
                  }}>🤖</div>
                  <div style={{
                    padding: "14px 18px", background: "#16161f",
                    border: "1px solid #2d2d40", borderRadius: "14px 14px 14px 4px"
                  }}>
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      {[0, 1, 2].map(d => (
                        <div key={d} style={{
                          width: 7, height: 7, borderRadius: "50%",
                          background: mode.color,
                          animation: `pulse 1.2s ease-in-out ${d * 0.2}s infinite`
                        }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        <div style={{
          padding: "16px 28px 24px",
          borderTop: "1px solid #1e1e2e",
          background: "#0f0f13"
        }}>
          <div style={{
            display: "flex", flexDirection: "column", gap: 0,
            background: "#16161f", border: `1px solid #2d2d40`,
            borderRadius: 14, overflow: "hidden"
          }}
            onFocusCapture={e => e.currentTarget.style.borderColor = mode.color + "66"}
            onBlurCapture={e => e.currentTarget.style.borderColor = "#2d2d40"}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mode.placeholder}
              rows={5}
              disabled={loading}
              maxLength={5000}
              style={{
                background: "transparent", border: "none", outline: "none",
                color: "#e2e8f0", fontSize: 14, padding: "16px 18px",
                resize: "none", fontFamily: "inherit", lineHeight: 1.6,
                opacity: loading ? 0.6 : 1
              }}
            />
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", borderTop: "1px solid #1e1e2e"
            }}>
              <div style={{ fontSize: 12, color: "#475569" }}>
                {mode.icon} {mode.label} · {input.length}/5000
              </div>
              <button
                onClick={callAgent}
                disabled={!input.trim() || loading}
                style={{
                  padding: "8px 20px", borderRadius: 9, border: "none",
                  background: !input.trim() || loading ? "#2d2d40" : mode.color,
                  color: !input.trim() || loading ? "#475569" : "#fff",
                  fontSize: 13, fontWeight: 600, cursor: !input.trim() || loading ? "not-allowed" : "pointer"
                }}
              >
                {loading ? "Analyzing..." : "Run Agent →"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2d2d40; border-radius: 4px; }
        textarea::placeholder { color: #334155; }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        .msg-heading {
          font-weight: 700;
          font-size: 15px;
          color: #f1f5f9;
          margin: 10px 0 4px;
          padding-bottom: 4px;
          border-bottom: 1px solid #2d2d40;
        }
        .msg-bullet {
          padding: 2px 0 2px 8px;
          color: #cbd5e1;
        }
        .inline-code {
          background: #1e1e2e;
          color: #a78bfa;
          padding: 1px 6px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}
