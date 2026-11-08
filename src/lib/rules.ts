import type { Action, Condition, RuleTrigger, Settings, Variable } from "./types";

const num = (v: unknown) => (v !== "" && v !== null && v !== undefined && !isNaN(Number(v)) ? Number(v) : null);

function check(c: Condition, answers: Record<string, unknown>, vars: Record<string, Variable["value"]>): boolean {
  const left = c.sourceType === "variable" ? vars[c.sourceId] : answers[c.sourceId];
  const a = String(left ?? "");
  const b = c.value;
  const na = num(left);
  const nb = num(b);
  switch (c.operator) {
    case "equals": return a.toLowerCase() === b.toLowerCase();
    case "not_equals": return a.toLowerCase() !== b.toLowerCase();
    case "contains": return a.toLowerCase().includes(b.toLowerCase());
    case "not_contains": return !a.toLowerCase().includes(b.toLowerCase());
    case "gt": return na !== null && nb !== null && na > nb;
    case "lt": return na !== null && nb !== null && na < nb;
    case "gte": return na !== null && nb !== null && na >= nb;
    case "lte": return na !== null && nb !== null && na <= nb;
  }
}

/** Ruleaza regulile pentru un eveniment (aprobat / achitat / respins). Intoarce variabilele noi si starea formularului. */
export function runRules(trigger: RuleTrigger, s: Settings, answers: Record<string, unknown>) {
  const variables = s.variables.map((v) => ({ ...v }));
  const vars: Record<string, Variable["value"]> = Object.fromEntries(variables.map((v) => [v.name, v.value]));
  let open = s.open;

  const apply = (a: Action) => {
    if (a.type === "close_form") return void (open = false);
    if (a.type === "open_form") return void (open = true);
    const v = variables.find((x) => x.name === a.targetVar);
    if (!v) return;
    if (a.type === "set_var") {
      v.value = v.type === "bool" ? a.value === "true" : v.type === "str" ? String(a.value ?? "") : Number(a.value) || 0;
    } else {
      const d = (a.amount ?? 1) * (a.type === "decrement_var" ? -1 : 1);
      v.value = (Number(v.value) || 0) + d;
    }
    vars[v.name] = v.value;
  };

  for (const r of s.rules.filter((r) => r.trigger === trigger)) {
    const res = r.conditions.length === 0 ? true : r.logic === "or" ? r.conditions.some((c) => check(c, answers, vars)) : r.conditions.every((c) => check(c, answers, vars));
    (res ? r.actions : r.elseActions || []).forEach(apply);
  }
  return { variables, open };
}
