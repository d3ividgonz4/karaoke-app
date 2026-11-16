import fs from 'fs';
import path from 'path';

// Ruta origen de UltraStar
const SONGS_DIR = 'D:\\UltraStar\\UltraStar WorldParty\\songs';
// Carpetas destino en tu proyecto web
const OUTPUT_COVERS_DIR = path.join(process.cwd(), 'public', 'covers');
const OUTPUT_JSON = path.join(process.cwd(), 'src', 'songs.json');

// 1. Limpiar o crear carpeta public/covers desde cero
if (fs.existsSync(OUTPUT_COVERS_DIR)) {
  fs.rmSync(OUTPUT_COVERS_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUTPUT_COVERS_DIR, { recursive: true });

if (!fs.existsSync(path.dirname(OUTPUT_JSON))) {
  fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
}

// Función para parsear .txt soportando codificación Windows-1252 / ISO-8859-1 y UTF-8
function parseTxtFile(filePath) {
  const metadata = {
    title: '',
    artist: '',
    genre: 'Pop & Baladas',
    cover: '',
    bpm: null
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
      if (cleanLine.toUpperCase().startsWith('#TITLE:')) {
        metadata.title = cleanLine.substring(7).trim();
      } else if (cleanLine.toUpperCase().startsWith('#ARTIST:')) {
        metadata.artist = cleanLine.substring(8).trim();
      } else if (cleanLine.toUpperCase().startsWith('#GENRE:')) {
        metadata.genre = cleanLine.substring(7).trim();
      } else if (cleanLine.toUpperCase().startsWith('#COVER:')) {
        metadata.cover = cleanLine.substring(7).trim();
      } else if (cleanLine.toUpperCase().startsWith('#COVERJPG:')) {
        metadata.cover = cleanLine.substring(10).trim();
      } else if (cleanLine.toUpperCase().startsWith('#BPM:')) {
        metadata.bpm = parseFloat(cleanLine.substring(5).trim().replace(',', '.'));
      }
    }
  } catch (err) {
    console.error(`Error leyendo ${filePath}:`, err.message);
  }

  return metadata;
}

function processCatalog() {
  console.log('🔍 Escaneando carpeta de UltraStar...');
  
  if (!fs.existsSync(SONGS_DIR)) {
    console.error(`❌ No existe la ruta: ${SONGS_DIR}`);
    return;
  }

  const folders = fs.readdirSync(SONGS_DIR);
  const catalog = [];

  folders.forEach((folderName, index) => {
    const folderPath = path.join(SONGS_DIR, folderName);
    
    // Ignorar archivos sueltos o torrents
    if (!fs.statSync(folderPath).isDirectory() || folderName.includes('ultrastar-es.org')) return;

    const songData = {
      id: index + 1,
      folder_name: folderName,
      artist: '',
      title: '',
      genre: 'General',
      cover_filename: '',
      cover_url: '',
      bpm: null
    };

    const files = fs.readdirSync(folderPath);
    const txtFile = files.find(f => f.toLowerCase().endsWith('.txt'));
    
    if (txtFile) {
      const parsed = parseTxtFile(path.join(folderPath, txtFile));
      songData.title = parsed.title;
      songData.artist = parsed.artist;
      if (parsed.genre) songData.genre = parsed.genre;
      if (parsed.bpm) songData.bpm = parsed.bpm;

      // Buscar la imagen de portada
      let coverFileName = parsed.cover;
      if (!coverFileName) {
        coverFileName = files.find(f => /\.(jpg|jpeg|png)$/i.test(f) && (f.includes('[CO]') || f.toLowerCase().includes('cover')));
      }

      if (coverFileName && fs.existsSync(path.join(folderPath, coverFileName))) {
        const ext = path.extname(coverFileName).toLowerCase();
        
        // Asignar el nombre exacto de la carpeta a la imagen de portada
        // Limpiamos caracteres prohibidos en nombres de archivos de Windows por si acaso
        const safeFolderName = folderName.replace(/[\\/:*?"<>|]/g, '_');
        const finalImageName = `${safeFolderName}${ext}`;
        const destPath = path.join(OUTPUT_COVERS_DIR, finalImageName);
        
        fs.copyFileSync(path.join(folderPath, coverFileName), destPath);
        
        songData.cover_filename = finalImageName;
        songData.cover_url = `/covers/${encodeURIComponent(finalImageName)}`;
      }
    }

    // Fallback de Artista y Título si el .txt no los contenía
    if (!songData.artist || !songData.title) {
      const parts = folderName.split(' - ');
      if (parts.length >= 2) {
        songData.artist = parts[0].trim();
        songData.title = parts.slice(1).join(' - ').trim();
      } else {
        songData.artist = 'Varios';
        songData.title = folderName;
      }
    }

    catalog.push(songData);
  });

  // Guardar archivo JSON
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(catalog, null, 2), 'utf-8');
  console.log(`✅ ¡Éxito! Se copiaron las portadas con el nombre de su carpeta y se indexaron ${catalog.length} canciones.`);
}

processCatalog();