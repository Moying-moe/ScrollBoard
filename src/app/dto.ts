export interface Contest {
    problems: Problem[];
    teams: Team[];
    submissions: Submission[];
    duration: number;
    penaltyTime: number;
    freezeTime: number;
    name: string;
}

export interface Problem {
    id: string;
    tag: string;
    color?: string;
}

export interface Team {
    id: string;
    name: string;
}

export interface Submission {
    id: string;
    teamId: string;
    problemId: string;
    submitTime: number;
    accepted: boolean;
}
