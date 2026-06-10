export function getCurrentUserBranch() {
  try {
    const keys = ["local_AppUser", "AppUser", "ch_AppUser", "user", "currentUser"];
    for (const key of keys) {
      const val = localStorage.getItem(key);
      if (val) {
        const parsed = JSON.parse(val);
        const users = Array.isArray(parsed) ? parsed : [parsed];
        const sorted = users.sort((a, b) => new Date(b.last_login || 0) - new Date(a.last_login || 0));
        const user = sorted[0];
        if (user && (user.full_name || user.username || user.email)) {
          const branch = user.branch_id || "All Branches";
          return {
            branch,
            isAllBranches: !user.branch_id || user.branch_id === "All Branches",
            role: user.role,
            isSuperAdmin: user.role === "super_admin",
            user,
          };
        }
      }
    }
  } catch {}
  return { branch: "All Branches", isAllBranches: true };
}

export function filterByBranch(items, branchNameField = "branch_name") {
  const { branch, isAllBranches } = getCurrentUserBranch();
  if (isAllBranches) return items;
  return items.filter(item => {
    const itemBranch = item[branchNameField] || item.branch || "";
    return itemBranch.toLowerCase() === branch.toLowerCase();
  });
}