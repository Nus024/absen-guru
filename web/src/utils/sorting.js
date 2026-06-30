export function parseClass(classString) {
  if (!classString) return { grade: 999, major: "", variant: "" };
  
  // Example: "10 A", "10 D.Pi", "10 D/2", "11 B", "12 A"
  // Try to match standard pattern: {Grade} {Major}{Variant}
  const match = classString.trim().match(/^(\d+)\s*([A-Za-z]+)?(.*)?$/);
  if (match) {
    const grade = parseInt(match[1], 10) || 999;
    const major = (match[2] || "").trim().toUpperCase();
    const variant = (match[3] || "").trim();
    return { grade, major, variant };
  }
  return { grade: 999, major: classString.trim(), variant: "" };
}

export function sortClasses(a, b) {
  // Parse class from a and b
  const classA = a.kelas || "";
  const classB = b.kelas || "";
  
  const parsedA = parseClass(classA);
  const parsedB = parseClass(classB);

  // 1. Sort by Grade
  if (parsedA.grade !== parsedB.grade) {
    return parsedA.grade - parsedB.grade;
  }
  
  // 2. Sort by Major
  if (parsedA.major !== parsedB.major) {
    return parsedA.major.localeCompare(parsedB.major);
  }
  
  // 3. Sort by Variant (e.g. .Pi, /2)
  if (parsedA.variant !== parsedB.variant) {
    return parsedA.variant.localeCompare(parsedB.variant);
  }
  
  // 4. Tie breaker: Teacher name
  const nameA = a.nama_guru || "";
  const nameB = b.nama_guru || "";
  return nameA.localeCompare(nameB);
}
