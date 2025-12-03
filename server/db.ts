// In-memory database for development
interface Project {
    name: string;
    token: string;
    tasks: any[];
    members: string[];
}

interface DB {
    projects: { [token: string]: Project };
}

export const db: DB = {
    projects: {}
};

export function createProject(name: string, token: string) {
    db.projects[token] = { name, token, tasks: [], members: [] };
    return db.projects[token];
}

export function getProject(token: string) {
    return db.projects[token];
}

export function addTask(token: string, task: any) {
    const project = getProject(token);
    if (project) {
        project.tasks.push(task);
    }
    return task;
}

export function getTasks(token: string) {
    return getProject(token)?.tasks || [];
}

export function addMember(token: string, member: string) {
    const project = getProject(token);
    if (project && !project.members.includes(member)) {
        project.members.push(member);
    }
    return member;
}

export function getMembers(token: string) {
    return getProject(token)?.members || [];
}
