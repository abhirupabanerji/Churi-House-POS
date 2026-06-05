import { createClient } from "@base44/sdk";
import { appParams } from "@/lib/app-params";

const { appId, token, functionsVersion, appBaseUrl } = appParams;

function makeLocalEntity(entityName) {
  const key = `local_${entityName}`;

  const read = () => JSON.parse(localStorage.getItem(key) || "[]");
  const write = (rows) => localStorage.setItem(key, JSON.stringify(rows));

  return {
    async list(sort, limit = 100) {
      let rows = read();

      if (sort) {
        const desc = sort.startsWith("-");
        const field = desc ? sort.slice(1) : sort;
        rows = rows.sort((a, b) => {
          const av = a[field] ?? "";
          const bv = b[field] ?? "";
          return desc ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
        });
      }

      return rows.slice(0, limit);
    },

    async filter(filter = {}, sort, limit = 100) {
      const rows = await this.list(sort, limit);
      return rows.filter((row) =>
        Object.entries(filter).every(([key, value]) => row[key] === value)
      );
    },

    async create(data) {
      const rows = read();
      const now = new Date().toISOString();
      const item = {
        id: crypto.randomUUID(),
        ...data,
        created_date: now,
        updated_date: now,
      };
      rows.push(item);
      write(rows);
      return item;
    },

    async update(id, data) {
      const rows = read();
      const updated = rows.map((row) =>
        row.id === id ? { ...row, ...data, updated_date: new Date().toISOString() } : row
      );
      write(updated);
      return updated.find((row) => row.id === id);
    },

    async delete(id) {
      write(read().filter((row) => row.id !== id));
      return true;
    },

    subscribe() {
      return () => {};
    },
  };
}

const localBase44 = {
  entities: new Proxy({}, {
    get: (_, entityName) => makeLocalEntity(entityName),
  }),
  auth: {
    async me() {
      return { email: "local@app.com", full_name: "Local User" };
    },
    logout() {},
    redirectToLogin() {},
  },
  integrations: {
    Core: {
      async UploadFile() {
        throw new Error("File upload is not available in local mode.");
      },
      async InvokeLLM() {
        throw new Error("AI functions are not available in local mode.");
      },
    },
  },
};

export const base44 = appBaseUrl
  ? createClient({
      appId,
      token,
      functionsVersion,
      serverUrl: "",
      requiresAuth: false,
      appBaseUrl,
    })
  : localBase44;