import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import api from "../api/client";
import StatusPill from "../components/StatusPill";

function StatCard({ label, value }) {
  return (
    <article className="stat-card">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
    </article>
  );
}

function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadOverview = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/dashboard/overview");
      setOverview(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const summary = useMemo(
    () =>
      overview?.summary || {
        total: 0,
        todo: 0,
        inProgress: 0,
        done: 0,
        overdue: 0
      },
    [overview]
  );

  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  return (
    <section className="stack-lg">
      <div className="section-head">
        <h1>Dashboard</h1>
        <button type="button" className="ghost-btn" onClick={loadOverview}>
          Refresh
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="stats-grid">
        <StatCard label="Total Tasks" value={summary.total} />
        <StatCard label="To Do" value={summary.todo} />
        <StatCard label="In Progress" value={summary.inProgress} />
        <StatCard label="Completed" value={summary.done} />
        <StatCard label="Overdue" value={summary.overdue} />
      </div>

      <div className="grid-two">
        <article className="panel">
          <h2>Overdue Tasks</h2>
          {overview?.overdueTasks?.length ? (
            <ul className="list">
              {overview.overdueTasks.map((task) => (
                <li key={task.id} className="list-row">
                  <div>
                    <strong>{task.title}</strong>
                    <p className="muted">
                      {task.project?.name} | Due {dayjs(task.dueDate).format("DD MMM YYYY")}
                    </p>
                  </div>
                  <StatusPill status={task.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No overdue tasks.</p>
          )}
        </article>

        <article className="panel">
          <h2>Assigned To Me</h2>
          {overview?.assignedToMe?.length ? (
            <ul className="list">
              {overview.assignedToMe.map((task) => (
                <li key={task.id} className="list-row">
                  <div>
                    <strong>{task.title}</strong>
                    <p className="muted">
                      {task.project?.name}
                      {task.dueDate ? ` | Due ${dayjs(task.dueDate).format("DD MMM YYYY")}` : ""}
                    </p>
                  </div>
                  <StatusPill status={task.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No tasks assigned to you.</p>
          )}
        </article>
      </div>
    </section>
  );
}

export default DashboardPage;
