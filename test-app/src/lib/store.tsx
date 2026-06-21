"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Project = {
  id: number;
  title: string;
  description: string;
};

export type Priority = "Low" | "Medium" | "High";

export type Task = {
  id: number;
  projectId: number;
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  completed: boolean;
  assignee: string;
  createdAt: string;
};

export type TeamMember = {
  id: number;
  name: string;
  email: string;
  role: "Owner" | "Admin" | "Member" | "Viewer";
  avatar: string;
  joinedAt: string;
};

export type ActivityItem = {
  id: number;
  type: "task_created" | "task_completed" | "project_created" | "member_invited" | "note_saved";
  message: string;
  timestamp: string;
};

export type Note = {
  projectId: number;
  content: string;
  updatedAt: string;
};

export type NimbusState = {
  user: { name: string; email: string } | null;
  workspaceName: string | null;
  projects: Project[];
  nextProjectId: number;
  tasks: Task[];
  nextTaskId: number;
  team: TeamMember[];
  nextMemberId: number;
  activity: ActivityItem[];
  nextActivityId: number;
  notes: Note[];
};

const STORAGE_KEY = "nimbus_state_v1";

const initialState: NimbusState = {
  user: null,
  workspaceName: null,
  projects: [],
  nextProjectId: 1,
  tasks: [],
  nextTaskId: 1,
  team: [],
  nextMemberId: 1,
  activity: [],
  nextActivityId: 1,
  notes: [],
};

type AddTaskInput = {
  projectId: number;
  title: string;
  description?: string;
  dueDate: string;
  priority: Priority;
  assignee?: string;
};

type StoreContextValue = {
  state: NimbusState;
  hydrated: boolean;
  setUser: (user: { name: string; email: string }) => void;
  setWorkspaceName: (name: string) => void;
  addProject: (title: string, description?: string) => void;
  deleteProject: (projectId: number) => void;
  addTask: (input: AddTaskInput) => void;
  toggleTask: (taskId: number) => void;
  deleteTask: (taskId: number) => void;
  updateTask: (taskId: number, updates: Partial<Pick<Task, "title" | "description" | "dueDate" | "priority" | "assignee">>) => void;
  addTeamMember: (name: string, email: string, role: TeamMember["role"]) => void;
  removeTeamMember: (memberId: number) => void;
  updateMemberRole: (memberId: number, role: TeamMember["role"]) => void;
  saveNote: (projectId: number, content: string) => void;
  reset: () => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

const AVATARS = ["A", "B", "C", "D", "E", "F", "G", "H"];

function getAvatar(index: number): string {
  return AVATARS[index % AVATARS.length];
}

function now(): string {
  return new Date().toISOString();
}

function loadState(): NimbusState {
  if (typeof window === "undefined") {
    return initialState;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return initialState;
    }
    const parsed = JSON.parse(raw) as Partial<NimbusState>;
    return {
      user: parsed.user ?? null,
      workspaceName: parsed.workspaceName ?? null,
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      nextProjectId:
        typeof parsed.nextProjectId === "number" ? parsed.nextProjectId : 1,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      nextTaskId:
        typeof parsed.nextTaskId === "number" ? parsed.nextTaskId : 1,
      team: Array.isArray(parsed.team) ? parsed.team : [],
      nextMemberId:
        typeof parsed.nextMemberId === "number" ? parsed.nextMemberId : 1,
      activity: Array.isArray(parsed.activity) ? parsed.activity : [],
      nextActivityId:
        typeof parsed.nextActivityId === "number" ? parsed.nextActivityId : 1,
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
    };
  } catch {
    return initialState;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NimbusState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore write errors.
    }
  }, [state, hydrated]);

  const value = useMemo<StoreContextValue>(() => {
    function addActivity(state: NimbusState, type: ActivityItem["type"], message: string): { activity: ActivityItem[]; nextActivityId: number } {
      return {
        activity: [
          { id: state.nextActivityId, type, message, timestamp: now() },
          ...state.activity,
        ].slice(0, 50),
        nextActivityId: state.nextActivityId + 1,
      };
    }

    return {
      state,
      hydrated,
      setUser: (user) => setState((prev) => ({ ...prev, user })),
      setWorkspaceName: (workspaceName) =>
        setState((prev) => ({ ...prev, workspaceName })),
      addProject: (title, description = "") =>
        setState((prev) => ({
          ...prev,
          projects: [
            ...prev.projects,
            { id: prev.nextProjectId, title, description },
          ],
          nextProjectId: prev.nextProjectId + 1,
          ...addActivity(prev, "project_created", `Created project "${title}"`),
        })),
      deleteProject: (projectId) =>
        setState((prev) => {
          const project = prev.projects.find((p) => p.id === projectId);
          return {
            ...prev,
            projects: prev.projects.filter((p) => p.id !== projectId),
            tasks: prev.tasks.filter((t) => t.projectId !== projectId),
            notes: prev.notes.filter((n) => n.projectId !== projectId),
            ...addActivity(prev, "project_created", `Deleted project "${project?.title ?? "Unknown"}"`),
          };
        }),
      addTask: ({ projectId, title, description = "", dueDate, priority, assignee = "" }) =>
        setState((prev) => ({
          ...prev,
          tasks: [
            ...prev.tasks,
            {
              id: prev.nextTaskId,
              projectId,
              title,
              description,
              dueDate,
              priority,
              completed: false,
              assignee,
              createdAt: now(),
            },
          ],
          nextTaskId: prev.nextTaskId + 1,
          ...addActivity(prev, "task_created", `Created task "${title}"`),
        })),
      toggleTask: (taskId) =>
        setState((prev) => {
          const task = prev.tasks.find((t) => t.id === taskId);
          const willComplete = task && !task.completed;
          return {
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.id === taskId ? { ...t, completed: !t.completed } : t
            ),
            ...(willComplete
              ? addActivity(prev, "task_completed", `Completed task "${task.title}"`)
              : {}),
          };
        }),
      deleteTask: (taskId) =>
        setState((prev) => ({
          ...prev,
          tasks: prev.tasks.filter((t) => t.id !== taskId),
        })),
      updateTask: (taskId, updates) =>
        setState((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.id === taskId ? { ...t, ...updates } : t
          ),
        })),
      addTeamMember: (name, email, role) =>
        setState((prev) => ({
          ...prev,
          team: [
            ...prev.team,
            {
              id: prev.nextMemberId,
              name,
              email,
              role,
              avatar: getAvatar(prev.nextMemberId),
              joinedAt: now(),
            },
          ],
          nextMemberId: prev.nextMemberId + 1,
          ...addActivity(prev, "member_invited", `Invited ${name} as ${role}`),
        })),
      removeTeamMember: (memberId) =>
        setState((prev) => ({
          ...prev,
          team: prev.team.filter((m) => m.id !== memberId),
        })),
      updateMemberRole: (memberId, role) =>
        setState((prev) => ({
          ...prev,
          team: prev.team.map((m) =>
            m.id === memberId ? { ...m, role } : m
          ),
        })),
      saveNote: (projectId, content) =>
        setState((prev) => {
          const existing = prev.notes.findIndex((n) => n.projectId === projectId);
          const note: Note = { projectId, content, updatedAt: now() };
          const notes = existing >= 0
            ? prev.notes.map((n, i) => (i === existing ? note : n))
            : [...prev.notes, note];
          return {
            ...prev,
            notes,
            ...addActivity(prev, "note_saved", `Updated notes for project`),
          };
        }),
      reset: () => setState(initialState),
    };
  }, [state, hydrated]);

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return ctx;
}
