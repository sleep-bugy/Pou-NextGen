/** Stable asset keys keep saved item IDs and Canvas callers compatible. */
const groups: Record<string,string[]> = {
  app:['pou/icon150.png','icons/pou.png','icons/phone/account.png','icons/shops/pou.png'],
  coin:['coin/coin_sm.png','dialog/buy_coin.png'],
  level:['star/star.png','icons/star.png','icons/star_sm.png','dialog/buy_star.png'],
  previous:['icons/prev_naked.png','icons/prev.png'],
  next:['icons/next_naked.png','icons/next.png','icons/next_green.png'],
  back:['dialog/back.png'],close:['dialog/close.png','icons/remove.png'],
  pause:['icons/pause.png'],play:['icons/play.svg','icons/multiplayer/start.png'],
  fullscreen:['icons/fullscreen.svg'], 'exit-fullscreen':['icons/exit-fullscreen.svg'],
  shop:['shop/shop.png','icons/shops/food.png'],
  microphone:['room/micro.png'],settings:['icons/settings.png','icons/phone/settings.png'],
  phone:['phones/100/black.png','icons/shops/phones.png'],
  closet:['closets/closet.png'],fridge:['fridges/fridge.png'],shelf:['shelves/shelf.png'],
  games:['room/joystick.png','icons/games.png','icons/phone/games.png'],
  online:['icons/phone/online.png','icons/multiplayer/wifi.png','icons/multiplayer/wifi_on.png'],
  partner:['icons/phone/friends.png'],trophy:['icons/phone/achievements.png'],
  help:['icons/help.png','icons/phone/help.png'],
  'lamp-on':['lamps/100/light_on.png','icons/shops/lamps.png'],
  'lamp-off':['lamps/100/light_off.png'],
  soap:['soaps/100/white.png','icons/shops/soaps.png'],
  shower:['showers/100/white.png','icons/shops/showers.png'],
  flower:['flowers/1.png','icons/shops/flowers.png'],
  ball:['balls/300/l1.png','icons/shops/balls.png'],basketball:['balls/400/red.png'],
  'status-fullness':['status/fullness.png'],'status-health':['status/health.png'],
  'status-fun':['status/fun.png'],'status-energy':['status/energy.png'],
  food:['status/fullness_icon.png'],heart:['status/health_icon.png'],happy:['status/fun_icon.png'],
  palette:['icons/shops/body_colors.png'],eyes:['icons/shops/eye_colors.png'],
  hat:['icons/shops/hats.png'],glasses:['icons/shops/eyeglasses.png'],
  outfit:['icons/shops/outfits.png'],wallpaper:['icons/shops/wallpapers.png'],
};
const gameNames=['Food Drop','Sky Jump','Free Fall','Jet Pou','Cliff Jump','Memory','Find Pou','Tic Tac Pou','Four Pous','Color Tap','Sad Tap','Pou Sounds','Match Tap','Food Swap','Goal','Hoops'];
export const FOOD_ICON_NAMES='apple apple_juice apricot artichoke avocado_maki bacon banana banana_donut blackberry_juice broccoli burger cabbage california_temaki candy_cane candy_stick carrot cheese_cake cheese_croissant cherries chicken_leg chicken_soup chili_pepper chocolate_balls chocolate_bar chocolate_cake chocolate_cereal chocolate_croissant chocolate_cupcake chocolate_donut chocolate_icecream chocolate_spread coke cookie corn cucumber dumpling eel_temaki egg fig fries fruit_cereal gingerbread gummy_bears honey_cracker hotdog iced_tea jelly_beans kiwi lemon_cupcake lemonade lobster lollipop mango marshmallow milk milkshake mussel noodles octopus octopus_sushi onion_rings orange_fruit orange_juice pancakes peach_jam peanut_butter pear pineapple pizza potato_chips pretzel pumpkin_soup ramen_soup raspberry raspberry_juice salmon_maki salmon_sushi salmon_temaki salty_cracker sardine sausages scallop shrimp shrimp_sushi soda squid strawberry strawberry_cake strawberry_cupcake strawberry_donut strawberry_icecream strawberry_jam strawberry_juice sugar_cereal tomato tortilla_chips tuna_maki tuna_sushi vanilla_icecream vegetable_soup waffles water watermelon wonton_soup'.split(' ');
for(const name of FOOD_ICON_NAMES)groups[`food-${name}`]=[`food/${name}.png`];
for(const name of ['sofa','plant','rug','table','bookcase','aquarium'])groups[`decor-${name}`]=[`decor/${name}.svg`];
groups['explorer-hat']=['rewards/explorer-hat.svg'];
for(const name of gameNames)groups[`game-${name.toLowerCase().replaceAll(' ','-')}`]=[`icons/games/${name}.png`];
for(let id=1;id<=8;id++)groups[`potion-${id}`]=[`potions/${id}.png`];
groups['potion-4'].push('icons/shops/potions.png');
for(const id of ['100','200','300','400','500'])groups[`achievement-${id}`]=[`achievements/${id}.png`];

export const ICON_ALIASES:Readonly<Record<string,string>>=Object.fromEntries(Object.entries(groups).flatMap(([name,keys])=>keys.map(key=>[key,`icons/modern/${name}.svg`])));
export const MODERN_ICON_NAMES=Object.keys(groups);
