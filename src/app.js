import songsData from './songs.json';

let currentSongs = Array.isArray(songsData) ? [...songsData] : [];
let selectedGenre = 'TODOS';
let selectedLetter = 'TODOS';

const songsGrid = document.getElementById('songs-grid');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const sortSelect = document.getElementById('sort-select');
const genreBar = document.getElementById('genre-bar');
const alphabetBar = document.getElementById('alphabet-bar');
const songCount = document.getElementById('song-count');

// Normalización limpia de géneros
function normalizeGenre(rawGenre) {
  if (!rawGenre || rawGenre.toLowerCase() === 'general') return 'Pop & Baladas';
  
  const lower = rawGenre.trim().toLowerCase();
  
  if (lower.includes('reggaeton') || lower.includes('urbano') || lower.includes('trap') || lower.includes('cumbia')) return 'Reggaetón & Urbano';
  if (lower.includes('ranchera') || lower.includes('mariachi') || lower.includes('regional') || lower.includes('norteño') || lower.includes('corridos')) return 'Mariachi & Ranchera';
  if (lower.includes('rock') || lower.includes('punk') || lower.includes('metal') || lower.includes('ska')) return 'Rock & Alternativo';
  if (lower.includes('navidad') || lower.includes('villancico') || lower.includes('navideña')) return 'Navideñas';
  if (lower.includes('tv') || lower.includes('anime') || lower.includes('soundtrack') || lower.includes('banda sonora') || lower.includes('caricatura')) return 'Anime, Disney & TV';
  if (lower.includes('comedy') || lower.includes('comedia') || lower.includes('infantil')) return 'Infantil & Comedy';
  if (lower.includes('pop') || lower.includes('balada') || lower.includes('romantic') || lower.includes('latin')) return 'Pop & Baladas';

  return 'Otros';
}

// 1. Inicializar Filtros por Género
function initGenreBar() {
  const genreCount = {};
  
  currentSongs.forEach(song => {
    const normalized = normalizeGenre(song.genero);
    song.genero_normalizado = normalized;
    genreCount[normalized] = (genreCount[normalized] || 0) + 1;
  });

  const validGenres = Object.keys(genreCount).filter(g => genreCount[g] >= 2).sort();
  const genres = ['TODOS', ...validGenres];
  
  genreBar.innerHTML = genres.map(genre => `
    <button data-genre="${genre}" class="genre-btn flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
      genre === 'TODOS' 
        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' 
        : 'bg-slate-900 text-slate-400 border border-slate-800/80 hover:bg-slate-800 hover:text-slate-200 hover:border-slate-700'
    }">
      ${genre}
    </button>
  `).join('');

  document.querySelectorAll('.genre-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.genre-btn').forEach(b => {
        b.classList.remove('bg-purple-600', 'text-white', 'shadow-md', 'shadow-purple-600/30');
        b.classList.add('bg-slate-900', 'text-slate-400', 'border', 'border-slate-800/80');
      });
      e.target.classList.remove('bg-slate-900', 'text-slate-400', 'border', 'border-slate-800/80');
      e.target.classList.add('bg-purple-600', 'text-white', 'shadow-md', 'shadow-purple-600/30');
      
      selectedGenre = e.target.dataset.genre;
      applyFiltersAndSort();
    });
  });
}

// 2. Inicializar Barra A-Z
function initAlphabetBar() {
  const letters = ['TODOS', '#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];
  alphabetBar.innerHTML = letters.map(letter => `
    <button data-letter="${letter}" class="alphabet-btn flex-shrink-0 px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all duration-200 ${
      letter === 'TODOS' 
        ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/20' 
        : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    }">
      ${letter}
    </button>
  `).join('');

  document.querySelectorAll('.alphabet-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.alphabet-btn').forEach(b => {
        b.classList.remove('bg-rose-500', 'text-white', 'shadow-sm', 'shadow-rose-500/20');
        b.classList.add('bg-slate-900', 'text-slate-400');
      });
      e.target.classList.remove('bg-slate-900', 'text-slate-400');
      e.target.classList.add('bg-rose-500', 'text-white', 'shadow-sm', 'shadow-rose-500/20');
      
      selectedLetter = e.target.dataset.letter;
      applyFiltersAndSort();
    });
  });
}

