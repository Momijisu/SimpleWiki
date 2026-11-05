// Fills an EMPTY wiki with example articles, so you can see how it looks.
//   DATA_DIR=./demo-data node tools/demo.js
// The articles are written by a "demo" account. Afterwards, sign in with
// Discord and make yourself admin with:  node tools/role.js <your name> admin
import fs from 'node:fs';
import { createServer } from '../server/index.js';
import { createSession } from '../server/auth.js';

const server = createServer();
if (server.db.prepare('SELECT COUNT(*) AS n FROM users').get().n) {
  console.error('This wiki already has accounts. Point DATA_DIR at an empty folder to try the demo.');
  process.exit(1);
}
// A local account to write as. It has no Discord account, so nobody can sign in as it.
const id = Number(server.db.prepare("INSERT INTO users (username, role, status, created_at) VALUES ('demo', 'admin', 'active', ?)").run(Date.now()).lastInsertRowid);
const cookie = `sw_session=${createSession(server.db, id)}`;
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
async function call(method, path, body) {
  const res = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'SimpleWiki', cookie },
    body: body && JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path}: ${data.error}`);
  return data;
}
const article = (ns, title, template, fields, body, image = '') => call('POST', `/api/ns/${ns}/articles`, { title, template, fields, body, image });
async function upload(file) {
  const res = await fetch(`${base}/api/upload`, {
    method: 'POST', headers: { 'X-Requested-With': 'SimpleWiki', 'Content-Type': 'image/png', cookie },
    body: fs.readFileSync(new URL(`./demo-assets/${file}`, import.meta.url)),
  });
  return (await res.json()).url;
}
const logo = await upload('logo.png');
const saints = await upload('saints.png');

await call('PUT', '/api/admin/settings', {
  siteName: 'Southside RP Wiki', tagline: 'Every story from every city we’ve played.', logo,
  footer: 'The Southside RP Wiki is written by the players of the Southside roleplay community. Everything here is in-character unless it says otherwise.',
  socialLinks: 'Discord | https://discord.gg/example\nYouTube | https://www.youtube.com/@example\nTikTok | https://www.tiktok.com/@example\nTwitch | https://www.twitch.tv/example\nWebsite | https://example.com',
  welcome: `## What is Southside RP?
Southside RP is a story-first roleplay community. This wiki is where players write up their characters, crews, businesses and the
events that shaped each city, across every version of the server.

