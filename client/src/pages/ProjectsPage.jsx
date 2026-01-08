import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import StatusPill from "../components/StatusPill";

const initialProjectForm = {
  name: "",
  description: ""
};

const initialMemberForm = {
  userId: "",
  role: "MEMBER"
};

const initialTaskForm = {
  title: "",
  description: "",
  assigneeId: "",
  status: "TODO",
  priority: "MEDIUM",
  dueDate: ""
};

function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projectForm, setProjectForm] = useState(initialProjectForm);
  const [memberForm, setMemberForm] = useState(initialMemberForm);
  const [taskForm, setTaskForm] = useState(initialTaskForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedMembers = selectedProject?.members || [];

  const myProjectRole = useMemo(() => {
    if (!selectedProject) {
      return null;
    }

    if (user.role === "ADMIN") {
      return "ADMIN";
    }

    const membership = selectedMembers.find((member) => member.userId === user.id);
    return membership?.role || null;
  }, [selectedProject, selectedMembers, user.id, user.role]);

  const canManageProject = myProjectRole === "ADMIN";

  const loadUsers = async () => {
    if (user.role !== "ADMIN") {
      return;
    }

    const response = await api.get("/users");
    setUsers(response.data.users || []);
  };

  const loadProjectDetails = async (projectId) => {
    if (!projectId) {
      setSelectedProject(null);
      setTasks([]);
      return;
    }

    const [projectResponse, tasksResponse] = await Promise.all([
      api.get(`/projects/${projectId}`),
      api.get(`/projects/${projectId}/tasks`)
    ]);

    setSelectedProject(projectResponse.data.project);
    setTasks(tasksResponse.data.tasks || []);
    setTaskForm((state) => ({
      ...state,
      assigneeId:
        projectResponse.data.project.members?.[0]?.userId || state.assigneeId || ""
    }));
  };

  const loadProjects = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/projects");
      const projectList = response.data.projects || [];
      setProjects(projectList);

      const nextProjectId =
        projectList.find((project) => project.id === selectedProjectId)?.id ||
        projectList[0]?.id ||
        "";

      setSelectedProjectId(nextProjectId);
      await loadProjectDetails(nextProjectId);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const onSelectProject = async (projectId) => {
    setSelectedProjectId(projectId);
    setError("");
    try {
      await loadProjectDetails(projectId);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load project details.");
    }
  };

  const createProject = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api.post("/projects", projectForm);
      setProjectForm(initialProjectForm);
      setNotice("Project created.");
      await loadProjects();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create project.");
    } finally {
      setBusy(false);
    }
  };

  const addMember = async (event) => {
    event.preventDefault();
    if (!selectedProjectId) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api.post(`/projects/${selectedProjectId}/members`, memberForm);
      setMemberForm(initialMemberForm);
      setNotice("Member added to project.");
      await loadProjectDetails(selectedProjectId);
      await loadProjects();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to add member.");
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (memberUserId) => {
    if (!selectedProjectId) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api.delete(`/projects/${selectedProjectId}/members/${memberUserId}`);
      setNotice("Member removed.");
      await loadProjectDetails(selectedProjectId);
      await loadProjects();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to remove member.");
    } finally {
      setBusy(false);
    }
  };

  const createTask = async (event) => {
    event.preventDefault();
    if (!selectedProjectId) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        ...taskForm,
        assigneeId: taskForm.assigneeId || null,
        dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : null
      };
      await api.post(`/projects/${selectedProjectId}/tasks`, payload);
      setTaskForm(initialTaskForm);
      setNotice("Task created.");
      await loadProjectDetails(selectedProjectId);
      await loadProjects();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create task.");
    } finally {
      setBusy(false);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api.patch(`/tasks/${taskId}`, { status });
      setNotice("Task updated.");
      await loadProjectDetails(selectedProjectId);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update task.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p>Loading projects...</p>;
  }

  return (
    <section className="stack-lg">
      <div className="section-head">
        <h1>Projects & Team</h1>
        <button className="ghost-btn" type="button" onClick={loadProjects} disabled={busy}>
          Refresh
        </button>
      </div>

      {notice ? <p className="success-text">{notice}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <div className="grid-two">
        <article className="panel">
          <h2>Projects</h2>
          {projects.length ? (
            <ul className="list">
              {projects.map((project) => (
                <li key={project.id} className="list-row">
                  <button
                    className={`link-btn ${selectedProjectId === project.id ? "active" : ""}`}
                    type="button"
                    onClick={() => onSelectProject(project.id)}
                  >
                    <strong>{project.name}</strong>
                    <span className="muted">
                      {project._count.tasks} tasks | {project._count.members} members
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No projects yet.</p>
          )}
        </article>

        {user.role === "ADMIN" ? (
          <article className="panel">
            <h2>Create Project</h2>
            <form className="stack-sm" onSubmit={createProject}>
              <label>
                Name
                <input
                  value={projectForm.name}
                  onChange={(event) =>
                    setProjectForm((state) => ({ ...state, name: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Description
                <textarea
                  value={projectForm.description}
                  onChange={(event) =>
                    setProjectForm((state) => ({ ...state, description: event.target.value }))
                  }
                  rows={3}
                />
              </label>
              <button type="submit" disabled={busy}>
                {busy ? "Saving..." : "Create Project"}
              </button>
            </form>
          </article>
        ) : (
          <article className="panel">
            <h2>Access Model</h2>
            <p className="muted">
              Members can view their project tasks and update status for tasks assigned to them.
            </p>
          </article>
        )}
      </div>

      {selectedProject ? (
        <div className="stack-lg">
          <article className="panel">
            <h2>{selectedProject.name}</h2>
            <p className="muted">
              {selectedProject.description || "No description"} | Owner: {selectedProject.owner?.name}
            </p>
          </article>

          <div className="grid-two">
            <article className="panel">
              <h2>Team Members</h2>
              {selectedMembers.length ? (
                <ul className="list">
                  {selectedMembers.map((member) => (
                    <li key={member.id} className="list-row">
                      <div>
                        <strong>{member.user.name}</strong>
                        <p className="muted">
                          {member.user.email} | Project role: {member.role}
                        </p>
                      </div>
                      {canManageProject && selectedProject.ownerId !== member.userId ? (
                        <button
                          className="danger-btn"
                          type="button"
                          onClick={() => removeMember(member.userId)}
                          disabled={busy}
                        >
                          Remove
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No members in this project yet.</p>
              )}
            </article>

            {canManageProject ? (
              <article className="panel">
                <h2>Add Member</h2>
                <form className="stack-sm" onSubmit={addMember}>
                  <label>
                    User
                    <select
                      value={memberForm.userId}
                      onChange={(event) =>
                        setMemberForm((state) => ({ ...state, userId: event.target.value }))
                      }
                      required
                    >
                      <option value="">Select user</option>
                      {users.map((memberUser) => (
                        <option key={memberUser.id} value={memberUser.id}>
                          {memberUser.name} ({memberUser.role})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Role
                    <select
                      value={memberForm.role}
                      onChange={(event) =>
                        setMemberForm((state) => ({ ...state, role: event.target.value }))
                      }
                    >
                      <option value="MEMBER">MEMBER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </label>
                  <button type="submit" disabled={busy}>
                    {busy ? "Adding..." : "Add to Team"}
                  </button>
                </form>
              </article>
            ) : null}
          </div>

          {canManageProject ? (
            <article className="panel">
              <h2>Create Task</h2>
              <form className="task-grid" onSubmit={createTask}>
                <label>
                  Title
                  <input
                    value={taskForm.title}
                    onChange={(event) =>
                      setTaskForm((state) => ({ ...state, title: event.target.value }))
                    }
                    required
                  />
                </label>
                <label>
                  Assignee
                  <select
                    value={taskForm.assigneeId}
                    onChange={(event) =>
                      setTaskForm((state) => ({ ...state, assigneeId: event.target.value }))
                    }
                  >
                    <option value="">Unassigned</option>
                    {selectedMembers.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.user.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select
                    value={taskForm.status}
                    onChange={(event) =>
                      setTaskForm((state) => ({ ...state, status: event.target.value }))
                    }
                  >
                    <option value="TODO">TODO</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="DONE">DONE</option>
                  </select>
                </label>
                <label>
                  Priority
                  <select
                    value={taskForm.priority}
                    onChange={(event) =>
                      setTaskForm((state) => ({ ...state, priority: event.target.value }))
                    }
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                  </select>
                </label>
                <label>
                  Due Date
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(event) =>
                      setTaskForm((state) => ({ ...state, dueDate: event.target.value }))
                    }
                  />
                </label>
                <label className="span-full">
                  Description
                  <textarea
                    value={taskForm.description}
                    onChange={(event) =>
                      setTaskForm((state) => ({ ...state, description: event.target.value }))
                    }
                    rows={3}
                  />
                </label>
                <button className="span-full" type="submit" disabled={busy}>
                  {busy ? "Saving..." : "Create Task"}
                </button>
              </form>
            </article>
          ) : null}

          <article className="panel">
            <h2>Tasks</h2>
            {tasks.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Priority</th>
                      <th>Assignee</th>
                      <th>Due Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => {
                      const canUpdateStatus = canManageProject || task.assigneeId === user.id;
                      return (
                        <tr key={task.id}>
                          <td>
                            <strong>{task.title}</strong>
                            <p className="muted">{task.description || "No description"}</p>
                          </td>
                          <td>{task.priority}</td>
                          <td>{task.assignee?.name || "Unassigned"}</td>
                          <td>{task.dueDate ? dayjs(task.dueDate).format("DD MMM YYYY") : "-"}</td>
                          <td>
                            {canUpdateStatus ? (
                              <select
                                value={task.status}
                                onChange={(event) => updateTaskStatus(task.id, event.target.value)}
                                disabled={busy}
                              >
                                <option value="TODO">TODO</option>
                                <option value="IN_PROGRESS">IN_PROGRESS</option>
                                <option value="DONE">DONE</option>
                              </select>
                            ) : (
                              <StatusPill status={task.status} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No tasks in this project yet.</p>
            )}
          </article>
        </div>
      ) : (
        <article className="panel">
          <p className="muted">Select a project to view details.</p>
        </article>
      )}
    </section>
  );
}

export default ProjectsPage;
