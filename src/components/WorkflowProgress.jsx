import { Check, Download, FolderOpen, ListChecks, Play } from 'lucide-react';

const ICONS = {
  select: FolderOpen,
  import: FolderOpen,
  review: ListChecks,
  rename: Play,
  export: Download,
};

export default function WorkflowProgress({ steps, currentIndex = 0, className = '' }) {
  const lastIndex = steps.length - 1;
  const allComplete = currentIndex >= lastIndex && lastIndex >= 0;

  return (
    <nav className={`workflow-progress ${className}`.trim()} aria-label="Workflow progress">
      <ol className="workflow-progress-list">
        {steps.map((step, index) => {
          const isDone = index < currentIndex || (allComplete && index === currentIndex);
          const isCurrent = index === currentIndex;
          const Icon = isDone && !isCurrent ? Check : (ICONS[step.id] || Check);
          const stateClass = isCurrent ? 'is-current' : isDone ? 'is-done' : 'is-upcoming';
          const lineComplete = index < currentIndex;

          return (
            <li
              key={step.id}
              className={`workflow-progress-item ${lineComplete ? 'has-complete-line' : ''}`}
            >
              <div
                className={`workflow-progress-step ${stateClass}`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span className="workflow-progress-icon" aria-hidden="true">
                  <Icon size={13} strokeWidth={2.2} />
                </span>
                <span className="workflow-progress-label">{step.label}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