## How to help
- [[gta:Main page|Los Santos 4.0]]
- [[rdr:Main page|Cedar Falls 1899]]
- [Join the Discord](https://discord.gg/example)
`,
});
await call('PUT', '/api/admin/namespaces/gta', { name: 'Los Santos 4.0', tagline: 'The current city: 2026 onwards.', sort: 0 });
await call('POST', '/api/admin/namespaces', { slug: 'gta3', name: 'Los Santos 3.0', tagline: 'The 2023–2025 city, kept for the record.', theme: 'gta', sort: 1, archived: true });
await call('PUT', '/api/admin/namespaces/rdr', { name: 'Cedar Falls 1899', tagline: 'The Wild West server.', sort: 2 });

// ---- Los Santos 4.0
await article('gta', 'Main page', 'page', {}, `
## What is Los Santos 4.0?
The current city, open since January 2026. Start with the [[Southside Saints]], the [[Los Santos Police Department]] or the
[[Harbor Bank Heist]] that kicked off the summer.

This wiki is for players to show off their characters, crews and storylines, and to keep a record of everything that happens in the city.

## Wiki rules
- Everything here is out-of-character information. Don’t use it in character.
- No OOC drama or toxicity, in articles or anywhere else.
- Don’t discuss bans or ban reasons.
- Don’t remove content from a page unless it’s false.
- Don’t edit-war. If you disagree with someone, take it to a moderator on Discord.

## Latest update: 4.2
- New casino games
- Beekeeping and hunting jobs
- Blaine County Sheriff’s Office
- Weazel News vans
- Reworked phone
- [[Harbor Bank Heist|The Harbor heist]] is now repeatable

## Official links
- [Discord](https://discord.gg/example)
- [Server rules](https://example.com/rules)
- [Interactive map](https://example.com/map)
- [YouTube](https://www.youtube.com/@example)
- [Twitch](https://www.twitch.tv/example)
`);
await article('gta', 'Tony Ramirez', 'character', {
  'Full name': 'Antonio “Tony” Ramirez', Nicknames: 'Two-Times', Age: '34', Gender: 'Male', Nationality: 'American',
  Status: 'Alive', Occupation: 'Mechanic at [[Big Rig Customs]]', Affiliation: '[[Southside Saints]]', Residence: 'Grove Street',
  'Played by': 'TwoTimesTony (Discord)', 'First seen': 'March 2026',
}, `
## Overview
Tony Ramirez is a mechanic by day and the [[Southside Saints]]’ getaway driver by night. He earned the name *Two-Times* after
walking out of Bolingbroke twice in one month on technicalities.

## Background
Born and raised on the south side, Tony learned to drive in his uncle’s tow truck. He moved back to Los Santos in early 2026 after
a few quiet years up north, picked up work at [[Big Rig Customs]], and fell back in with old friends within a week.

## Personality
Loud, loyal and impossible to stay mad at. He never carries a gun if he can help it and will talk his way out of anything,
which is how he talks himself *into* most things.

## Relationships
- **[[Marisol Vega]]**: leader of the Saints; Tony would follow her anywhere.
- **[[Officer Dana Brooks]]**: has arrested him four times. They get coffee now.

## Notable events
- Drove the getaway car in the [[Harbor Bank Heist]].
- Previously known in the old city as [[gta3:Tony Ramirez]].

> [!rumor]
> People say he still owes the Lost Coast boys for a car he “borrowed” in April.
`);
await article('gta', 'Southside Saints', 'gang', {
  'Also known as': 'The Saints, SSS', Founded: 'January 2026', Status: 'Active', Colors: 'Purple and gold', Symbol: 'A crowned S',
  Territory: 'Grove Street, Davis', Headquarters: 'The old laundromat on Forum Drive', Rackets: 'Chop shops, street races',
  Leader: '[[Marisol Vega]]', Ranks: 'OG, Shot-caller, Soldier, Prospect', 'Notable members': '[[Tony Ramirez]]',
  Rivals: '[[Eastside Vipers]]',
}, `
## Overview
The Southside Saints run Grove Street and most of Davis. They make their money from stolen cars and keep the peace on their blocks
better than the police do, or so they say.

## History
Founded by [[Marisol Vega]] and three friends in the first week of the city, after the [[Eastside Vipers]] burned down her
brother’s garage.

## Ranks & members
| Rank | Members |
|---|---|
| OG | [[Marisol Vega]] |
| Shot-caller | — |
| Soldier | [[Tony Ramirez]] |

## Territory & operations
Street races on Friday nights under the Davis overpass; cars stripped at [[Big Rig Customs]] after hours.

## Conflicts
- The [[Harbor Bank Heist]]
`);
await article('gta', 'Big Rig Customs', 'business', {
  Type: 'Garage and body shop', Owner: 'Earl “Big Rig” Hollis', Status: 'Open', Location: 'Strawberry Avenue',
  'Opening hours': 'Whenever Earl is awake', 'Products & services': 'Repairs, tuning, wraps, no questions asked', Employees: '[[Tony Ramirez]]',
}, `
## Overview
The best paint jobs in the city and the worst coffee. The police have searched it three times and found nothing every time.

## Staff
- [[Tony Ramirez]]: mechanic
`);
await article('gta', 'Los Santos Police Department', 'police', {
  Agency: 'LSPD', Jurisdiction: 'City of Los Santos', Headquarters: 'Mission Row', 'Chief / Sheriff': '[[Chief Ray Holloway]]',
  Ranks: 'Chief, Captain, Lieutenant, Sergeant, Officer, Cadet', Divisions: 'Patrol, Detectives, Air Support', 'Notable officers': '[[Officer Dana Brooks]]',
}, `
## Overview
The city’s police department. Recruitment is open: apply on the server Discord.

## Chain of command
| Rank | Officers |
|---|---|
| Chief | [[Chief Ray Holloway]] |
| Officer | [[Officer Dana Brooks]] |

## Notable cases
- [[Harbor Bank Heist]]
`);
await article('gta', 'Central Medical', 'medical', {
  Facility: 'Hospital and EMS', Location: 'Pillbox Hill', Director: '[[Dr. Amara Okafor]]', Services: 'Emergency care, surgery, ambulance',
  Fees: '$500 per visit, waived for the broke', Hours: 'Always open',
}, `
## Overview
The city’s only hospital, and the busiest building in Los Santos on a Friday night.
`);
await article('gta', 'Harbor Bank Heist', 'event', {
  Date: '14 June 2026', Location: 'Harbor Savings & Loan, Del Perro', Type: 'Bank robbery',
  'Organized by': '[[Southside Saints]]', Participants: '[[Tony Ramirez]], [[Marisol Vega]], two unknown', 'Factions involved': '[[Southside Saints]], [[Los Santos Police Department]]',
  Result: 'Robbers escaped; $2.1M taken', Casualties: 'None', Arrests: 'One, released after 48 hours',
}, `
## Summary
Four masked robbers took the Harbor Savings & Loan vault in under six minutes and lost eleven police cars in a chase through Vespucci canals.

## Timeline
1. **21:04**: alarm triggered; first unit on scene four minutes later.
2. **21:10**: getaway car (driven by [[Tony Ramirez]]) leaves through the loading bay.
3. **21:31**: chase ends when the car goes into the canal. Nobody is inside.

## Aftermath
[[Officer Dana Brooks]] still has the case open on her desk.

> [!secret] What really happened (spoiler)
> The car in the canal was a decoy. The money left in a [[Big Rig Customs]] tow truck.

## Clips & media
- [Chase from the helicopter](https://example.com/clip)
`);

// ---- Los Santos 3.0 (archived)
await article('gta3', 'Tony Ramirez', 'character', { Status: 'Left the city', Occupation: 'Taxi driver' }, `
## Overview
Before the reset, Tony drove a cab and was famous for never once taking the fastest route. See his current story in [[gta:Tony Ramirez]].
`);

// ---- Cedar Falls 1899
await article('rdr', 'Main page', 'page', {}, `
Welcome to **Cedar Falls**, 1899: a railroad town on the edge of the territory. The [[Crane Gang]] rides the hills,
[[Sheriff Eli Mercer]] keeps what order he can, and the train still comes through on Tuesdays. Mostly.
`);
await article('rdr', 'Silas Crane', 'character', {
  'Full name': 'Silas Josiah Crane', Nicknames: 'The Parson', Age: '41', Gender: 'Male', Nationality: 'Born in Missouri',
  Status: 'Wanted, $800 bounty', Occupation: 'Outlaw, sometime preacher', Affiliation: '[[Crane Gang]]', Residence: 'Unknown, somewhere in the hills',
  'Played by': 'ParsonSi (Discord)',
}, `
## Overview
A preacher who stopped believing and kept the Bible anyway, for quoting at people he robs.

## Background
Came west after the war with his younger brother and a wagon of hymnals. The hymnals are gone. So is the brother.

## Notable events
- Led the [[Cedar Falls Train Robbery]]

> [!ooc]
> Silas is played for slow-burn drama. Bounty hunters welcome; please keep it to evenings EU time.
`);
await article('rdr', 'Crane Gang', 'gang', {
  'Also known as': 'The Parson’s Boys', Founded: 'Spring 1898', Status: 'Active', Territory: 'The Cedar Hills', Headquarters: 'An old mission',
  Leader: '[[Silas Crane]]', Rivals: '[[Cedar Falls Sheriff’s Office]]',
}, `
## Overview
A small band of outlaws who rob trains and stagecoaches and give a cut to the poor farms nearby, which keeps the farmers quiet.

## Conflicts
- [[Cedar Falls Train Robbery]]
`);
await article('rdr', 'Cedar Falls Sheriff’s Office', 'police', {
  Agency: 'Sheriff’s Office', Jurisdiction: 'Cedar County', Headquarters: 'Main Street, Cedar Falls', 'Chief / Sheriff': '[[Sheriff Eli Mercer]]',
  Ranks: 'Sheriff, Deputy, Posse', Size: 'Three deputies and whoever’s sober',
}, `
## Overview
The law in Cedar County, such as it is. Deputies are sworn in at the saloon.
`);
await article('rdr', 'Doc Whitmore’s Practice', 'medical', {
  Facility: 'Doctor’s office', Location: 'Above the general store', Director: 'Dr. Henry Whitmore', Services: 'Bullets out, bones set, teeth pulled', Fees: '$2, or a chicken',
}, `
## Overview
The only doctor for fifty miles. Sober until noon.
`);
await article('rdr', 'Cedar Falls Train Robbery', 'event', {
  Date: 'Tuesday, 3 October 1899', Location: 'Miller’s Bend, west of Cedar Falls', Type: 'Train robbery',
  'Organized by': '[[Crane Gang]]', Result: 'Mail car emptied; $3,400 in payroll taken', Casualties: 'One deputy wounded',
}, `
## Summary
The [[Crane Gang]] stopped the Tuesday train with a felled pine and emptied the mail car before the [[Cedar Falls Sheriff’s Office]] arrived.

## Aftermath
The railroad put an $800 bounty on [[Silas Crane]].
`);
await article('rdr', 'Ember', 'horse', { Breed: 'American Paint', Coat: 'Chestnut overo', Owner: '[[Silas Crane]]', 'Stabled at': 'Nowhere for long' }, `
## Overview
Silas’s horse. Bites deputies, specifically.
`);

// A picture for the Saints, and feature them on the Los Santos front page.
const s = await call('GET', '/api/ns/gta/article/southside-saints');
await call('PUT', '/api/ns/gta/article/southside-saints', { ...s.article, image: saints, baseRev: s.article.revId, comment: 'Added the crew logo' });
await call('POST', '/api/ns/gta/article/southside-saints/feature', { on: true });

server.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
server.close();
console.log(`
Demo wiki ready. To sign in, set up Discord (see the README), sign in once, then make yourself admin:
  DATA_DIR=${process.env.DATA_DIR || 'data'} node tools/role.js <your Discord username> admin
`);