// 3. Función de Ordenamiento
function sortSongs(list, mode) {
  return list.sort((a, b) => {
    const artistA = a.artista || '';
    const artistB = b.artista || '';
    const titleA = a.nombre_cancion || '';
    const titleB = b.nombre_cancion || '';
    const durationA = a.duracion_segundos || 0;
    const durationB = b.duracion_segundos || 0;

    if (mode === 'artist-asc') return artistA.localeCompare(artistB, 'es', { numeric: true, sensitivity: 'base' });
    if (mode === 'artist-desc') return artistB.localeCompare(artistA, 'es', { numeric: true, sensitivity: 'base' });
    if (mode === 'title-asc') return titleA.localeCompare(titleB, 'es', { numeric: true, sensitivity: 'base' });
    if (mode === 'title-desc') return titleB.localeCompare(titleA, 'es', { numeric: true, sensitivity: 'base' });
    if (mode === 'duration-asc') return durationA - durationB;
    if (mode === 'duration-desc') return durationB - durationA;
    if (mode === 'random') return 0.5 - Math.random();
    return 0;
  });
}

// 4. Aplicar Filtros y Re-renderizar
function applyFiltersAndSort() {
  const query = searchInput.value.toLowerCase().trim();
  const sortMode = sortSelect.value;

  if (query.length > 0) {
    clearSearchBtn.classList.remove('hidden');
    clearSearchBtn.classList.add('flex');
  } else {
    clearSearchBtn.classList.remove('flex');
    clearSearchBtn.classList.add('hidden');
  }

  let filtered = currentSongs.filter(song => {
    const title = (song.nombre_cancion || '').toLowerCase();
    const artist = (song.artista || '').toLowerCase();
    const genre = (song.genero_normalizado || '').toLowerCase();

    const matchesSearch = title.includes(query) || artist.includes(query) || genre.includes(query);
    const matchesGenre = (selectedGenre === 'TODOS') || (song.genero_normalizado === selectedGenre);

    let matchesLetter = true;
    const targetText = sortMode.includes('title') ? song.nombre_cancion : song.artista;
    
    if (selectedLetter === '#') {
      const firstChar = (targetText || '').charAt(0);
      matchesLetter = /^[0-9]/.test(firstChar);
    } else if (selectedLetter !== 'TODOS') {
      matchesLetter = (targetText || '').toUpperCase().startsWith(selectedLetter);
    }

    return matchesSearch && matchesGenre && matchesLetter;
  });

  filtered = sortSongs(filtered, sortMode);
  renderSongs(filtered);
}

// 5. Renderizado Visual
function renderSongs(songs) {
  if (!songsGrid || !songCount) return;

  songCount.textContent = `${songs.length} canciones`;

  if (songs.length === 0) {
    songsGrid.innerHTML = `
      <div class="col-span-full text-center py-16 text-slate-500 text-sm bg-slate-900/30 rounded-2xl border border-slate-800/60 flex flex-col items-center gap-2">
        <svg class="w-8 h-8 text-slate-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        No se encontraron canciones con los filtros seleccionados.
      </div>`;
    return;
  }

  songsGrid.innerHTML = songs.map((song, index) => {
    const initials = song.artista ? song.artista.substring(0, 2).toUpperCase() : 'US';
    return `
      <div class="animate-fade-in bg-slate-900/90 border border-slate-800/80 hover:border-purple-500/60 rounded-2xl p-3 flex items-center gap-3.5 hover:shadow-xl hover:shadow-purple-950/30 hover:-translate-y-0.5 transition-all duration-250 group" style="animation-delay: ${Math.min(index * 20, 300)}ms">
        <div class="w-14 h-14 rounded-xl bg-slate-950 flex-shrink-0 overflow-hidden relative flex items-center justify-center border border-slate-800/60 shadow-inner">
          ${song.cover 
            ? `<img src="${song.cover}" alt="${song.nombre_cancion}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
               <span class="text-xs font-bold text-purple-400 bg-purple-950/80 w-full h-full hidden items-center justify-center">${initials}</span>`
            : `<span class="text-xs font-bold text-purple-400 bg-purple-950/80 w-full h-full flex items-center justify-center">${initials}</span>`
          }
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1 mb-1">
            <span class="inline-block px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider text-purple-400 bg-purple-950/40 rounded-md border border-purple-800/30 truncate max-w-[130px]">
              ${song.genero_normalizado || 'General'}
            </span>
            <span class="text-[11px] font-mono text-slate-400 flex items-center gap-1 flex-shrink-0">
              <svg class="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              ${song.duracion || '03:30'}
            </span>
          </div>
          <h3 class="text-sm font-semibold text-slate-100 truncate group-hover:text-purple-300 transition-colors">
            ${song.nombre_cancion}
          </h3>
          <p class="text-xs text-slate-400 truncate">
            ${song.artista}
          </p>
        </div>
      </div>
    `;
  }).join('');
}

// Listeners
if (searchInput) searchInput.addEventListener('input', applyFiltersAndSort);
if (sortSelect) sortSelect.addEventListener('change', applyFiltersAndSort);
if (clearSearchBtn) {
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    applyFiltersAndSort();
    searchInput.focus();
  });
}

initGenreBar();
initAlphabetBar();
applyFiltersAndSort();