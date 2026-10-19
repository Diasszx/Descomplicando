import fs from 'fs';
import path from 'path';

export function isSqlDestructive(sqlContent: string): { isDestructive: boolean; matchedKeywords: string[] } {
  const DESTRUCTIVE_PATTERNS = [
    /\bDROP\s+TABLE\b/i,
    /\bDROP\s+COLUMN\b/i,
    /\bTRUNCATE\b/i,
    /\bDROP\s+DATABASE\b/i,
  ];

  const matchedKeywords: string[] = [];

  for (const pattern of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(sqlContent)) {
      matchedKeywords.push(pattern.source);
    }
  }

  return {
    isDestructive: matchedKeywords.length > 0,
    matchedKeywords,
  };
}

export function runCheck() {
  const allowDestructive = process.env.ALLOW_DESTRUCTIVE_MIGRATION === 'true';
  const migrationsDir = path.resolve(__dirname, '../prisma/migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.log('Nenhum diretório prisma/migrations encontrado. Verificação aprovada.');
    return;
  }

  const migrationFolders = fs.readdirSync(migrationsDir);
  for (const folder of migrationFolders) {
    const migrationFile = path.join(migrationsDir, folder, 'migration.sql');
    if (fs.existsSync(migrationFile)) {
      const content = fs.readFileSync(migrationFile, 'utf-8');
      const { isDestructive, matchedKeywords } = isSqlDestructive(content);
      if (isDestructive) {
        if (allowDestructive) {
          console.warn(`[AVISO] Migration destrutiva detectada em ${folder} (${matchedKeywords.join(', ')}), porém autorizada via ALLOW_DESTRUCTIVE_MIGRATION.`);
        } else {
          console.error(`[ERRO CRÍTICO] Migration destrutiva bloqueada em ${folder}: [${matchedKeywords.join(', ')}]. Operações com DROP/TRUNCATE exigem autorização explícita via label allow-destructive-migration.`);
          process.exit(1);
        }
      }
    }
  }

  console.log('Verificação de migrations destrutivas concluída com sucesso.');
}

if (require.main === module) {
  runCheck();
}
