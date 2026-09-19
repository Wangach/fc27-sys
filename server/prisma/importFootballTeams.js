import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const CLEAN_JSON = path.join(DATA_DIR, 'football-teams.json');
const CLUBS_ROOT = path.join(DATA_DIR, 'clubs-master');

function getFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? getFiles(fullPath) : [fullPath];
  });
}

function formatCountry(folderName) {
  return folderName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function parseClubFile(file) {
  const country = formatCountry(path.basename(path.dirname(file)));
  const contents = fs.readFileSync(file, 'utf8');
  const teams = [];

  for (const rawLine of contents.split(/\r?\n/)) {
    if (/^\s/.test(rawLine)) continue;

    let line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('=') || line.startsWith('|')) continue;

    line = line.replace(/\s+##.*$/, '').replace(/\s+#.*$/, '').trim();
    if (!line) continue;

    const name = line.split(',')[0].trim();
    if (!name) continue;
    if (/^ii\)/i.test(name)) continue;
    if (/\(\d{4}\s*-\s*\d{4}\)/.test(name)) continue;

    teams.push({ name, country });
  }

  return teams;
}

function dedupe(teams) {
  const unique = new Map();
  for (const team of teams) {
    const name = String(team.name || '').trim();
    const country = String(team.country || '').trim();
    if (!name || !country) continue;
    const key = `${country}:${name}`.toLocaleLowerCase('en');
    if (!unique.has(key)) unique.set(key, { name, country });
  }
  return [...unique.values()];
}

function loadTeams() {
  if (fs.existsSync(CLEAN_JSON)) {
    const parsed = JSON.parse(fs.readFileSync(CLEAN_JSON, 'utf8'));
    if (!Array.isArray(parsed)) throw new Error('football-teams.json must contain an array.');
    console.log(`Using cleaned development dataset: ${CLEAN_JSON}`);
    return dedupe(parsed);
  }

  if (!fs.existsSync(CLUBS_ROOT)) {
    throw new Error(
      `No football-team dataset found. Expected either ${CLEAN_JSON} or extracted OpenFootball files in ${CLUBS_ROOT}`,
    );
  }

  const files = getFiles(CLUBS_ROOT).filter((file) => file.endsWith('.clubs.txt'));
  console.log(`Found ${files.length} OpenFootball *.clubs.txt files.`);
  return dedupe(files.flatMap(parseClubFile));
}

async function main() {
  const teams = loadTeams();
  console.log(`Preparing ${teams.length} unique canonical team names for PostgreSQL.`);

  const result = await prisma.footballTeam.createMany({
    data: teams,
    skipDuplicates: true,
  });

  const total = await prisma.footballTeam.count();
  console.log(`Inserted ${result.count} new teams.`);
  console.log(`Football teams currently in PostgreSQL: ${total}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main()
    .catch((error) => {
      console.error('Football team import failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
