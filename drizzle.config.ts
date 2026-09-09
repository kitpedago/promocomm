import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// quiet : sans ça dotenv 17 écrit des « tips » publicitaires dans les logs de prod
config({ path: ['.env.local', '.env'], quiet: true })

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
})
