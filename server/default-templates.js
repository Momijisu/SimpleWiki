// The templates a new wiki starts with. Admins can change, add and remove
// templates afterwards in Admin → Templates; this list is only the seed.
//
// key       stable id stored on each article (don't change it once used)
// label     name shown in the picker and on the article
// plural    heading for lists ("Gangs")
// icon      a Phosphor icon name from public/js/icons.js
// group     picker group: people, orgs, events, places, other
// hint      one line on when to use it
// themes    only offer it in namespaces with one of these themes (empty = all)
// sections  infobox sections, each with its field names
// body      the Markdown a new article starts with

const T = (key, label, plural, icon, group, hint, sections, body, themes = []) => ({
  key, label, plural, icon, group, hint, themes,
  sections: sections.map(([name, fields]) => ({ name, fields })),
  body: body.trim() + '\n',
});

export const DEFAULT_TEMPLATES = [
  T('character', 'Character', 'Characters', 'user', 'people',
    'A player character or a notable local.', [
      ['Basics', ['Full name', 'Nicknames', 'Age', 'Gender', 'Nationality']],
      ['Life', ['Status', 'Occupation', 'Affiliation', 'Residence']],
      ['Out of character', ['Played by', 'First seen', 'Last seen']],
    ], `
## Overview
Who they are, in two or three sentences.

## Background
Where they came from and how they ended up here.

## Personality
How they talk, what they want, what they won't do.

## Relationships
- **[[Someone]]**: how they know each other

## Notable events
- [[An event]]

## Trivia
`),

  T('gang', 'Gang', 'Gangs', 'hand-fist', 'orgs',
    'A gang, crew, cartel, family or outlaw posse.', [
      ['Overview', ['Also known as', 'Founded', 'Status', 'Colors', 'Symbol']],
      ['Territory', ['Territory', 'Headquarters', 'Rackets']],
      ['People', ['Leader', 'Ranks', 'Notable members']],
      ['Relations', ['Allies', 'Rivals']],
    ], `
## Overview

## History

## Ranks & members
| Rank | Members |
|---|---|
| Leader | [[Someone]] |

## Territory & operations

## Conflicts
`),

  T('business', 'Business', 'Businesses', 'storefront', 'orgs',
    'A shop, bar, garage, club, saloon or other business.', [
      ['Overview', ['Type', 'Owner', 'Manager', 'Status', 'Opened']],
      ['Where', ['Location', 'Opening hours', 'Contact']],
      ['Trade', ['Products & services', 'Prices', 'Employees']],
    ], `
## Overview

## Products & services

## Staff
- [[Someone]]: role

## History
`),

  T('police', 'Law enforcement', 'Law enforcement', 'shield-star', 'orgs',
    'A police department, sheriff’s office, marshals or federal agency.', [
      ['Overview', ['Agency', 'Jurisdiction', 'Headquarters', 'Founded']],
      ['Command', ['Chief / Sheriff', 'Deputy chief', 'Ranks', 'Divisions']],
      ['Roster', ['Notable officers', 'Size']],
    ], `
## Overview

## Chain of command
| Rank | Officers |
|---|---|
| Chief | [[Someone]] |

## Divisions

## Policies & procedures

## Notable cases
`),

  T('medical', 'Medical', 'Medical', 'first-aid', 'orgs',
    'A hospital, clinic, EMS service or town doctor.', [
      ['Overview', ['Facility', 'Location', 'Director', 'Founded']],
      ['Staff', ['Ranks', 'Notable staff', 'Size']],
      ['Services', ['Services', 'Fees', 'Hours']],
    ], `
## Overview

## Staff
| Role | Name |
|---|---|
| Director | [[Someone]] |

## Services

## Notable patients & incidents
`),

  T('organization', 'Organization', 'Organizations', 'buildings', 'orgs',
    'Any other group: government, news outlet, union, church, company.', [
      ['Overview', ['Type', 'Founded', 'Headquarters', 'Status']],
      ['People', ['Leader', 'Notable members']],
      ['Relations', ['Allies', 'Rivals']],
    ], `
## Overview

## History

## Members
`),

  T('event', 'Server event', 'Events', 'calendar-star', 'events',
    'A heist, war, trial, festival, election or anything else that happened.', [
      ['When & where', ['Date', 'Location', 'Type']],
      ['Who', ['Organized by', 'Participants', 'Factions involved']],
      ['Outcome', ['Result', 'Casualties', 'Arrests']],
    ], `
## Summary
What happened, in a paragraph.

## Background

## Timeline
1.

## Outcome

## Aftermath

## Clips & media
- [Clip title](https://)
`),

  T('location', 'Location', 'Locations', 'map-pin', 'places',
    'A neighbourhood, building, hideout, town or landmark.', [
      ['Overview', ['Type', 'Area', 'Address', 'Owner']],
      ['Control', ['Controlled by', 'Status']],
    ], `
## Overview

## History

## Notable events
`),

  T('vehicle', 'Vehicle', 'Vehicles', 'car', 'places',
    'A notable car, bike, boat or aircraft.', [
      ['Overview', ['Make & model', 'Plate', 'Owner', 'Color']],
      ['History', ['Acquired', 'Status']],
    ], `
## Overview

## History
`, ['gta']),

  T('horse', 'Horse', 'Horses', 'horse', 'places',
    'A notable horse and its rider.', [
      ['Overview', ['Breed', 'Coat', 'Owner', 'Stabled at']],
      ['History', ['Acquired', 'Status']],
    ], `
## Overview

## History
`, ['rdr']),

  T('page', 'Page', 'Other pages', 'file-text', 'other',
    'A guide, rule page, list or anything else without an infobox.', [], `
`),
];

export const TEMPLATE_GROUPS = {
  people: 'People',
  orgs: 'Organizations',
  events: 'Events',
  places: 'Places & things',
  other: 'Other',
};
