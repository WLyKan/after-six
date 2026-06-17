export function getStaffId(): string | null {
  try {
    const personInfoStr = localStorage.getItem('personInfo');
    if (!personInfoStr) return null;

    const personInfo = JSON.parse(personInfoStr);
    return personInfo.staff_id || null;
  } catch {
    return null;
  }
}
