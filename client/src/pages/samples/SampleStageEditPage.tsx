import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { ChevronDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { FormSkeleton } from "@/components/ui/skeletons"
import { STAGES } from "@/lib/constants"
import { stageForRole } from "@/lib/rbac"
import { getStageFields, stagePayloadFromForm, type StageFieldConfig } from "@/lib/stageFields"
import { getSample, updateSample, heartbeatSamplePresence, releaseSamplePresence } from "@/api/samples"
import { listUsers } from "@/api/users"
import { getStages, updateStage, type StagesResponse } from "@/api/stages"
import type { Sample } from "@/types/sample"
import type { User } from "@/types/user"
import type { StageName } from "@/lib/constants"
import type { RoleCode } from "@/lib/constants"
import { useAuth } from "@/contexts/auth"
import { toast } from "sonner"
import { getStatusColor } from "@/lib/statusColors"

const STAGE_LABELS: Record<StageName, string> = {
  [STAGES.PSI]: "PSI Intake (TD)",
  [STAGES.SAMPLE_DEVELOPMENT]: "FTY Development ",
  [STAGES.PC_REVIEW]: "MD / Product Review Decision",
  [STAGES.COSTING]: "Cost Sheet Processing(Costing)",
  [STAGES.SHIPMENT_TO_BRAND]: "Brand Delivery Tracking",
  [STAGES.DELIVERED_CONFIRMATION]: "Delivered Confirmation",
}

const STAGE_OPTIONS: StageName[] = [
  STAGES.PSI,
  STAGES.SAMPLE_DEVELOPMENT,
  STAGES.PC_REVIEW,
  STAGES.COSTING,
  STAGES.SHIPMENT_TO_BRAND,
  STAGES.DELIVERED_CONFIRMATION,
]

const STAGE_ORDER: StageName[] = [
  STAGES.PSI,
  STAGES.SAMPLE_DEVELOPMENT,
  STAGES.PC_REVIEW,
  STAGES.COSTING,
  STAGES.SHIPMENT_TO_BRAND,
  STAGES.DELIVERED_CONFIRMATION,
]

const SECTION_LABELS: Record<string, string> = {
  Setup: "Setup Details to Fill",
  Status: "Status Updates to Record",
  Shipping: "Shipping Details to Record",
  Finalize: "Final Verification Fields",
  default: "General Stage Fields",
}

function getStageLabel(stage: StageName | null | undefined): string {
  if (!stage) return "-"
  return STAGE_LABELS[stage] ?? stage
}

function getSectionLabel(sectionName: string): string {
  return SECTION_LABELS[sectionName] ?? sectionName
}

function getNextStage(currentStage: StageName | null | undefined): StageName | null {
  if (!currentStage) return STAGE_ORDER[0] ?? null
  const idx = STAGE_ORDER.indexOf(currentStage)
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null
  return STAGE_ORDER[idx + 1] ?? null
}

function isDeliveryConfirmationStage(stage: string | null | undefined): boolean {
  return String(stage || "").trim().toLowerCase() === STAGES.DELIVERED_CONFIRMATION
}

function normalizeStageName(stage: string | null | undefined): StageName | null {
  const value = String(stage || "").trim().toLowerCase()
  if (!value) return null
  if (Object.values(STAGES).includes(value as StageName)) return value as StageName
  if (value.includes("delivered")) return STAGES.DELIVERED_CONFIRMATION
  if (value.includes("shipment") || value.includes("brand")) return STAGES.SHIPMENT_TO_BRAND
  if (value.includes("cost")) return STAGES.COSTING
  if (value.includes("pc") || value.includes("review")) return STAGES.PC_REVIEW
  if (value.includes("development")) return STAGES.SAMPLE_DEVELOPMENT
  if (value.includes("psi")) return STAGES.PSI
  return null
}

type StageRoleConfig = {
  label: string
  roleCode: "PBD" | "TD" | "FTY" | "MD" | "COSTING"
  assignmentKey?: "pbd_user_id" | "td_user_id" | "fty_user_id" | "fty_md2_user_id" | "md_user_id" | "costing_user_id"
  stageFieldKey?: "fty_md_user_id" | "team_member_user_id"
}

function getStageRoleConfig(stage: StageName | null | undefined): StageRoleConfig | null {
  if (!stage) return null
  if (stage === STAGES.PSI) {
    return { label: "TD - PSI Intake", roleCode: "TD", assignmentKey: "td_user_id" }
  }
  if (stage === STAGES.SAMPLE_DEVELOPMENT) {
    return {
      label: "FTY MD - FTY Development",
      roleCode: "FTY",
      assignmentKey: "fty_md2_user_id",
      stageFieldKey: "fty_md_user_id",
    }
  }
  if (stage === STAGES.PC_REVIEW) {
    return { label: "MD M88 - MD/Product Decision", roleCode: "MD", assignmentKey: "md_user_id" }
  }
  if (stage === STAGES.COSTING) {
    return {
      label: "Costing Team - Cost Sheet",
      roleCode: "COSTING",
      assignmentKey: "costing_user_id",
      stageFieldKey: "team_member_user_id",
    }
  }
  if (stage === STAGES.SHIPMENT_TO_BRAND) {
    return { label: "Brand Tracking/Delivery Confirmation - PBD", roleCode: "PBD", assignmentKey: "pbd_user_id" }
  }
  return null
}

function getEditableStageFields(
  stage: StageName | null | undefined,
  stageRoleConfig: StageRoleConfig | null,
): StageFieldConfig[] {
  if (!stage) return []

  const fields = [...getStageFields(stage)]

  if (
    stageRoleConfig?.assignmentKey &&
    !stageRoleConfig.stageFieldKey &&
    !fields.some((f) => f.key === stageRoleConfig.assignmentKey)
  ) {
    fields.unshift({
      key: stageRoleConfig.assignmentKey,
      label: stageRoleConfig.label,
      type: "user_select",
      optional: false,
      section: "default",
    })
  }

  return fields
}

function valueToString(v: unknown): string {
  if (v == null) return ""
  if (typeof v === "boolean") return v ? "true" : "false"
  if (typeof v === "string" && v.match(/^\d{4}-\d{2}-\d{2}/)) return v.slice(0, 10)
  return String(v)
}

function fieldValueToForm(value: unknown, type: StageFieldConfig["type"]): string {
  if (value == null || value === "") return ""
  if (type === "boolean") return value ? "true" : "false"
  if (type === "date" && typeof value === "string") return value.slice(0, 10)
  return String(value)
}

type FormValidationState = {
  fieldErrors: Record<string, string>
  canSubmit: boolean
  hasStageFieldChanges: boolean
}

function userMatchesRole(user: User, expectedRole: "PBD" | "TD" | "FTY" | "MD" | "COSTING"): boolean {
  const roleCode = String(user.roleCode || "").trim().toUpperCase()
  const roleName = String(user.roleName || "").trim().toUpperCase()

  const roleAliases: Record<"PBD" | "TD" | "FTY" | "MD" | "COSTING", string[]> = {
    PBD: ["PBD", "PRODUCT BUSINESS DEV", "PRODUCT BUSINESS DEVELOPMENT"],
    TD: ["TD", "TECHNICAL DESIGN"],
    FTY: ["FTY", "FACTORY", "FACTORY EXECUTION"],
    MD: ["MD", "MERCHANDISING"],
    COSTING: ["COSTING", "COSTING ANALYSIS"],
  }

  const aliases = roleAliases[expectedRole]
  return aliases.includes(roleCode) || aliases.includes(roleName)
}

export default function SampleStageEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sample, setSample] = useState<Sample | null>(null)
  const [stagesData, setStagesData] = useState<StagesResponse | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const userStage = user ? stageForRole(user.roleCode as RoleCode) : null
  const isSuperAdmin = user?.roleCode === "SUPER_ADMIN"
  const isAdmin = user?.roleCode === "ADMIN" || isSuperAdmin
  const canSeeAllRegions = isSuperAdmin
  const currentRegion = user?.region
  const defaultStage: StageName | null = userStage ?? null

  const [selectedStage, setSelectedStage] = useState<StageName | null>(defaultStage)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [initialFormValues, setInitialFormValues] = useState<Record<string, string>>({})
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [stageRoleUserId, setStageRoleUserId] = useState<string>("")

  const currentStage = selectedStage ?? userStage
  const stageRoleConfig = getStageRoleConfig(currentStage)

  function getSingleRelation<T>(value: T | T[] | null | undefined): T | null {
    if (!value) return null
    return Array.isArray(value) ? value[0] ?? null : value
  }

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [sampleRes, stagesRes] = await Promise.all([
        getSample(id),
        getStages(id),
      ])
      setSample(sampleRes)
      setStagesData(stagesRes)
    } catch (e: unknown) {
      console.error("Failed to load sample/stages:", e)
      const err = e as { response?: { status?: number; data?: { error?: string } } }
      const msg = err?.response?.status === 403
        ? (err.response?.data?.error ?? "You can only access samples at your stage.")
        : "Failed to load sample or stage data."
      setError(msg)
      toast.error(msg)
      if (err?.response?.status === 403) navigate("/samples")
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!id || !user) return
    const sampleId = id
    let active = true

    async function beat() {
      try {
        await heartbeatSamplePresence(sampleId, {
          context: "stage_edit",
          lock_type: "stage_edit",
        })
      } catch (err: unknown) {
        if (!active) return
        const status = (err as { response?: { status?: number; data?: { error?: string } } })?.response?.status
        const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Sample is currently being edited by another user"
        if (status === 409) {
          toast.error(message)
          navigate(`/samples/${sampleId}`)
        }
      }
    }

    void beat()
    const intervalId = window.setInterval(() => {
      void beat()
    }, 10000)

    return () => {
      active = false
      window.clearInterval(intervalId)
      void releaseSamplePresence(sampleId, { context: "stage_edit" })
    }
  }, [id, user, navigate])

  useEffect(() => {
    if (!sample?.current_stage) return

    if (isAdmin) {
      setSelectedStage(normalizeStageName(sample.current_stage) ?? STAGES.PSI)
      return
    }

    if (isDeliveryConfirmationStage(sample.current_stage)) {
      setSelectedStage(STAGES.DELIVERED_CONFIRMATION)
    }
  }, [sample?.current_stage, isAdmin])

  useEffect(() => {
    if (!isAdmin) return
    let active = true
    async function loadUsers() {
      try {
        const data = await listUsers()
        if (active) setUsers(data)
      } catch (err) {
        console.error("Failed to load users:", err)
        toast.error("Failed to load users")
      }
    }
    loadUsers()
    return () => {
      active = false
    }
  }, [isAdmin])

  useEffect(() => {
    if (!currentStage || !stagesData) return
    const row = currentStage === STAGES.DELIVERED_CONFIRMATION
      ? stagesData.stages[STAGES.SHIPMENT_TO_BRAND]
      : stagesData.stages[currentStage]
    const fields = getEditableStageFields(currentStage, getStageRoleConfig(currentStage))
    const initial: Record<string, string> = {}
    for (const f of fields) {
      initial[f.key] = fieldValueToForm(row?.[f.key], f.type)
    }

    const roleConfig = getStageRoleConfig(currentStage)
    const assignment = getSingleRelation(sample?.team_assignment)
    const assignmentValue = roleConfig?.assignmentKey ? assignment?.[roleConfig.assignmentKey] : null

    if (roleConfig?.stageFieldKey) {
      const currentStageValue = String(initial[roleConfig.stageFieldKey] ?? "").trim()
      if (!currentStageValue && assignmentValue != null && String(assignmentValue).trim() !== "") {
        initial[roleConfig.stageFieldKey] = String(assignmentValue)
      }
    } else if (roleConfig?.assignmentKey) {
      const currentAssignmentValue = String(initial[roleConfig.assignmentKey] ?? "").trim()
      if (!currentAssignmentValue && assignmentValue != null && String(assignmentValue).trim() !== "") {
        initial[roleConfig.assignmentKey] = String(assignmentValue)
      }
    }

    setFormValues(initial)
    setInitialFormValues(initial)
    
    // Find first incomplete section based on loaded data and open only that one
    const sectionFields: Record<string, typeof fields> = {}
    fields.forEach((f) => {
      const sectionName = f.section || "default"
      if (!sectionFields[sectionName]) sectionFields[sectionName] = []
      sectionFields[sectionName].push(f)
    })

    const sectionOrder = ["Setup", "Status", "Shipping", "Finalize"]
    const orderedSections = sectionOrder.filter(name => sectionFields[name])

    // Find first incomplete section based on loaded data
    const firstIncomplete = orderedSections.find((name) => {
      const fields = sectionFields[name]
      return !fields.every((f) => {
        const value = fieldValueToForm(row?.[f.key], f.type)
        return value !== undefined && value !== null && String(value).trim() !== ""
      })
    })

    // Set initial expanded state: only first incomplete section is open
    const initialExpanded: Record<string, boolean> = {}
    orderedSections.forEach((name) => {
      initialExpanded[name] = name === firstIncomplete
    })
    setExpandedSections(initialExpanded)
  }, [currentStage, stagesData, sample])

  useEffect(() => {
    if (!stageRoleConfig || !sample) {
      setStageRoleUserId("")
      return
    }

    const assignment = getSingleRelation(sample.team_assignment)
    const assignmentValue = stageRoleConfig.assignmentKey ? assignment?.[stageRoleConfig.assignmentKey] : null
    const stageValue = stageRoleConfig.stageFieldKey
      ? formValues[stageRoleConfig.stageFieldKey]
      : (stageRoleConfig.assignmentKey ? formValues[stageRoleConfig.assignmentKey] : "")

    if (stageValue && String(stageValue).trim() !== "") {
      setStageRoleUserId(String(stageValue))
      return
    }

    if (assignmentValue != null && String(assignmentValue).trim() !== "") {
      setStageRoleUserId(String(assignmentValue))
      return
    }

    if (!isAdmin && user?.id != null) {
      setStageRoleUserId(String(user.id))
      return
    }

    setStageRoleUserId("")
  }, [stageRoleConfig, sample, formValues, isAdmin, user?.id])

  useEffect(() => {
    if (!currentStage || isAdmin || !user) return

    setFormValues((prev) => {
      const next = { ...prev }

      if (currentStage === STAGES.SAMPLE_DEVELOPMENT && user.roleCode === "FTY") {
        if (!next.fty_md_user_id) next.fty_md_user_id = String(user.id)
      }

      if (currentStage === STAGES.COSTING && user.roleCode === "COSTING") {
        if (!next.team_member_user_id) next.team_member_user_id = String(user.id)
      }

      return next
    })
  }, [currentStage, isAdmin, user])

  function toggleSection(sectionName: string) {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }))
  }

  function isSectionComplete(sectionFields: typeof fields): boolean {
    // Check if ALL fields are filled (regardless of optional status)
    return sectionFields.every((f) => {
      const value = formValues[f.key]
      return value !== undefined && value !== null && String(value).trim() !== ""
    })
  }

  const validationState = useMemo<FormValidationState>(() => {
    if (!currentStage) {
      return {
        fieldErrors: {},
        canSubmit: false,
        hasStageFieldChanges: false,
      }
    }

    const fields = getEditableStageFields(currentStage, stageRoleConfig)
    const errs: Record<string, string> = {}

    for (const f of fields) {
      const v = formValues[f.key]
      const hasValue = v !== undefined && v !== null && String(v).trim() !== ""

      if (!f.optional && !hasValue) {
        errs[f.key] = `${f.label} is required`
        continue
      }
      if (!hasValue) continue

      if (f.type === "number") {
        const n = Number(v)
        if (Number.isNaN(n)) {
          errs[f.key] = `${f.label} must be a number`
        }
      }

      if (f.type === "date") {
        const t = Date.parse(String(v))
        if (!Number.isFinite(t)) {
          errs[f.key] = `${f.label} must be a valid date`
        }
      }

      if (f.type === "user_select") {
        const n = Number(v)
        if (Number.isNaN(n)) {
          errs[f.key] = `${f.label} must be selected`
        }
      }

      if (f.type === "boolean") {
        const s = String(v)
        if (s !== "true" && s !== "false" && s !== "") {
          errs[f.key] = `${f.label} must be Yes or No`
        }
      }
    }

    // Fix: compare boolean values as strings for hasStageFieldChanges
    const hasStageFieldChanges = fields.some((f) => {
      const current = f.type === "boolean"
        ? String(formValues[f.key] ?? "")
        : (formValues[f.key] ?? "")
      const initial = f.type === "boolean"
        ? String(initialFormValues[f.key] ?? "")
        : (initialFormValues[f.key] ?? "")
      return current !== initial
    })

    return {
      fieldErrors: errs,
      canSubmit: hasStageFieldChanges && Object.keys(errs).length === 0,
      hasStageFieldChanges,
    }
  }, [currentStage, formValues, initialFormValues, stageRoleConfig])

  const initialStageRoleUserId = useMemo(() => {
    if (!stageRoleConfig || !sample) return ""

    const assignment = getSingleRelation(sample.team_assignment)
    const assignmentValue = stageRoleConfig.assignmentKey ? assignment?.[stageRoleConfig.assignmentKey] : null
    const stageValue = stageRoleConfig.stageFieldKey ? initialFormValues[stageRoleConfig.stageFieldKey] : ""

    if (stageValue && String(stageValue).trim() !== "") return String(stageValue)
    if (assignmentValue != null && String(assignmentValue).trim() !== "") return String(assignmentValue)
    if (!isAdmin && user?.id != null) return String(user.id)
    return ""
  }, [stageRoleConfig, sample, initialFormValues, isAdmin, user?.id])

  const hasRoleChange = useMemo(() => {
    const currentValue = (stageRoleUserId || "").trim()
    const initialValue = (initialStageRoleUserId || "").trim()
    return currentValue !== initialValue
  }, [stageRoleUserId, initialStageRoleUserId])

  const canSave = validationState.canSubmit || (!validationState.hasStageFieldChanges && hasRoleChange)

  const withSelectedUser = useCallback((usersList: User[], selectedUserId: string | undefined): User[] => {
    if (!selectedUserId) return usersList
    const selectedIdNum = Number(selectedUserId)
    if (Number.isNaN(selectedIdNum)) return usersList
    if (usersList.some((u) => u.id === selectedIdNum)) return usersList

    const selectedUser = users.find((u) => u.id === selectedIdNum)
    if (!selectedUser) return usersList

    return [...usersList, selectedUser].sort((a, b) =>
      (a.full_name || a.username).localeCompare(b.full_name || b.username)
    )
  }, [users])

  const ftyUsers = useMemo(() => {
    const filteredUsers = users
      .filter((u) => userMatchesRole(u, "FTY") && u.is_active)
      .filter((u) => canSeeAllRegions || !currentRegion || u.region === currentRegion)
      .sort((a, b) => (a.full_name || a.username).localeCompare(b.full_name || b.username))
    return withSelectedUser(filteredUsers, formValues.fty_md_user_id)
  }, [users, canSeeAllRegions, currentRegion, formValues.fty_md_user_id, withSelectedUser])

  const costingUsers = useMemo(() => {
    const filteredUsers = users
      .filter((u) => userMatchesRole(u, "COSTING") && u.is_active)
      .filter((u) => canSeeAllRegions || !currentRegion || u.region === currentRegion)
      .sort((a, b) => (a.full_name || a.username).localeCompare(b.full_name || b.username))
    return withSelectedUser(filteredUsers, formValues.team_member_user_id)
  }, [users, canSeeAllRegions, currentRegion, formValues.team_member_user_id, withSelectedUser])

  const tdUsers = useMemo(() => {
    const filteredUsers = users
      .filter((u) => userMatchesRole(u, "TD") && u.is_active)
      .filter((u) => canSeeAllRegions || !currentRegion || u.region === currentRegion)
      .sort((a, b) => (a.full_name || a.username).localeCompare(b.full_name || b.username))
    return withSelectedUser(filteredUsers, formValues.td_user_id)
  }, [users, canSeeAllRegions, currentRegion, formValues.td_user_id, withSelectedUser])

  const mdUsers = useMemo(() => {
    const filteredUsers = users
      .filter((u) => userMatchesRole(u, "MD") && u.is_active)
      .filter((u) => canSeeAllRegions || !currentRegion || u.region === currentRegion)
      .sort((a, b) => (a.full_name || a.username).localeCompare(b.full_name || b.username))
    return withSelectedUser(filteredUsers, formValues.md_user_id)
  }, [users, canSeeAllRegions, currentRegion, formValues.md_user_id, withSelectedUser])

  const pbdUsers = useMemo(() => {
    const filteredUsers = users
      .filter((u) => userMatchesRole(u, "PBD") && u.is_active)
      .filter((u) => canSeeAllRegions || !currentRegion || u.region === currentRegion)
      .sort((a, b) => (a.full_name || a.username).localeCompare(b.full_name || b.username))
    return withSelectedUser(filteredUsers, formValues.pbd_user_id)
  }, [users, canSeeAllRegions, currentRegion, formValues.pbd_user_id, withSelectedUser])

  const stageRoleUsers = useMemo(() => {
    if (!stageRoleConfig) return []
    const filteredUsers = users
      .filter((u) => userMatchesRole(u, stageRoleConfig.roleCode) && u.is_active)
      .filter((u) => canSeeAllRegions || !currentRegion || u.region === currentRegion)
      .sort((a, b) => (a.full_name || a.username).localeCompare(b.full_name || b.username))
    return withSelectedUser(filteredUsers, stageRoleUserId)
  }, [users, stageRoleConfig, canSeeAllRegions, currentRegion, stageRoleUserId, withSelectedUser])

  const userNameById = useMemo(() => {
    const map = new Map<number, string>()
    users.forEach((u) => {
      const name = u.full_name?.trim() || u.username
      map.set(u.id, name)
    })
    return map
  }, [users])

  function getUserLabel(userId: string | undefined): string {
    if (!userId) return ""
    const idNum = Number(userId)
    if (Number.isNaN(idNum)) return ""
    return userNameById.get(idNum) || `User #${idNum}`
  }

  function getUserOptionsForField(fieldKey: string): User[] {
    if (fieldKey === "fty_md_user_id" || fieldKey === "fty_md2_user_id" || fieldKey === "fty_user_id") return ftyUsers
    if (fieldKey === "team_member_user_id" || fieldKey === "costing_user_id") return costingUsers
    if (fieldKey === "td_user_id") return tdUsers
    if (fieldKey === "md_user_id") return mdUsers
    if (fieldKey === "pbd_user_id") return pbdUsers
    return stageRoleUsers
  }

  function getCurrentAssignedOption(fieldKey: string): { value: string; label: string } | null {
    const assignment = getSingleRelation(sample?.team_assignment)
    if (!assignment) return null

    if (fieldKey === "td_user_id" && assignment.td_user_id != null) {
      return { value: String(assignment.td_user_id), label: assignment.td?.full_name?.trim() || `User #${assignment.td_user_id}` }
    }
    if (fieldKey === "pbd_user_id" && assignment.pbd_user_id != null) {
      return { value: String(assignment.pbd_user_id), label: assignment.pbd?.full_name?.trim() || `User #${assignment.pbd_user_id}` }
    }
    if (fieldKey === "md_user_id" && assignment.md_user_id != null) {
      return { value: String(assignment.md_user_id), label: assignment.md?.full_name?.trim() || `User #${assignment.md_user_id}` }
    }
    if ((fieldKey === "costing_user_id" || fieldKey === "team_member_user_id") && assignment.costing_user_id != null) {
      return { value: String(assignment.costing_user_id), label: assignment.costing?.full_name?.trim() || `User #${assignment.costing_user_id}` }
    }
    if ((fieldKey === "fty_md2_user_id" || fieldKey === "fty_user_id" || fieldKey === "fty_md_user_id") && (assignment.fty_md2_user_id != null || assignment.fty_user_id != null)) {
      const id = assignment.fty_md2_user_id ?? assignment.fty_user_id
      if (id == null) return null
      return { value: String(id), label: assignment.fty_md2?.full_name?.trim() || `User #${id}` }
    }

    return null
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !currentStage) return
    if (String(sample?.current_status || "").trim().toLowerCase().includes("drop")) {
      toast.error("Sample is dropped. Activate the sample first to make stage modifications.")
      return
    }
    const ok = validateForm()
    if (ok) setShowConfirm(true)
  }

  function validateForm(): boolean {
    const { fieldErrors: errs, canSubmit } = validationState

    setFieldErrors(errs)
    if (validationState.hasStageFieldChanges && Object.keys(errs).length > 0) {
      const first = Object.values(errs)[0]
      toast.error(first)
      return false
    }

    if (validationState.hasStageFieldChanges) return canSubmit
    return hasRoleChange
  }

  function canAdvanceStage(): boolean {
    if (!currentStage) return false
    const fields = getEditableStageFields(currentStage, stageRoleConfig)

    const finalizeFields = fields.filter((f) => f.section === "Finalize")
    if (finalizeFields.length > 0) {
      const allFinalizeFilled = finalizeFields.every((f) => {
        const value = formValues[f.key]
        return value !== undefined && value !== null && String(value).trim() !== ""
      })
      const hasFinalizeCheck = finalizeFields.some((f) => f.key === "is_checked")
      const isChecked = formValues["is_checked"] === "true"
      return allFinalizeFilled && (!hasFinalizeCheck || isChecked)
    }

    const sentDate = formValues["sent_date"]
    if (sentDate !== undefined && sentDate !== null && String(sentDate).trim() !== "") {
      return true
    }

    return fields.some((f) => {
      if (f.key === "is_checked") return false
      const value = formValues[f.key]
      return value !== undefined && value !== null && String(value).trim() !== ""
    })
  }

  function getAdvanceRequirementMessage(): string {
    if (!currentStage) return "Complete required fields to enable advancing."
    const fields = getEditableStageFields(currentStage, stageRoleConfig)
    const hasFinalize = fields.some((f) => f.section === "Finalize")
    if (hasFinalize) return "Complete Finalize section and verify to enable advancing."
    if (fields.some((f) => f.key === "sent_date")) return "Fill PSI Sent to FTY Date to enable advancing."
    return "Complete required fields to enable advancing."
  }

  function confirmAndSave(moveToNext: boolean) {
    if (!id || !currentStage) return
    if (String(sample?.current_status || "").trim().toLowerCase().includes("drop")) {
      toast.error("Sample is dropped. Activate the sample first to make stage modifications.")
      return
    }

    // Validate Finalize section if trying to advance
    if (moveToNext && !canAdvanceStage()) {
      toast.error(`Cannot advance: ${getAdvanceRequirementMessage()}`)
      setShowConfirm(false)
      return
    }

    const sampleId = id
    const stage = currentStage
    const payload = stagePayloadFromForm(stage, formValues as unknown as Record<string, unknown>)
    const shouldSaveStage = moveToNext || validationState.hasStageFieldChanges
    const stageLabel = STAGE_LABELS[stage] ?? stage
    const nextStage = getNextStage(stage)

    setShowConfirm(false)
    setError(null)

    const DELAY = 3
    let remaining = DELAY
    let cancelled = false

    const intervalId: ReturnType<typeof setInterval> = setInterval(() => {
      remaining--
      if (remaining > 0) {
        toast.loading(`${actionLabel} in ${remaining}s — click Undo to cancel`, {
          id: toastId,
          action: { label: "Undo", onClick: cancel },
          duration: Infinity,
        })
      }
    }, 1000)

    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(async () => {
      clearInterval(intervalId)
      if (cancelled) return
      toast.dismiss(toastId)
      setSaving(true)
      try {
        if (stageRoleConfig && stageRoleConfig.assignmentKey && isAdmin && hasRoleChange) {
          await updateSample(sampleId, {
            assignment: {
              [stageRoleConfig.assignmentKey]: stageRoleUserId ? Number(stageRoleUserId) : null,
            },
          })
        }

        if (shouldSaveStage) {
          const stagePayload: Record<string, unknown> = { ...payload }
          if (stageRoleConfig?.stageFieldKey && stageRoleUserId) {
            stagePayload[stageRoleConfig.stageFieldKey] = Number(stageRoleUserId)
          }
          if (moveToNext && nextStage) {
            stagePayload.advance_to_stage = nextStage
          }
          await updateStage(sampleId, stage, stagePayload)
        }

        if (moveToNext && nextStage) {
          // current_stage is advanced via updateStage() on backend
        }

        if (moveToNext && nextStage) {
          toast.success(`${stageLabel} saved — sample advanced to ${STAGE_LABELS[nextStage] ?? nextStage}`)
        } else {
          toast.success(`${stageLabel} stage saved`)
        }
        navigate(`/samples/${sampleId}`)
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
            : "Failed to update stage"
        setError(message ?? "Failed to update stage")
        toast.error(message ?? "Failed to update stage")
      } finally {
        setSaving(false)
      }
    }, DELAY * 1000)

    const actionLabel = moveToNext && nextStage
      ? `Saving & advancing to ${STAGE_LABELS[nextStage] ?? nextStage}`
      : `Saving ${stageLabel}`

    function cancel() {
      cancelled = true
      clearInterval(intervalId)
      clearTimeout(timeoutId)
      toast.dismiss(toastId)
      toast.info("Save cancelled — you can continue editing")
    }

    const toastId = toast.loading(`${actionLabel} in ${remaining}s — click Undo to cancel`, {
      action: { label: "Undo", onClick: cancel },
      duration: Infinity,
    })

  }

  async function markSampleReceivedAndComplete() {
    if (!id) return
    if (String(sample?.current_status || "").trim().toLowerCase().includes("drop")) {
      toast.error("Sample is dropped. Activate the sample first to make stage modifications.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const sentDate = String(formValues.sent_date || "").trim()
      if (!sentDate) {
        toast.error("Date Package Was Sent to Brand is required.")
        return
      }

      await updateStage(id, STAGES.DELIVERED_CONFIRMATION, {
        sent_date: sentDate,
      })

      await updateSample(id, {
        current_stage: STAGES.DELIVERED_CONFIRMATION,
        current_status: "Delivered",
        sample_status: "Completed",
      })

      await loadData()
      toast.success("Sample marked as delivered")
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : "Failed to complete delivery confirmation"
      setError(message ?? "Failed to complete delivery confirmation")
      toast.error(message ?? "Failed to complete delivery confirmation")
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Please log in to edit stages.</p>
      </div>
    )
  }

  if (userStage === null && !isAdmin) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Your role does not have a stage to edit.</p>
        <Button variant="link" className="mt-2" onClick={() => navigate("/samples")}>
          Back to samples
        </Button>
      </div>
    )
  }

  if (loading && !sample) {
    return (
      <div className="p-6">
        <FormSkeleton />
      </div>
    )
  }

  if (!id || !sample) {
    return (
      <div className="p-6">
        <p className="text-destructive">Sample not found.</p>
        <Button variant="link" className="mt-2" onClick={() => navigate("/samples")}>
          Back to samples
        </Button>
      </div>
    )
  }

  const fields = getEditableStageFields(currentStage, stageRoleConfig)
  const isDeliveryCompletionView = isDeliveryConfirmationStage(currentStage)
  const isSampleDropped = String(sample.current_status || "").trim().toLowerCase().includes("drop")

  // Determine context card styling based on status
  const getStatusCardStyle = () => {
    const status = sample?.current_status?.toUpperCase() || ""
    if (status === "REJECTED" || status === "HOLD" || status === "CANCELLED" || status === "CANCELED" || status === "DROPPED") {
      return "border-l-rose-500 bg-rose-50/30 dark:bg-rose-950/10"
    }
    if (
      status === "APPROVED" ||
      status === "PARTIAL_APPROVED" ||
      status.includes("COMPLETE") ||
      status.includes("SENT") ||
      status.includes("SHARED") ||
      status.includes("DELIVERED")
    ) {
      return "border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10"
    }
    if (status.includes("PENDING") || status.includes("REVIEW")) {
      return "border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/10"
    }
    if (status === "INITIATED" || status.includes("DEVELOPMENT") || status.includes("PROGRESS") || status.includes("ACTIVE")) {
      return "border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/10"
    }
    return "border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/10" // fallback
  }

  return (
    <div className="space-y-3 p-3 md:p-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              to={id ? `/samples/${id}` : "/samples"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted text-lg font-black leading-none text-foreground hover:bg-accent"
            >
              &larr;
            </Link>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/samples">Samples</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={id ? `/samples/${id}` : "/samples"}>Details</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Edit Stage</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
        <div>
          <h1 className="text-xl font-bold">Edit Stage</h1>
          <p className="text-xs text-muted-foreground">
            {sample.style_number}
            {sample.style_name ? ` • ${sample.style_name}` : ""}
          </p>
        </div>
          </div>

      <Card className={`border-l-4 ${getStatusCardStyle()}`}>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Style #</div>
              <div className="font-medium">{sample.style_number}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Color</div>
              <div className="font-medium">{sample.color ?? "-"}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Status</div>
              {sample.current_status ? (
                <Badge variant="outline" className={`${getStatusColor(sample.current_status)} text-white border-0`}>
                  {sample.current_status}
                </Badge>
              ) : (
                <div className="font-medium">-</div>
              )}
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Current Stage</div>
              <div className="font-medium">{getStageLabel(sample.current_stage as StageName | null | undefined)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-3">
        {isAdmin && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Select Stage to Edit</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedStage ?? ""}
                onValueChange={(v) => setSelectedStage(v as StageName)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_OPTIONS.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {STAGE_LABELS[stage]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {currentStage && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{STAGE_LABELS[currentStage]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isSampleDropped ? (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  Sample is dropped. Activate the sample first to make stage modifications.
                </div>
              ) : (
                <>
                  {isDeliveryCompletionView && (
                    <div className="rounded-md border border-border bg-muted/40 px-3 py-3 text-sm">
                      <div className="font-medium">Delivery Confirmation</div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Mark the sample as received to finalize this request. This sets stage to Delivered and sample status to Completed.
                      </p>
                    </div>
                  )}
                  {error && (
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {error}
                    </div>
                  )}
                  {(() => {
                // Group fields by section
                const sections: Record<string, typeof fields> = {}
                fields.forEach((f) => {
                  const sectionName = f.section || "default"
                  if (!sections[sectionName]) sections[sectionName] = []
                  sections[sectionName].push(f)
                })

                // Define section order for chronological expansion
                const sectionOrder = ["Setup", "Status", "Shipping", "Finalize", "default"]
                const orderedSections = sectionOrder
                  .filter(name => sections[name])
                  .map(name => [name, sections[name]] as const)

                return orderedSections.map(([sectionName, sectionFields]) => {
                  // Default section always expanded, others managed by expandedSections state
                  const isExpanded = sectionName === "default" 
                    ? true 
                    : (expandedSections[sectionName] ?? false)
                  const isComplete = isSectionComplete(sectionFields)
                  
                  if (sectionName === "default") {
                    return (
                      <div key={sectionName} className="grid gap-3 sm:grid-cols-2">
                        {sectionFields.map((f) => {
                          // Inline special handling for stageRoleConfig assignment field
                          if (
                            stageRoleConfig &&
                            ((stageRoleConfig.stageFieldKey && f.key === stageRoleConfig.stageFieldKey) ||
                              (!stageRoleConfig.stageFieldKey && f.key === stageRoleConfig.assignmentKey))
                          ) {
                            return (
                              <div key={f.key} className="space-y-1.5">
                                <Label htmlFor={f.key} className="text-xs font-medium">
                                  {stageRoleConfig.label}
                                  {!f.optional && <span className="text-destructive ml-1">*</span>}
                                </Label>
                                {isAdmin ? (
                                  <Select
                                    value={formValues[f.key] || stageRoleUserId || initialFormValues[f.key] || "none"}
                                    onValueChange={(v) => {
                                      const next = v === "none" ? "" : v
                                      setFormValues((prev) => ({ ...prev, [f.key]: next }))
                                      setStageRoleUserId(next)
                                    }}
                                  >
                                    <SelectTrigger id={f.key} className="h-8">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">—</SelectItem>
                                      {stageRoleUsers.map((u) => (
                                        <SelectItem key={u.id} value={String(u.id)}>
                                          {u.full_name?.trim() || u.username}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    id={f.key}
                                    value={getUserLabel(formValues[f.key]) || user?.full_name || user?.username || ""}
                                    readOnly
                                    disabled
                                    className="h-8 text-sm"
                                  />
                                )}
                                {isAdmin && (
                                  <p className="text-[11px] text-muted-foreground">
                                    Current: {getUserLabel(initialFormValues[f.key]) || "—"}
                                  </p>
                                )}
                                {fieldErrors[f.key] && (
                                  <p className="text-destructive text-xs">{fieldErrors[f.key]}</p>
                                )}
                              </div>
                            )
                          }
                          // Default rendering for other fields
                          return (
                            <div key={f.key} className="space-y-1.5">
                              <Label htmlFor={f.key} className="text-xs font-medium">
                                {f.label}
                                {!f.optional && <span className="text-destructive ml-1">*</span>}
                              </Label>
                              {f.type === "text" && (
                                <Input
                                  id={f.key}
                                  value={formValues[f.key] ?? ""}
                                  onChange={(e) => setFormValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                  className="h-8 text-sm"
                                />
                              )}
                              {f.type === "textarea" && (
                                <textarea
                                  id={f.key}
                                  value={formValues[f.key] ?? ""}
                                  onChange={(e) => setFormValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                  className="min-h-[84px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                              )}
                              {f.type === "date" && (
                                <Input
                                  id={f.key}
                                  type="date"
                                  value={valueToString(formValues[f.key]).slice(0, 10)}
                                  onChange={(e) => setFormValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                  className="h-8"
                                />
                              )}
                              {f.type === "number" && (
                                <Input
                                  id={f.key}
                                  type="number"
                                  value={formValues[f.key] ?? ""}
                                  onChange={(e) => setFormValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                  className="h-8 text-sm"
                                />
                              )}
                              {f.type === "boolean" && (
                                <Select
                                  value={formValues[f.key] || "none"}
                                  onValueChange={(v) => setFormValues((prev) => ({ ...prev, [f.key]: v === "none" ? "" : v }))}
                                >
                                  <SelectTrigger id={f.key} className="h-8">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">—</SelectItem>
                                    <SelectItem value="true">Yes</SelectItem>
                                    <SelectItem value="false">No</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                              {f.type === "select" && (
                                <Select
                                  value={formValues[f.key] || "none"}
                                  onValueChange={(v) => setFormValues((prev) => ({ ...prev, [f.key]: v === "none" ? "" : v }))}
                                >
                                  <SelectTrigger id={f.key} className="h-8">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">—</SelectItem>
                                    {(f.options ?? []).map((option) => (
                                      <SelectItem key={option} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              {f.type === "user_select" && (
                                isAdmin ? (
                                  (() => {
                                    const options = getUserOptionsForField(f.key)
                                    const currentAssigned = getCurrentAssignedOption(f.key)
                                    const selectedValue = formValues[f.key] || initialFormValues[f.key] || currentAssigned?.value || "none"
                                    const hasCurrentInOptions = currentAssigned
                                      ? options.some((u) => String(u.id) === currentAssigned.value)
                                      : true
                                    return (
                                  <Select
                                    value={selectedValue}
                                    onValueChange={(v) => setFormValues((prev) => ({ ...prev, [f.key]: v === "none" ? "" : v }))}
                                  >
                                    <SelectTrigger id={f.key} className="h-8">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">—</SelectItem>
                                      {currentAssigned && !hasCurrentInOptions && (
                                        <SelectItem value={currentAssigned.value}>
                                          {currentAssigned.label}
                                        </SelectItem>
                                      )}
                                      {options.map((u) => (
                                        <SelectItem key={u.id} value={String(u.id)}>
                                          {u.full_name?.trim() || u.username}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                    )
                                  })()
                                ) : (
                                  <Input
                                    id={f.key}
                                    value={getUserLabel(formValues[f.key]) || user?.full_name || user?.username || ""}
                                    readOnly
                                    disabled
                                    className="h-8 text-sm"
                                  />
                                )
                              )}
                              {isAdmin && f.type === "user_select" && (
                                <p className="text-[11px] text-muted-foreground">
                                  Current: {getUserLabel(initialFormValues[f.key]) || "—"}
                                </p>
                              )}
                              {fieldErrors[f.key] && (
                                <p className="text-destructive text-xs">{fieldErrors[f.key]}</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  }
                  
                  return (
                    <Collapsible
                      key={sectionName}
                      open={isExpanded}
                      onOpenChange={() => toggleSection(sectionName)}
                      className="space-y-3"
                    >
                      <CollapsibleTrigger className="flex items-center justify-between gap-2 text-sm font-semibold text-foreground border-b pb-1 w-full hover:text-primary transition-colors">
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
                          />
                          {getSectionLabel(sectionName)}
                        </div>
                        {isComplete && (
                          <div className="flex items-center gap-1 text-emerald-600">
                            <Check className="h-4 w-4" />
                            <span className="text-xs font-normal">Complete</span>
                          </div>
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          {sectionFields.map((f) => (
                            <div key={f.key} className="space-y-1.5">
                              <Label htmlFor={f.key} className="text-xs font-medium">
                                {f.label}
                                {!f.optional && <span className="text-destructive ml-1">*</span>}
                              </Label>
                              {f.type === "text" && (
                                <Input
                                  id={f.key}
                                  value={formValues[f.key] ?? ""}
                                  onChange={(e) => setFormValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                  className="h-8 text-sm"
                                />
                              )}
                              {f.type === "textarea" && (
                                <textarea
                                  id={f.key}
                                  value={formValues[f.key] ?? ""}
                                  onChange={(e) => setFormValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                  className="min-h-[84px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                              )}
                              {f.type === "date" && (
                                <Input
                                  id={f.key}
                                  type="date"
                                  value={valueToString(formValues[f.key]).slice(0, 10)}
                                  onChange={(e) => setFormValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                  className="h-8"
                                />
                              )}
                              {f.type === "number" && (
                                <Input
                                  id={f.key}
                                  type="number"
                                  value={formValues[f.key] ?? ""}
                                  onChange={(e) => setFormValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                  className="h-8 text-sm"
                                />
                              )}
                              {f.type === "boolean" && (
                                <Select
                                  value={formValues[f.key] || "none"}
                                  onValueChange={(v) => setFormValues((prev) => ({ ...prev, [f.key]: v === "none" ? "" : v }))}
                                >
                                  <SelectTrigger id={f.key} className="h-8">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">—</SelectItem>
                                    <SelectItem value="true">Yes</SelectItem>
                                    <SelectItem value="false">No</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                              {f.type === "select" && (
                                <Select
                                  value={formValues[f.key] || "none"}
                                  onValueChange={(v) => setFormValues((prev) => ({ ...prev, [f.key]: v === "none" ? "" : v }))}
                                >
                                  <SelectTrigger id={f.key} className="h-8">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">—</SelectItem>
                                    {(f.options ?? []).map((option) => (
                                      <SelectItem key={option} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              {f.type === "user_select" && (
                                isAdmin ? (
                                  (() => {
                                    const options = getUserOptionsForField(f.key)
                                    const currentAssigned = getCurrentAssignedOption(f.key)
                                    const selectedValue = formValues[f.key] || initialFormValues[f.key] || currentAssigned?.value || "none"
                                    const hasCurrentInOptions = currentAssigned
                                      ? options.some((u) => String(u.id) === currentAssigned.value)
                                      : true
                                    return (
                                  <Select
                                    value={selectedValue}
                                    onValueChange={(v) => setFormValues((prev) => ({ ...prev, [f.key]: v === "none" ? "" : v }))}
                                  >
                                    <SelectTrigger id={f.key} className="h-8">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">—</SelectItem>
                                      {currentAssigned && !hasCurrentInOptions && (
                                        <SelectItem value={currentAssigned.value}>
                                          {currentAssigned.label}
                                        </SelectItem>
                                      )}
                                      {options.map((u) => (
                                        <SelectItem key={u.id} value={String(u.id)}>
                                          {u.full_name?.trim() || u.username}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                    )
                                  })()
                                ) : (
                                  <Input
                                    id={f.key}
                                    value={getUserLabel(formValues[f.key]) || user?.full_name || user?.username || ""}
                                    readOnly
                                    disabled
                                    className="h-8 text-sm"
                                  />
                                )
                              )}
                              {isAdmin && f.type === "user_select" && (
                                <p className="text-[11px] text-muted-foreground">
                                  Current: {getUserLabel(initialFormValues[f.key]) || "—"}
                                </p>
                              )}
                              {fieldErrors[f.key] && (
                                <p className="text-destructive text-xs">{fieldErrors[f.key]}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )
                })
                  })()}
                  <div className="flex gap-2 pt-1">
                    {!isDeliveryCompletionView && (
                      <Button type="submit" disabled={saving || !canSave} size="sm">
                        {saving ? "Saving..." : "Save Stage"}
                      </Button>
                    )}
                    {isDeliveryCompletionView && (
                      <Button
                        type="button"
                        onClick={markSampleReceivedAndComplete}
                        disabled={saving || !String(formValues.sent_date || "").trim()}
                        size="sm"
                      >
                        {saving ? "Completing..." : "Complete & Mark Sample Received"}
                      </Button>
                    )}
                    <Button type="button" variant="outline" onClick={() => navigate(`/samples/${id}`)} size="sm">
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </form>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm update</AlertDialogTitle>
            <AlertDialogDescription>
              Update <span className="font-medium text-foreground">{currentStage ? (STAGE_LABELS[currentStage] ?? currentStage) : "stage"}</span> data? You have 3 seconds to undo.
              {currentStage && getNextStage(currentStage) && canAdvanceStage() && (
                <div className="mt-2 text-sm text-foreground">
                  You can advance to <span className="font-medium">{STAGE_LABELS[getNextStage(currentStage)!] ?? getNextStage(currentStage)}</span>.
                </div>
              )}
              {currentStage && getNextStage(currentStage) && !canAdvanceStage() && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {getAdvanceRequirementMessage()}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {!isDeliveryCompletionView && (
              <>
                <AlertDialogAction
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  onClick={() => confirmAndSave(false)}
                >
                  Save Only
                </AlertDialogAction>
                {currentStage && getNextStage(currentStage) && (
                  <AlertDialogAction 
                    onClick={() => confirmAndSave(true)}
                    disabled={!canAdvanceStage()}
                  >
                    Complete &amp; Advance
                  </AlertDialogAction>
                )}
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
