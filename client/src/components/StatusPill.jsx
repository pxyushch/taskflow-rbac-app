function StatusPill({ status }) {
  const map = {
    TODO: "pill pill-todo",
    IN_PROGRESS: "pill pill-progress",
    DONE: "pill pill-done"
  };

  return <span className={map[status] || "pill"}>{status.replace("_", " ")}</span>;
}

export default StatusPill;
