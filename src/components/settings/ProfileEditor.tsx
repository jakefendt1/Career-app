import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { EducationEntry, CertificationEntry } from '../../lib/types'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Card, CardBody, CardHeader } from '../ui/card'
import { Plus, Trash2, GripVertical } from 'lucide-react'

export function ProfileEditor() {
  const { profile, updateProfile } = useAppStore()
  const [newEdu, setNewEdu] = useState(false)
  const [newCert, setNewCert] = useState(false)
  const [eduForm, setEduForm] = useState({ degree: '', school: '', location: '', graduationYear: '' })
  const [certForm, setCertForm] = useState({ name: '', issuer: '', date: '' })

  function handleProfileChange(field: string, value: string) {
    updateProfile({ [field]: value } as Parameters<typeof updateProfile>[0])
  }

  function addEducation() {
    if (!eduForm.degree || !eduForm.school) return
    const entry: EducationEntry = {
      id: crypto.randomUUID(),
      degree: eduForm.degree,
      school: eduForm.school,
      location: eduForm.location,
      graduationYear: eduForm.graduationYear ? Number(eduForm.graduationYear) : undefined,
    }
    updateProfile({ education: [...profile.education, entry] })
    setEduForm({ degree: '', school: '', location: '', graduationYear: '' })
    setNewEdu(false)
  }

  function removeEducation(id: string) {
    updateProfile({ education: profile.education.filter(e => e.id !== id) })
  }

  function addCertification() {
    if (!certForm.name || !certForm.issuer) return
    const entry: CertificationEntry = {
      id: crypto.randomUUID(),
      name: certForm.name,
      issuer: certForm.issuer,
      date: certForm.date,
    }
    updateProfile({ certifications: [...profile.certifications, entry] })
    setCertForm({ name: '', issuer: '', date: '' })
    setNewCert(false)
  }

  function removeCertification(id: string) {
    updateProfile({ certifications: profile.certifications.filter(c => c.id !== id) })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-800">Personal Information</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={profile.name}
              onChange={e => handleProfileChange('name', e.target.value)}
              placeholder="Alex Johnson"
            />
            <Input
              label="Credentials (optional)"
              value={profile.credentials ?? ''}
              onChange={e => handleProfileChange('credentials', e.target.value)}
              placeholder="MBA"
            />
            <Input
              label="Email"
              type="email"
              value={profile.email}
              onChange={e => handleProfileChange('email', e.target.value)}
              placeholder="you@example.com"
            />
            <Input
              label="Phone"
              value={profile.phone}
              onChange={e => handleProfileChange('phone', e.target.value)}
              placeholder="555-555-0100"
            />
            <Input
              label="City"
              value={profile.city}
              onChange={e => handleProfileChange('city', e.target.value)}
              placeholder="Your City"
            />
            <Input
              label="State"
              value={profile.state}
              onChange={e => handleProfileChange('state', e.target.value)}
              placeholder="ST"
            />
            <Input
              label="LinkedIn URL (optional)"
              value={profile.linkedinUrl ?? ''}
              onChange={e => handleProfileChange('linkedinUrl', e.target.value)}
              placeholder="linkedin.com/in/yourname"
              className="col-span-2"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Education</h3>
            <Button variant="ghost" size="sm" onClick={() => setNewEdu(true)}>
              <Plus size={14} /> Add
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {profile.education.map(edu => (
              <div key={edu.id} className="flex items-start gap-2 p-3 bg-slate-50 rounded-md">
                <GripVertical size={16} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{edu.degree}</p>
                  <p className="text-xs text-slate-500">{edu.school}, {edu.location}</p>
                </div>
                <button onClick={() => removeEducation(edu.id)} className="text-slate-400 hover:text-red-500 shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {newEdu && (
              <div className="border border-blue-200 rounded-md p-4 space-y-3 bg-blue-50">
                <Input
                  label="Degree"
                  value={eduForm.degree}
                  onChange={e => setEduForm(f => ({ ...f, degree: e.target.value }))}
                  placeholder="MBA, Business Administration"
                />
                <Input
                  label="School"
                  value={eduForm.school}
                  onChange={e => setEduForm(f => ({ ...f, school: e.target.value }))}
                  placeholder="State University"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Location"
                    value={eduForm.location}
                    onChange={e => setEduForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="City, ST"
                  />
                  <Input
                    label="Graduation Year"
                    value={eduForm.graduationYear}
                    onChange={e => setEduForm(f => ({ ...f, graduationYear: e.target.value }))}
                    placeholder="2022"
                    type="number"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={addEducation}>Add</Button>
                  <Button variant="ghost" size="sm" onClick={() => setNewEdu(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {profile.education.length === 0 && !newEdu && (
              <p className="text-sm text-slate-400 italic">No education entries yet.</p>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Certifications</h3>
            <Button variant="ghost" size="sm" onClick={() => setNewCert(true)}>
              <Plus size={14} /> Add
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {profile.certifications.map(cert => (
              <div key={cert.id} className="flex items-start gap-2 p-3 bg-slate-50 rounded-md">
                <GripVertical size={16} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{cert.name}</p>
                  <p className="text-xs text-slate-500">{cert.issuer} | {cert.date}</p>
                </div>
                <button onClick={() => removeCertification(cert.id)} className="text-slate-400 hover:text-red-500 shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {newCert && (
              <div className="border border-blue-200 rounded-md p-4 space-y-3 bg-blue-50">
                <Input
                  label="Certification Name"
                  value={certForm.name}
                  onChange={e => setCertForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Relevant Certification"
                />
                <Input
                  label="Issuer"
                  value={certForm.issuer}
                  onChange={e => setCertForm(f => ({ ...f, issuer: e.target.value }))}
                  placeholder="Issuing Organization"
                />
                <Input
                  label="Date"
                  value={certForm.date}
                  onChange={e => setCertForm(f => ({ ...f, date: e.target.value }))}
                  placeholder="10/2025"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={addCertification}>Add</Button>
                  <Button variant="ghost" size="sm" onClick={() => setNewCert(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {profile.certifications.length === 0 && !newCert && (
              <p className="text-sm text-slate-400 italic">No certifications yet.</p>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
