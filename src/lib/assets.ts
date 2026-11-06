import { ICON_ALIASES } from './icon-theme.ts';

export interface Catalog {
  images: Record<string, [number, number]>;
  sounds: Record<string, string>;
}

export const imageUrl = (key: string) => `/assets/images/${(Object.hasOwn(ICON_ALIASES,key)?ICON_ALIASES[key]:key).replace(/\.png$/, '.webp').split('/').map(encodeURIComponent).join('/')}`;
const images = new Map<string, HTMLImageElement>();
export function getImage(key: string): HTMLImageElement | undefined {
  if (!key) return;
  let image = images.get(key);
  if (!image) {
    image = new Image();
    image.src = imageUrl(key);
    images.set(key, image);
  }
  return image.complete && image.naturalWidth ? image : undefined;
}

export const prettyName = (key: string) => key.replace(/\.png$/, '').split('/').at(-1)!.replaceAll('_', ' ').replace(/\b\w/g, s => s.toUpperCase());

export const POTIONS = [
  { id: '1', name: 'Health Potion', price: 20, stat: 'health', amount: 30 },
  { id: '2', name: 'Energizer', price: 30, stat: 'energy', amount: 30 },
  { id: '3', name: 'Fat Burner', price: 15, stat: 'fullness', amount: -40 },
  { id: '4', name: 'Max Potion', price: 99, stat: 'all', amount: 100 },
  { id: '5', name: 'Hunger Potion', price: 20, stat: 'fullness', amount: -70 },
  { id: '6', name: 'Baby Potion', price: 99, stat: 'baby', amount: 0 },
  { id: '7', name: 'Adult Potion', price: 99, stat: 'adult', amount: 0 },
  { id: '8', name: 'Fun Potion', price: 20, stat: 'fun', amount: 40 },
  { id: 'poison', name: 'Racun Alien', price: 15, stat: 'poison', amount: 0 },
  { id: 'spin', name: 'Racun Pusaran', price: 40, stat: 'spin', amount: 0 },
  { id: 'drowsy', name: 'Racun Kantuk', price: 25, stat: 'drowsy', amount: 0 },
  { id: 'antidote', name: 'Penawar', price: 20, stat: 'antidote', amount: 25 },
  { id: 'antidote-max', name: 'Penawar Maksimal', price: 60, stat: 'antidote', amount: 100 },
  { id: 'infinite', name: 'Energi Unlimited', price: 9999, stat: 'infinite', amount: 100 },
] as const;
export const potionImage=(id:string)=>/^\d$/.test(id)?`potions/${id}.png`:`potions/custom/${id}.svg`;
export function potionDescription(id:string){return ({poison:'Kesehatan berkurang selama 120 detik. Bisa mematikan.',spin:'Tampilan berputar selama 5 detik.',drowsy:'Energi turun menjadi 5% dan Pou tertidur.',antidote:'Hentikan semua racun dan pulihkan 25 kesehatan.','antidote-max':'Hentikan semua racun dan pulihkan kesehatan penuh.',infinite:'Energi selalu 100%, permanen setelah diminum.'} as Record<string,string>)[id]??'';}

export const foodPrice = (key: string) => /water$|apple$|carrot$/.test(key) ? 5 : /burger|pizza|lobster|cake|sushi|soup/.test(key) ? 15 : 10;
export const foodNutrition = (key: string) => /water$|juice|soda|tea/.test(key) ? 8 : /burger|pizza|soup|chicken|cake/.test(key) ? 22 : 14;

export const GAMES = [
  { id: 'food-drop', name: 'Food Drop', music: 'music_food', instructions: 'Move Pou to catch food. Avoid falling objects!', mode: 'catch' },
  { id: 'sky-jump', name: 'Sky Jump', music: 'music_jump', instructions: 'Move left and right. Jump as high as you can!', mode: 'jump' },
  { id: 'free-fall', name: 'Free Fall', music: 'music_fall', instructions: 'Move left and right. Fall through the clouds!', mode: 'fall' },
  { id: 'jet-pou', name: 'Jet Pou', music: 'music_country', instructions: 'Tap to fly. Pass between the tree trunks!', mode: 'fly' },
  { id: 'cliff-jump', name: 'Cliff Jump', music: 'music_country', instructions: 'Tap to jump. Jump over the gaps!', mode: 'run' },
  { id: 'memory', name: 'Memory', music: 'music_soft', instructions: 'Turn over the cards and find matching pairs!', mode: 'memory' },
  { id: 'find-pou', name: 'Find Pou', music: 'music_guess', instructions: 'Watch the cups. Find the cup hiding Pou!', mode: 'cups' },
  { id: 'tic-tac-pou', name: 'Tic Tac Pou', music: 'music_soft', instructions: 'Get three Pous in a row. You play first!', mode: 'tic' },
  { id: 'four-pous', name: 'Four Pous', music: 'music_soft', instructions: 'Tap a column. Connect four Pous to win!', mode: 'four' },
  { id: 'color-tap', name: 'Color Tap', music: 'music_match', instructions: 'Change every Pou to the target color!', mode: 'color' },
  { id: 'sad-tap', name: 'Sad Tap', music: 'music_jolly', instructions: 'Tap every sad Pou before time runs out!', mode: 'sad' },
  { id: 'pou-sounds', name: 'Pou Sounds', music: '', instructions: 'Listen carefully. Repeat the sequence!', mode: 'sounds' },
  { id: 'match-tap', name: 'Match Tap', music: 'music_match', instructions: 'Tap groups of three or more matching Pous!', mode: 'match' },
  { id: 'food-swap', name: 'Food Swap', music: 'music_swap', instructions: 'Swap neighboring food. Match three in a row!', mode: 'swap' },
  { id: 'goal', name: 'Goal', music: 'music_jolly', instructions: 'Swipe the ball toward the goal. Beat the keeper!', mode: 'goal' },
  { id: 'hoops', name: 'Hoops', music: 'music_jolly', instructions: 'Drag the ball back, then release to shoot!', mode: 'hoops' },
] as const;
export type GameInfo = typeof GAMES[number];

export function gameHud(mode: GameInfo['mode']) {
  return {
    timed: ['color','sad','match','swap','goal','hoops'].includes(mode),
    lives: ['catch','goal','hoops'].includes(mode),
  };
}
