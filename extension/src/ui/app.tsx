import * as React from 'react';
import { useEffect, useState } from 'react';
import * as ReactDOM from 'react-dom';
import './styles.css';

interface Task {
    id: string;
    name: string;
    status: 'pending' | 'active' | 'complete' | 'blocked';
    assignee?: string;
}

interface DependencyGraph {
    nodes: Task[];
    edges: { from: string; to: string }[];
}

// VS Code API
const vscode = acquireVsCodeApi();

const App: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [graph, setGraph] = useState<DependencyGraph>({ nodes: [], edges: [] });

    // Listen for messages from extension
    useEffect(() => {
        window.addEventListener('message', (event) => {
            const message = event.data;
            if (message.type === 'update') {
                const { tasks: updatedTasks, graph: updatedGraph } = message.payload;
                if (updatedTasks) setTasks(updatedTasks);
                if (updatedGraph) setGraph(updatedGraph);
            }
        });
    }, []);

    // Handle refresh request
    const handleRefresh = () => {
        vscode.postMessage({ command: 'refresh' });
    };

    return (
        <div className="container">
            <header>
                <h1>Manta Flow</h1>
                <button onClick={handleRefresh}>Refresh</button>
            </header>
            <main>
                <section className="tasks">
                    <h2>Tasks</h2>
                    <ul>
                        {tasks.map((task) => (
                            <li key={task.id} className={`task ${task.status}`}>
                                {task.name} {task.assignee ? `(${task.assignee})` : ''}
                            </li>
                        ))}
                    </ul>
                </section>
                <section className="graph">
                    <h2>Dependency Graph</h2>
                    {graph.nodes.length > 0 ? (
                        <svg width="100%" height="400">
                            {graph.edges.map((edge, idx) => {
                                const fromNode = graph.nodes.find((n) => n.id === edge.from);
                                const toNode = graph.nodes.find((n) => n.id === edge.to);
                                if (!fromNode || !toNode) return null;
                                return (
                                    <line
                                        key={idx}
                                        x1={Math.random() * 300 + 50}
                                        y1={Math.random() * 300 + 50}
                                        x2={Math.random() * 300 + 50}
                                        y2={Math.random() * 300 + 50}
                                        stroke="black"
                                    />
                                );
                            })}
                            {graph.nodes.map((node, idx) => (
                                <circle
                                    key={idx}
                                    cx={Math.random() * 300 + 50}
                                    cy={Math.random() * 300 + 50}
                                    r={20}
                                    fill={
                                        node.status === 'complete'
                                            ? 'green'
                                            : node.status === 'active'
                                                ? 'yellow'
                                                : node.status === 'blocked'
                                                    ? 'red'
                                                    : 'gray'
                                    }
                                />
                            ))}
                        </svg>
                    ) : (
                        <p>No tasks yet.</p>
                    )}
                </section>
            </main>
        </div>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));
