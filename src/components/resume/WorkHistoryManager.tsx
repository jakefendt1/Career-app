import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAppStore } from '../../store/useAppStore'
import type { ResumeJob } from '../../lib/types'
import { JobEditDialog } from './JobEditDialog'
import { Button } from '../ui/button'
import { ArrowLeft, GripVertical, Edit2, Trash2, Plus } from 'lucide-react'

function SortableJobCard({
  job,
  onEdit,
  onDelete,
}: {
  job: ResumeJob
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: job.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg"
    >
      <button {...attributes} {...listeners} className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing">
        <GripVertical size={16} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">{job.title}</p>
        <p className="text-xs text-slate-500">{job.company} · {job.location} · {job.startDate}–{job.endDate}</p>
      </div>
      <button onClick={onEdit} className="text-slate-400 hover:text-blue-600">
        <Edit2 size={14} />
      </button>
      <button
        onClick={onDelete}
        className="text-slate-400 hover:text-red-500"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

export function WorkHistoryManager() {
  const { resumeJobs, addResumeJob, updateResumeJob, deleteResumeJob, reorderResumeJobs, setView } = useAppStore()
  const [editingJob, setEditingJob] = useState<ResumeJob | null>(null)
  const [addingNew, setAddingNew] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const sorted = [...resumeJobs].sort((a, b) => a.order - b.order)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = sorted.findIndex(j => j.id === active.id)
    const newIdx = sorted.findIndex(j => j.id === over.id)
    const reordered = arrayMove(sorted, oldIdx, newIdx).map((j, i) => ({ ...j, order: i }))
    reorderResumeJobs(reordered)
  }

  function handleAdd(data: Omit<ResumeJob, 'id' | 'order'>) {
    addResumeJob({
      id: crypto.randomUUID(),
      order: resumeJobs.length,
      ...data,
    })
    setAddingNew(false)
  }

  function handleEdit(data: Omit<ResumeJob, 'id' | 'order'>) {
    if (!editingJob) return
    updateResumeJob(editingJob.id, data)
    setEditingJob(null)
  }

  function handleDelete(job: ResumeJob) {
    if (confirm(`Remove "${job.title} at ${job.company}"? Drafts referencing this job will skip it but retain the bullet content.`)) {
      deleteResumeJob(job.id)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setView('resume')}>
          <ArrowLeft size={14} /> Drafts
        </Button>
        <h1 className="text-lg font-bold text-slate-900 flex-1">Work History</h1>
        <Button onClick={() => setAddingNew(true)}>
          <Plus size={15} /> Add Job
        </Button>
      </div>

      <p className="text-sm text-slate-500 mb-4">
        Drag to reorder. Most recent job should be first — this order controls how the resume is generated.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sorted.map(j => j.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sorted.map(job => (
              <SortableJobCard
                key={job.id}
                job={job}
                onEdit={() => setEditingJob(job)}
                onDelete={() => handleDelete(job)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {sorted.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="mb-3">No jobs yet.</p>
          <Button onClick={() => setAddingNew(true)}><Plus size={15} /> Add Your First Job</Button>
        </div>
      )}

      <JobEditDialog
        open={addingNew}
        onClose={() => setAddingNew(false)}
        onSave={handleAdd}
      />

      {editingJob && (
        <JobEditDialog
          job={editingJob}
          open
          onClose={() => setEditingJob(null)}
          onSave={handleEdit}
        />
      )}
    </div>
  )
}
