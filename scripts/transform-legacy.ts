// Rejoue la transformation legacy → public sans réimporter le .bak.
// Usage : npm run db:transform
import { runTransform } from '#/lib/etl/transform.ts'

await runTransform((line) => console.log(line))
console.log('Transformation terminée.')
process.exit(0)
