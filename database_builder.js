import fs from 'fs';
import path from 'path';
import { parseFile } from 'music-metadata';

const SONGS_DIR = 'D:\\UltraStar\\UltraStar WorldParty\\songs';
const OUTPUT_COVERS_DIR = path.join(process.cwd(), 'public', 'covers');
const OUTPUT_JSON = path.join(process.cwd(), 'src', 'songs.json');
const OUTPUT_SQL = path.join(process.cwd(), 'schema.sql');

if (fs.existsSync(OUTPUT_COVERS_DIR)) {
  fs.rmSync(OUTPUT_COVERS_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUTPUT_COVERS_DIR, { recursive: true });

function parseTxtFile(filePath) {
  const metadata = {
    title: '',
    artist: '',
    genre: 'Pop & Baladas',
    cover: '',
    audioFile: ''
  };

  try {
    const buffer = fs.readFileSync(filePath);
    let content = '';

    try {
      const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
      content = utf8Decoder.decode(buffer);
    } catch (e) {
      const winDecoder = new TextDecoder('windows-1252');
      content = winDecoder.decode(buffer);
    }

    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.toUpperCase().startsWith('#TITLE:')) metadata.title = cleanLine.substring(7).trim();
      else if (cleanLine.toUpperCase().startsWith('#ARTIST:')) metadata.artist = cleanLine.substring(8).trim();
      else if (cleanLine.toUpperCase().startsWith('#GENRE:')) metadata.genre = cleanLine.substring(7).trim();
      else if (cleanLine.toUpperCase().startsWith('#COVER:')) metadata.cover = cleanLine.substring(7).trim();
      else if (cleanLine.toUpperCase().startsWith('#COVERJPG:')) metadata.cover = cleanLine.substring(10).trim();
      else if (cleanLine.toUpperCase().startsWith('#MP3:')) metadata.audioFile = cleanLine.substring(5).trim();
    }
  } catch (err) {
    console.error(`Error al leer ${filePath}:`, err.message);
  }

  return metadata;
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '03:30';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function sanitizeFilename(folderName, id) {
  const cleanName = folderName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  return `song_${id}_${cleanName}`;
}

async function buildDatabase() {
  console.log('🗄️ Construyendo base de datos de canciones...');

  if (!fs.existsSync(SONGS_DIR)) {
    console.error(`❌ La carpeta no existe: ${SONGS_DIR}`);
    return;
  }

  const folders = fs.readdirSync(SONGS_DIR);
  const catalog = [];

  for (let index = 0; index < folders.length; index++) {
    const folderName = folders[index];
    const folderPath = path.join(SONGS_DIR, folderName);

    if (!fs.statSync(folderPath).isDirectory() || folderName.includes('ultrastar-es.org')) continue;

    const files = fs.readdirSync(folderPath);
    const txtFile = files.find(f => f.toLowerCase().endsWith('.txt'));

    let title = '';
    let artist = '';
    let genre = 'Pop & Baladas';
    let coverName = '';
    let durationSecs = 0;

    if (txtFile) {
      const parsed = parseTxtFile(path.join(folderPath, txtFile));
      title = parsed.title;
      artist = parsed.artist;
      if (parsed.genre) genre = parsed.genre;

      // Audio
      let audioFileName = parsed.audioFile;
      if (!audioFileName) {
        audioFileName = files.find(f => /\.(mp3|m4a|ogg|wav)$/i.test(f));
      }

      if (audioFileName && fs.existsSync(path.join(folderPath, audioFileName))) {
        try {
          const audioMeta = await parseFile(path.join(folderPath, audioFileName));
          durationSecs = audioMeta.format.duration || 0;
        } catch (e) {
          durationSecs = 210;
        }
      }

      // 1. Intentar portada del .txt
      let coverFileName = parsed.cover;
      
      // 2. Si no existe o no se especificó, buscar cualquier imagen disponible en la carpeta
      if (!coverFileName || !fs.existsSync(path.join(folderPath, coverFileName))) {
        coverFileName = files.find(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
      }

      if (coverFileName && fs.existsSync(path.join(folderPath, coverFileName))) {
        const ext = path.extname(coverFileName).toLowerCase();
        const safeName = sanitizeFilename(folderName, catalog.length + 1);
        coverName = `${safeName}${ext}`;
        
        fs.copyFileSync(path.join(folderPath, coverFileName), path.join(OUTPUT_COVERS_DIR, coverName));
      }
    }

    if (!artist || !title) {
      const parts = folderName.split(' - ');
      if (parts.length >= 2) {
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      } else {
        artist = 'Varios';
        title = folderName;
      }
    }

    catalog.push({
      id: catalog.length + 1,
      nombre_cancion: title,
      artista: artist,
      genero: genre,
      duracion: formatDuration(durationSecs),
      duracion_segundos: Math.round(durationSecs),
      cover: coverName ? `/covers/${coverName}` : ''
    });
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(catalog, null, 2), 'utf-8');

  let sqlScript = `CREATE TABLE IF NOT EXISTS canciones (\n`;
  sqlScript += `  id INT PRIMARY KEY AUTO_INCREMENT,\n`;
  sqlScript += `  nombre_cancion VARCHAR(255) NOT NULL,\n`;
  sqlScript += `  artista VARCHAR(255) NOT NULL,\n`;
  sqlScript += `  genero VARCHAR(100),\n`;
  sqlScript += `  duracion VARCHAR(10),\n`;
  sqlScript += `  duracion_segundos INT,\n`;
  sqlScript += `  cover VARCHAR(255)\n`;
  sqlScript += `);\n\n`;

  catalog.forEach(s => {
    const safeTitle = s.nombre_cancion.replace(/'/g, "''");
    const safeArtist = s.artista.replace(/'/g, "''");
    const safeGenre = s.genero.replace(/'/g, "''");
    const safeCover = s.cover.replace(/'/g, "''");
    sqlScript += `INSERT INTO canciones (id, nombre_cancion, artista, genero, duracion, duracion_segundos, cover) VALUES (${s.id}, '${safeTitle}', '${safeArtist}', '${safeGenre}', '${s.duracion}', ${s.duracion_segundos}, '${safeCover}');\n`;
  });

  fs.writeFileSync(OUTPUT_SQL, sqlScript, 'utf-8');
  console.log(`✅ ¡Procesado completado! Total canciones: ${catalog.length}`);
}

buildDatabase();