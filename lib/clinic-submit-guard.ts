export type ClinicSubmitGuard = {
  active: boolean
}

export function beginClinicSubmit(guard: ClinicSubmitGuard) {
  if (guard.active) return false
  guard.active = true
  return true
}

export function finishClinicSubmit(guard: ClinicSubmitGuard) {
  guard.active = false
}
